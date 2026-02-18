-- ============================================================
-- RECEIPTS STORAGE + SUB_TITLE MIGRATION
-- Jalankan di Supabase SQL Editor
-- ============================================================

-- 1. Tambah kolom sub_title pada tabel transactions
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS sub_title TEXT DEFAULT NULL;

-- 2. Index untuk pencarian recap by sub_title
CREATE INDEX IF NOT EXISTS idx_transactions_sub_title
  ON transactions(sub_title)
  WHERE sub_title IS NOT NULL;

-- 3. Buat bucket 'receipts' (public)
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', true)
ON CONFLICT (id) DO NOTHING;

-- 4. RLS Policy: anyone authenticated bisa upload ke folder mereka sendiri
CREATE POLICY "Users can upload receipts"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'receipts' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- 5. RLS Policy: semua orang bisa lihat struk (public read)
CREATE POLICY "Public can view receipts"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'receipts');

-- 6. RLS Policy: pemilik bisa delete struk miliknya
CREATE POLICY "Users can delete own receipts"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'receipts' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- 7. RLS Policy: pemilik bisa update (replace) struk miliknya
CREATE POLICY "Users can update own receipts"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'receipts' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );
