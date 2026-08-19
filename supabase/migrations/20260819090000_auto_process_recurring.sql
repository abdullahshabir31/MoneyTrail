-- Automatically executes recurring transactions when their scheduled date
-- arrives, instead of requiring the user to open the app and click
-- "Log now" (see RecurringPage.jsx's `logNow`, which is left in place for
-- logging something early/manually — this migration adds the automatic
-- path on top of it).
--
-- Supabase Postgres ships the pg_cron extension, which lets the database
-- itself run a SQL job on a schedule. That's what actually gives "money is
-- deducted automatically every month on that date" even if the app is
-- never opened — nothing purely client-side (like the visibility-based
-- revalidation in useDataQuery.js) could ever do that, since there'd be no
-- browser tab open to run the JS.

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

-- Advances a date by one cycle of the given frequency. Mirrors
-- src/lib/finance.js's nextOccurrence() so the server-side schedule stays
-- in step with what the client shows/expects.
CREATE OR REPLACE FUNCTION public.recurring_next_date(d date, freq text)
RETURNS date
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE freq
    WHEN 'daily' THEN d + INTERVAL '1 day'
    WHEN 'weekly' THEN d + INTERVAL '7 days'
    WHEN 'yearly' THEN d + INTERVAL '1 year'
    ELSE d + INTERVAL '1 month'
  END::date;
$$;

-- Runs as a scheduled job (see cron.schedule below), not on behalf of any
-- signed-in user, so it's SECURITY DEFINER and deliberately bypasses RLS —
-- it has to sweep every user's due recurring transactions in one pass,
-- not just one signed-in user's like the client-side RPCs do.
CREATE OR REPLACE FUNCTION public.process_due_recurring()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT * FROM public.recurring_transactions
    WHERE is_active = true AND next_date <= (now() AT TIME ZONE 'utc')::date
    ORDER BY next_date
  LOOP
    -- Catch up on every cycle that's due, not just one — covers the rare
    -- case where the job didn't run for a while (e.g. a paused project).
    WHILE r.next_date <= (now() AT TIME ZONE 'utc')::date LOOP
      INSERT INTO public.transactions
        (user_id, type, amount, date, category_id, item_id, description, payment_method)
      VALUES
        (r.user_id, r.type, r.amount, r.next_date, r.category_id, r.item_id, 'Recurring', r.payment_method);

      -- Same "recently used" bump useSaveTransaction() does for a manual
      -- entry, so auto-logged items still show up in recent-item suggestions.
      IF r.item_id IS NOT NULL THEN
        UPDATE public.items
        SET usage_count = usage_count + 1, last_used_at = now()
        WHERE id = r.item_id;
      END IF;

      r.next_date := public.recurring_next_date(r.next_date, r.frequency);
    END LOOP;

    UPDATE public.recurring_transactions
    SET next_date = r.next_date
    WHERE id = r.id;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.process_due_recurring() FROM PUBLIC, anon, authenticated;

-- Speeds up the WHERE clause above once a user has many recurring rules.
CREATE INDEX IF NOT EXISTS recurring_transactions_due_idx
  ON public.recurring_transactions (next_date)
  WHERE is_active;

-- Schedule it to run once a day, just after midnight UTC. Guarded so
-- re-running this migration (or applying it twice) doesn't create a
-- duplicate cron job.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'process-due-recurring') THEN
    PERFORM cron.unschedule('process-due-recurring');
  END IF;
  PERFORM cron.schedule(
    'process-due-recurring',
    '10 0 * * *',
    $$SELECT public.process_due_recurring();$$
  );
END $$;
