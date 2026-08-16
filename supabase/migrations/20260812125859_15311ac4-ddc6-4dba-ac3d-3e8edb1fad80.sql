REVOKE ALL ON FUNCTION public.ensure_user_setup() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ensure_user_setup() TO authenticated;