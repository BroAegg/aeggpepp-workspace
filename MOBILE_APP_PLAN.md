# 📱 AeggPepp Mobile App — Master Architecture & Implementation Plan

> **Dokumen Arsitektur & Rencana Pembangunan Aplikasi Mobile Native**  
> Pasangan: **Aegg** (Fullstack Engineer 👨‍💻) & **Peppaa** (Game Dev PM 👩‍💼)  
> Stack: **React Native (Expo SDK 52) + TypeScript + Supabase + Android Studio SDK**  
> Status: **Ready for Execution** 🚀

---

## 🎯 1. Visi & Filosofi Aplikasi
* **100% Native Feel (120 FPS)**: Bukan sekadar WebView dibungkus browser, melainkan aplikasi native murni dengan animasi halus, gesture swipe, dan transisi tanpa lag.
* **Game Feel & Micro-Interactions**: Dilengkapi *Haptic Feedback* (getaran mikro saat mencentang tugas/RSVP) yang disukai standar Game Dev.
* **One Single Truth Database**: Terhubung langsung ke database PostgreSQL Supabase yang sudah aktif (Web & Mobile tersinkronisasi 100% secara real-time via WebSocket RLS).
* **Anti-Ribet & Cepat**: Buka aplikasi dengan Fingerprint / Face ID dalam 0.2 detik, input pengeluaran langsung dengan keypad numerik instan.

---

## 🏗️ 2. Arsitektur Repositori & Monorepo

Struktur direktori di dalam repositori `aeggpepp-workspace`:

```
aeggpepp-workspace/
├── src/                      # 🌐 Web Dashboard (Next.js 14 App Router)
│   ├── app/
│   ├── components/
│   ├── stores/
│   └── types/
├── mobile/                   # 📱 Native Mobile App (React Native Expo)
│   ├── assets/               # Logo, App Icon & Splash Screen (Aset dari Peppaa)
│   ├── src/
│   │   ├── api/              # Supabase Client & Queries
│   │   ├── components/       # Native UI Components (Button, Card, BottomSheet)
│   │   ├── navigation/       # React Navigation (Bottom Tabs & Stacks)
│   │   ├── screens/          # Halaman Aplikasi
│   │   │   ├── auth/         # Login, Register, Biometric Setup
│   │   │   ├── home/         # Dashboard & Couple Glance Widget
│   │   │   ├── wedding/      # Budget 25jt, Guest RSVP, Rundown
│   │   │   ├── finance/      # Quick Expense, Ledger, Budgets
│   │   │   ├── todos/        # Daily Tasks & Shopping Checklist
│   │   │   └── settings/     # Profile, Partner View, Security
│   │   ├── stores/           # Zustand Mobile Store (Offline Cached)
│   │   └── theme/            # Semantic Notion-like Colors & Typography
│   ├── app.json              # Konfigurasi Expo & Android Package
│   ├── package.json
│   └── tsconfig.json
├── CAPSTONE_TASKS.md         # 🧭 Master Kiblat Progress Project
└── setup-wedding-system.sql  # 🗄️ Database Migrations
```

---

## 🎨 3. Integrasi Branding & Aset Logo Peppaa

Sambil menunggu Peppaa menyelesaikan master desain logo, slot aset di folder `mobile/assets/` disiapkan sebagai berikut:

| Nama File | Dimensi | Fungsi | Catatan Desain Peppaa |
|---|---|---|---|
| `icon.png` | 1024 × 1024 px | Master App Icon (iOS & Play Store) | PNG transparan / solid |
| `adaptive-icon.png` | 1024 × 1024 px | Android Adaptive Icon | Safe Zone di tengah lingkaran (~70% radius) |
| `splash.png` | 1284 × 2778 px | Native Splash Screen saat app dibuka | Background gelap (`#09090b`) + Logo elegan di tengah |
| `favicon.png` | 192 × 192 px | Web / PWA fallback | Icon minimalis |

