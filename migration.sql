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

-- =====================================================
-- RAMADAN LOGS TABLE
-- =====================================================
create table if not exists ramadan_logs (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references profiles(id) on delete cascade not null,
    date date not null,
    data jsonb default '{}'::jsonb, -- stores { fasted: boolean, prayers: {...}, quranJuz: number }
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique(user_id, date)
);

-- Enable RLS
alter table ramadan_logs enable row level security;

-- Policies
create policy "Users can view all ramadan logs"
    on ramadan_logs for select
    using ( true );

create policy "Users can insert their own logs"
    on ramadan_logs for insert
    with check ( auth.uid() = user_id );

create policy "Users can update their own logs"
    on ramadan_logs for update
    using ( auth.uid() = user_id );

-- Trigger for updated_at
create trigger update_ramadan_logs_updated_at
    before update on ramadan_logs
    for each row
    execute function update_updated_at_column();

