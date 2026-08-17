-- Adds account balance tracking + transfers between payment methods.
--
-- Payment methods (Cash, Bank, Easypaisa, JazzCash, ...) already exist as
-- `public.payment_methods`. This migration turns each one into a proper
-- "account" with a running balance:
--
--   balance = opening_balance
--             + sum(income transactions on this method)
--             - sum(expense transactions on this method)
--             + sum(transfers received)
--             - sum(transfers sent)
--
-- `opening_balance` lets a user tell the app how much was already in an
-- account before they started tracking it. `account_transfers` records
-- moving money from one of the user's own accounts to another (e.g.
-- JazzCash -> Easypaisa) without it counting as income or expense.
--
-- No existing tables are dropped or altered destructively.

ALTER TABLE public.payment_methods
  ADD COLUMN IF NOT EXISTS opening_balance numeric(14,2) NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.account_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  from_method text NOT NULL,
  to_method text NOT NULL,
  amount numeric(14,2) NOT NULL CHECK (amount > 0),
  date date NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT account_transfers_distinct_accounts CHECK (from_method <> to_method)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.account_transfers TO authenticated;
GRANT ALL ON public.account_transfers TO service_role;
ALTER TABLE public.account_transfers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own account transfers" ON public.account_transfers FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS account_transfers_user_date_idx
  ON public.account_transfers (user_id, date DESC);
