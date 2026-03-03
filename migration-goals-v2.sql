-- =====================================================
-- GOALS V2 MIGRATION: Sub-Pages System
-- Run this in Supabase SQL Editor
-- =====================================================

-- 1. Add new columns to goals table
ALTER TABLE goals ADD COLUMN IF NOT EXISTS icon TEXT DEFAULT NULL;
ALTER TABLE goals ADD COLUMN IF NOT EXISTS display_id SERIAL;

-- 2. Create goal_pages table for sub-pages
CREATE TABLE IF NOT EXISTS goal_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID REFERENCES goals(id) ON DELETE CASCADE NOT NULL,
  parent_page_id UUID REFERENCES goal_pages(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Untitled',
  icon TEXT DEFAULT NULL,
  content JSONB DEFAULT '[]'::jsonb,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Enable RLS on goal_pages
ALTER TABLE goal_pages ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for goal_pages (inherit from parent goal, shared access)
CREATE POLICY "Users can view all goal pages"
  ON goal_pages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM goals
      WHERE goals.id = goal_pages.goal_id
    )
  );

CREATE POLICY "Users can create pages for their goals"
  ON goal_pages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM goals
      WHERE goals.id = goal_pages.goal_id
      AND goals.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update pages for their goals"
  ON goal_pages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM goals
      WHERE goals.id = goal_pages.goal_id
      AND goals.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete pages for their goals"
  ON goal_pages FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM goals
      WHERE goals.id = goal_pages.goal_id
      AND goals.user_id = auth.uid()
    )
  );

-- 5. Index for faster queries
CREATE INDEX IF NOT EXISTS idx_goal_pages_goal_id ON goal_pages(goal_id);
CREATE INDEX IF NOT EXISTS idx_goal_pages_parent ON goal_pages(parent_page_id);

-- 6. Update schema comment
COMMENT ON TABLE goal_pages IS 'Sub-pages within goals, supports nested pages with rich text content stored as JSONB blocks';
COMMENT ON COLUMN goals.icon IS 'Emoji icon for the goal';
COMMENT ON COLUMN goals.display_id IS 'Sequential display ID for table view numbering';
