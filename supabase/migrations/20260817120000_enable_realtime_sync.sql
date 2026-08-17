-- Enables Supabase Realtime (Postgres change feed) for every table the app
-- reads through useFinance.js, so a change made on one device/tab shows up
-- live on every other open device/tab for the same account — not just after
-- that tab is backgrounded and refocused (see useDataQuery.js's
-- visibility/focus revalidation, which only covers the single-device case).
--
-- Wrapped in a DO block + catalog check because `ALTER PUBLICATION ...
-- ADD TABLE` errors if the table is already a member (e.g. re-running this
-- migration, or a table added by hand in the dashboard already).
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'profiles',
    'categories',
    'items',
    'payment_methods',
    'transactions',
    'budgets',
    'recurring_transactions',
    'account_transfers'
  ]
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;
