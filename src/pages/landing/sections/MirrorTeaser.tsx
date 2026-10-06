/* MirrorTeaser — pixel-parity port of the mirror teaser card on the landing hero.
   Source: public/shutap/Landing.dc.html line ~200. Onclick → onOpen (parent
   navigates to /mirror to match the iframe's openMirror() → mirror route). */
import { EyeMark } from '@/components/EyeMark'

const SORA = "'Sora', system-ui, sans-serif"
const NEWSREADER = "'Newsreader', Georgia, serif"

export function MirrorTeaser({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      style={{
        textAlign: 'left',
        marginTop: 12,
        width: '100%',
        maxWidth: 480,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        background: 'linear-gradient(160deg,#100c14,#100c14)',
        border: '.5px solid rgba(23,19,26,.32)',
        borderRadius: 16,
        padding: '13px 15px',
        cursor: 'pointer',
      }}
    >
      <span style={{ display: 'inline-flex', flex: 'none' }}>
        <EyeMark size={30} />
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: SORA, fontWeight: 700, fontSize: 14, color: '#fdfbf9' }}>
          the mirror <span style={{ color: '#c1a02b' }}>✦</span>
        </div>
        <div style={{ fontFamily: NEWSREADER, fontStyle: 'italic', fontSize: 12.5, color: '#645b61', marginTop: 2, lineHeight: 1.4 }}>
          your patterns &amp; your arc — drawn from everything you&rsquo;ve poured in.
        </div>
      </div>
      <span style={{ fontFamily: SORA, fontWeight: 700, fontSize: 12.5, color: '#e2dde0', flex: 'none' }}>open →</span>
    </button>
  )
}
