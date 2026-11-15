-- ==============================================================================
-- FASE 3: WEDDING VENDOR PAYMENT MILESTONES & GUEST PAX TRACKING
-- ==============================================================================

-- 1. Tambahkan kolom termin pembayaran vendor pada wedding_budget_items
ALTER TABLE wedding_budget_items
  ADD COLUMN IF NOT EXISTS dp_amount DECIMAL(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS dp_due_date DATE,
  ADD COLUMN IF NOT EXISTS dp_paid BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS termin2_amount DECIMAL(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS termin2_due_date DATE,
  ADD COLUMN IF NOT EXISTS termin2_paid BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS pelunasan_amount DECIMAL(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pelunasan_due_date DATE,
  ADD COLUMN IF NOT EXISTS pelunasan_paid BOOLEAN DEFAULT FALSE;

-- 2. Tambahkan kolom status pengiriman undangan pada wedding_guests
ALTER TABLE wedding_guests
  ADD COLUMN IF NOT EXISTS is_invitation_sent BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS invitation_type TEXT DEFAULT 'digital';

-- Selesai. Seluruh data lama tetap utuh.
