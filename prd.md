# Product Requirement Document (PRD): Aplikasi Manajemen Klinik/Rumah Sakit

## Versi Dokumen

| Versi | Tanggal      | Penulis | Status          |
| ----- | ------------ | ------- | --------------- |
| 1.1   | 13 Juli 2025 | Gemini  | Draf Diperbarui |

---

## 1. Pendahuluan

### 1.1. Latar Belakang

Banyak klinik atau fasilitas kesehatan skala kecil hingga menengah masih mengandalkan proses manual atau sistem yang terfragmentasi. Hal ini menyebabkan inefisiensi alur kerja, kesulitan melacak data pasien, dan kurangnya visibilitas operasional bagi manajemen.

### 1.2. Tujuan Produk

Membangun Sistem Informasi Manajemen (SIM) berbasis web yang modern, terintegrasi, dan mudah digunakan. Aplikasi ini akan mendigitalkan seluruh alur pelayanan pasien, mulai dari pendaftaran, pemeriksaan, pembayaran, hingga manajemen inventaris obat dan pelaporan untuk manajemen, serta rencana integrasi ke platform nasional seperti BPJS dan SatuSehat.

---

## 2. Persyaratan Teknis (Tech Stack)

- **Frontend:** Next.js (React.js)
- **UI/UX:** Shadcn/UI, Tailwind CSS
- **Tema:** Zinc
- **Mode:** Light & Dark Mode
- **Notifikasi:** Shadcn Sonner (toast/pop-up)
- **Backend & Database:** Supabase (termasuk Supabase Auth)
- **Deployment:** Vercel

---

## 3. Pengguna dan Peran (User Roles)

| Peran                  | Deskripsi Tugas Utama                                                                         |
| ---------------------- | --------------------------------------------------------------------------------------------- |
| Admin Sistem           | Mengelola akun pengguna, mengatur peran pengguna.                                             |
| Admin CS               | Mendaftarkan pasien baru, mencari data pasien lama, mencatat keluhan/tugas kedatangan pasien. |
| Asisten Dokter/Perawat | Pemeriksaan awal (triage), mencatat data vital pasien.                                        |
| Dokter                 | Melihat riwayat medis, diagnosis, mencatat gejala, membuat resep, rekomendasi tindakan medis. |
| Apoteker               | Menerima resep digital, menyiapkan obat, verifikasi pembayaran, serahkan obat ke pasien.      |
| Staf Billing           | Menerima notifikasi tagihan, mengelola proses pembayaran.                                     |
| Admin Kamar            | Mengelola status/alokasi kamar pasien.                                                        |
| Manajer Inventaris     | Mengelola stok obat/alkes, menerima notifikasi stok menipis.                                  |
| Staf Keuangan          | Melihat laporan transaksi, rekap pendapatan (laba-rugi sederhana).                            |
| Direktur               | Melihat dashboard eksekutif (ringkasan data operasional & keuangan).                          |

---

## 4. Persyaratan Fungsional (Functional Requirements)

### 4.1. Manajemen Pengguna & Otentikasi

- Halaman login untuk semua pengguna.
- Otentikasi menggunakan Supabase Auth.
- [Admin Sistem] Dashboard CRUD pengguna.
- [Admin Sistem] Penetapan satu/lebih peran ke pengguna.

### 4.2. Modul Admin CS (Pendaftaran Pasien)

- Formulir pendaftaran pasien baru: Nama, Tanggal Lahir, Alamat, No. Telepon, NIK.
- Nomor Rekam Medis unik otomatis.
- Pencarian pasien berdasarkan Nama/Nomor Rekam Medis.
- Formulir keluhan utama pasien.

### 4.3. Modul Asisten Dokter (Pemeriksaan Awal)

- Pilih pasien dari antrian.
- Formulir data vital: berat badan (kg), tinggi badan (cm), suhu (°C), tekanan darah (mmHg).
- Data otomatis tersimpan di rekam medis kunjungan hari itu.

