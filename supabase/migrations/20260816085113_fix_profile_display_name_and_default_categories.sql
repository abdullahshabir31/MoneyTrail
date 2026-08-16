-- Fixes two issues in public.ensure_user_setup():
--
-- 1. The profile row was created with no display_name, even though the
--    signup form already collects one and passes it as
--    auth.users.raw_user_meta_data->>'display_name'. New profiles now pick
--    that value up; existing profiles that are still missing a
--    display_name are backfilled the same way (a display_name the user has
--    already set/edited themselves is never overwritten).
--
-- 2. Default categories/items were only created the very first time a user
--    had zero categories — a single custom category was enough to make the
--    function skip default setup entirely, and there was no way to safely
--    top up a user who was missing some (but not all) defaults. Category
--    and item creation is now per-row idempotent (ON CONFLICT DO NOTHING
--    against the existing unique constraints), so running this any number
--    of times for any user — new or existing — only ever fills in what's
--    missing and never touches existing custom or default data.
--
-- No tables are dropped, reset, or have data deleted. RLS policies are
-- unchanged.

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
  cat jsonb;
  cat_id uuid;
  itm text;
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
END; $$;

REVOKE ALL ON FUNCTION public.ensure_user_setup() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ensure_user_setup() TO authenticated;
