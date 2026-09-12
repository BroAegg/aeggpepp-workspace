-- ============================================================
-- RECEIPT SCANNER & ITEMS SYSTEM MIGRATION
-- AeggPepp Workspace - Supabase SQL Migration
-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/_/sql
-- ============================================================

-- 1. Tambah kolom pendukung di tabel transactions
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS sub_title TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS receipt_url TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'web'; -- 'web' | 'telegram'

-- Index untuk optimasi query
CREATE INDEX IF NOT EXISTS idx_transactions_sub_title
  ON transactions(sub_title)
  WHERE sub_title IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_source
  ON transactions(source);

-- 2. Buat tabel detail item struk belanja (receipt_items)
CREATE TABLE IF NOT EXISTS receipt_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE NOT NULL,
  item_name TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,
  unit_price DECIMAL(12,2),
  total_price DECIMAL(12,2) NOT NULL,
  category TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index foreign key
CREATE INDEX IF NOT EXISTS idx_receipt_items_transaction_id 
  ON receipt_items(transaction_id);

-- Enable RLS untuk receipt_items
ALTER TABLE receipt_items ENABLE ROW LEVEL SECURITY;

-- Policies: Semua user yang terautentikasi (Aegg & Peppaa) bisa melihat item struk
CREATE POLICY "Users can view receipt items"
  ON receipt_items FOR SELECT
  USING ( true );

-- Policy insert/update/delete receipt items
CREATE POLICY "Users can insert receipt items"
  ON receipt_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM transactions
      WHERE transactions.id = receipt_items.transaction_id
    )
  );

CREATE POLICY "Users can update receipt items"
  ON receipt_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM transactions
      WHERE transactions.id = receipt_items.transaction_id
    )
  );

CREATE POLICY "Users can delete receipt items"
  ON receipt_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM transactions
      WHERE transactions.id = receipt_items.transaction_id
    )
  );

-- 3. Setup Storage Bucket 'receipts' (Public)
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage Policies:
DROP POLICY IF EXISTS "Users can upload receipts" ON storage.objects;
CREATE POLICY "Users can upload receipts"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'receipts');

DROP POLICY IF EXISTS "Public can view receipts" ON storage.objects;
CREATE POLICY "Public can view receipts"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'receipts');

DROP POLICY IF EXISTS "Users can delete own receipts" ON storage.objects;
CREATE POLICY "Users can delete own receipts"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'receipts');
