-- =========================================================================
-- AEGGPEPP WORKSPACE — FASE 2: FITUR SPESIFIK PASANGAN & FORM GUARDING
-- Run this migration in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/_/sql
-- =========================================================================

-- =====================================================
-- 1. TRANSACTIONS: IS_SETTLEMENT COLUMN
-- =====================================================
alter table public.transactions 
  add column if not exists is_settlement boolean default false;

create index if not exists idx_transactions_is_settlement on public.transactions(is_settlement);

-- =====================================================
-- 2. RECURRING SUBSCRIPTIONS / BILLS TABLE
-- =====================================================
create table if not exists public.subscriptions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  amount decimal(12,2) not null,
  billing_cycle text default 'monthly' check (billing_cycle in ('monthly', 'yearly')),
  due_day integer not null check (due_day between 1 and 31),
  category text default 'bills',
  icon text,
  is_active boolean default true,
  last_paid_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.subscriptions enable row level security;

drop policy if exists "Couple members can manage subscriptions" on public.subscriptions;
create policy "Couple members can manage subscriptions" 
  on public.subscriptions 
  for all 
  using (public.is_couple_member()) 
  with check (public.is_couple_member());

-- =====================================================
-- 3. WEDDING KUA CHECKLIST TABLE & SEED DATA
-- =====================================================
create table if not exists public.wedding_kua_checklist (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  document_name text not null,
  description text,
  is_completed_aegg boolean default false,
  is_completed_peppaa boolean default false,
  notes text,
  position integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.wedding_kua_checklist enable row level security;

drop policy if exists "Couple members can manage wedding KUA checklist" on public.wedding_kua_checklist;
create policy "Couple members can manage wedding KUA checklist" 
  on public.wedding_kua_checklist 
  for all 
  using (public.is_couple_member()) 
  with check (public.is_couple_member());

-- =====================================================
-- 4. REALTIME PUBLICATION ACTIVATION
-- =====================================================
do $$
begin
  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' and tablename = 'subscriptions'
  ) then
    alter publication supabase_realtime add table public.subscriptions;
  end if;

  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' and tablename = 'wedding_kua_checklist'
  ) then
    alter publication supabase_realtime add table public.wedding_kua_checklist;
  end if;
end;
$$;
