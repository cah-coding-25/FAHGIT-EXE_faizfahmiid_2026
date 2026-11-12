# Changelog — FAHGIT by Faiz_Fahmi_ID

Semua perubahan penting pada proyek **FAHGIT** didokumentasikan dalam berkas ini.
Format ini mengacu pada [Keep a Changelog](https://keepachangelog.com/id/1.0.0/) dan proyek ini mematuhi [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] - 2026-11-12

### 🚀 Peluncuran Perdana (Initial Official Release)

### ADDED
- **Platform Pengelola Repositori & Berkas GitHub**:
  - Transformasi website ke aplikasi desktop Windows menggunakan Electron dengan desain Semi-Dark & Light Claymorphism.
  - Penjelajah Berkas & Editor Kode Monaco terintegrasi dalam satu layar dengan pratinjau Markdown & HTML sandbox serta pemformat JSON otomatis.
- **Mesin Klon Repositori GitHub (Repo Cloner)**:
  - Kolom tempel tautan repositori sumber (`https://github.com/owner/repo`, `owner/repo`, `.git`) dengan pratinjau metadata.
  - Pilihan tujuan fleksibel: buat repositori baru otomatis atau klon ke repositori pribadi yang sudah ada.
  - Indikator progres persentase real-time (0% - 100%) dan commit atomik via Git Database API.
- **Pusat Unggah & Ekstraksi ZIP Langsung**:
  - Dukungan unggah berkas tunggal/banyak, folder bertingkat, Drag & Drop, serta ekstraksi ZIP otomatis.
  - Penghapusan folder pembungkus luar secara otomatis sehingga berkas dan sub-folder di dalam ZIP maupun folder langsung masuk ke root repositori tujuan.
- **Identitas & Aset Aplikasi Resmi**:
  - Ikon Windows `.ico` multi-resolusi resmi, ikon PNG 512x512, dan profil pengembang **Faiz Fahmi (Faiz_Fahmi_ID)**.
  - Pintasan keyboard desktop (`F12` / `Ctrl+Shift+I` untuk Developer Tools dan `Ctrl+R` untuk Reload).
- **Tiga Format Distribusi Windows**:
  1. `FAHGIT-Setup-1.0.0.exe` (Installer resmi NSIS).
  2. `FAHGIT-Portable-1.0.0.exe` (Biner portabel single-file).
  3. `FAHGIT-win-unpacked.zip` (Folder aplikasi siap pakai).

### OFFLINE & ONLINE ADAPTIVE (5-TIER)
- **Full Offline**: Editor Monaco, pratinjau Markdown/HTML, analisis & ekstraksi ZIP, format JSON, tema, dan log lokal berjalan 100% tanpa internet.
- **Deteksi Jaringan Cerdas**: Heartbeat ping GitHub API (`/zen`) dengan *exponential backoff* dan banner status adaptif.
- **Pembaruan Aplikasi Ketat (Strict Startup Auto-Update)**:
  - Pemeriksaan pembaruan berjalan hanya satu kali saat aplikasi pertama kali dibuka.
  - Hanya menampilkan notifikasi apabila terdapat rilis resmi terbaru dengan versi SemVer lebih tinggi daripada `v1.0.0`.

### SECURITY
- **Zero Token Leakage**: Token PAT terenkripsi AES-GCM 256-bit di penyimpanan lokal browser dengan PBKDF2 100.000 iterasi.
- **Isolasi Konteks Desktop**: Mempertahankan `contextIsolation: true`, `nodeIntegration: false`, dan IPC whitelist terbatas.
