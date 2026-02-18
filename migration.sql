-- Run this in your Supabase SQL Editor

-- 1. Add receipt_url column to transactions table if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'receipt_url') THEN
        ALTER TABLE transactions ADD COLUMN receipt_url TEXT;
    END IF;
END $$;

-- 2. Create storage bucket for receipts (if it doesn't exist)
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Policy to allow authenticated users to upload receipts
-- Drop first to avoid "policy already exists" error
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'receipts');

-- 4. Policy to allow everyone to view receipts
DROP POLICY IF EXISTS "Allow public viewing" ON storage.objects;
CREATE POLICY "Allow public viewing"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'receipts');
