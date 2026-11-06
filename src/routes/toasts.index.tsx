import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { z } from 'zod'
import { pageMeta } from '@/lib/seo/page-meta'
import { Footer } from '@/components/feed/Footer'
import { useIsAdmin } from '@/hooks/use-current-alias'
import { ToastForm } from '@/pages/toasts/ToastForm'
import { OCCASIONS, type Occasion } from '@/lib/toasts/shared'
import '@/components/feed/feed.css'
import '@/pages/realtors/realtors.css'

// Shutap Toasts (Nov 6 2026). /toasts is the product: the form (board 1).
// No waitlist (Candy, Nov 6: deleted; Toasts opens today). Writing is behind
// the toasts flag: until it's on, "write my toast" says it opens later today
// and admins can write. ?occasion= presets the form (the landing pages);
// ?prepaid= is the $12.99 return.
const TITLE = 'Shutap Toasts — your best man, maid of honor or holiday toast, funnier'
const DESC = 'Your stories about them, in your words, built into a toast: pause marks, a running clock, cue cards and a phone prompter. Best man, maid of honor, parents, Thanksgiving, holiday party, New Year’s, retirement, birthday, Toastmasters.'

export const Route = createFileRoute('/toasts/')({
  validateSearch: (s: Record<string, unknown>) => z.object({ occasion: z.enum(OCCASIONS).optional().catch(undefined), prepaid: z.string().max(200).optional().catch(undefined) }).parse(s),
  loader: async () => {
    const { getFlags } = await import('@/lib/flags.functions')
    const f = await getFlags().catch(() => null)
    return { open: !!f?.toasts }
  },
  head: () => ({ meta: pageMeta(TITLE, DESC, '/toasts') }),
  component: ToastsPage,
})

function ToastsPage() {
  const { open } = Route.useLoaderData()
  const { occasion, prepaid } = Route.useSearch()
  const admin = useIsAdmin()
  // the strip is for admins only, checked in the browser after load
  const [adminView, setAdminView] = useState(false)
  useEffect(() => { if (admin) setAdminView(true) }, [admin])
  return (
    <div className="fd">
      {!open && adminView && <p style={{ margin: 0, padding: '8px 16px', textAlign: 'center', font: '600 12.5px var(--sora, sans-serif)', background: '#1a1418', color: '#fff' }}>admin view · writing is off for visitors until the toasts flag is on</p>}
      <ToastForm occasionIn={occasion as Occasion | undefined} prepaidSession={prepaid} />
      <Footer />
    </div>
  )
}
