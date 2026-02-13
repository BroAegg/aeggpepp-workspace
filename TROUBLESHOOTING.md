# 🔧 Troubleshooting Guide

## ❌ "Invalid login credentials" Error

Jika Anda mendapatkan error ini saat mencoba login, kemungkinan besar karena **email belum dikonfirmasi**.

### Solusi: Confirm Email di Supabase Dashboard

#### ⚡ Solusi Tercepat: Disable Email Confirmation

**RECOMMENDED** untuk development - fix dalam 30 detik!

1. **Buka Supabase Dashboard**
   - Login ke [supabase.com/dashboard](https://supabase.com/dashboard)
   - Pilih project Anda

2. **Masuk ke Authentication Settings**
   - Di sidebar kiri, klik **"Authentication"**
   - Klik tab **"Providers"** di bagian atas
   - Scroll ke bawah cari **"Email"**

3. **Disable Email Confirmation**
   - Klik **"Email"** untuk expand
   - Cari setting **"Confirm email"**
   - **Toggle OFF** (matikan) switch **"Confirm email"**
   - Klik **"Save"** di bagian bawah

4. **Hapus User Lama & Buat Ulang**
   
   Karena user lama masih dalam status "unconfirmed", kita perlu buat ulang:
   
   ```bash
   # Di terminal, jalankan:
   cd "d:\Peppakuu\Our Project\aeggpepp-workspace"
   node scripts/recreate-users.mjs
   ```

5. **Test Login**
   - Buka http://localhost:3000/login
   - Email: `aegneru@gmail.com`
   - Password: `aeggpeppa2024`
   - **Seharusnya langsung masuk tanpa confirm email!** ✅

⚠️ **Note**: Untuk production nanti, sebaiknya enable kembali email confirmation untuk keamanan.

---

#### 🔄 Alternatif: Manual Confirm via SQL (Jika Tidak Bisa Akses UI)

Jika tombol "..." tidak muncul di UI atau ada rate limit, gunakan SQL langsung:

1. **Buka Supabase Dashboard** → **SQL Editor**

2. **Jalankan query ini untuk confirm semua user**:

```sql
-- Update auth.users to mark email as confirmed
UPDATE auth.users
SET 
  email_confirmed_at = NOW(),
  confirmed_at = NOW()
WHERE email IN ('aegneru@gmail.com', 'mevani2015@gmail.com')
  AND email_confirmed_at IS NULL;

-- Verify the update
SELECT 
  id,
  email,
  email_confirmed_at,
  created_at
FROM auth.users
WHERE email IN ('aegneru@gmail.com', 'mevani2015@gmail.com');
```

3. **Cek hasil query** - Jika `email_confirmed_at` sudah ada timestamp (bukan null), berarti berhasil!

4. **Test login**
   ```bash
   node scripts/confirm-users.mjs
   ```
   
   Output seharusnya:
   ```
   ✅ aegneru@gmail.com: Login successful!
   ✅ mevani2015@gmail.com: Login successful!
   ```

---

## 🚫 Auth Middleware Redirect Loop

Jika Anda mengalami infinite redirect ke `/login`:

### Penyebab
- Auth middleware (`src/middleware.ts`) sedang aktif
- Session tidak tersimpan dengan benar

### Solusi
1. Clear browser cookies & cache
2. Pastikan `.env.local` sudah benar (URL dan Anon Key valid)
3. Coba login di incognito/private window
4. Cek console browser untuk error Supabase

---

## 📸 Gallery Upload Error

Jika upload foto gagal:

### Solusi: Create Storage Bucket

1. **Buka Supabase Dashboard** → **Storage**
2. Klik **"Create bucket"**
3. **Bucket name**: `gallery`
4. **Public bucket**: ✅ **Yes** (centang)
5. Klik **"Create"**

### Verifikasi Policy

Pastikan bucket `gallery` memiliki policy:

```sql
-- Allow authenticated users to upload
create policy "Authenticated users can upload"
on storage.objects for insert
to authenticated
with check (bucket_id = 'gallery');

-- Allow everyone to read
create policy "Public read access"
on storage.objects for select
to public
using (bucket_id = 'gallery');

-- Allow users to delete own files
create policy "Users can delete own files"
on storage.objects for delete
to authenticated
using (bucket_id = 'gallery' AND auth.uid()::text = (storage.foldername(name))[1]);
```

---

## 🗄️ Database Migration Issues

Jika Anda mendapatkan error "table does not exist":

### Solusi: Run SQL Schema

1. **Buka Supabase Dashboard** → **SQL Editor**
2. Klik **"New query"**
3. Copy seluruh isi file `supabase-schema.sql`
4. Paste di SQL Editor
5. Klik **"Run"**

Atau run specific table:

```sql
-- Cek apakah table ada
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public';
```

---

## 🌐 Deployment to Vercel

### Environment Variables

Pastikan di Vercel Settings → Environment Variables, tambahkan:

```
NEXT_PUBLIC_SUPABASE_URL = https://isgefvbsvzllqfmxelod.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Build Error

Jika build gagal dengan TypeScript error:

```bash
# Local check
npm run build

# Jika ada error, fix dan commit ulang
git add .
git commit -m "fix: TypeScript errors"
git push
```

---

## 🔄 Reset Development Environment

Jika Anda ingin start fresh:

```bash
# 1. Clear node_modules & reinstall
rm -rf node_modules package-lock.json .next
npm install

# 2. Reset database (di Supabase Dashboard)
# SQL Editor → Run:
drop schema public cascade;
create schema public;
grant usage on schema public to postgres, anon, authenticated, service_role;

# 3. Re-run schema
# Copy paste dari supabase-schema.sql

# 4. Recreate users
node scripts/create-accounts.mjs

# 5. Confirm emails (manual di dashboard)

# 6. Restart dev server
npm run dev
```

---

## 📞 Need Help?

Jika masalah masih berlanjut:

1. **Check logs**:
   - Browser DevTools → Console
   - Browser DevTools → Network tab
   - Terminal output dari `npm run dev`

2. **Verify Supabase**:
   - Dashboard → Project Settings → API
   - Pastikan project URL & keys benar
   - Cek quota (free tier limits)

3. **Check PROJECT_CONTEXT.md**:
   - Dokumentasi lengkap ada di file ini
   - Mencakup schema, RLS policies, dan catatan development

---

**Last Updated**: February 14, 2026
