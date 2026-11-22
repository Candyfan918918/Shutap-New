// Shutap for small business: My creations (Nov 21 2026). Server only.
// A finished video is kept 30 days in a private bucket, then deleted. Only
// its owner is ever handed a link to it, and the link lasts an hour.
import { today } from '../bits/tier.server'

export const VIDEO_BUCKET = 'shop-videos'
export const videoPath = (userId: string, videoId: string, ext: 'mp4' | 'webm') => `${userId}/${videoId}.${ext}`

/** Delete every stored video that is past its day. Returns how many. Rows
 *  stay (the plan's count stays true); the file and its path go. */
export async function cleanUpVideos(admin: any): Promise<{ due: number; removed: number; errors: string[] }> {
  const errors: string[] = []
  const { data, error } = await admin.from('shop_videos').select('id, storage_path').lte('delete_on', today().day).is('deleted_at', null).limit(500)
  if (error) return { due: 0, removed: 0, errors: [error.message] }
  const rows = (data ?? []) as { id: string; storage_path: string | null }[]
  let removed = 0
  for (let i = 0; i < rows.length; i += 50) {
    const batch = rows.slice(i, i + 50)
    const paths = batch.map((r) => r.storage_path).filter((p): p is string => !!p)
    if (paths.length) {
      const rm = await admin.storage.from(VIDEO_BUCKET).remove(paths)
      // a file that will not delete keeps its row for the next night
      if (rm.error) { errors.push(rm.error.message); continue }
    }
    const up = await admin.from('shop_videos').update({ deleted_at: new Date().toISOString(), storage_path: null }).in('id', batch.map((r) => r.id))
    if (up.error) errors.push(up.error.message)
    else removed += batch.length
  }
  return { due: rows.length, removed, errors }
}
