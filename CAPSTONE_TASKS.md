# 🧭 AeggPepp Workspace — Master Capstone & Task Kiblat

> **KIBLAT UNTUK AI AGENT & DEVELOPER BARU**  
> File ini adalah sumber kebenaran tunggal (*single source of truth*) yang memuat seluruh riwayat pembangunan, status terkini, arsitektur teknis, dan checklist tugas dari awal hingga akhir.  
> **Instruksi untuk AI Agent**: BACA file ini terlebih dahulu sebelum mulai bekerja. Jangan analisis ulang seluruh folder kode agar hemat token. Setiap kali menyelesaikan tugas atau fase, **selalu perbarui status checkbox `[x]` di file ini dan lakukan Git commit & push ke GitHub!**

---

## 📌 1. Project Identity & Context

| Atribut | Detail |
|---|---|
| **Nama Project** | AeggPepp Workspace |
| **Deskripsi** | Personal Couple Productivity Dashboard (Notion-style) |
| **Target User** | **Aegg** (Fullstack Engineer 👨‍💻) & **Peppaa** (PM Game Developer 👩‍💼) |
| **Frontend Stack** | Next.js 14 (App Router), TypeScript, Tailwind CSS, Framer Motion, Lucide Icons, Zustand |
| **Backend & DB** | Supabase (PostgreSQL, Supabase Auth, Row Level Security, Storage Buckets) |
| **Automation** | N8N (Self-hosted / Cloud Railway) + Telegram Bot API |
| **AI Vision & Chat**| Google Gemini API (Vision OCR 2.0 Flash / Pro) |
| **Styling Rule** | Notion-like, semantic CSS variables (`hsl(var(--name))`), dark/light mode via `next-themes`. JANGAN hardcode warna Tailwind shade number (seperti `bg-blue-500` / `gray-700`). |

---

## 📜 2. Historical Progress (Phases 1–17 ✅ COMPLETED)

- [x] **Phase 1: Foundation** — Next.js 14, Tailwind config, Notion-style CSS tokens, custom UI components.
- [x] **Phase 2: Authentication** — Supabase Auth (Login/Register), role selection (Aegg/Peppaa), middleware auth guards.
- [x] **Phase 3: Dashboard Home** — Quick access grid, stats cards, recent activity feed.
- [x] **Phase 4: Calendar** — Monthly grid view, Indonesian holidays 2025–2027 integration (`holidays.ts`).
- [x] **Phase 5: Goals Initial** — Kanban board (Backlog, In Progress, Completed), basic task checklists.
- [x] **Phase 6: Gallery** — Photo grid & timeline, Supabase storage bucket, lightbox with inline caption edit & download.
- [x] **Phase 7: Portfolio & Wishlist** — Link showcase, wishlist with priority, partner purchase toggle, RLS shared updates.
- [x] **Phase 8: Finance Core** — Transactions CRUD, categories, budgets with progress bar, income vs expense charts.
- [x] **Phase 9: Todos System** — Todo list, status grouping, priorities, due date filters, cleanup cron.
- [x] **Phase 10: Settings & Theme** — Dark/Light theme toggle, profile editor, partner info card, password change.
- [x] **Phase 11: Security Hardening** — Full auth middleware enabled, goal tasks ownership checks, RLS policies.
- [x] **Phase 12: Data Integrity** — Month-filtered finance totals, NaN-safe savings rate, dynamic user profiles.
- [x] **Phase 13: Dynamic User Attribution** — Removed all hardcoded 'aegg'/'peppaa' strings, dynamic profile joins.
- [x] **Phase 14: Feature Completeness** — File upload validations (10MB image limit), dead server actions purged.
- [x] **Phase 15: Indonesian Calendar** — National, religious, and international special dates integrated with badges.
- [x] **Phase 16: Mobile UX Polish** — Touch device friendly, hover-only buttons made accessible on mobile.
- [x] **Phase 17: Codebase Clean & Security** — 
  - Purged redundant root SQL migration scripts.
  - Fixed credentials leak in `.env.local.example`.
  - Removed deprecated Ramadan temporary modules for lean codebase.
  - TypeScript compilation verified 100% clean (`tsc --noEmit`).
  - Cloned and configured 9Router at `D:\Peppakuu\Our Project\9Router` for local token saving.

---

## 🚀 3. Grand Roadmap: Tasks Kiblat (Phases 18–23)

```
[Phase 18: N8N & Telegram Setup] 
            ↓
[Phase 19: Gemini OCR Receipt Scanner] 
            ↓
[Phase 20: Web Dashboard Receipt View & Upload] 
            ↓
[Phase 21: Financial Health Engine & Alerts] 
            ↓
[Phase 22: AI Financial Advisor Chat & Telegram Digest] 
            ↓
[Phase 23: Notion-like Goals Overhaul (Side Peek + Sub-pages)]
```

---

### 🟢 PHASE 18: Telegram Bot + N8N Cloud Setup (In Progress ⏳)
**Target**: Bot Telegram siap menerima pesan & foto, terhubung ke N8N yang aktif 24/7 di Cloud.

- [ ] **18.1** Buat Bot Telegram baru via `@BotFather` (Simpan Bot Token ke tempat aman).
- [ ] **18.2** Jalankan SQL Migration `setup-receipts-system.sql` di Supabase SQL Editor:
  - Tabel `receipt_items` dibuat.
  - Kolom `receipt_url`, `sub_title`, `source` pada `transactions` ditambahkan.
  - Storage bucket `receipts` disiapkan.
- [ ] **18.3** Deploy N8N di cloud gratis (Railway template / Render):
  - Setup environment variables & public URL HTTPS.
- [ ] **18.4** Import workflow `n8n-receipt-workflow-template.json` ke dashboard N8N.
- [ ] **18.5** Hubungkan kredensial Telegram Bot Token & Supabase Service Role Key di N8N.
- [ ] **18.6** Test webhook trigger dengan kirim chat teks pertama dari Telegram ke Bot.

---

### 🟢 PHASE 19: AI OCR Receipt & Expense Parser Engine
**Target**: Foto struk belanja & pesan teks di Telegram otomatis diekstrak menjadi data terstruktur dan masuk ke database Supabase.

- [ ] **19.1** Setup Google Gemini API Key (Gemini 2.0 Flash) di N8N.
- [ ] **19.2** Implementasi Image Downloader node di N8N (download binary foto struk resolusi penuh dari Telegram).
- [ ] **19.3** Konfigurasi Gemini Vision Prompt untuk struk fisik Indonesia (Indomaret, Alfamart, Supermarket, Resto, SPBU):
  - Ekstraksi: Nama merchant/toko, tanggal belanja, kategori, total bayar.
  - Ekstraksi array item: `[ { name, quantity, unit_price, total_price } ]`.
- [ ] **19.4** Konfigurasi Text Parser node untuk input cepat (contoh: *"Makan siang Padang 35rb"* atau *"Bensin Shell 100rb"*).
- [ ] **19.5** Insert data ke Supabase:
  - Record utama masuk ke tabel `transactions` (`type = 'expense'`, `source = 'telegram'`).
  - Rincian item masuk ke tabel `receipt_items`.
  - Foto struk diunggah ke Supabase Storage bucket `receipts`.
- [ ] **19.6** Telegram Confirmation Reply: Bot membalas dengan struk digital rapi format Markdown + ringkasan item.

---

### 🟢 PHASE 20: Web Dashboard Finance — Receipt Items & Gallery View
**Target**: Pengguna bisa melihat rincian isi struk belanja langsung di web dashboard AeggPepp.

- [ ] **20.1** Server Actions: Buat `src/lib/actions/receipts.ts`:
  - `getReceiptItems(transactionId)` — Ambil daftar barang belanja per transaksi.
  - `uploadReceiptPhoto(file, transactionId)` — Upload struk manual via web.
- [ ] **20.2** Modal / Drawer Detail Struk (`receipt-detail-modal.tsx`):
  - Klik transaksi di Ledger Tab → Buka rincian struk (foto struk asli + tabel item belanja).
