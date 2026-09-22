-- =========================================================================
-- AEGGPEPP WORKSPACE: RESET ALL WORKSPACE DATA (KEEP PROFILES & LOGINS)
-- Jalankan skrip ini di Supabase SQL Editor:
-- Dashboard -> SQL Editor -> New Query -> Run
-- =========================================================================

-- 1. Transaksi & Keuangan
truncate table if exists transactions cascade;
truncate table if exists budgets cascade;
truncate table if exists savings_accounts cascade;

-- 2. Tugas & Kategori
truncate table if exists todo_tasks cascade;
truncate table if exists todos cascade;
truncate table if exists todo_categories cascade;

-- 3. Target & Halaman Target (Goals)
truncate table if exists goal_pages cascade;
truncate table if exists goal_tasks cascade;
truncate table if exists goals cascade;

-- 4. Kalender & Agenda
truncate table if exists events cascade;

-- 5. Catatan, Wishlist, Galeri & Portfolio
truncate table if exists activity_logs cascade;
truncate table if exists gallery cascade;
truncate table if exists wishlist cascade;
truncate table if exists portfolio_links cascade;

-- Catatan:
-- Akun login (auth.users) dan Profil (profiles) TETAP AMAN terjaga,
-- sehingga kalian berdua tidak perlu registrasi ulang.
