# 🔧 FIX GUIDE - Goals & Gallery Error

## ❌ Error yang Terjadi:
1. **Goals**: "Could not find the 'tag' column of 'goals' in the schema cache"
2. **Gallery**: "Upload failed: new row violates row-level security policy"

## ✅ Solusi Lengkap:

### STEP 1: Fix Database Schema

1. **Buka Supabase Dashboard** → `https://supabase.com/dashboard`
2. **Pilih project** → `aeggpepp-workspace`
3. **Klik SQL Editor** (icon ⚡ di sidebar kiri)
4. **Copy paste** isi file `fix-database.sql` ke editor
5. **Klik RUN** (atau tekan Ctrl+Enter)
6. ✅ Tunggu sampai muncul "Success. No rows returned"

---

### STEP 2: Create Storage Bucket 'gallery'

1. **Buka Supabase Dashboard** → Storage (icon 🗄️ di sidebar)
2. **Klik "New Bucket"**
3. Isi form:
   - **Name**: `gallery`
   - **Public bucket**: ✅ **ON** (PENTING!)
   - Klik **Create Bucket**

---

### STEP 3: Set Storage Policies

1. **Klik bucket** `gallery` yang baru dibuat
2. **Klik tab "Policies"** di atas
3. **Klik "New Policy"** → pilih "For full customization"

#### Policy 1: SELECT (view)
```
Policy name: Public gallery access
Allowed operation: SELECT
Target roles: public
WITH CHECK expression: (kosongkan)
USING expression: bucket_id = 'gallery'
```

#### Policy 2: INSERT (upload)
```
Policy name: Authenticated users can upload
Allowed operation: INSERT
Target roles: authenticated
WITH CHECK expression: bucket_id = 'gallery'
USING expression: (kosongkan)
```

#### Policy 3: UPDATE (edit)
```
Policy name: Users can update own files
Allowed operation: UPDATE
Target roles: authenticated
WITH CHECK expression: bucket_id = 'gallery' AND (storage.foldername(name))[1] = auth.uid()::text
USING expression: bucket_id = 'gallery' AND (storage.foldername(name))[1] = auth.uid()::text
```

#### Policy 4: DELETE (hapus)
```
Policy name: Users can delete own files
Allowed operation: DELETE
Target roles: authenticated
WITH CHECK expression: (kosongkan)
USING expression: bucket_id = 'gallery' AND (storage.foldername(name))[1] = auth.uid()::text
```

---

### STEP 4: Restart Dev Server

```bash
# Stop server (Ctrl+C di terminal)
# Clear cache
Remove-Item -Recurse -Force .next

# Start ulang
npm run dev
```

---

### STEP 5: Test

1. **Buka** http://localhost:3001/goals
2. **Klik New Goal** → isi form → **Create**
   - ✅ Seharusnya berhasil sekarang!

3. **Buka** http://localhost:3001/gallery
4. **Klik Upload Photo** → pilih foto → **Upload**
   - ✅ Seharusnya berhasil!

---

## 📝 Catatan Penting:

- **Jangan skip** Step 2 & 3 - tanpa Storage Bucket + Policies, Gallery **pasti** error
- Kalau masih error **"bucket not found"** → refresh Supabase Dashboard, tunggu 30 detik
- Kalau masih error **RLS policy** → double check policies di Step 3

---

## 🆘 Troubleshooting:

### Kalau Goals masih error:
```sql
-- Run di Supabase SQL Editor untuk cek kolom:
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'goals';
```
Pastikan ada kolom `tag` dengan type `text`.

### Kalau Gallery masih error:
- Cek apakah bucket `gallery` ada di Storage
- Cek apakah bucket `gallery` di-set **Public**
- Cek apakah semua 4 policies sudah dibuat

---

**Setelah semua step selesai, Goals & Gallery akan work! 🎉**
