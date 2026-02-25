-- Add new default categories: Groceries and Sports & Nutrition
INSERT INTO categories (id, user_id, name, type, icon, color, is_default) VALUES
  (uuid_generate_v4(), NULL, 'Groceries', 'expense', 'shopping-cart', '#22c55e', true),
  (uuid_generate_v4(), NULL, 'Sports & Nutrition', 'expense', 'dumbbell', '#f97316', true)
ON CONFLICT DO NOTHING;
