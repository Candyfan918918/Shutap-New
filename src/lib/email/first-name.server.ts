// Looks up a recipient's first name for an email (rules in ./first-name.ts).
import { firstNameFor } from './first-name'

export async function recipientFirstName(userId: string, email: string): Promise<string | null> {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
  const [profile, alias, auth] = await Promise.all([
    supabaseAdmin.from('profiles').select('first_name').eq('user_id', userId).maybeSingle(),
    supabaseAdmin
      .from('aliases')
      .select('display_name, emotion, nation, creature')
      .eq('user_id', userId)
      .maybeSingle(),
    supabaseAdmin.auth.admin.getUserById(userId),
  ])
  const md = (auth.data?.user?.user_metadata ?? {}) as { full_name?: string; name?: string }
  return firstNameFor({
    profileFirstName: (profile.data as { first_name?: string | null } | null)?.first_name ?? null,
    metaName: md.full_name || md.name || null,
    alias: alias.data as never,
    email,
  })
}