- [ ] **20.3** Direct Web Upload: Tombol "Scan / Upload Struk" langsung di halaman Finance web (alternatif selain Telegram).
- [ ] **20.4** Filter transaksi berdasarkan `source`: All / Web / Telegram.

---

### 🟢 PHASE 21: Financial Health Score Engine & Smart Alerts
**Target**: Algoritma cerdas yang mendeteksi pola keuangan tidak sehat dan memberi peringatan proaktif.

- [ ] **21.1** Buat modul kalkulator kesehatan keuangan `src/lib/financial-health.ts`:
  - **Health Score (0–100)** berdasarkan rasio tabungan, kebutuhan pokok vs gaya hidup.
  - **Savings Rate Ratio**: `(Income - Expense) / Income`. (Sehat jika >= 20%).
  - **Expense to Income Ratio**: Bahaya jika > 70%.
  - **Couple Spending Imbalance**: Deteksi ketimpangan pengeluaran partner.
- [ ] **21.2** Smart Alert Rules:
  - Peringatan jika kategori tertentu melonjak drastis (>140% dibanding bulan lalu).
  - Peringatan jika sisa budget bulanan habis sebelum pertengahan bulan.
  - Notifikasi transaksi tunggal tidak wajar (anomali spending).
- [ ] **21.3** UI Widget Kesehatan Finansial di `/finance`:
  - Kartu skor kesehatan visual, rekomendasi perbaikan instan, dan status badge (Sehat / Waspada / Kritis).

---

### 🟢 PHASE 22: AI Financial Advisor Chatbot & Telegram Digest
**Target**: AI Partner di dalam web yang bisa diajak diskusi strategi keuangan + ringkasan mingguan via Telegram.

- [ ] **22.1** Server Action AI Advisor `src/lib/actions/finance-ai.ts`:
  - Integrasi Gemini API dengan konteks riil pengeluaran, pemasukan, kategori, dan target tabungan Aegg & Peppaa.
- [ ] **22.2** Halaman Chat Advisor interaktif:
  - Routing: `src/app/(dashboard)/finance/advisor/page.tsx`.
  - Streaming UI chat, rekomendasi prompt cepat ("Gimana cara hemat 2jt bulan depan?", "Analisis pengeluaran makan kita").
- [ ] **22.3** Automated Weekly Digest (N8N Cron):
  - Setiap hari Minggu malam, N8N merangkum total spending 7 hari terakhir.
  - Kirim ringkasan & tips cerdas ke chat Telegram Aegg & Peppaa.

---

### 🟢 PHASE 23: Notion-like Goals Overhaul (Ref: GOALS-OVERHAUL-PLAN.md)
**Target**: Merombak Goals dari Kanban sederhana menjadi project management setara Notion.

- [ ] **23.1** View Toggle: Switch antara Table View dan Kanban View.
- [ ] **23.2** Notion Table View: Nomor, Judul Goal + Icon, Status, Priority, Tags, Due Date.
- [ ] **23.3** Side Peek Panel: Klik baris goal → panel slide-in dari kanan tanpa reload halaman.
- [ ] **23.4** Sub-Pages System: Bisa membuat page di dalam page (`goal_pages`).
- [ ] **23.5** Rich Text Block Editor: Integrasi Novel / Block Editor untuk catatan detail di dalam Goal.

---

## 🛠️ 4. Aturan Kerja AI Agent Berikutnya (Coding Guidelines)

1. **JANGAN Menghapus File Tanpa Perintah**: Konsultasikan file yang hendak dihapus.
2. **JANGAN Hardcode User**: Selalu gunakan relasi dinamis ke tabel `profiles` via `user_id`.
3. **Selalu Lakukan Verifikasi**: Jalankan `npx tsc --noEmit` sebelum menyelesaikan sesi untuk memastikan tidak ada TypeScript error.
4. **Update File Ini**: Tandai tugas yang selesai dengan `[x]` dan update tanggal di bagian footer.
5. **Git Push**: Setelah setiap pencapaian penting, commit dengan pesan deskriptif dan push ke remote repository (`origin main`).

---

*Terakhir diperbarui: 13 September 2026*  
*Pembuat: Aegg & Antigravity AI*
