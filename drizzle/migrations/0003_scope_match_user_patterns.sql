CREATE OR REPLACE FUNCTION public.match_user_patterns(p_user uuid, q vector, match_count integer DEFAULT 1, similarity_floor double precision DEFAULT 0.78)
 RETURNS TABLE(id uuid, name text, district text, similarity double precision)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT mp.id, mp.name, mp.district, 1 - (mp.embedding <=> q) AS similarity
  FROM public.mirror_patterns mp
  WHERE mp.user_id = p_user
    AND (p_user = auth.uid() OR auth.role() = 'service_role')
    AND mp.is_demo = false
    AND mp.embedding IS NOT NULL
    AND 1 - (mp.embedding <=> q) >= similarity_floor
  ORDER BY mp.embedding <=> q
  LIMIT match_count;
$function$;
REVOKE EXECUTE ON FUNCTION public.match_user_patterns(uuid, vector, integer, double precision) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.match_user_patterns(uuid, vector, integer, double precision) TO authenticated, service_role;