-- ─── Fix: ensure authenticated users can read profiles needed for repair requests ───
-- This is idempotent — safe to re-run.

-- 1. Re-ensure the permissive read policy exists (was added in 20260305123000 but may not be live)
DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON public.profiles;
CREATE POLICY "Authenticated users can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- 2. Create a SECURITY DEFINER RPC that lets a company fetch profiles of their requesters.
--    SECURITY DEFINER means it runs as the DB owner, bypassing RLS entirely.
CREATE OR REPLACE FUNCTION public.get_profiles_for_requests(user_ids UUID[])
RETURNS TABLE (
  id UUID,
  name TEXT,
  phone TEXT,
  avatar_url TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.name, p.phone, p.avatar_url
  FROM public.profiles p
  WHERE p.id = ANY(user_ids);
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_profiles_for_requests(UUID[]) TO authenticated;
