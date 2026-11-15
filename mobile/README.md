# [FROZEN] Mobile Expo Subproject

> **STATUS: DIBEKUKAN / INACTIVE (ARCHIVED)**  
> Tanggal Pembekuan: November 2026  
> Keputusan Arsitektur: Unified PWA + WhatsApp AI Assistant (Nanang)

Folder `mobile/` ini merupakan eksperimen awal aplikasi mobile React Native / Expo. Demi efisiensi operasional harian, integritas tipe data, dan menghindari beban pemeliharaan dual-codebase yang rentan *drift*, pengembangan native app dibekukan secara resmi.

---

### Alur Kerja Produksi Pengganti (Lebih Praktis & Ringan):
1. **Next.js 14 Progressive Web App (PWA):**
   - Akses URL aplikasi di Safari (iOS) atau Chrome (Android).
   - Tekan tombol **"Add to Home Screen" / "Tambahkan ke Layar Utama"**.
   - Aplikasi berjalan dalam mode layar penuh *standalone*, hemat memori, mendukung caching offline, dan 100% selalu tersinkronisasi dengan perubahan fitur terbaru.
2. **WhatsApp Bot Mandiri (Nanang Service di VPS):**
   - Pencatatan transaksi kilat via foto struk (Vision AI OCR) atau pesan chat langsung via WhatsApp.
   - Tidak perlu membuka aplikasi untuk sekadar mencatat pengeluaran di kasir atau perjalanan.

Jika di masa depan diperlukan build APK/IPA mandiri, kode di folder ini dapat dijadikan referensi komponen dasar.
