-- Add Suppliers table
CREATE TABLE IF NOT EXISTS suppliers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  contact_person VARCHAR(255),
  phone VARCHAR(50),
  email VARCHAR(255),
  address TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add Warehouse Zones table
CREATE TABLE IF NOT EXISTS warehouse_zones (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  capacity DECIMAL(10,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add Product Batches table
CREATE TABLE IF NOT EXISTS product_batches (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  batch_number VARCHAR(100) NOT NULL,
  manufacturing_date DATE,
  expiry_date DATE,
  quantity DECIMAL(10,2) NOT NULL DEFAULT 0,
  weight DECIMAL(10,2) NOT NULL DEFAULT 0,
  supplier_id INTEGER REFERENCES suppliers(id) ON DELETE SET NULL,
  zone_id INTEGER REFERENCES warehouse_zones(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(product_id, batch_number)
);

-- Add Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- 'LOW_STOCK', 'EXPIRING_SOON', 'EXPIRED', 'SYSTEM'
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
  batch_id INTEGER REFERENCES product_batches(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add supplier_id to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS supplier_id INTEGER REFERENCES suppliers(id) ON DELETE SET NULL;

-- Add zone_id to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS zone_id INTEGER REFERENCES warehouse_zones(id) ON DELETE SET NULL;

-- Add batch_id to stock_ins and stock_outs
ALTER TABLE stock_ins ADD COLUMN IF NOT EXISTS batch_id INTEGER REFERENCES product_batches(id) ON DELETE SET NULL;
ALTER TABLE stock_outs ADD COLUMN IF NOT EXISTS batch_id INTEGER REFERENCES product_batches(id) ON DELETE SET NULL;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_batches_expiry ON product_batches(expiry_date);
CREATE INDEX IF NOT EXISTS idx_batches_product ON product_batches(product_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_supplier ON products(supplier_id);
CREATE INDEX IF NOT EXISTS idx_products_zone ON products(zone_id);

-- Insert sample suppliers
INSERT INTO suppliers (name, contact_person, phone, email, address) VALUES
('تامین کننده الف', 'احمد محمدی', '09121234567', 'ahmad@supplier-a.ir', 'تهران، خیابان ولیعصر'),
('تامین کننده ب', 'مریم احمدی', '09129876543', 'maryam@supplier-b.ir', 'تهران، خیابان آزادی'),
('شرکت پخش سی', 'علی رضایی', '09123456789', 'ali@supplier-c.ir', 'تهران، میدان ونک')
ON CONFLICT DO NOTHING;

-- Insert sample warehouse zones
INSERT INTO warehouse_zones (name, description, capacity) VALUES
('انبار A - قفسه ۱', 'محصولات سنگین', 5000.00),
('انبار A - قفسه ۲', 'محصولات متوسط', 3000.00),
('انبار B - قفسه ۱', 'محصولات سبک', 2000.00),
('انبار سردخانه', 'محصولات قابل فساد', 1500.00)
ON CONFLICT DO NOTHING;

-- Insert sample batches
INSERT INTO product_batches (product_id, batch_number, manufacturing_date, expiry_date, quantity, weight, supplier_id, zone_id)
SELECT 
  p.id,
  'BATCH-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || p.id,
  CURRENT_DATE - INTERVAL '30 days',
  CURRENT_DATE + INTERVAL '180 days',
  p.quantity / 2,
  p.weight / 2,
  (SELECT id FROM suppliers ORDER BY RANDOM() LIMIT 1),
  (SELECT id FROM warehouse_zones ORDER BY RANDOM() LIMIT 1)
FROM products p
WHERE p.quantity > 0
ON CONFLICT DO NOTHING;

-- Create function to check for expiring products
CREATE OR REPLACE FUNCTION check_expiring_products()
RETURNS void AS $$
BEGIN
  -- Insert notifications for products expiring within 30 days
  INSERT INTO notifications (user_id, type, title, message, product_id, batch_id)
  SELECT 
    u.id,
    'EXPIRING_SOON',
    'هشدار: محصول در حال انقضا',
    'محصول "' || p.name || '" در دسته ' || pb.batch_number || ' ظرف ' || 
    (pb.expiry_date - CURRENT_DATE) || ' روز منقضی می‌شود.',
    p.id,
    pb.id
  FROM product_batches pb
  JOIN products p ON pb.product_id = p.id
  CROSS JOIN users u
  WHERE pb.expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
    AND pb.quantity > 0
    AND NOT EXISTS (
      SELECT 1 FROM notifications n 
      WHERE n.batch_id = pb.id 
      AND n.type = 'EXPIRING_SOON' 
      AND n.created_at > CURRENT_DATE - INTERVAL '7 days'
    );
END;
$$ LANGUAGE plpgsql;
