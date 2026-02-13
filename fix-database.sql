-- FIX DATABASE ISSUES
-- Copy dan run script ini di Supabase SQL Editor

-- =====================================================
-- 1. FIX GOALS TABLE - Add 'tag' column if missing
-- =====================================================
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'goals' AND column_name = 'tag'
    ) THEN
        ALTER TABLE goals ADD COLUMN tag text;
    END IF;
END $$;

-- =====================================================
-- 2. FIX GALLERY RLS POLICIES
-- =====================================================

-- Drop existing policies first
DROP POLICY IF EXISTS "Users can view all gallery items" ON gallery;
DROP POLICY IF EXISTS "Users can upload their own photos" ON gallery;
DROP POLICY IF EXISTS "Users can update their own photos" ON gallery;
DROP POLICY IF EXISTS "Users can delete their own photos" ON gallery;

-- Recreate with correct policies
CREATE POLICY "Users can view all gallery items"
  ON gallery FOR SELECT
  USING ( true );

CREATE POLICY "Users can upload their own photos"
  ON gallery FOR INSERT
  WITH CHECK ( auth.uid() = user_id );

CREATE POLICY "Users can update their own photos"
  ON gallery FOR UPDATE
  USING ( auth.uid() = user_id );

CREATE POLICY "Users can delete their own photos"
  ON gallery FOR DELETE
  USING ( auth.uid() = user_id );

-- =====================================================
-- 3. FIX GOAL_TASKS RLS - Allow partner to toggle tasks
-- =====================================================

DROP POLICY IF EXISTS "Users can view goal tasks" ON goal_tasks;
DROP POLICY IF EXISTS "Users can create goal tasks for their goals" ON goal_tasks;
DROP POLICY IF EXISTS "Users can update goal tasks for their goals" ON goal_tasks;
DROP POLICY IF EXISTS "Users can delete goal tasks for their goals" ON goal_tasks;

-- Everyone can view all tasks (couple app)
CREATE POLICY "Anyone can view goal tasks"
  ON goal_tasks FOR SELECT
  USING ( true );

-- Authenticated users can create tasks
CREATE POLICY "Authenticated can create goal tasks"
  ON goal_tasks FOR INSERT
  WITH CHECK ( true );

-- Anyone authenticated can toggle/update tasks
CREATE POLICY "Authenticated can update goal tasks"
  ON goal_tasks FOR UPDATE
  USING ( true );

-- Anyone authenticated can delete tasks
CREATE POLICY "Authenticated can delete goal tasks"
  ON goal_tasks FOR DELETE
  USING ( true );

-- =====================================================
-- DONE!
-- =====================================================
