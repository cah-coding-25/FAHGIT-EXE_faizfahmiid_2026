# FAHGIT by: Faiz_Fahmi_ID
> **FAH UNIVERSAL WEBSITE TO WINDOWS APPLICATION ENGINE WITH PERMANENT AUTO UPDATE SYSTEM**  
> *Your GitHub. Your Files. Your Control.*  
> **Versi:** 1.0.0 | **Author:** Faiz_Fahmi_ID

---

## 1. Arsitektur & Gambaran Umum FAHGIT Desktop
**FAHGIT** adalah aplikasi desktop Windows dan platform web manajemen repository GitHub modern yang dibangun dengan arsitektur **Offline-First**, runtime **Electron**, dan sistem **Permanent Auto Update** terintegrasi langsung dengan GitHub Releases.

Aplikasi ini mendistribusikan tiga output Windows siap pakai:
1. **Windows EXE Installer (`FAHGIT-Setup-1.0.0.exe`)**: NSIS installer resmi dengan custom install directory, uninstaller bersih, desktop & start menu shortcut, serta registry hygiene.
2. **Windows EXE Portable (`FAHGIT-Portable-1.0.0.exe`)**: Standalone binary tanpa instalasi, menyimpan state dan cache di direktori user lokal tanpa mengotori registry.
3. **Windows Unpacked Application (`release/win-unpacked/` & `FAHGIT-win-unpacked.zip`)**: Binary terekstrak siap dijalankan atau di-debug langsung.

---

## 2. Klasifikasi Sistem Online & Offline Adaptif (5-Tier)

FAHGIT menerapkan engine adaptif 5-tier untuk menangani kondisi jaringan secara tangguh tanpa pernah membuat aplikasi crash atau menampilkan layar kosong:

| Tier | Klasifikasi | Cakupan Fitur | Perilaku Saat Offline |
| :--- | :--- | :--- | :--- |
| **1** | **FULL OFFLINE** | Local Code Editor (Monaco), JSON Formatter, Local Markdown & HTML sandbox preview, ZIP archive inspection & extraction, Pengaturan tema, audit logs lokal. | Berjalan 100% normal tanpa membutuhkan jaringan internet. |
| **2** | **ONLINE REQUIRED** | Cloning/Fetching remote repository, listing remote branches, creating remote repository, remote atomic Git commits. | Dijeda dengan indikator visual ramah pemula; pengguna diberitahu fitur memerlukan koneksi GitHub. |
| **3** | **OFFLINE WITH LOCAL FALLBACK** | Pengecekan status repository & file browsing. | Membaca struktur file dan konten dari snapshot cache lokal (`IndexedDB` / `localStorage`). |
| **4** | **ONLINE SYNC** | Antrean perubahan file lokal & upload batch. | Disimpan ke **Offline Action Queue** lokal. Ketika koneksi pulih, aplikasi mengecek kesehatan API GitHub dan mensinkronkan antrean secara aman tanpa duplikasi aksi. |
| **5** | **LOCAL DATA** | Kredensial PAT terenkripsi (AES-GCM 256-bit), preferensi tema, file draf editor, riwayat cache. | Tersimpan aman di IndexedDB `fahgit_local_db` di sandbox lokal browser/Electron. |

### Deteksi Koneksi & Reconnection Engine
- **Dual Verification**: Deteksi event `navigator.onLine` dikombinasikan dengan active heartbeat ping ke endpoint ringan GitHub API (`https://api.github.com/zen`).
- **Exponential Backoff**: Reconnection polling dimulai dari interval 2 detik hingga maksimum 30 detik dengan jitter untuk menghindari request storming.
- **Offline Banner**: Notifikasi non-intrusif di bagian atas antarmuka menjelaskan status koneksi, fitur lokal yang tetap aktif, dan antrean sinkronisasi.

---

## 3. Sistem Permanent Auto-Update Terintegrasi

