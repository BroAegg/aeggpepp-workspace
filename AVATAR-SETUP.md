# Setup Avatar Storage di Supabase

Setelah deployment, jalankan SQL file ini di Supabase SQL Editor:

```bash
# File: setup-avatar-storage.sql
```

## Cara Setup:

1. Buka Supabase Dashboard → SQL Editor
2. Copy paste isi file `setup-avatar-storage.sql`
3. Klik Run
4. Bucket "avatars" akan dibuat dengan policy RLS yang benar

## Fitur Upload Avatar:

✅ Upload foto profil di Settings page
✅ Preview sebelum upload
✅ Delete avatar
✅ Validasi: JPG, PNG, GIF, WebP (max 2MB)
✅ Avatar ditampilkan di Sidebar & Header
✅ Fallback ke emoji ⭐/🌙 jika belum upload

## Lokasi Perubahan:
- `src/lib/actions/auth.ts` - functions: updateAvatar(), deleteAvatar()
- `src/app/(dashboard)/settings/page.tsx` - UI upload avatar
- `src/components/layout/sidebar.tsx` - Tampilkan avatar
- `src/components/layout/header.tsx` - Tampilkan avatar
- `setup-avatar-storage.sql` - Setup Supabase Storage
