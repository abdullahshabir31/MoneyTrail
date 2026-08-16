-- Adds per-user, custom payment methods.
--
-- Payment methods used to be a hardcoded list shared by every user
-- (src/lib/finance.js -> PAYMENT_METHODS). This migration moves them into
-- their own table, scoped by RLS exactly like categories/items, so each
-- user can add their own payment methods (e.g. a specific bank account or
-- wallet) and only ever sees their own. A fixed set of defaults (Cash,
-- Debit Card, Credit Card, Bank Transfer, Easypaisa, JazzCash, Other) is
-- seeded per-user by public.ensure_user_setup(), the same function that
-- seeds default categories/items, using the same idempotent "top up"
-- pattern so it's safe to run for both new and existing users.
--
-- No existing tables are dropped or altered. transactions.payment_method
-- stays a free-form text column (unchanged) — it just stores the name of
-- whichever payment method (default or custom) the user picked.

CREATE TABLE public.payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_methods TO authenticated;
GRANT ALL ON public.payment_methods TO service_role;
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own payment methods" ON public.payment_methods FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.ensure_user_setup()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  meta_name text;
  defaults jsonb := '[
    {"type":"expense","name":"Bills","items":["Electricity","Gas","Mobile","Water"]},
    {"type":"expense","name":"Education","items":["Books","Courses","Fees"]},
    {"type":"expense","name":"Entertainment","items":["Games","Movies","Outing"]},
    {"type":"expense","name":"Food","items":["Biryani","Burger","Coffee","Fast Food","Fries","Pizza","Restaurant","Shawarma"]},
    {"type":"expense","name":"Groceries","items":["Bread","Fruits","Meat","Milk","Rice","Vegetables"]},
    {"type":"expense","name":"Health","items":["Doctor","Gym","Medicine"]},
    {"type":"expense","name":"Other","items":["Misc"]},
    {"type":"expense","name":"Rent","items":["Home Rent","Office Rent"]},
    {"type":"expense","name":"Shopping","items":["Accessories","Clothes","Electronics","Shoes"]},
    {"type":"expense","name":"Subscriptions","items":["Netflix","Spotify","YouTube Premium"]},
    {"type":"expense","name":"Transport","items":["Bus","Parking","Petrol","Taxi","Uber"]},
    {"type":"expense","name":"Travel","items":["Fuel","Hotel","Tickets"]},
    {"type":"expense","name":"Utilities","items":["Internet","Maintenance","Repairs"]},
    {"type":"income","name":"Business","items":["Profit","Sales"]},
    {"type":"income","name":"Freelance","items":["Client Payment","Project"]},
    {"type":"income","name":"Gift","items":["Gift"]},
    {"type":"income","name":"Investment","items":["Dividend","Interest"]},
    {"type":"income","name":"Other","items":["Misc"]},
    {"type":"income","name":"Salary","items":["Bonus","Monthly Salary"]}
  ]'::jsonb;
  default_payment_methods text[] := ARRAY[
    'Cash', 'Debit Card', 'Credit Card', 'Bank Transfer', 'Easypaisa', 'JazzCash', 'Other'
  ];
  cat jsonb;
  cat_id uuid;
  itm text;
  pm text;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;

  -- Pull the display name entered at signup (stored on the auth user's
  -- metadata by the client). NULLIF/btrim collapses blank input to NULL.
  SELECT NULLIF(btrim(au.raw_user_meta_data->>'display_name'), '')
  INTO meta_name
  FROM auth.users au
  WHERE au.id = uid;

  -- Create the profile if it doesn't exist yet, with that display name.
  -- If the profile already exists, only fill display_name in when it's
  -- still empty — never clobber a name the user has since edited.
  INSERT INTO public.profiles (id, display_name)
  VALUES (uid, meta_name)
  ON CONFLICT (id) DO UPDATE
    SET display_name = COALESCE(public.profiles.display_name, EXCLUDED.display_name)
    WHERE public.profiles.display_name IS NULL;

  -- Top up default categories/items. Each insert is individually
  -- idempotent, so this safely fills gaps for existing users too instead
  -- of bailing out the moment any one category already exists.
  FOR cat IN SELECT * FROM jsonb_array_elements(defaults) LOOP
    cat_id := NULL;

    INSERT INTO public.categories (user_id, name, type, is_default)
    VALUES (uid, cat->>'name', (cat->>'type')::public.txn_type, true)
    ON CONFLICT (user_id, type, name) DO NOTHING
    RETURNING id INTO cat_id;

    IF cat_id IS NULL THEN
      SELECT id INTO cat_id
      FROM public.categories
      WHERE user_id = uid AND type = (cat->>'type')::public.txn_type AND name = cat->>'name';
    END IF;

    FOR itm IN SELECT jsonb_array_elements_text(cat->'items') LOOP
      INSERT INTO public.items (user_id, category_id, name, is_default)
      VALUES (uid, cat_id, itm, true)
      ON CONFLICT (category_id, name) DO NOTHING;
    END LOOP;
  END LOOP;

  -- Top up default payment methods the same idempotent way. A user is
  -- always free to rename/delete/hide these or add their own — this only
  -- ever fills in whichever defaults are still missing.
  FOREACH pm IN ARRAY default_payment_methods LOOP
    INSERT INTO public.payment_methods (user_id, name, is_default)
    VALUES (uid, pm, true)
    ON CONFLICT (user_id, name) DO NOTHING;
  END LOOP;
END; $$;

REVOKE ALL ON FUNCTION public.ensure_user_setup() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ensure_user_setup() TO authenticated;