Aplikasi desktop dilengkapi dengan auto-update permanen dari GitHub Releases:
- **Penyedia**: GitHub Releases (`ghfghjk94-hash/fahgirexe_update`).
- **Pengecekan Otomatis**: Dilakukan secara ketat hanya **satu kali saat aplikasi pertama kali dibuka** dan hanya menampilkan modal apabila terdapat versi SemVer baru di atas `v1.0.0`.
- **Modal Interaktif Wajib**:
  - Menampilkan nama aplikasi: `FAHGIT by: Faiz_Fahmi_ID`.
  - Versi saat ini vs Versi terbaru yang tersedia.
  - Tanggal rilis dan ukuran unduhan (MB).
  - Catatan rilis lengkap (Changelog).
  - Tiga tombol aksi wajib:
    - **`UPDATE SEKARANG`**: Mengunduh pembaruan di latar belakang dengan progress bar real-time.
    - **`LEWATI`**: Mengabaikan versi ini hingga versi berikutnya dirilis.
    - **`SILANG (X)`**: Menutup modal sementara dan mengingatkan kembali nanti.
  - Setelah unduhan selesai, tombol berganti menjadi **`RESTART & PASANG SEKARANG`**.

---

## 4. Keamanan Desktop (Security Hardening)
- `contextIsolation = true`: Mengisolasi renderer process dari konteks internal Node.js.
- `nodeIntegration = false`: Mencegah eksekusi script arbitrary mengakses file system Node.js secara langsung.
- `sandbox = true`: Menjalankan renderer dalam sandbox browser Chromium.
- **Preload API Terbatas (`contextBridge`)**: Hanya mengekspos kanal IPC whitelist (`desktop:check-updates`, `desktop:start-download`, `desktop:install-update`, `desktop:open-external`).
- **External URL Safety**: Semua tautan eksternal (dokumentasi, GitHub profile, settings) dibuka menggunakan default web browser Windows bawaan pengguna (`shell.openExternal`).
- **Zero Token Leakage**: GitHub Personal Access Token tidak pernah diekspos melalui IPC atau telemetry.

---

## 5. Perintah Menjalankan & Membangun Distribusi Windows

### Development (Web + Electron)
```bash
# Menjalankan Vite Web Dev Server (Port 3000)
npm run dev

# Menjalankan Electron Desktop App dalam mode Development
npm run electron:dev
```

### Build Web Renderer
```bash
npm run build
```

### Build Distribusi Windows Lengkap
```bash
# Membangun Installer (NSIS), Portable EXE, dan Unpacked Directory sekaligus:
npm run dist:win

# Hanya membangun Windows NSIS Installer (FAHGIT-Setup-1.0.0.exe):
npm run dist:nsis

# Hanya membangun Windows Portable EXE (FAHGIT-Portable-1.0.0.exe):
npm run dist:portable

# Hanya menghasilkan Unpacked Directory (release/win-unpacked/):
npm run dist:unpacked
```

Semua output instalasi dan biner Windows akan tersimpan rapi di direktori `/release`.

---

## 6. GitHub Actions CI/CD Release Automation
Workflow CI/CD tersedia di `.github/workflows/build-release.yml`:
1. Memicu build otomatis saat tag git dibuat (contoh: `git tag v1.0.0 && git push origin v1.0.0`) atau via tombol *Run workflow* di GitHub Actions tab.
2. Melakukan checkout, setup Node.js 20, dan instalasi dependensi.
3. Menjalankan linter dan build Vite renderer.
4. Menjalankan `electron-builder` pada runner `windows-latest`.
5. Mengompresi unpacked folder menjadi `FAHGIT-win-unpacked.zip`.
6. Menghasilkan checksum SHA-256 untuk seluruh artefak release (`checksums.sha256`).
7. Mempublikasikan GitHub Release baru secara otomatis berisi:
   - `FAHGIT-Setup-1.0.0.exe`
   - `FAHGIT-Portable-1.0.0.exe`
   - `FAHGIT-win-unpacked.zip`
   - `checksums.sha256`
   - Catatan rilis dari `CHANGELOG.md`.

---

## 7. Versioning & Changelog
Proyek ini mengikuti standar **Semantic Versioning (SemVer)**: `MAJOR.MINOR.PATCH`.
Setiap rilis didokumentasikan secara rinci di file `CHANGELOG.md`.

---
**FAHGIT by: Faiz_Fahmi_ID**  
*Your GitHub. Your Files. Your Control.*
