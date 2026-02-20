
-- ==============================================
-- FinFlow Database Schema
-- ==============================================

-- 1. Role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'executive', 'warehouse', 'fulfillment');

-- 2. Profiles table (auto-created on signup)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- 3. User roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checks
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1
$$;

CREATE POLICY "Users can view all roles" ON public.user_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 4. Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), NEW.email);
  
  -- First user gets admin role, others get no role (admin assigns)
  IF (SELECT COUNT(*) FROM public.user_roles) = 0 THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Products table
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku TEXT NOT NULL UNIQUE,
  barcode TEXT,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  cost NUMERIC(12,2) DEFAULT 0,
  retail_price NUMERIC(12,2) DEFAULT 0,
  wholesale_price NUMERIC(12,2) DEFAULT 0,
  current_stock INTEGER DEFAULT 0,
  reorder_point INTEGER DEFAULT 10,
  reorder_quantity INTEGER DEFAULT 50,
  weight NUMERIC(8,2),
  weight_unit TEXT DEFAULT 'lb',
  supplier TEXT,
  lead_time_days INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view products" ON public.products FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/warehouse can manage products" ON public.products FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'warehouse'));

-- 6. Inventory Locations
CREATE TABLE public.inventory_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT DEFAULT 'warehouse',
  address TEXT,
  manager TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.inventory_locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view locations" ON public.inventory_locations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/warehouse can manage locations" ON public.inventory_locations FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'warehouse'));

-- 7. Product Location Stock
CREATE TABLE public.product_location_stocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  location_id UUID REFERENCES public.inventory_locations(id) ON DELETE CASCADE NOT NULL,
  quantity INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (product_id, location_id)
);

ALTER TABLE public.product_location_stocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view stocks" ON public.product_location_stocks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/warehouse can manage stocks" ON public.product_location_stocks FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'warehouse'));

-- 8. Inventory Movements
CREATE TABLE public.inventory_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  sku TEXT,
  quantity INTEGER NOT NULL,
  from_location_id UUID REFERENCES public.inventory_locations(id),
  to_location_id UUID REFERENCES public.inventory_locations(id),
  movement_type TEXT NOT NULL DEFAULT 'transfer',
  notes TEXT,
  reference_id TEXT,
  created_date TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view movements" ON public.inventory_movements FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/warehouse can manage movements" ON public.inventory_movements FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'warehouse'));

-- 9. Customers
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL DEFAULT '',
  company TEXT,
  status TEXT DEFAULT 'active',
  channel TEXT DEFAULT 'd2c',
  tags TEXT[] DEFAULT '{}',
  notes TEXT,
  lifetime_value NUMERIC(12,2) DEFAULT 0,
  created_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view customers" ON public.customers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/exec can manage customers" ON public.customers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'executive'));

-- 10. Transactions
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL DEFAULT 'revenue',
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  category TEXT,
  channel TEXT DEFAULT 'd2c',
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT,
  sku TEXT,
  quantity INTEGER,
  shipping_cost NUMERIC(12,2),
  unit_shipping_cost NUMERIC(12,2),
  customer_id UUID REFERENCES public.customers(id),
  order_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view transactions" ON public.transactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/exec can manage transactions" ON public.transactions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'executive'));

-- 11. SKU Mappings
CREATE TABLE public.sku_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_sku TEXT NOT NULL,
  internal_sku TEXT NOT NULL,
  customer_name TEXT,
  product_id UUID REFERENCES public.products(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.sku_mappings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view mappings" ON public.sku_mappings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin can manage mappings" ON public.sku_mappings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 12. App Settings
CREATE TABLE public.app_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT NOT NULL UNIQUE,
  setting_value TEXT NOT NULL DEFAULT '',
  setting_type TEXT DEFAULT 'general',
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view settings" ON public.app_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin can manage settings" ON public.app_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 13. Inventory Snapshots
CREATE TABLE public.inventory_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date DATE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  sku TEXT,
  product_name TEXT,
  total_stock INTEGER DEFAULT 0,
  location_breakdown JSONB DEFAULT '[]',
  reorder_point INTEGER,
  cost NUMERIC(12,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.inventory_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view snapshots" ON public.inventory_snapshots FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin can manage snapshots" ON public.inventory_snapshots FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 14. Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_inventory_locations_updated_at BEFORE UPDATE ON public.inventory_locations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_product_location_stocks_updated_at BEFORE UPDATE ON public.product_location_stocks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_app_settings_updated_at BEFORE UPDATE ON public.app_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 15. Indexes for performance
CREATE INDEX idx_transactions_date ON public.transactions(date);
CREATE INDEX idx_transactions_type ON public.transactions(type);
CREATE INDEX idx_transactions_customer ON public.transactions(customer_id);
CREATE INDEX idx_transactions_order ON public.transactions(order_id);
CREATE INDEX idx_products_sku ON public.products(sku);
CREATE INDEX idx_products_category ON public.products(category);
CREATE INDEX idx_inventory_movements_product ON public.inventory_movements(product_id);
CREATE INDEX idx_inventory_snapshots_date ON public.inventory_snapshots(snapshot_date);
CREATE INDEX idx_inventory_snapshots_product ON public.inventory_snapshots(product_id);
CREATE INDEX idx_sku_mappings_customer_sku ON public.sku_mappings(customer_sku);
CREATE INDEX idx_customers_email ON public.customers(email);
