# Setup Avatar Storage di Supabase

## 🔧 Langkah Setup:

### 1. Jalankan SQL Migration

Buka **Supabase Dashboard** → **SQL Editor**, lalu run:

```sql
-- Copy paste semua isi file setup-avatar-storage.sql
```

### 2. Verifikasi Storage Bucket

1. Buka **Supabase Dashboard** → **Storage**
2. Pastikan bucket **"avatars"** sudah ada
3. Klik bucket "avatars" → **Policies**
4. Pastikan ada 4 policies:
   - ✅ Avatar images are publicly accessible (SELECT)
   - ✅ Users can upload their own avatar (INSERT)
   - ✅ Users can update their own avatar (UPDATE)
   - ✅ Users can delete their own avatar (DELETE)

### 3. Test Upload

1. Login ke aplikasi
2. Buka **Settings** page
3. Klik **"Choose Photo"**
4. Upload foto (max 2MB)
5. Buka **Console** browser (F12) → lihat log:
   ```
   Upload avatar - File: xxx.jpg Size: 12345 Type: image/jpeg
   Current profile: {...}
   Uploading file: [user-id]-[timestamp].jpg
   Upload success: {...}
   Public URL: https://[project-id].supabase.co/storage/v1/object/public/avatars/[filename]
   Profile updated: {...}
   Avatar uploaded successfully: [URL]
   ```

### 4. Troubleshooting

#### ❌ Error: "No file provided"
- Pastikan input file name="avatar"
- Cek apakah file ter-select dengan benar

#### ❌ Error: "new row violates row-level security policy"
- Bucket belum public, jalankan ulang SQL:
  ```sql
  update storage.buckets set public = true where id = 'avatars';
  ```

#### ❌ Error: "The resource already exists" 
- File dengan nama sama sudah ada
- Solusi: Hapus manual di Storage atau tunggu beberapa detik (kode pakai timestamp)

#### ❌ Upload berhasil tapi avatar tidak muncul
- **Sudah diperbaiki!** Halaman akan auto-refresh setelah upload
- Jika masih tidak muncul, cek:
  1. Apakah `avatar_url` ter-update di database? (Table Editor → profiles)
  2. Apakah URL bisa diakses? (Copy URL paste di browser)
  3. Cek Console browser untuk error

#### ❌ Error CORS
- Buka **Supabase** → **Storage** → **Configuration**
- Tambah allowed origins: `http://localhost:3000`, `https://your-domain.com`

### 5. Manual Check di Database

```sql
-- Cek avatar_url di profiles table
select id, display_name, avatar_url from profiles;

-- Cek files di storage
select * from storage.objects where bucket_id = 'avatars';
```

## 📸 Fitur Upload Avatar:

✅ Upload foto profil di Settings page  
✅ Preview sebelum upload  
✅ Auto-refresh setelah upload (sidebar & header update otomatis)  
✅ Delete avatar  
✅ Validasi: JPG, PNG, GIF, WebP (max 2MB)  
✅ Avatar ditampilkan di Sidebar & Header  
✅ Fallback ke emoji ⭐/🌙 jika belum upload  
✅ Console logging untuk debugging

## 📁 File yang Diubah:
- `src/lib/actions/auth.ts` - updateAvatar(), deleteAvatar() + logging
- `src/app/(dashboard)/settings/page.tsx` - UI upload + auto-refresh
- `src/components/layout/sidebar.tsx` - Tampilkan avatar
- `src/components/layout/header.tsx` - Tampilkan avatar
- `setup-avatar-storage.sql` - Setup Supabase Storage (FIXED policies)
