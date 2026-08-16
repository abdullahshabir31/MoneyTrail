-- Expands the default categories/items/payment-methods that get seeded
-- into every account (existing users get topped up, new users get the
-- full set on signup).
--
-- IMPORTANT: this migration is purely additive.
--   - Nothing is deleted.
--   - No existing category, item, or payment method is renamed or altered.
--   - "Fuel" (Travel) stays in the list.
--   - Every insert below goes through the same idempotent
--     ON CONFLICT DO NOTHING pattern ensure_user_setup() already uses, so
--     running it for a user who already has some/all of these is always
--     safe — it only ever fills in what's missing, never touches what's
--     already there.
--
-- On top of the existing list, a few more commonly-needed items (and two
-- new categories: Personal Care, Insurance) have been added based on what
-- a typical expense/income tracker usually needs.

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
    {"type":"expense","name":"Bills","items":["Electricity","Gas","Mobile","Water","Internet","PTCL/Landline"]},
    {"type":"expense","name":"Education","items":["Books","Courses","Fees","Stationery","Tuition"]},
    {"type":"expense","name":"Entertainment","items":["Games","Movies","Outing","Concerts & Events"]},
    {"type":"expense","name":"Food","items":["Biryani","Burger","Coffee","Fast Food","Fries","Pizza","Restaurant","Shawarma","Tea","Snacks"]},
    {"type":"expense","name":"Groceries","items":["Bread","Fruits","Meat","Milk","Rice","Vegetables","Eggs","Cooking Oil","Spices"]},
    {"type":"expense","name":"Health","items":["Doctor","Gym","Medicine","Dental","Lab Tests"]},
    {"type":"expense","name":"Insurance","items":["Life Insurance","Health Insurance","Vehicle Insurance"]},
    {"type":"expense","name":"Other","items":["Misc","Donation & Charity","Gifts Given"]},
    {"type":"expense","name":"Personal Care","items":["Haircut","Skincare","Cosmetics"]},
    {"type":"expense","name":"Rent","items":["Home Rent","Office Rent"]},
    {"type":"expense","name":"Shopping","items":["Accessories","Clothes","Electronics","Shoes","Home Decor"]},
    {"type":"expense","name":"Subscriptions","items":["Netflix","Spotify","YouTube Premium","Amazon Prime","Cloud Storage"]},
    {"type":"expense","name":"Transport","items":["Bus","Parking","Petrol","Taxi","Uber","Rickshaw","Car Maintenance","Metro/Train"]},
    {"type":"expense","name":"Travel","items":["Fuel","Hotel","Tickets","Visa","Travel Insurance"]},
    {"type":"expense","name":"Utilities","items":["Internet","Maintenance","Repairs","Cable TV"]},
    {"type":"income","name":"Business","items":["Profit","Sales","Refund"]},
    {"type":"income","name":"Freelance","items":["Client Payment","Project","Royalty"]},
    {"type":"income","name":"Gift","items":["Gift","Cashback"]},
    {"type":"income","name":"Investment","items":["Dividend","Interest","Capital Gains"]},
    {"type":"income","name":"Other","items":["Misc","Reimbursement"]},
    {"type":"income","name":"Salary","items":["Bonus","Monthly Salary","Overtime"]}
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
  -- idempotent (ON CONFLICT DO NOTHING), so this only ever fills in
  -- whatever's missing for a user — new categories, new items inside an
  -- existing category, etc. Nothing already present is ever touched,
  -- changed, or removed.
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