### 4.4. Modul Dokter (Pemeriksaan & Diagnosis)

- Dashboard antrian pasien.
- Halaman detail pasien (riwayat medis, hasil pemeriksaan awal).
- Formulir SOAP (Subjective, Objective, Assessment, Plan).
- **(Update)** Diagnosis dengan kode standar ICD-10.
- Resep digital dari database inventaris.
- Notifikasi otomatis ke modul Billing & Apotek setelah diagnosis.

### 4.5. Modul Apotek

- Dashboard resep masuk real-time.
- Detail resep: nama pasien, dokter, daftar obat, status pembayaran.
- Tombol "Siapkan Obat" & "Serahkan Obat" (aktif setelah pembayaran lunas).
- Penyerahan obat otomatis mengurangi stok inventaris.

### 4.6. Modul Billing

- Dashboard tagihan belum dibayar.
- Rincian tagihan: biaya konsultasi, tindakan, obat.
- **(Update)** Struktur data tagihan & pembayaran mendukung integrasi BPJS/SatuSehat (misal, pisahkan tagihan asuransi & pribadi).
- Fitur mencatat pembayaran & ubah status "Lunas".

### 4.7. Modul Admin Kamar

- Tampilan visual status kamar (Tersedia, Terisi, Dibersihkan).
- Fitur ubah status & alokasi pasien ke kamar.

### 4.8. Modul Inventaris

- Dashboard CRUD data obat/alkes.
- Field: Nama, Satuan, Stok Saat Ini, Stok Minimum.
- Notifikasi visual stok menipis.

### 4.9. Modul Keuangan

- Dashboard laporan pendapatan.
- Filter laporan berdasarkan rentang tanggal.
- **(Update)** Laporan laba-rugi sederhana (Pendapatan - Harga Pokok Obat).
- Ekspor laporan ke CSV/PDF.

### 4.10. Dashboard Direktur

- Ringkasan metrik kunci: jumlah pasien, okupansi, pendapatan, obat & diagnosis teratas.
- Data dalam angka & grafik sederhana.

---

## 5. Persyaratan Non-Fungsional

- **Desain & UX:** Antarmuka bersih, modern, intuitif, responsif.
- **Keamanan:** Akses modul dibatasi peran (Role-Based Access Control).
- **Kinerja:** Waktu muat cepat, interaksi instan.
- **(Baru) Notifikasi:** Real-time antar modul (misal resep baru, pembayaran lunas) via toast/pop-up (Shadcn Sonner).

---

## 6. Alur Kerja Utama Pengguna (Contoh)

Alur kerja tetap sama seperti versi sebelumnya.

---

## 7. Integrasi Masa Depan

- **BPJS & SatuSehat:** Fondasi aplikasi siap integrasi dengan VClaim BPJS & SatuSehat.

---

## 8. Lampiran

- **Lampiran A:** Desain Skema Database & Data Mockup untuk Supabase.

-- Skema Database untuk Aplikasi Manajemen Klinik
-- Platform: Supabase (PostgreSQL)
-- Versi: 1.0

-- 1. Manajemen Pengguna dan Peran
-- Tabel ini akan di-handle oleh Supabase Auth, namun kita definisikan profil publiknya.
CREATE TABLE public.profiles (
id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
full_name TEXT,
avatar_url TEXT
);

-- Tabel untuk peran pengguna
CREATE TABLE public.roles (
id SERIAL PRIMARY KEY,
name TEXT UNIQUE NOT NULL -- e.g., 'Admin Sistem', 'Dokter', 'Apoteker'
);

-- Tabel penghubung antara pengguna dan peran (Many-to-Many)
CREATE TABLE public.user_roles (
user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
role_id INTEGER REFERENCES public.roles(id) ON DELETE CASCADE,
PRIMARY KEY (user_id, role_id)
);

