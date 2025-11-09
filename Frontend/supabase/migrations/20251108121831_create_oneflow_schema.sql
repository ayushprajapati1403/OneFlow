/*
  # OneFlow Database Schema - Complete Project Management System

  ## Overview
  This migration creates the complete database schema for OneFlow, a premium project management 
  system with integrated billing, timesheets, and financial tracking.

  ## New Tables

  ### User Management
  - `profiles` - Extended user profiles with role and metadata
    - `id` (uuid, FK to auth.users)
    - `email` (text)
    - `full_name` (text)
    - `avatar_url` (text, nullable)
    - `role` (text: 'admin', 'project_manager', 'team_member', 'sales', 'finance')
    - `hourly_rate` (numeric, for cost calculation)
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  ### Project Management
  - `projects` - Core project tracking
    - `id` (uuid, primary key)
    - `name` (text)
    - `description` (text)
    - `client_name` (text)
    - `project_manager_id` (uuid, FK to profiles)
    - `status` (text: 'planned', 'in_progress', 'on_hold', 'completed', 'cancelled')
    - `start_date` (date)
    - `end_date` (date)
    - `budget` (numeric)
    - `budget_spent` (numeric, default 0)
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  - `tasks` - Task tracking with Kanban states
    - `id` (uuid, primary key)
    - `project_id` (uuid, FK to projects)
    - `title` (text)
    - `description` (text)
    - `assignee_id` (uuid, FK to profiles, nullable)
    - `status` (text: 'new', 'in_progress', 'blocked', 'done')
    - `priority` (text: 'low', 'medium', 'high', 'urgent')
    - `due_date` (date, nullable)
    - `attachment_count` (integer, default 0)
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  - `task_comments` - Task discussion threads
    - `id` (uuid, primary key)
    - `task_id` (uuid, FK to tasks)
    - `user_id` (uuid, FK to profiles)
    - `content` (text)
    - `created_at` (timestamptz)

  ### Time Tracking
  - `timesheets` - Time logging for tasks
    - `id` (uuid, primary key)
    - `user_id` (uuid, FK to profiles)
    - `task_id` (uuid, FK to tasks)
    - `project_id` (uuid, FK to projects)
    - `date` (date)
    - `hours` (numeric)
    - `billable` (boolean, default true)
    - `note` (text, nullable)
    - `created_at` (timestamptz)

  ### Financial Documents
  - `sales_orders` - Customer sales orders
    - `id` (uuid, primary key)
    - `project_id` (uuid, FK to projects, nullable)
    - `order_number` (text, unique)
    - `partner_name` (text)
    - `order_date` (date)
    - `amount` (numeric)
    - `status` (text: 'draft', 'confirmed', 'cancelled')
    - `created_at` (timestamptz)

  - `purchase_orders` - Vendor purchase orders
    - `id` (uuid, primary key)
    - `project_id` (uuid, FK to projects, nullable)
    - `order_number` (text, unique)
    - `vendor_name` (text)
    - `order_date` (date)
    - `amount` (numeric)
    - `status` (text: 'draft', 'sent', 'received', 'cancelled')
    - `created_at` (timestamptz)

  - `customer_invoices` - Customer billing
    - `id` (uuid, primary key)
    - `project_id` (uuid, FK to projects, nullable)
    - `sales_order_id` (uuid, FK to sales_orders, nullable)
    - `invoice_number` (text, unique)
    - `partner_name` (text)
    - `invoice_date` (date)
    - `amount` (numeric)
    - `status` (text: 'draft', 'sent', 'paid', 'cancelled')
    - `created_at` (timestamptz)

  - `vendor_bills` - Vendor invoices
    - `id` (uuid, primary key)
    - `project_id` (uuid, FK to projects, nullable)
    - `purchase_order_id` (uuid, FK to purchase_orders, nullable)
    - `bill_number` (text, unique)
    - `vendor_name` (text)
    - `bill_date` (date)
    - `amount` (numeric)
    - `status` (text: 'draft', 'posted', 'paid', 'cancelled')
    - `created_at` (timestamptz)

  - `expenses` - Team expenses
    - `id` (uuid, primary key)
    - `project_id` (uuid, FK to projects, nullable)
    - `user_id` (uuid, FK to profiles)
    - `description` (text)
    - `amount` (numeric)
    - `expense_date` (date)
    - `billable` (boolean, default false)
    - `status` (text: 'draft', 'submitted', 'approved', 'rejected', 'reimbursed')
    - `created_at` (timestamptz)

  ## Security
  - Enable RLS on all tables
  - Policies for role-based access control
  - Authenticated users can view data based on their role
  - Project managers can manage their projects
  - Admins have full access
  - Users can manage their own timesheets and expenses

  ## Indexes
  - Foreign key indexes for performance
  - Status and date range queries optimization
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  avatar_url text,
  role text NOT NULL DEFAULT 'team_member' CHECK (role IN ('admin', 'project_manager', 'team_member', 'sales', 'finance')),
  hourly_rate numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create projects table
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  client_name text NOT NULL,
  project_manager_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'on_hold', 'completed', 'cancelled')),
  start_date date NOT NULL,
  end_date date,
  budget numeric DEFAULT 0,
  budget_spent numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text DEFAULT '',
  assignee_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'blocked', 'done')),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  due_date date,
  attachment_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create task comments table
CREATE TABLE IF NOT EXISTS task_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create timesheets table
CREATE TABLE IF NOT EXISTS timesheets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  date date NOT NULL,
  hours numeric NOT NULL CHECK (hours > 0),
  billable boolean DEFAULT true,
  note text,
  created_at timestamptz DEFAULT now()
);

-- Create sales orders table
CREATE TABLE IF NOT EXISTS sales_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  order_number text UNIQUE NOT NULL,
  partner_name text NOT NULL,
  order_date date NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'confirmed', 'cancelled')),
  created_at timestamptz DEFAULT now()
);

-- Create purchase orders table
CREATE TABLE IF NOT EXISTS purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  order_number text UNIQUE NOT NULL,
  vendor_name text NOT NULL,
  order_date date NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'received', 'cancelled')),
  created_at timestamptz DEFAULT now()
);

-- Create customer invoices table
CREATE TABLE IF NOT EXISTS customer_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  sales_order_id uuid REFERENCES sales_orders(id) ON DELETE SET NULL,
  invoice_number text UNIQUE NOT NULL,
  partner_name text NOT NULL,
  invoice_date date NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'cancelled')),
  created_at timestamptz DEFAULT now()
);

-- Create vendor bills table
CREATE TABLE IF NOT EXISTS vendor_bills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  purchase_order_id uuid REFERENCES purchase_orders(id) ON DELETE SET NULL,
  bill_number text UNIQUE NOT NULL,
  vendor_name text NOT NULL,
  bill_date date NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'posted', 'paid', 'cancelled')),
  created_at timestamptz DEFAULT now()
);

-- Create expenses table
CREATE TABLE IF NOT EXISTS expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  description text NOT NULL,
  amount numeric NOT NULL CHECK (amount > 0),
  expense_date date NOT NULL,
  billable boolean DEFAULT false,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected', 'reimbursed')),
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_projects_pm ON projects(project_manager_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_timesheets_user ON timesheets(user_id);
CREATE INDEX IF NOT EXISTS idx_timesheets_project ON timesheets(project_id);
CREATE INDEX IF NOT EXISTS idx_timesheets_date ON timesheets(date);
CREATE INDEX IF NOT EXISTS idx_sales_orders_project ON sales_orders(project_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_project ON purchase_orders(project_id);
CREATE INDEX IF NOT EXISTS idx_customer_invoices_project ON customer_invoices(project_id);
CREATE INDEX IF NOT EXISTS idx_vendor_bills_project ON vendor_bills(project_id);
CREATE INDEX IF NOT EXISTS idx_expenses_project ON expenses(project_id);
CREATE INDEX IF NOT EXISTS idx_expenses_user ON expenses(user_id);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE timesheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- RLS Policies for projects
CREATE POLICY "Users can view all projects"
  ON projects FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Project managers can create projects"
  ON projects FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'project_manager')
    )
  );

CREATE POLICY "Project managers and admins can update projects"
  ON projects FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.role = 'admin' OR (profiles.role = 'project_manager' AND projects.project_manager_id = auth.uid()))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.role = 'admin' OR (profiles.role = 'project_manager' AND projects.project_manager_id = auth.uid()))
    )
  );

CREATE POLICY "Admins can delete projects"
  ON projects FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies for tasks
CREATE POLICY "Users can view all tasks"
  ON tasks FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create tasks"
  ON tasks FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update tasks they own or are assigned to"
  ON tasks FOR UPDATE
  TO authenticated
  USING (
    assignee_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = tasks.project_id
      AND projects.project_manager_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    assignee_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = tasks.project_id
      AND projects.project_manager_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Users can delete tasks they manage"
  ON tasks FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = tasks.project_id
      AND projects.project_manager_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies for task comments
CREATE POLICY "Users can view all task comments"
  ON task_comments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create task comments"
  ON task_comments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own comments"
  ON task_comments FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments"
  ON task_comments FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for timesheets
CREATE POLICY "Users can view timesheets"
  ON timesheets FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'project_manager', 'finance')
    )
  );

CREATE POLICY "Users can create own timesheets"
  ON timesheets FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own timesheets"
  ON timesheets FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own timesheets"
  ON timesheets FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for sales orders
CREATE POLICY "Users can view sales orders"
  ON sales_orders FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Sales and admin can create sales orders"
  ON sales_orders FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'sales', 'project_manager')
    )
  );

CREATE POLICY "Sales and admin can update sales orders"
  ON sales_orders FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'sales', 'project_manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'sales', 'project_manager')
    )
  );

CREATE POLICY "Admins can delete sales orders"
  ON sales_orders FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies for purchase orders
CREATE POLICY "Users can view purchase orders"
  ON purchase_orders FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and PMs can create purchase orders"
  ON purchase_orders FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'project_manager')
    )
  );

CREATE POLICY "Admins and PMs can update purchase orders"
  ON purchase_orders FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'project_manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'project_manager')
    )
  );

CREATE POLICY "Admins can delete purchase orders"
  ON purchase_orders FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies for customer invoices
CREATE POLICY "Users can view customer invoices"
  ON customer_invoices FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Finance and admin can create customer invoices"
  ON customer_invoices FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'finance', 'project_manager')
    )
  );

CREATE POLICY "Finance and admin can update customer invoices"
  ON customer_invoices FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'finance', 'project_manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'finance', 'project_manager')
    )
  );

CREATE POLICY "Admins can delete customer invoices"
  ON customer_invoices FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies for vendor bills
CREATE POLICY "Users can view vendor bills"
  ON vendor_bills FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Finance and admin can create vendor bills"
  ON vendor_bills FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'finance', 'project_manager')
    )
  );

CREATE POLICY "Finance and admin can update vendor bills"
  ON vendor_bills FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'finance', 'project_manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'finance', 'project_manager')
    )
  );

CREATE POLICY "Admins can delete vendor bills"
  ON vendor_bills FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies for expenses
CREATE POLICY "Users can view expenses"
  ON expenses FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'finance', 'project_manager')
    )
  );

CREATE POLICY "Users can create own expenses"
  ON expenses FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own expenses"
  ON expenses FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'finance')
    )
  )
  WITH CHECK (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'finance')
    )
  );

CREATE POLICY "Users can delete own expenses"
  ON expenses FOR DELETE
  TO authenticated
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );