-- =============================================================================
-- AEGGPEPP WORKSPACE — UNIFIED MASTER MIGRATION
-- Multi-POV Architecture, Scope & Privacy RLS, Wedding Settings & Realtime 360°
-- Execute this script in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/_/sql
-- =============================================================================

-- =====================================================
-- 1. PROFILES: JOINT DEFAULT ACCOUNT ID
-- =====================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS joint_default_account_id UUID REFERENCES public.savings_accounts(id) ON DELETE SET NULL;

-- =====================================================
-- 2. PENYERAGAMAN KOLOM SCOPE PADA TABEL FINANCE
-- ('aegg' | 'peppaa' | 'joint')
-- =====================================================

-- savings_accounts
ALTER TABLE public.savings_accounts
  ADD COLUMN IF NOT EXISTS scope TEXT NOT NULL DEFAULT 'aegg' CHECK (scope IN ('aegg', 'peppaa', 'joint'));

-- Backfill savings_accounts: akun yang is_locked (nikah/impian) atau punya kata nikah/bersama otomatis jadi 'joint'
UPDATE public.savings_accounts
SET scope = 'joint'
WHERE (is_locked = TRUE OR LOWER(name) LIKE '%nikah%' OR LOWER(name) LIKE '%bersama%' OR LOWER(name) LIKE '%gabungan%')
  AND scope != 'joint';

-- transactions
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS scope TEXT NOT NULL DEFAULT 'aegg' CHECK (scope IN ('aegg', 'peppaa', 'joint')),
  ADD COLUMN IF NOT EXISTS transfer_category TEXT NOT NULL DEFAULT 'internal' CHECK (transfer_category IN ('internal', 'contribution'));

-- budgets
ALTER TABLE public.budgets
  ADD COLUMN IF NOT EXISTS scope TEXT NOT NULL DEFAULT 'aegg' CHECK (scope IN ('aegg', 'peppaa', 'joint'));

-- subscriptions
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS scope TEXT NOT NULL DEFAULT 'aegg' CHECK (scope IN ('aegg', 'peppaa', 'joint'));

-- =====================================================
-- 3. PENYERAGAMAN SCOPE & PRIVASI PADA NON-FINANCE
-- =====================================================

-- todos
ALTER TABLE public.todos
  ADD COLUMN IF NOT EXISTS scope TEXT NOT NULL DEFAULT 'joint' CHECK (scope IN ('aegg', 'peppaa', 'joint')),
  ADD COLUMN IF NOT EXISTS is_private BOOLEAN NOT NULL DEFAULT FALSE;

-- goals
ALTER TABLE public.goals
  ADD COLUMN IF NOT EXISTS scope TEXT NOT NULL DEFAULT 'joint' CHECK (scope IN ('aegg', 'peppaa', 'joint'));

-- events (kalender)
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS scope TEXT NOT NULL DEFAULT 'joint' CHECK (scope IN ('aegg', 'peppaa', 'joint')),
  ADD COLUMN IF NOT EXISTS is_private BOOLEAN NOT NULL DEFAULT FALSE;

-- wishlist (kejutan / surprise gift)
ALTER TABLE public.wishlist
  ADD COLUMN IF NOT EXISTS is_surprise BOOLEAN NOT NULL DEFAULT FALSE;

-- =====================================================
-- 4. PENGATURAN WEDDING DINAMIS & SUMBER DANA SPONSOR
-- =====================================================

CREATE TABLE IF NOT EXISTS public.wedding_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  target_budget DECIMAL(12,2) DEFAULT 25000000 NOT NULL,
  target_pax INTEGER DEFAULT 180 NOT NULL,
  wedding_date DATE,
  venue_name TEXT,
  notes TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Seed baris default 1 baris jika belum ada
INSERT INTO public.wedding_settings (id, target_budget, target_pax)
SELECT 'a0000000-0000-0000-0000-000000000001', 25000000, 180
WHERE NOT EXISTS (SELECT 1 FROM public.wedding_settings);

-- wedding_budget_items: funding_source & is_sponsored
ALTER TABLE public.wedding_budget_items
  ADD COLUMN IF NOT EXISTS funding_source TEXT NOT NULL DEFAULT 'couple' 
    CHECK (funding_source IN ('couple', 'parent_aegg', 'parent_peppaa', 'sponsor')),
  ADD COLUMN IF NOT EXISTS is_sponsored BOOLEAN NOT NULL DEFAULT FALSE;

-- =====================================================
-- 5. UPDATE RLS SECURITY (ANTI-BOCOR DATA RAHASIA)
-- =====================================================

-- Helper is_couple_member function jika belum ada
CREATE OR REPLACE FUNCTION public.is_couple_member(p_uid UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = p_uid AND role IN ('aegg', 'peppaa')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS wedding_settings
ALTER TABLE public.wedding_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Couple members can view wedding settings" ON public.wedding_settings;
CREATE POLICY "Couple members can view wedding settings"
  ON public.wedding_settings FOR SELECT
  USING ( public.is_couple_member() );

DROP POLICY IF EXISTS "Couple members can update wedding settings" ON public.wedding_settings;
CREATE POLICY "Couple members can update wedding settings"
  ON public.wedding_settings FOR UPDATE
  USING ( public.is_couple_member() );

DROP POLICY IF EXISTS "Couple members can insert wedding settings" ON public.wedding_settings;
CREATE POLICY "Couple members can insert wedding settings"
  ON public.wedding_settings FOR INSERT
  WITH CHECK ( public.is_couple_member() );

-- RLS todos: sembunyikan todo privat kecuali milik pembuat
DROP POLICY IF EXISTS "Users can view todos" ON public.todos;
DROP POLICY IF EXISTS "Users can view all todos" ON public.todos;
CREATE POLICY "Users can view todos"
  ON public.todos FOR SELECT
  USING ( is_private = FALSE OR auth.uid() = user_id );

-- RLS events: sembunyikan event privat kecuali milik pembuat
DROP POLICY IF EXISTS "Users can view events" ON public.events;
DROP POLICY IF EXISTS "Users can view all events" ON public.events;
CREATE POLICY "Users can view events"
  ON public.events FOR SELECT
  USING ( is_private = FALSE OR auth.uid() = user_id );

-- RLS wishlist: sembunyikan kado kejutan dari pasangan sampai status dibeli/purchased
DROP POLICY IF EXISTS "Users can view shared and own wishlist items" ON public.wishlist;
DROP POLICY IF EXISTS "Users can view wishlist items" ON public.wishlist;
CREATE POLICY "Users can view wishlist items"
  ON public.wishlist FOR SELECT
  USING (
    auth.uid() = user_id
    OR (is_surprise = FALSE AND is_shared = TRUE)
    OR (is_surprise = TRUE AND is_purchased = TRUE)
  );

-- =====================================================
-- 6. REALTIME PUBLICATION 360° (SEMUA TABEL TERDAFTAR)
-- =====================================================
DO $$
BEGIN
  -- savings_accounts
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'savings_accounts') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.savings_accounts;
  END IF;

  -- budgets
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'budgets') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.budgets;
  END IF;

  -- subscriptions
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'subscriptions') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.subscriptions;
  END IF;

  -- wedding_budget_items
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'wedding_budget_items') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.wedding_budget_items;
  END IF;

  -- wedding_settings
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'wedding_settings') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.wedding_settings;
  END IF;
END;
$$;
