-- ==============================================================================
-- FASE 2: TRANSFER ANTAR REKENING & LOKASI UANG (ANTI-SLOP ARCHITECTURE)
-- ==============================================================================

-- 1. Perbarui check constraint tabel transactions agar mendukung tipe 'transfer'
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_type_check;
ALTER TABLE transactions ADD CONSTRAINT transactions_type_check 
  CHECK (type IN ('income', 'expense', 'transfer'));

-- 2. Tambahkan kolom relasi rekening pada tabel transactions
ALTER TABLE transactions 
  ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES savings_accounts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS from_account_id UUID REFERENCES savings_accounts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS to_account_id UUID REFERENCES savings_accounts(id) ON DELETE SET NULL;

-- 3. Tambahkan kolom status dana terkunci pada savings_accounts
-- FALSE = Dana Operasional Bebas (bisa dipakai belanja harian/tagihan)
-- TRUE  = Dana Terkunci (khusus persiapan nikah, emergency fund, atau goals)
ALTER TABLE savings_accounts 
  ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT FALSE;

-- 4. Indeks performa untuk query transaksi per rekening
CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_from_to_accounts ON transactions(from_account_id, to_account_id);
CREATE INDEX IF NOT EXISTS idx_savings_accounts_is_locked ON savings_accounts(is_locked);

-- Selesai. Seluruh data lama tetap utuh dan kompatibel 100%.
