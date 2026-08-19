-- Moves the daily recurring-transactions sweep to run right at midnight
-- Pakistan time (Asia/Karachi, UTC+5).

-- Compare against the Pakistan-local date rather than the UTC date,
-- so recurring dates line up with the user's local calendar date.
CREATE OR REPLACE FUNCTION public.process_due_recurring()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
  today date := (now() AT TIME ZONE 'Asia/Karachi')::date;
BEGIN
  FOR r IN
    SELECT *
    FROM public.recurring_transactions
    WHERE is_active = true
      AND next_date <= today
    ORDER BY next_date
  LOOP

    -- Catch up on every cycle that is due.
    WHILE r.next_date <= today LOOP

      INSERT INTO public.transactions
        (
          user_id,
          type,
          amount,
          date,
          category_id,
          item_id,
          description,
          payment_method
        )
      VALUES
        (
          r.user_id,
          r.type,
          r.amount,
          r.next_date,
          r.category_id,
          r.item_id,
          'Recurring',
          r.payment_method
        );

      -- Update recently-used item information.
      IF r.item_id IS NOT NULL THEN
        UPDATE public.items
        SET
          usage_count = usage_count + 1,
          last_used_at = now()
        WHERE id = r.item_id;
      END IF;

      -- Move to the next occurrence.
      r.next_date := public.recurring_next_date(
        r.next_date,
        r.frequency
      );

    END LOOP;

    -- Save the next future occurrence.
    UPDATE public.recurring_transactions
    SET next_date = r.next_date
    WHERE id = r.id;

  END LOOP;
END;
$$;

REVOKE ALL
ON FUNCTION public.process_due_recurring()
FROM PUBLIC, anon, authenticated;

-- Run the recurring processor at 00:01 Pakistan time.
-- 00:01 PKT = 19:01 UTC.
DO $$
BEGIN

  IF EXISTS (
    SELECT 1
    FROM cron.job
    WHERE jobname = 'process-due-recurring'
  ) THEN
    PERFORM cron.unschedule('process-due-recurring');
  END IF;

  PERFORM cron.schedule(
    'process-due-recurring',
    '1 19 * * *',
    $cron$SELECT public.process_due_recurring();$cron$
  );

END;
$$;