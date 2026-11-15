-- ==============================================================================
-- FIX RLS: IZINKAN WHATSAPP BOT NANANG MENYIMPAN & MENGUBAH TRANSAKSI
-- Jalankan script ini di Supabase SQL Editor untuk menyelesaikan error:
-- "new row violates row-level security policy for table 'transactions'"
-- ==============================================================================

-- 1. Buka akses INSERT untuk transaksi:
-- - User Web yang sedang login (authenticated)
-- - Backend / VPS Service Role (service_role)
-- - WhatsApp Bot Nanang (anon key) dengan user_id milik Aegg atau Peppaa
DROP POLICY IF EXISTS "Couple members can insert transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can create their own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Allow bot and couple insert transactions" ON public.transactions;

CREATE POLICY "Allow bot and couple insert transactions"
  ON public.transactions FOR INSERT
  WITH CHECK (
    -- Web app (authenticated session)
    (auth.role() = 'authenticated')
    OR
    -- Backend service role
    (auth.role() = 'service_role')
    OR
    -- WhatsApp Bot (anon key dengan user_id valid milik Aegg atau Peppaa)
    (auth.role() = 'anon' AND user_id IN (SELECT id FROM public.profiles WHERE role IN ('aegg', 'peppaa')))
  );

-- 2. Buka akses UPDATE untuk transaksi:
-- Dibutuhkan saat user me-reply "batal" / "hapus" (Instant Undo soft-delete)
DROP POLICY IF EXISTS "Couple members can update transactions" ON public.transactions;
DROP POLICY IF EXISTS "Partners can update transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can update their own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Allow bot and couple update transactions" ON public.transactions;

CREATE POLICY "Allow bot and couple update transactions"
  ON public.transactions FOR UPDATE
  USING (
    (auth.role() = 'authenticated')
    OR
    (auth.role() = 'service_role')
    OR
    (auth.role() = 'anon')
  );

-- 3. Buka akses SELECT untuk transaksi:
-- Dibutuhkan untuk pengecekan idempotency_key dan pembacaan data
DROP POLICY IF EXISTS "Couple members can select transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can view all transactions" ON public.transactions;
DROP POLICY IF EXISTS "Allow bot and couple select transactions" ON public.transactions;

CREATE POLICY "Allow bot and couple select transactions"
  ON public.transactions FOR SELECT
  USING (true);

-- 4. Buka akses untuk receipt_items (rincian item belanja hasil OCR struk)
ALTER TABLE IF EXISTS public.receipt_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all receipt items insert" ON public.receipt_items;
CREATE POLICY "Allow all receipt items insert"
  ON public.receipt_items FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all receipt items select" ON public.receipt_items;
CREATE POLICY "Allow all receipt items select"
  ON public.receipt_items FOR SELECT
  USING (true);

-- Verifikasi status RLS
SELECT tablename, policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename IN ('transactions', 'receipt_items');
