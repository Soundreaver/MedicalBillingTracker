-- Medical Billing Tracker - Supabase Migration SQL
-- Run this in your Supabase SQL Editor to create all tables

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table for authentication
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(255) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'doctor', -- 'admin' or 'doctor'
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Sessions table for session management
CREATE TABLE IF NOT EXISTS sessions (
    id VARCHAR(128) PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for sessions
CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions(user_id);
CREATE INDEX IF NOT EXISTS sessions_expires_at_idx ON sessions(expires_at);

-- Patients table
CREATE TABLE IF NOT EXISTS patients (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(255),
    address TEXT,
    patient_id VARCHAR(50) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Medicines table
CREATE TABLE IF NOT EXISTS medicines (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    unit_price DECIMAL(10, 2) NOT NULL,
    buy_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
    stock_quantity INTEGER NOT NULL DEFAULT 0,
    low_stock_threshold INTEGER NOT NULL DEFAULT 50,
    unit VARCHAR(50) NOT NULL DEFAULT 'units'
);

-- Medical services table for standardized billing items
CREATE TABLE IF NOT EXISTS medical_services (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    default_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
    unit VARCHAR(50) NOT NULL DEFAULT 'service',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Invoices table (needs to be created before rooms for foreign key reference)
CREATE TABLE IF NOT EXISTS invoices (
    id SERIAL PRIMARY KEY,
    invoice_number VARCHAR(50) NOT NULL UNIQUE,
    patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    subtotal_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    service_charge DECIMAL(10, 2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(10, 2) NOT NULL,
    paid_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'paid', 'overdue'
    due_date TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    description TEXT
);

-- Rooms table
CREATE TABLE IF NOT EXISTS rooms (
    id SERIAL PRIMARY KEY,
    room_number VARCHAR(20) NOT NULL UNIQUE,
    room_type VARCHAR(50) NOT NULL,
    daily_rate DECIMAL(10, 2) NOT NULL,
    is_occupied BOOLEAN NOT NULL DEFAULT false,
    current_patient_id INTEGER REFERENCES patients(id) ON DELETE SET NULL,
    check_in_date TIMESTAMP,
    current_invoice_id INTEGER REFERENCES invoices(id) ON DELETE SET NULL
);

-- Invoice items table
CREATE TABLE IF NOT EXISTS invoice_items (
    id SERIAL PRIMARY KEY,
    invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    item_type VARCHAR(20) NOT NULL, -- 'medicine', 'room', 'service'
    item_id INTEGER, -- references medicine.id or room.id
    item_name VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    total_price DECIMAL(10, 2) NOT NULL
);

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    payment_date TIMESTAMP DEFAULT NOW(),
    reference VARCHAR(100),
    notes TEXT
);

-- Activity logs table
CREATE TABLE IF NOT EXISTS activity_logs (
    id SERIAL PRIMARY KEY,
    type VARCHAR(50) NOT NULL, -- 'payment', 'invoice', 'patient', 'medicine', 'room'
    title VARCHAR(255) NOT NULL,
    description TEXT,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    related_id INTEGER, -- ID of related record (patient, invoice, etc.)
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Patient documents table
CREATE TABLE IF NOT EXISTS patient_documents (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    document_type VARCHAR(50) NOT NULL, -- 'report', 'xray', 'scan', 'prescription', etc
    document_name VARCHAR(255) NOT NULL,
    document_url VARCHAR(500),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create additional indexes for better performance
CREATE INDEX IF NOT EXISTS patients_patient_id_idx ON patients(patient_id);
CREATE INDEX IF NOT EXISTS invoices_patient_id_idx ON invoices(patient_id);
CREATE INDEX IF NOT EXISTS invoices_status_idx ON invoices(status);
CREATE INDEX IF NOT EXISTS invoices_due_date_idx ON invoices(due_date);
CREATE INDEX IF NOT EXISTS invoice_items_invoice_id_idx ON invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS payments_invoice_id_idx ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS payments_payment_date_idx ON payments(payment_date);
CREATE INDEX IF NOT EXISTS rooms_is_occupied_idx ON rooms(is_occupied);
CREATE INDEX IF NOT EXISTS medicines_category_idx ON medicines(category);
CREATE INDEX IF NOT EXISTS medicines_stock_quantity_idx ON medicines(stock_quantity);
CREATE INDEX IF NOT EXISTS activity_logs_type_idx ON activity_logs(type);
CREATE INDEX IF NOT EXISTS activity_logs_created_at_idx ON activity_logs(created_at);
CREATE INDEX IF NOT EXISTS patient_documents_patient_id_idx ON patient_documents(patient_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at columns
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_patient_documents_updated_at 
    BEFORE UPDATE ON patient_documents 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Insert default admin user (password: 'password123')
-- Note: You should change this password after first login
INSERT INTO users (username, email, password_hash, role, first_name, last_name, is_active) 
VALUES (
    'admin',
    'admin@medical-billing.com',
    '$2b$10$rGwPzFdpFcjhJhBcGO7tCuOWVfOK6XYX6VwXt4yRhEyFgDXc8jG5K', -- password: 'password123'
    'admin',
    'System',
    'Administrator',
    true
) ON CONFLICT (username) DO NOTHING;

-- Insert sample medicine categories data
INSERT INTO medicines (name, category, unit_price, buy_price, stock_quantity, low_stock_threshold, unit) VALUES
    ('Paracetamol 500mg', 'Analgesics', 2.50, 1.80, 1000, 100, 'tablets'),
    ('Amoxicillin 250mg', 'Antibiotics', 8.00, 6.50, 500, 50, 'capsules'),
    ('Omeprazole 20mg', 'Antacids', 12.00, 9.50, 200, 25, 'capsules'),
    ('Vitamin B Complex', 'Vitamins', 15.00, 12.00, 300, 30, 'tablets'),
    ('Cough Syrup 100ml', 'Respiratory', 45.00, 35.00, 150, 20, 'bottles')
ON CONFLICT DO NOTHING;

-- Insert sample medical services
INSERT INTO medical_services (name, category, default_price, unit, is_active) VALUES
    ('General Consultation', 'Consultation', 500.00, 'service', true),
    ('X-Ray Chest', 'Radiology', 1200.00, 'service', true),
    ('Blood Test - CBC', 'Laboratory', 800.00, 'service', true),
    ('ECG', 'Cardiology', 600.00, 'service', true),
    ('Ultrasound Abdomen', 'Radiology', 1500.00, 'service', true),
    ('Physiotherapy Session', 'Therapy', 400.00, 'service', true)
ON CONFLICT DO NOTHING;

-- Insert sample room types
INSERT INTO rooms (room_number, room_type, daily_rate, is_occupied) VALUES
    ('101', 'General', 2000.00, false),
    ('102', 'General', 2000.00, false),
    ('201', 'Private', 3500.00, false),
    ('202', 'Private', 3500.00, false),
    ('301', 'ICU', 8000.00, false),
    ('302', 'ICU', 8000.00, false),
    ('401', 'Deluxe', 5000.00, false),
    ('402', 'Deluxe', 5000.00, false)
ON CONFLICT (room_number) DO NOTHING;

-- Create views for common queries
-- Outstanding invoices view
CREATE OR REPLACE VIEW outstanding_invoices AS
SELECT 
    i.*,
    p.name as patient_name,
    p.phone as patient_phone,
    (i.total_amount - i.paid_amount) as outstanding_amount
FROM invoices i
JOIN patients p ON i.patient_id = p.id
WHERE i.status != 'paid' AND (i.total_amount - i.paid_amount) > 0;

-- Low stock medicines view
CREATE OR REPLACE VIEW low_stock_medicines AS
SELECT 
    id,
    name,
    category,
    stock_quantity,
    low_stock_threshold,
    unit_price,
    (stock_quantity <= low_stock_threshold) as is_low_stock
FROM medicines
WHERE stock_quantity <= low_stock_threshold;

-- Room occupancy summary view
CREATE OR REPLACE VIEW room_occupancy_summary AS
SELECT 
    room_type,
    COUNT(*) as total_rooms,
    COUNT(CASE WHEN is_occupied = true THEN 1 END) as occupied_rooms,
    COUNT(CASE WHEN is_occupied = false THEN 1 END) as available_rooms,
    ROUND(
        (COUNT(CASE WHEN is_occupied = true THEN 1 END)::DECIMAL / COUNT(*)::DECIMAL) * 100, 
        2
    ) as occupancy_rate
FROM rooms
GROUP BY room_type;

-- Invoice summary view
CREATE OR REPLACE VIEW invoice_summary AS
SELECT 
    i.id,
    i.invoice_number,
    i.patient_id,
    p.name as patient_name,
    p.patient_id as patient_code,
    i.total_amount,
    i.paid_amount,
    (i.total_amount - i.paid_amount) as outstanding_amount,
    i.status,
    i.due_date,
    i.created_at,
    COUNT(ii.id) as item_count,
    COUNT(pay.id) as payment_count
FROM invoices i
JOIN patients p ON i.patient_id = p.id
LEFT JOIN invoice_items ii ON i.id = ii.invoice_id
LEFT JOIN payments pay ON i.id = pay.invoice_id
GROUP BY i.id, p.name, p.patient_id;

-- Grant necessary permissions (adjust as needed for your Supabase setup)
-- These might not be necessary depending on your Supabase RLS policies
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO authenticated;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Medical Billing Tracker database migration completed successfully!';
    RAISE NOTICE 'Tables created: users, sessions, patients, medicines, medical_services, rooms, invoices, invoice_items, payments, activity_logs, patient_documents';
    RAISE NOTICE 'Sample data inserted for medicines, medical services, and rooms';
    RAISE NOTICE 'Default admin user created - Username: admin, Password: password123';
    RAISE NOTICE 'IMPORTANT: Change the admin password after first login!';
END $$;
