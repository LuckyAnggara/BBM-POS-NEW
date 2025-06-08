
"use client";

import React, { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from "html5-qrcode";
import type { QrcodeSuccessCallback, QrcodeErrorCallback } from "html5-qrcode/esm/core";
import { CameraOff, Video } from "lucide-react";

interface ScanCustomerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (scannedId: string) => void;
  branchId: string; // To potentially scope customer search in the future
}

const SCANNER_ELEMENT_ID = "qr-reader";

export default function ScanCustomerDialog({ isOpen, onClose, onScanSuccess, branchId }: ScanCustomerDialogProps) {
  const { toast } = useToast();
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [scannerMessage, setScannerMessage] = useState<string>("Arahkan QR Code atau Barcode pelanggan ke kamera.");
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      if (scannerRef.current) {
        try {
          if (scannerRef.current.getState() === 2) { // SCANNING_STATE
             scannerRef.current.stop().catch(err => console.error("Error stopping scanner:", err));
          }
           scannerRef.current.clear();
        } catch (e) {
          console.warn("Error while trying to stop/clear scanner:", e);
        }
        scannerRef.current = null;
      }
      setHasCameraPermission(null); // Reset permission status on close
      return;
    }

    const requestCameraPermission = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        setHasCameraPermission(true);
        stream.getTracks().forEach(track => track.stop()); // Release camera immediately after permission check
      } catch (error) {
        console.error("Error accessing camera:", error);
        setHasCameraPermission(false);
        setScannerMessage("Izin kamera ditolak atau tidak ada kamera. Aktifkan di pengaturan browser.");
        toast({
          variant: "destructive",
          title: "Akses Kamera Ditolak",
          description: "Mohon izinkan akses kamera di pengaturan browser Anda untuk menggunakan fitur scan.",
        });
      }
    };

    requestCameraPermission();

  }, [isOpen, toast]);


  useEffect(() => {
    if (isOpen && hasCameraPermission === true && videoContainerRef.current && !scannerRef.current) {
        const successCallback: QrcodeSuccessCallback = (decodedText, result) => {
            console.log(`Scan result: ${decodedText}`, result);
            onScanSuccess(decodedText);
            if (scannerRef.current) {
                scannerRef.current.stop().catch(err => console.error("Error stopping scanner on success:", err));
                scannerRef.current.clear(); // Ensure it's cleared
                scannerRef.current = null;
            }
        };

        const errorCallback: QrcodeErrorCallback = (errorMessage) => {
            // console.warn(`QR error: ${errorMessage}`);
            // setScannerMessage("Tidak ada QR/Barcode terdeteksi. Coba lagi.");
        };
        
        const config = { 
            fps: 10, 
            qrbox: { width: 250, height: 250 },
            rememberLastUsedCamera: true,
            supportedScanTypes: [0], // 0 for SCAN_TYPE_CAMERA
            formatsToSupport: [
                Html5QrcodeSupportedFormats.QR_CODE,
                Html5QrcodeSupportedFormats.CODE_128,
                Html5QrcodeSupportedFormats.EAN_13,
                Html5QrcodeSupportedFormats.UPC_A,
                Html5QrcodeSupportedFormats.UPC_E,
            ]
        };

        const html5QrcodeScanner = new Html5QrcodeScanner(
            SCANNER_ELEMENT_ID,
            config,
            false // verbose
        );
        
        try {
             html5QrcodeScanner.render(successCallback, errorCallback);
             scannerRef.current = html5QrcodeScanner;
             setScannerMessage("Arahkan QR Code atau Barcode pelanggan ke kamera.");
        } catch (renderError) {
            console.error("Error rendering scanner:", renderError);
            setScannerMessage("Gagal memulai scanner. Coba tutup dan buka lagi.");
            toast({variant: "destructive", title: "Scanner Error", description: "Gagal memulai scanner."});
        }
    }

    return () => {
      if (scannerRef.current) {
         try {
            if (scannerRef.current.getState() === 2) { // SCANNING_STATE
                scannerRef.current.stop().catch(err => console.error("Error stopping scanner on unmount/re-render:", err));
            }
            scannerRef.current.clear();
        } catch (e) {
            console.warn("Error stopping/clearing scanner on cleanup:", e);
        }
        scannerRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, hasCameraPermission, onScanSuccess]);


  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">Scan ID Pelanggan</DialogTitle>
          <DialogDescription className="text-xs">
            {scannerMessage}
          </DialogDescription>
        </DialogHeader>
        <div className="py-2">
          {hasCameraPermission === null && (
            <div className="flex flex-col items-center justify-center h-48 bg-muted rounded-md">
              <CameraOff className="h-12 w-12 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">Meminta izin kamera...</p>
            </div>
          )}
          {hasCameraPermission === false && (
            <Alert variant="destructive" className="mt-2">
              <AlertTitle>Akses Kamera Diperlukan</AlertTitle>
              <AlertDescription>
                Aplikasi ini memerlukan izin untuk mengakses kamera Anda agar dapat memindai QR Code/Barcode. 
                Silakan aktifkan izin kamera di pengaturan browser Anda dan coba lagi.
              </AlertDescription>
            </Alert>
          )}
          {hasCameraPermission === true && (
            <div ref={videoContainerRef} id={SCANNER_ELEMENT_ID} className="w-full aspect-square rounded-md border bg-muted overflow-hidden">
                {/* Video stream will be rendered here by html5-qrcode */}
            </div>
          )}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" className="text-xs h-8" onClick={onClose}>
              Tutup
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
