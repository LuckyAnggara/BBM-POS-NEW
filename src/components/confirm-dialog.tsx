'use client'
import React from 'react'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'

export interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  title?: string
  description?: string
  confirmText?: string
  cancelText?: string
  variant?: 'default' | 'destructive' | 'outline' | 'secondary'
  loading?: boolean
  onConfirm: () => void | Promise<void>
  icon?: React.ReactNode
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title = 'Konfirmasi',
  description = 'Anda yakin?',
  confirmText = 'Ya',
  cancelText = 'Batal',
  variant = 'default',
  loading = false,
  onConfirm,
  icon,
}: ConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className='sm:max-w-[420px]'>
        <AlertDialogHeader>
          <AlertDialogTitle className='flex items-center gap-2'>
            {icon}
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className='text-xs'>
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading} className='text-xs'>
            {cancelText}
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button
              size='sm'
              className='text-xs'
              disabled={loading}
              variant={variant}
              onClick={() => onConfirm()}
            >
              {loading ? 'Proses...' : confirmText}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
