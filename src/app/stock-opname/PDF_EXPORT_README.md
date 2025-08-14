# PDF Export Roadmap

Saat ini fitur export PDF untuk Stock Opname belum diimplementasikan. Berikut rencana implementasi:

## Backend

1. Tambah dependency library PDF (contoh: barryvdh/laravel-dompdf atau spatie/browsershot bila butuh rendering Tailwind).
2. Buat view blade `resources/views/stock_opname/pdf.blade.php` yang menampilkan header (kode, tanggal, status), ringkasan agregat (total items, total adjustment + dan -), dan tabel item (produk, system qty, counted qty, diff, notes).
3. Endpoint baru: `GET /api/stock-opname/{id}/export-pdf` -> generate PDF dan return `application/pdf` response + filename `stock-opname-{code}.pdf`.
4. Pertimbangkan cache hasil PDF (misal simpan di storage/app/cache/stock_opname/pdf/{id}.pdf) jika status sudah FINAL (APPROVED / REJECTED) untuk mengurangi beban rendering.
5. Audit log: catat setiap export (optional) di tabel `activity_logs` bila sudah ada.

## Frontend

1. Tambah tombol PDF disebelah tombol CSV (list & detail page). Link langsung menuju endpoint baru.
2. Tampilkan loading state (disable tombol) jika perlu generate on-demand (opsional: HEAD request untuk cek cached).
3. Jika PDF generation > 5 detik, pertimbangkan mekanisme polling job queue (kirim request create job, tampilkan toast progress, download ketika siap).

## Security & Access

- Batasi export hanya untuk user dengan permission yang sama dengan yang dapat melihat sesi.
- Sanitasi input ID (gunakan route model binding di controller).

## Testing

- Unit test controller: memastikan response code 200 dan header `Content-Type: application/pdf`.
- Snapshot ukuran file minimum (> 1KB) untuk memastikan konten tidak kosong.
- Frontend e2e: klik tombol, memastikan download dimulai (Playwright intercept).

## Performance

- Gunakan eager loading relasi items untuk menghindari N+1.
- Untuk sesi besar (>5k items), pertimbangkan streaming HTML -> PDF chunking atau menyederhanakan styling.

## Estimasi

- Implementasi dasar: ~2-3 jam (tanpa queue & cache).
- Versi advanced (cache + queue + progress): ~1 hari.

--
Jika disetujui saya bisa lanjutkan dengan paket dompdf standar terlebih dahulu.
