/* Section: Preloader — byte-for-byte port of /tmp/bundle/template.html.  
 * Every data-* hook preserved verbatim so mountImmersive drives interactivity. */
export function Preloader() {
  return (
    <>
            {/* ══ PRELOADER ══ */}
            <div data-pre="" style={{ position: 'fixed', inset: '0', zIndex: '100', background: '#100c14', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '26px', transition: 'opacity .7s cubic-bezier(.6,0,.3,1),visibility .7s' }}>
              {' '}
              <span style={{ width: '120px', height: '82px', display: 'block', animation: 'eblink 2.2s infinite', transformOrigin: 'center' }}>
                {' '}
                <svg viewBox="0 0 140 96" fill="none" style={{ display: 'block', width: '100%', height: '100%' }}>
                  {' '}
                  <rect x="16" y="6" width="56" height="84" rx="28" fill="url(#eyeG2)" />
                  {' '}
                  <rect x="84" y="6" width="56" height="84" rx="28" fill="url(#eyeG2)" />
                  {' '}
                  <ellipse data-prepup="" cx="44" cy="62" rx="19" ry="24" fill="url(#pupG2)" />
                  {' '}
                  <ellipse data-prepup="" cx="112" cy="62" rx="19" ry="24" fill="url(#pupG2)" />
                  {' '}
                </svg>
                {' '}
              </span>
              {' '}
              <div style={{ fontFamily: '\'Newsreader\',serif', fontStyle: 'italic', fontSize: 'clamp(18px,2.4vw,24px)', color: '#fdfbf9' }}>
                SHUTAP.
                <em style={{ color: '#a52a5f' }}>
                  Joke about it.
                </em>
              </div>
            </div>
    </>
  )
}
