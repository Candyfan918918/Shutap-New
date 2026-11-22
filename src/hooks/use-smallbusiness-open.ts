// Is Shutap for small business open to this visitor? True when the
// smallbusiness flag is on (launched) or for an admin (testing while it is
// dark). Every link to /smallbusiness — the new homepage, the products menu,
// the footer — waits on this, so nobody is sent to a page they cannot open.
// One request per page load, shared by every caller.
import { useEffect, useState } from 'react'
import { getFlags } from '@/lib/flags.functions'
import { amIAdmin } from '@/lib/admin.functions'

let pending: Promise<boolean> | null = null
let known: boolean | null = null

export function smallBusinessOpen(): Promise<boolean> {
  if (!pending) {
    pending = (async () => {
      const flags = await getFlags().catch(() => null)
      if (flags?.smallbusiness) return true
      return await amIAdmin().catch(() => false)
    })().then((v) => { known = v; return v })
  }
  return pending
}

/** Clears the answer (after a sign-in or sign-out). */
export function resetSmallBusinessOpen() { pending = null; known = null }

/** null while unknown, then true or false. */
export function useSmallBusinessOpen(initial?: boolean): boolean | null {
  // starts the same on the server and in the browser (no hydration mismatch)
  const [open, setOpen] = useState<boolean | null>(initial ? true : null)
  useEffect(() => {
    if (initial) return
    let off = false
    if (known !== null) { setOpen(known); return }
    void smallBusinessOpen().then((v) => { if (!off) setOpen(v) })
    return () => { off = true }
  }, [initial])
  return open
}
