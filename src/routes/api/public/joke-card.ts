// The public share image for a joke card.
//
// This is the URL that travels — pasted into a chat, unfurled by a link
// preview, opened by whoever the card was sent to. It is therefore ALWAYS the
// marked, story-size render: the clean print-size export is a paid file the
// member saves from the app, never a link anyone can strip the mark off by
// editing a query string.
//
// The image is authored on the server from the stored row; it is never a
// client screenshot of the DOM. Returned as SVG so the Worker needs no native
// rasteriser — the client download path draws this exact document to a canvas.
import { createFileRoute } from '@tanstack/react-router'
import { angleLabel, angleSubtitle, EXPORT } from '@/lib/jokes/deck'
import { renderCardSvg } from '@/lib/jokes/card-art'

export const Route = createFileRoute('/api/public/joke-card')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url)
        const id = url.searchParams.get('id')
        if (!id) return new Response('missing id', { status: 400 })

        const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
        const { data } = await supabaseAdmin
          .from('joke_cards')
          .select('card_text, angle')
          .eq('id', id)
          .maybeSingle()
        if (!data) return new Response('not found', { status: 404 })

        const svg = renderCardSvg({
          text: String(data.card_text),
          label: angleLabel(data.angle as string),
          subtitle: angleSubtitle(data.angle as string),
          width: EXPORT.free.width,
          height: EXPORT.free.height,
          mark: true,
        })
        return new Response(svg, {
          headers: {
            'Content-Type': 'image/svg+xml; charset=utf-8',
            'Cache-Control': 'public, max-age=300, s-maxage=3600',
          },
        })
      },
    },
  },
})
