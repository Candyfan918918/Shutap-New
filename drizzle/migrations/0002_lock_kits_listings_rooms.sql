ALTER TABLE public.kits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kit_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kit_evals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.kits, public.kit_versions, public.kit_evals, public.listings FROM anon, authenticated;
GRANT ALL ON public.kits, public.kit_versions, public.kit_evals, public.listings TO service_role;
DROP POLICY IF EXISTS "rooms readable by anyone" ON public.rooms;
CREATE POLICY "rooms readable when visible" ON public.rooms FOR SELECT TO anon, authenticated
  USING (hidden = false OR auth.uid() = author_id);