-- 2. Manajemen Pasien
CREATE TABLE public.patients (
id SERIAL PRIMARY KEY,
medical_record_number TEXT UNIQUE NOT NULL,
full_name TEXT NOT NULL,
date_of_birth DATE NOT NULL,
address TEXT,
phone_number TEXT,
nik TEXT UNIQUE,
created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Manajemen Inventaris (Obat & Alkes)
CREATE TABLE public.medicines (
id SERIAL PRIMARY KEY,
name TEXT NOT NULL,
unit TEXT NOT NULL, -- e.g., 'Tablet', 'Botol', 'Strip'
current_stock INTEGER NOT NULL DEFAULT 0,
minimum_stock INTEGER NOT NULL DEFAULT 10,
purchase_price NUMERIC(10, 2) NOT NULL DEFAULT 0, -- Harga Beli/Pokok
selling_price NUMERIC(10, 2) NOT NULL DEFAULT 0, -- Harga Jual
created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Manajemen Kamar
CREATE TABLE public.rooms (
id SERIAL PRIMARY KEY,
room_number TEXT NOT NULL,
category TEXT NOT NULL, -- e.g., 'Rawat Inap', 'ICU', 'Ruang Dokter'
status TEXT NOT NULL DEFAULT 'Tersedia' -- e.g., 'Tersedia', 'Terisi', 'Dibersihkan'
);

-- 5. Alur Pelayanan Medis
CREATE TABLE public.visits (
id SERIAL PRIMARY KEY,
patient_id INTEGER REFERENCES public.patients(id) ON DELETE CASCADE,
doctor_id UUID REFERENCES public.profiles(id),
visit_date DATE NOT NULL DEFAULT CURRENT_DATE,
main_complaint TEXT,
status TEXT NOT NULL DEFAULT 'Menunggu', -- e.g., 'Menunggu', 'Pemeriksaan', 'Selesai', 'Dibayar'
created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Data Vital Pasien per Kunjungan
CREATE TABLE public.vitals (
id SERIAL PRIMARY KEY,
visit_id INTEGER UNIQUE REFERENCES public.visits(id) ON DELETE CASCADE,
weight_kg NUMERIC(5, 2),
height_cm NUMERIC(5, 2),
temperature_c NUMERIC(4, 2),
blood_pressure TEXT, -- e.g., '120/80'
recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Diagnosis Dokter per Kunjungan
CREATE TABLE public.diagnoses (
id SERIAL PRIMARY KEY,
visit_id INTEGER UNIQUE REFERENCES public.visits(id) ON DELETE CASCADE,
icd10_code TEXT, -- Kode diagnosis standar
icd10_name TEXT,
subjective TEXT,
objective TEXT,
assessment TEXT,
plan TEXT,
created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Resep Obat per Kunjungan
CREATE TABLE public.prescriptions (
id SERIAL PRIMARY KEY,
visit_id INTEGER UNIQUE REFERENCES public.visits(id) ON DELETE CASCADE,
status TEXT NOT NULL DEFAULT 'Baru', -- e.g., 'Baru', 'Disiapkan', 'Selesai'
created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Detail item dalam satu resep
CREATE TABLE public.prescription_items (
id SERIAL PRIMARY KEY,
prescription_id INTEGER REFERENCES public.prescriptions(id) ON DELETE CASCADE,
medicine_id INTEGER REFERENCES public.medicines(id),
quantity INTEGER NOT NULL,
dosage_instruction TEXT -- e.g., '3x1 sesudah makan'
);

-- 6. Manajemen Keuangan
CREATE TABLE public.payments (
id SERIAL PRIMARY KEY,
visit_id INTEGER UNIQUE REFERENCES public.visits(id) ON DELETE CASCADE,
total_amount NUMERIC(12, 2) NOT NULL,
amount_paid NUMERIC(12, 2) DEFAULT 0,
payment_method TEXT, -- e.g., 'Tunai', 'Transfer', 'BPJS'
status TEXT NOT NULL DEFAULT 'Belum Lunas', -- e.g., 'Belum Lunas', 'Lunas'
created_at TIMESTAMPTZ DEFAULT NOW(),
paid_at TIMESTAMPTZ
);

--- MOCKUP DATA ---

-- 1. Tambah Peran (Roles)
INSERT INTO public.roles (name) VALUES
('Admin Sistem'), ('Admin CS'), ('Asisten Dokter'), ('Dokter'),
('Apoteker'), ('Staf Billing'), ('Admin Kamar'), ('Manajer Inventaris'),
('Staf Keuangan'), ('Direktur');

-- Catatan: Untuk user dan user_roles, prosesnya akan melibatkan `auth.users`
-- yang dibuat saat sign-up. Mockup ini mengasumsikan UUID sudah ada.
-- Misal, setelah membuat user di Supabase Auth, Anda akan mendapatkan UUID-nya.
-- INSERT INTO public.profiles (id, full_name) VALUES ('uuid-dari-auth', 'Nama Lengkap');
-- INSERT INTO public.user_roles (user_id, role_id) VALUES ('uuid-dari-auth', 4); -- Memberi peran Dokter

-- 2. Tambah Data Obat
INSERT INTO public.medicines (name, unit, current_stock, minimum_stock, purchase_price, selling_price) VALUES
('Paracetamol 500mg', 'Tablet', 200, 50, 500, 700),
('Amoxicillin 500mg', 'Kapsul', 150, 50, 1500, 2000),
('OBH Combi Batuk', 'Botol 100ml', 80, 20, 15000, 18000);

-- 3. Tambah Data Pasien Baru
INSERT INTO public.patients (medical_record_number, full_name, date_of_birth, address, phone_number, nik) VALUES
('MR-2025-0001', 'Budi Santoso', '1990-05-15', 'Jl. Merdeka No. 10, Jakarta', '081234567890', '3171234567890001');

-- 4. Buat Kunjungan Baru untuk Pasien
-- (Asumsikan ID Pasien Budi Santoso adalah 1, dan ID Dokter adalah UUID spesifik)
INSERT INTO public.visits (patient_id, doctor_id, main_complaint, status) VALUES
(1, '8a9b1c2d-3e4f-5a6b-7c8d-9e0f1a2b3c4d', 'Demam dan sakit kepala selama 2 hari.', 'Menunggu');

-- 5. Catat Data Vital oleh Asisten Dokter
-- (Asumsikan ID Kunjungan adalah 1)
INSERT INTO public.vitals (visit_id, weight_kg, height_cm, temperature_c, blood_pressure) VALUES
(1, 75.5, 170, 38.5, '120/80');

-- 6. Buat Diagnosis oleh Dokter
-- (Asumsikan ID Kunjungan adalah 1)
INSERT INTO public.diagnoses (visit_id, icd10_code, icd10_name, assessment, plan) VALUES
(1, 'R50.9', 'Fever, unspecified', 'Pasien mengalami demam, kemungkinan infeksi virus.', 'Istirahat cukup, minum banyak air, dan resep obat.');

-- 7. Buat Resep
-- (Asumsikan ID Kunjungan adalah 1)
INSERT INTO public.prescriptions (visit_id, status) VALUES (1, 'Baru');

-- 8. Tambah Item ke Resep
-- (Asumsikan ID Resep adalah 1, ID Paracetamol adalah 1)
INSERT INTO public.prescription_items (prescription_id, medicine_id, quantity, dosage_instruction) VALUES
(1, 1, 10, '3x1 sesudah makan jika demam');

-- 9. Buat Tagihan oleh Sistem
-- (Asumsikan ID Kunjungan adalah 1, biaya konsultasi 150rb, harga obat 10\*700=7000)
INSERT INTO public.payments (visit_id, total_amount, status) VALUES
(1, 157000, 'Belum Lunas');
