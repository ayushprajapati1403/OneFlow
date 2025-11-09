-- Seed sample data for OneFlow demo

-- Sample users (profiles) - These should be created after auth signup
-- You'll need to create these through the signup form first, then update their roles

-- Sample update for existing users (run this after creating users via signup):
-- UPDATE profiles SET role = 'project_manager', hourly_rate = 1500 WHERE email = 'pm@oneflow.com';
-- UPDATE profiles SET role = 'team_member', hourly_rate = 800 WHERE email = 'dev1@oneflow.com';
-- UPDATE profiles SET role = 'team_member', hourly_rate = 900 WHERE email = 'dev2@oneflow.com';

-- Sample Projects
INSERT INTO projects (name, description, client_name, status, start_date, end_date, budget, budget_spent)
VALUES
  (
    'Brand Website Redesign',
    'Complete website redesign with modern UI/UX',
    'TechCorp Inc',
    'in_progress',
    '2024-01-15',
    '2024-06-30',
    100000,
    40000
  ),
  (
    'Mobile App Development',
    'Native iOS and Android app for customer engagement',
    'StartupXYZ',
    'in_progress',
    '2024-02-01',
    '2024-08-15',
    250000,
    120000
  ),
  (
    'E-commerce Platform',
    'Full-featured online store with payment integration',
    'RetailCo',
    'planned',
    '2024-05-01',
    '2024-12-31',
    500000,
    0
  ),
  (
    'Marketing Campaign',
    'Digital marketing and SEO optimization',
    'GrowthHub',
    'in_progress',
    '2024-03-01',
    '2024-09-30',
    80000,
    45000
  ),
  (
    'CRM Integration',
    'Salesforce integration and customization',
    'Enterprise Solutions Ltd',
    'completed',
    '2023-10-01',
    '2024-02-28',
    150000,
    148000
  );

-- Sample Tasks (will need to update project_id and assignee_id with actual IDs)
-- This is template SQL - you'll need to replace the UUIDs with actual ones from your database

-- Get first project ID for tasks
DO $$
DECLARE
  project1_id uuid;
  project2_id uuid;
BEGIN
  SELECT id INTO project1_id FROM projects WHERE name = 'Brand Website Redesign' LIMIT 1;
  SELECT id INTO project2_id FROM projects WHERE name = 'Mobile App Development' LIMIT 1;

  IF project1_id IS NOT NULL THEN
    INSERT INTO tasks (project_id, title, description, status, priority, due_date)
    VALUES
      (project1_id, 'Design Homepage Mockups', 'Create high-fidelity mockups for the homepage', 'done', 'high', '2024-02-15'),
      (project1_id, 'Implement Navigation Menu', 'Build responsive navigation with mobile support', 'in_progress', 'high', '2024-03-10'),
      (project1_id, 'Integrate Payment Gateway', 'Set up Stripe payment processing', 'new', 'medium', '2024-04-01'),
      (project1_id, 'Content Migration', 'Migrate existing content to new CMS', 'blocked', 'high', '2024-03-20');
  END IF;

  IF project2_id IS NOT NULL THEN
    INSERT INTO tasks (project_id, title, description, status, priority, due_date)
    VALUES
      (project2_id, 'User Authentication Flow', 'Implement OAuth and social login', 'in_progress', 'urgent', '2024-03-15'),
      (project2_id, 'Push Notifications', 'Configure Firebase Cloud Messaging', 'new', 'medium', '2024-04-10'),
      (project2_id, 'API Integration', 'Connect to backend REST API', 'in_progress', 'high', '2024-03-25'),
      (project2_id, 'App Store Submission', 'Prepare and submit to app stores', 'new', 'low', '2024-07-01');
  END IF;
END $$;

-- Sample Sales Orders
DO $$
DECLARE
  project1_id uuid;
  project2_id uuid;
BEGIN
  SELECT id INTO project1_id FROM projects WHERE name = 'Brand Website Redesign' LIMIT 1;
  SELECT id INTO project2_id FROM projects WHERE name = 'Mobile App Development' LIMIT 1;

  IF project1_id IS NOT NULL THEN
    INSERT INTO sales_orders (project_id, order_number, partner_name, order_date, amount, status)
    VALUES
      (project1_id, 'SO-2024-001', 'TechCorp Inc', '2024-01-10', 100000, 'confirmed');
  END IF;

  IF project2_id IS NOT NULL THEN
    INSERT INTO sales_orders (project_id, order_number, partner_name, order_date, amount, status)
    VALUES
      (project2_id, 'SO-2024-002', 'StartupXYZ', '2024-01-25', 250000, 'confirmed');
  END IF;
END $$;

-- Sample Purchase Orders
DO $$
DECLARE
  project1_id uuid;
BEGIN
  SELECT id INTO project1_id FROM projects WHERE name = 'Brand Website Redesign' LIMIT 1;

  IF project1_id IS NOT NULL THEN
    INSERT INTO purchase_orders (project_id, order_number, vendor_name, order_date, amount, status)
    VALUES
      (project1_id, 'PO-2024-001', 'Cloud Services Ltd', '2024-01-20', 12000, 'sent');
  END IF;
END $$;

-- Sample Customer Invoices
DO $$
DECLARE
  project1_id uuid;
  so_id uuid;
BEGIN
  SELECT id INTO project1_id FROM projects WHERE name = 'Brand Website Redesign' LIMIT 1;
  SELECT id INTO so_id FROM sales_orders WHERE order_number = 'SO-2024-001' LIMIT 1;

  IF project1_id IS NOT NULL AND so_id IS NOT NULL THEN
    INSERT INTO customer_invoices (project_id, sales_order_id, invoice_number, partner_name, invoice_date, amount, status)
    VALUES
      (project1_id, so_id, 'INV-2024-001', 'TechCorp Inc', '2024-02-15', 40000, 'paid');
  END IF;
END $$;

-- Sample Vendor Bills
DO $$
DECLARE
  project1_id uuid;
  po_id uuid;
BEGIN
  SELECT id INTO project1_id FROM projects WHERE name = 'Brand Website Redesign' LIMIT 1;
  SELECT id INTO po_id FROM purchase_orders WHERE order_number = 'PO-2024-001' LIMIT 1;

  IF project1_id IS NOT NULL AND po_id IS NOT NULL THEN
    INSERT INTO vendor_bills (project_id, purchase_order_id, bill_number, vendor_name, bill_date, amount, status)
    VALUES
      (project1_id, po_id, 'BILL-2024-001', 'Cloud Services Ltd', '2024-02-10', 12000, 'paid');
  END IF;
END $$;

-- Note: Timesheets and expenses require actual user IDs from profiles table
-- These should be created through the UI or after users are set up
