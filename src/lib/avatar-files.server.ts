// Uploaded profile pictures live in the public `avatars` bucket under
// `<userId>/`. Deleting a user row does not touch storage, so these helpers
// remove the files themselves: all of them when the account is deleted or
// the picture is removed, and the older ones when a new picture replaces
// them. The privacy policy (§8) promises this. Best-effort: a storage error
// is logged and never blocks the user's action.
import { supabaseAdmin } from '@/integrations/supabase/client.server'

export async function removeAvatarFiles(userId: string, keepPath?: string): Promise<void> {
  try {
    const { data, error } = await supabaseAdmin.storage.from('avatars').list(userId, { limit: 1000 })
    if (error || !data?.length) return
    const paths = data.map((f) => `${userId}/${f.name}`).filter((p) => p !== keepPath)
    if (paths.length) await supabaseAdmin.storage.from('avatars').remove(paths)
  } catch (e) {
    console.error('[avatars] cleanup failed', e instanceof Error ? e.message : e)
  }
}
