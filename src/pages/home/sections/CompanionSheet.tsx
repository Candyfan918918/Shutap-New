/* Section: Companion bubble + sheet — byte-for-byte port of
 * /tmp/bundle/template.html (lines 925-950). All data-* hooks preserved so
 * mountImmersive's canned-reply bubble/sheet lifecycle drives it unchanged. */
export function CompanionSheet() {
  return (
    <>
      {/* Hidden open trigger — the global draggable CompanionBubble (rendered
          in __root) fires a synthetic click on this element to open the sheet,
          leaving the delegated immersiveMount listener untouched. */}
      <span data-comp-action="open" aria-hidden style={{ display: 'none' }} />



      <div data-comp="root" style={{ position: 'fixed', inset: 0, zIndex: 90, display: 'none', alignItems: 'flex-end', justifyContent: 'center' }}>
        <div data-comp="back" style={{ position: 'absolute', inset: 0, background: 'rgba(10,6,14,.72)', backdropFilter: 'blur(8px)', opacity: 0, transition: 'opacity .3s' }} />
        <div data-comp="sheet" style={{ position: 'relative', width: '100%', maxWidth: '560px', background: 'linear-gradient(170deg,#1c1024,#100c14 70%)', border: '.5px solid rgba(255,255,255,.12)', borderRadius: '26px 26px 0 0', padding: '22px 22px 26px', transform: 'translateY(30px)', opacity: 0, transition: 'transform .35s cubic-bezier(.2,.8,.2,1),opacity .3s' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <svg viewBox="0 0 56 56" fill="none" style={{ width: '26px', height: '26px', flex: 'none' }}>
              <rect x="15.25" y="16" width="11.5" height="24" rx="5.75" fill="url(#eyeG2)" />
              <rect x="29.25" y="16" width="11.5" height="24" rx="5.75" fill="url(#eyeG2)" />
              <ellipse cx="21" cy="29" rx="4" ry="5" fill="url(#pupG2)" />
              <ellipse cx="35" cy="29" rx="4" ry="5" fill="url(#pupG2)" />
            </svg>
            <div style={{ flex: 1, fontFamily: "'Sora',sans-serif", fontWeight: 700, fontSize: '14px', color: '#fff' }}>the companion</div>
            <div data-comp-action="close" role="button" style={{ fontFamily: "'Newsreader',serif", fontStyle: 'italic', fontSize: '14px', color: '#aaa3e8', cursor: 'pointer', padding: '4px 8px' }}>close</div>
          </div>
          <div style={{ fontFamily: "'Newsreader',serif", fontStyle: 'italic', fontSize: '12.5px', color: '#8d86c9', marginBottom: '14px' }}>an ai — not a human, not a therapist. it listens, reflects, finds you a room.</div>
          <div data-comp="log" style={{ maxHeight: '38vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '14px' }} />
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '10px', background: 'rgba(255,255,255,.05)', border: '.5px solid rgba(255,255,255,.14)', borderRadius: '16px', padding: '10px 12px' }}>
            <textarea data-comp="input" rows={1} placeholder="tell me what's going on…" style={{ flex: 1, background: 'none', border: 'none', outline: 'none', resize: 'none', fontFamily: "'Newsreader',serif", fontStyle: 'italic', fontSize: '15.5px', color: '#f3eefc', lineHeight: 1.5, minHeight: '24px', maxHeight: '110px' }} />
            <div data-comp-action="send" role="button" style={{ fontFamily: "'Sora',sans-serif", fontWeight: 700, fontSize: '13px', color: '#100c14', background: '#2b2630', borderRadius: '999px', padding: '8px 16px', cursor: 'pointer', flex: 'none' }}>send</div>
          </div>
          <a href="/mirror" data-link="/mirror" style={{ marginTop: '13px', display: 'flex', alignItems: 'center', gap: '11px', background: 'rgba(233,192,106,.08)', border: '.5px solid rgba(233,192,106,.3)', borderRadius: '14px', padding: '12px 14px', textDecoration: 'none' }}>
            <span style={{ fontSize: '17px' }}>✦</span>
            <span style={{ flex: 1 }}>
              <span style={{ display: 'block', fontFamily: "'Sora',sans-serif", fontWeight: 700, fontSize: '13px', color: '#c1a02b' }}>the mirror</span>
              <span style={{ display: 'block', fontFamily: "'Newsreader',serif", fontStyle: 'italic', fontSize: '12.5px', color: '#b9a67e' }}>your patterns, read as cards</span>
            </span>
            <span style={{ fontFamily: "'Newsreader',serif", fontStyle: 'italic', fontSize: '13px', color: '#c1a02b' }}>open →</span>
          </a>
        </div>
      </div>
    </>
  )
}
