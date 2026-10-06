/* Single room tile used by the Stream grid. Branches on kind === 'scan'
 * to render a score-card variant (band-colored big number + pillar chip +
 * signature) instead of the normal title/body/reactions strip. */
import type { Room } from '../data/types'

export interface RoomTileData extends Room {
  kind?: 'spill' | 'scan'
  scan_band?: 'settling' | 'sitting' | 'weighing' | 'heavy' | 'consuming' | null
  initial_scan?: number | null
  scan_signature?: string | null
  pillar?: string | null
}

const BAND_COLOR: Record<string, string> = {
  settling: '#5B8A5E',
  sitting: '#7F77DD',
  weighing: '#c1a02b',
  heavy: '#c87c4a',
  consuming: '#17131a',
}
const BAND_LABEL: Record<string, string> = {
  settling: 'settling',
  sitting: 'sitting with it',
  weighing: 'weighing',
  heavy: 'heavy / loud',
  consuming: 'consuming',
}

export function RoomTile({ room, onOpen }: { room: RoomTileData; onOpen: (r: RoomTileData) => void }) {
  const isScan = room.kind === 'scan' && typeof room.initial_scan === 'number'
  const band = (room.scan_band || 'sitting') as keyof typeof BAND_COLOR
  const accent = BAND_COLOR[band] || '#7F77DD'

  return (
    <article
      className={'rtile' + (room.rested ? ' rested' : '')}
      onClick={() => onOpen(room)}
      style={{ display: 'flex', flexDirection: 'column' }}
    >
      <div style={{ padding: '18px 18px 14px', display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
        {/* header row: alias + time + kind badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
          <span style={{ width: 26, height: 26, borderRadius: '50%', background: '#fdfbf9', display: 'grid', placeItems: 'center', fontSize: 14, flex: 'none' }}>
            {room.emoji}
          </span>
          <span style={{ fontFamily: 'Newsreader,serif', fontStyle: 'italic', fontSize: 13, color: '#443c42', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {room.alias}
          </span>
          {isScan ? (
            <span style={{ fontFamily: 'Sora,sans-serif', fontWeight: 700, fontSize: 9.5, letterSpacing: '.14em', color: accent, background: accent + '15', border: '.5px solid ' + accent + '30', padding: '3px 8px', borderRadius: 999 }}>
              SCAN
            </span>
          ) : (
            <span style={{ fontFamily: 'Sora,sans-serif', fontWeight: 600, fontSize: 9.5, letterSpacing: '.14em', color: room.support === 'heard' ? '#17131a' : '#3a6b3c', background: room.support === 'heard' ? 'rgba(23,19,26,.08)' : 'rgba(91,138,94,.10)', padding: '3px 8px', borderRadius: 999, textTransform: 'uppercase' }}>
              {room.support === 'heard' ? 'heard' : 'advice'}
            </span>
          )}
          <span style={{ fontFamily: 'Newsreader,serif', fontStyle: 'italic', fontSize: 11.5, color: '#6f666c' }}>{room.hours}</span>
        </div>

        {isScan ? (
          // --- SCAN SCORE CARD VARIANT ---
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, padding: '6px 0' }}>
            <div style={{ fontFamily: 'Sora,sans-serif', fontWeight: 800, fontSize: 56, lineHeight: 1, letterSpacing: '-.04em', color: accent }}>
              {room.initial_scan}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: 'Sora,sans-serif', fontWeight: 600, fontSize: 10, letterSpacing: '.14em', textTransform: 'uppercase', color: accent, marginBottom: 4 }}>
                {BAND_LABEL[band]}
              </div>
              <div style={{ fontFamily: 'Newsreader,serif', fontStyle: 'italic', fontSize: 15.5, lineHeight: 1.35, color: '#100c14' }}>
                {room.scan_signature || room.title}
              </div>
              {room.pillar && (
                <div style={{ marginTop: 6, display: 'inline-block', fontFamily: 'Sora,sans-serif', fontWeight: 600, fontSize: 9.5, letterSpacing: '.12em', textTransform: 'uppercase', color: '#443c42', background: '#fdfbf9', padding: '2px 8px', borderRadius: 999 }}>
                  {room.pillar}
                </div>
              )}
            </div>
          </div>
        ) : (
          // --- NORMAL ROOM VARIANT ---
          <>
            <h3 style={{ fontFamily: 'Sora,sans-serif', fontWeight: 700, fontSize: 15.5, lineHeight: 1.3, margin: 0, color: '#0b080f', letterSpacing: '-.01em' }}>
              {room.title}
            </h3>
            <p style={{ fontFamily: 'Newsreader,serif', fontSize: 14, lineHeight: 1.5, color: '#383136', margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {room.body || room.clean_text}
            </p>
          </>
        )}
      </div>

      {/* footer */}
      <div style={{ padding: '11px 18px', borderTop: '.5px solid rgba(11,8,15,.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <span style={{ fontFamily: 'Newsreader,serif', fontStyle: 'italic', fontSize: 12.5, color: '#443c42' }}>
          {isScan ? (
            <>
              <b style={{ fontFamily: 'Sora', fontStyle: 'normal', fontWeight: 600, color: accent }}>{room.relates}</b> same number
            </>
          ) : (
            <>
              🫂 <b style={{ fontFamily: 'Sora', fontStyle: 'normal', fontWeight: 600, color: '#17131a' }}>{room.relates}</b> relate
            </>
          )}
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: 'Sora,sans-serif', fontWeight: 600, fontSize: 10.5, letterSpacing: '.06em', color: '#443c42' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#5DCAA5', animation: 'breathe 2.8s ease-in-out infinite' }} />
          {room.sitting} sitting
        </span>
      </div>
    </article>
  )
}
