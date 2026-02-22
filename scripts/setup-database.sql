-- Setup database for Weight-based Warehouse Management System

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create enum types
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'USER', 'VIEWER');

-- Create users table
CREATE TABLE IF NOT EXISTS "users" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    "email" TEXT UNIQUE NOT NULL,
    "name" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "UserRole" DEFAULT 'USER' NOT NULL,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create products table
CREATE TABLE IF NOT EXISTS "products" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    "name" TEXT NOT NULL,
    "nameAr" TEXT,
    "sku" TEXT UNIQUE NOT NULL,
    "barcode" TEXT UNIQUE,
    "qrCode" TEXT UNIQUE,
    "description" TEXT,
    "descriptionAr" TEXT,
    "category" TEXT NOT NULL,
    "minStock" DOUBLE PRECISION DEFAULT 0 NOT NULL,
    "maxStock" DOUBLE PRECISION,
    "currentStock" DOUBLE PRECISION DEFAULT 0 NOT NULL,
    "unit" TEXT DEFAULT 'قطعة' NOT NULL,
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create stock_ins table
CREATE TABLE IF NOT EXISTS "stock_ins" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    "productId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL,
    "supplier" TEXT,
    "invoiceNumber" TEXT,
    "notes" TEXT,
    "date" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE,
    FOREIGN KEY ("userId") REFERENCES "users"("id")
);

-- Create stock_outs table
CREATE TABLE IF NOT EXISTS "stock_outs" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    "productId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL,
    "customer" TEXT,
    "invoiceNumber" TEXT,
    "notes" TEXT,
    "date" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE,
    FOREIGN KEY ("userId") REFERENCES "users"("id")
);

-- Create activities table
CREATE TABLE IF NOT EXISTS "activities" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "details" TEXT,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    FOREIGN KEY ("userId") REFERENCES "users"("id")
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS "stock_ins_productId_idx" ON "stock_ins"("productId");
CREATE INDEX IF NOT EXISTS "stock_ins_userId_idx" ON "stock_ins"("userId");
CREATE INDEX IF NOT EXISTS "stock_ins_date_idx" ON "stock_ins"("date");

CREATE INDEX IF NOT EXISTS "stock_outs_productId_idx" ON "stock_outs"("productId");
CREATE INDEX IF NOT EXISTS "stock_outs_userId_idx" ON "stock_outs"("userId");
CREATE INDEX IF NOT EXISTS "stock_outs_date_idx" ON "stock_outs"("date");

CREATE INDEX IF NOT EXISTS "activities_userId_idx" ON "activities"("userId");
CREATE INDEX IF NOT EXISTS "activities_createdAt_idx" ON "activities"("createdAt");

-- Insert default admin user (password: admin123 - hashed with bcrypt)
-- Hash for 'admin123': $2a$10$rN8YvXGv6KJMvnJdqJCBWeFqIVYXYQb7WJXwKlVSVHBVxXQJXKEm6
INSERT INTO "users" ("id", "email", "name", "password", "role", "updatedAt")
VALUES (
    gen_random_uuid()::TEXT,
    'admin@warehouse.com',
    'مدير النظام',
    '$2a$10$rN8YvXGv6KJMvnJdqJCBWeFqIVYXYQb7WJXwKlVSVHBVxXQJXKEm6',
    'ADMIN',
    CURRENT_TIMESTAMP
) ON CONFLICT (email) DO NOTHING;

-- Insert sample products
INSERT INTO "products" ("id", "name", "nameAr", "sku", "barcode", "category", "minStock", "currentStock", "unit", "updatedAt")
VALUES 
    (gen_random_uuid()::TEXT, 'Rice Bag', 'كيس أرز', 'RICE-001', '1234567890123', 'حبوب', 100, 150, 'بسته', CURRENT_TIMESTAMP),
    (gen_random_uuid()::TEXT, 'Sugar Bag', 'كيس سكر', 'SUGAR-001', '1234567890124', 'سكريات', 50, 80, 'بسته', CURRENT_TIMESTAMP),
    (gen_random_uuid()::TEXT, 'Flour Bag', 'كيس دقيق', 'FLOUR-001', '1234567890125', 'حبوب', 200, 250, 'بسته', CURRENT_TIMESTAMP),
    (gen_random_uuid()::TEXT, 'Cooking Oil', 'زيت طعام', 'OIL-001', '1234567890126', 'زيوت', 30, 45, 'لیتر', CURRENT_TIMESTAMP),
    (gen_random_uuid()::TEXT, 'Tea Box', 'علبة شاي', 'TEA-001', '1234567890127', 'مشروبات', 100, 120, 'بسته', CURRENT_TIMESTAMP)
ON CONFLICT (sku) DO NOTHING;
