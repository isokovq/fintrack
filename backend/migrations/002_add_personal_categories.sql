-- Add personal expense categories
INSERT INTO categories (id, user_id, name, type, icon, color, is_default) VALUES
  (uuid_generate_v4(), NULL, 'Baby Expenses', 'expense', 'baby', '#f472b6', true),
  (uuid_generate_v4(), NULL, 'Presents', 'expense', 'gift', '#f59e0b', true),
  (uuid_generate_v4(), NULL, 'Wife Expenses', 'expense', 'heart', '#e879f9', true),
  (uuid_generate_v4(), NULL, 'Extended Family', 'expense', 'users', '#fb923c', true),
  (uuid_generate_v4(), NULL, 'Work Expenses', 'expense', 'briefcase', '#64748b', true)
ON CONFLICT DO NOTHING;
