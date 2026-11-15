-- ==============================================================================
-- FASE 4: JEMBATAN TRANSAKSI, RECONCILE SALDO & RPC ATOMIK
-- Jalankan migration ini di Supabase SQL Editor:
-- https://supabase.com/dashboard/project/_/sql
-- ==============================================================================

-- 1. Perbarui check constraint tabel transactions agar mendukung 'adjustment'
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_type_check;
ALTER TABLE public.transactions ADD CONSTRAINT transactions_type_check 
  CHECK (type IN ('income', 'expense', 'transfer', 'adjustment'));

-- 2. Tambahkan kolom sumber pencatatan pada transactions
ALTER TABLE public.transactions 
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'web';

-- 3. Tambahkan kolom relasi transaksi termin pada wedding_budget_items
ALTER TABLE public.wedding_budget_items
  ADD COLUMN IF NOT EXISTS dp_transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS termin2_transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS pelunasan_transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL;

-- 4. Tambahkan konfigurasi siklus gajian & rekening default pada profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS billing_cycle_start_day INT DEFAULT 25,
  ADD COLUMN IF NOT EXISTS default_account_id UUID REFERENCES public.savings_accounts(id) ON DELETE SET NULL;

-- 5. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_transactions_type ON public.transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_source ON public.transactions(source);
CREATE INDEX IF NOT EXISTS idx_wedding_dp_tx ON public.wedding_budget_items(dp_transaction_id);
CREATE INDEX IF NOT EXISTS idx_wedding_termin2_tx ON public.wedding_budget_items(termin2_transaction_id);
CREATE INDEX IF NOT EXISTS idx_wedding_pelunasan_tx ON public.wedding_budget_items(pelunasan_transaction_id);

-- 6. Fungsi RPC Atomik: Penyesuaian Saldo Kantong (Bebas Race Condition)
CREATE OR REPLACE FUNCTION public.adjust_account_balance(
  p_account_id UUID,
  p_delta NUMERIC
)
RETURNS NUMERIC
SECURITY DEFINER
AS $$
DECLARE
  v_new_balance NUMERIC;
BEGIN
  UPDATE public.savings_accounts
  SET 
    balance = COALESCE(balance, 0) + p_delta,
    updated_at = NOW()
  WHERE id = p_account_id
  RETURNING balance INTO v_new_balance;

  RETURN v_new_balance;
END;
$$ LANGUAGE plpgsql;

-- Berikan hak akses eksekusi RPC
GRANT EXECUTE ON FUNCTION public.adjust_account_balance(UUID, NUMERIC) TO authenticated, service_role, anon;

-- Verifikasi instalasi RPC dan kolom baru
SELECT 
  column_name, data_type 
FROM information_schema.columns 
WHERE table_name IN ('transactions', 'wedding_budget_items', 'profiles')
  AND column_name IN ('source', 'dp_transaction_id', 'termin2_transaction_id', 'pelunasan_transaction_id', 'billing_cycle_start_day', 'default_account_id');
