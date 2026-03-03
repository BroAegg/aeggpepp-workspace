-- Migration: Custom Todo Categories
-- Run this in Supabase SQL Editor

-- 1. Create todo_categories table
CREATE TABLE IF NOT EXISTS todo_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  icon text DEFAULT NULL,        -- emoji string e.g. '🎮'
  color text NOT NULL DEFAULT 'bg-gray-100 text-gray-700 dark:bg-gray-800/50 dark:text-gray-300',
  position integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- 2. Enable RLS
ALTER TABLE todo_categories ENABLE ROW LEVEL SECURITY;

-- 3. RLS policies: shared categories (everyone can read, authenticated can write)
CREATE POLICY "Anyone can read categories"
  ON todo_categories FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert categories"
  ON todo_categories FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update categories"
  ON todo_categories FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete categories"
  ON todo_categories FOR DELETE
  TO authenticated
  USING (true);

-- 4. Create indexes
CREATE INDEX IF NOT EXISTS idx_todo_categories_position ON todo_categories(position);

-- 5. Insert default categories (matching existing hardcoded ones)
INSERT INTO todo_categories (name, icon, color, position) VALUES
  ('Work', '💼', 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300', 0),
  ('Personal', '🏠', 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300', 1),
  ('Shopping', '🛒', 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300', 2),
  ('Other', '📌', 'bg-gray-100 text-gray-700 dark:bg-gray-800/50 dark:text-gray-300', 3);

-- 6. Remove the CHECK constraint on todos.category so it accepts any text
-- The constraint name may vary; try both common patterns:
ALTER TABLE todos DROP CONSTRAINT IF EXISTS todos_category_check;
-- If the above doesn't work, find the constraint name:
-- SELECT conname FROM pg_constraint WHERE conrelid = 'todos'::regclass AND contype = 'c';

-- 7. Update existing todos: map old category values to names (they already match lowercase)
-- No-op needed since we'll match by lowercase name in the app
-- But let's capitalize them to match the new category names:
UPDATE todos SET category = 'Work' WHERE category = 'work';
UPDATE todos SET category = 'Personal' WHERE category = 'personal';
UPDATE todos SET category = 'Shopping' WHERE category = 'shopping';
UPDATE todos SET category = 'Other' WHERE category = 'other';
