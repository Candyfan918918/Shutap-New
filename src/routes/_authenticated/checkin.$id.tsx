// Check-in card route — opened from the floating eye or an email deep link.
// Authenticated; renders the beat copy + one-tap chips and writes a response.
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useServerFn } from '@tanstack/react-start'
import { getCheckin, recordCheckinResponse, snoozeCheckin } from '@/lib/checkins.functions'

export const Route = createFileRoute('/_authenticated/checkin/$id')({
  component: CheckinCard,
})

function CheckinCard() {
  const { id } = Route.useParams()
  const navigate = useNavigate()
  const fetchCk = useServerFn(getCheckin)
  const record = useServerFn(recordCheckinResponse)
  const snooze = useServerFn(snoozeCheckin)
  const [ck, setCk] = useState<Awaited<ReturnType<typeof getCheckin>> | null>(null)
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(true)
  const [done, setDone] = useState(false)

  useEffect(() => {
    fetchCk({ data: { id } }).then((r) => { setCk(r); setLoading(false) })
  }, [id, fetchCk])

  if (loading) return <Shell><p className="italic opacity-70">opening the eye…</p></Shell>
  if (!ck || !ck.beat) return <Shell><p className="italic opacity-70">this check-in slipped away.</p></Shell>
  if (done) return <Shell><p className="italic">thanks for telling me. i'll keep listening.</p></Shell>

  const submit = async (value: string) => {
    const payload: {
      checkin_id: string
      clean_text: string | null
      trajectory?: 'better' | 'same' | 'worse'
      action?: string
      resolution?: 'in_progress' | 'resolved' | 'avoided' | 'worse'
      feeling_tap?: string
    } = {
      checkin_id: ck.id,
      clean_text: note || null,
    }
    if (ck.beat!.kind === 'trajectory') payload.trajectory = value as 'better' | 'same' | 'worse'
    else if (ck.beat!.kind === 'action') payload.action = value
    else if (ck.beat!.kind === 'resolution') payload.resolution = value as 'in_progress' | 'resolved' | 'avoided' | 'worse'
    else if (ck.beat!.kind === 'feeling') payload.feeling_tap = value
    await record({ data: payload })
    setDone(true)
    setTimeout(() => navigate({ to: '/' }), 1400)
  }

  return (
    <Shell>
      <p className="text-xs uppercase tracking-widest opacity-60">the eye · {ck.type}</p>
      <h1 className="font-serif italic text-2xl mt-2 mb-6 leading-snug">{ck.beat.title}</h1>
      <div className="flex flex-wrap gap-2 mb-4">
        {ck.beat.chips.map((c) => (
          <button
            key={c.value}
            onClick={() => submit(c.value)}
            className="px-4 py-2 rounded-full bg-[#17131a]/10 hover:bg-[#17131a]/20 text-[#000000] text-sm transition"
          >
            {c.label}
          </button>
        ))}
      </div>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="anything else? (optional)"
        rows={2}
        className="w-full p-2 text-sm rounded-lg border border-[#2b2630]/30 bg-white/60"
      />
      <button onClick={() => snooze({ data: { id: ck.id } }).then(() => navigate({ to: '/' }))}
        className="mt-4 text-xs opacity-60 hover:opacity-100">
        not now — snooze
      </button>
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-[#ffffff] text-[#0b080f] flex items-center justify-center p-6">
      <section className="max-w-md w-full bg-white/70 backdrop-blur rounded-3xl p-8 shadow-sm">
        {children}
      </section>
    </main>
  )
}
