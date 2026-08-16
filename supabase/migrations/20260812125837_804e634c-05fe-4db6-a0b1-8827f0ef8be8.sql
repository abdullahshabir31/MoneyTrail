
CREATE TYPE public.txn_type AS ENUM ('income','expense');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  currency text NOT NULL DEFAULT 'PKR',
  theme text NOT NULL DEFAULT 'system',
  notify_budget boolean NOT NULL DEFAULT true,
  notify_recurring boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile" ON public.profiles FOR ALL TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  type public.txn_type NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, type, name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own categories" ON public.categories FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  name text NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  usage_count integer NOT NULL DEFAULT 0,
  last_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (category_id, name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.items TO authenticated;
GRANT ALL ON public.items TO service_role;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own items" ON public.items FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type public.txn_type NOT NULL,
  amount numeric(14,2) NOT NULL CHECK (amount > 0),
  date date NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  category_id uuid REFERENCES public.categories(id) ON DELETE RESTRICT,
  item_id uuid REFERENCES public.items(id) ON DELETE RESTRICT,
  description text,
  note text,
  payment_method text NOT NULL DEFAULT 'Cash',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transactions TO authenticated;
GRANT ALL ON public.transactions TO service_role;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own transactions" ON public.transactions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX transactions_user_date_idx ON public.transactions (user_id, date DESC);

CREATE TABLE public.budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  month date NOT NULL,
  amount numeric(14,2) NOT NULL CHECK (amount > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, category_id, month)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.budgets TO authenticated;
GRANT ALL ON public.budgets TO service_role;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own budgets" ON public.budgets FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.recurring_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type public.txn_type NOT NULL DEFAULT 'expense',
  amount numeric(14,2) NOT NULL CHECK (amount > 0),
  category_id uuid REFERENCES public.categories(id) ON DELETE RESTRICT,
  item_id uuid REFERENCES public.items(id) ON DELETE RESTRICT,
  frequency text NOT NULL DEFAULT 'monthly',
  next_date date NOT NULL,
  payment_method text NOT NULL DEFAULT 'Cash',
  note text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recurring_transactions TO authenticated;
GRANT ALL ON public.recurring_transactions TO service_role;
ALTER TABLE public.recurring_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own recurring" ON public.recurring_transactions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER transactions_updated_at BEFORE UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.ensure_user_setup()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  defaults jsonb := '[
    {"type":"expense","name":"Food","items":["Pizza","Burger","Biryani","Shawarma","Fries","Coffee","Restaurant","Fast Food"]},
    {"type":"expense","name":"Groceries","items":["Vegetables","Fruits","Milk","Bread","Meat","Rice"]},
    {"type":"expense","name":"Transport","items":["Petrol","Uber","Bus","Taxi","Parking"]},
    {"type":"expense","name":"Shopping","items":["Clothes","Shoes","Electronics","Accessories"]},
    {"type":"expense","name":"Bills","items":["Electricity","Gas","Water","Mobile"]},
    {"type":"expense","name":"Utilities","items":["Internet","Maintenance","Repairs"]},
    {"type":"expense","name":"Entertainment","items":["Movies","Games","Outing"]},
    {"type":"expense","name":"Health","items":["Medicine","Doctor","Gym"]},
    {"type":"expense","name":"Education","items":["Books","Fees","Courses"]},
    {"type":"expense","name":"Rent","items":["Home Rent","Office Rent"]},
    {"type":"expense","name":"Travel","items":["Tickets","Hotel","Fuel"]},
    {"type":"expense","name":"Subscriptions","items":["Netflix","Spotify","YouTube Premium"]},
    {"type":"expense","name":"Other","items":["Misc"]},
    {"type":"income","name":"Salary","items":["Monthly Salary","Bonus"]},
    {"type":"income","name":"Freelance","items":["Project","Client Payment"]},
    {"type":"income","name":"Business","items":["Sales","Profit"]},
    {"type":"income","name":"Gift","items":["Gift"]},
    {"type":"income","name":"Investment","items":["Dividend","Interest"]},
    {"type":"income","name":"Other","items":["Misc"]}
  ]'::jsonb;
  cat jsonb;
  cat_id uuid;
  itm text;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;

  INSERT INTO public.profiles (id) VALUES (uid) ON CONFLICT (id) DO NOTHING;

  IF EXISTS (SELECT 1 FROM public.categories WHERE user_id = uid) THEN RETURN; END IF;

  FOR cat IN SELECT * FROM jsonb_array_elements(defaults) LOOP
    INSERT INTO public.categories (user_id, name, type, is_default)
    VALUES (uid, cat->>'name', (cat->>'type')::public.txn_type, true)
    RETURNING id INTO cat_id;
    FOR itm IN SELECT jsonb_array_elements_text(cat->'items') LOOP
      INSERT INTO public.items (user_id, category_id, name, is_default)
      VALUES (uid, cat_id, itm, true) ON CONFLICT DO NOTHING;
    END LOOP;
  END LOOP;
END; $$;

GRANT EXECUTE ON FUNCTION public.ensure_user_setup() TO authenticated;