---

## 📱 4. Fitur Utama di Aplikasi Mobile

### 💍 4.1 Wedding Hub Mobile (Prioritas Utama)
1. **Target 25 Juta Visual Gauge**: Progress bar real-time sisa budget vs pengeluaran riil.
2. **Vendor Quick Contact**: Tombol 1-tap panggil / kirim pesan WhatsApp ke vendor (Katering, MUA, KUA, Dokumentasi, Cincin).
3. **Guest List 50–100 Pax**: Swipe-to-RSVP dengan getaran haptik, filter kelompok (Keluarga Aegg, Keluarga Peppaa, Teman, VIP), dan tombol WhatsApp blast otomatis.
4. **Hari-H Rundown Card**: Mode hari-H layar penuh yang menampilkan sesi aktif saat ini dan PIC bertugas.

### 💰 4.2 Quick Expense Native Drawer (Kasir-Ready)
* Numpad khusus satu tangan: Ketik angka → Pilih kategori (Makan, Belanja, Bensin, Wedding) → Simpan dalam 3 detik.
* Pilihan sumber transaksi: Tunai, Rekening, atau e-Wallet.

### ✅ 4.3 Tasks & Belanja Bersama (Todos)
* Checklist interaktif dengan efek suara mikro & getaran *haptic tick*.
* Sinkronisasi instan saat kamu atau pasanganmu mencentang daftar belanjaan.

### 🔒 4.4 Keamanan Biometrik
* Dukungan Fingerprint / Face ID via `expo-local-authentication`.
* Sesi login tersimpan aman di Android Keystore / iOS Keychain (`expo-secure-store`).

---

## 🛠️ 5. Pemanfaatan Android Studio SDK Lokal

Lingkungan kerja lokal kamu sudah memiliki:
* **Android SDK Path**: `C:\Users\Aegner\AppData\Local\Android\Sdk`
* **ADB Tools**: `C:\Users\Aegner\AppData\Local\Android\Sdk\platform-tools\adb.exe`
* **Build System**: Bisa dijalankan langsung ke HP fisik via kabel USB / WiFi debugging:
  ```bash
  # Menjalankan di HP Android fisik via ADB
  npx expo run:android
  ```
* **Build APK Standalone**:
  Dapat menghasilkan file `.apk` mandiri yang bisa diinstal di HP calon istri tanpa perlu lewat Google Play Store.

---

## 🚀 6. Roadmap Pengerjaan Bertahap

```
[Fase M1: Setup Boilerplate Expo di folder mobile/]
                       ↓
[Fase M2: Koneksi Supabase SDK & Auth Biometrik]
                       ↓
[Fase M3: Wedding Hub Mobile Screen (25jt & RSVP)]
                       ↓
[Fase M4: Quick Expense & Todos Mobile Screen]
                       ↓
[Fase M5: Pemasangan Logo Peppaa & Generate APK Pertama]
```

- [ ] **M1.1**: Inisialisasi Expo TypeScript di `mobile/`.
- [ ] **M1.2**: Konfigurasi `app.json` (Nama: `AeggPepp`, Package: `com.broaegg.aeggpepp`).
- [ ] **M1.3**: Setup Supabase client di mobile dengan `expo-secure-store`.
- [ ] **M2.1**: Buat navigasi Bottom Tabs (Home, Wedding, Finance, Todos, Settings).
- [ ] **M2.2**: Pasang tema warna dark/light konsisten dengan web.
- [ ] **M3.1**: Bangun layar Wedding Preparation (Budget, Guests, Rundown).
- [ ] **M3.2**: Pasang gesture haptik pada RSVP toggle.
- [ ] **M4.1**: Bangun layar Quick Expense numpad.
- [ ] **M5.1**: Ganti aset icon & splash screen dengan hasil karya Peppaa.
- [ ] **M5.2**: Build release APK perdana untuk HP Aegg & Peppaa.
