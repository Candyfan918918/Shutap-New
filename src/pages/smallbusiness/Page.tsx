// The /smallbusiness page: the phone flow on top, the information under it.
// The flow needs the browser (camera, storage), so it mounts after the page
// loads; until then, and for search engines, the same first screen is
// rendered as plain text with the same headline and button.
import { useEffect, useState } from 'react'
import { SmallBusinessFlow } from './Flow'
import { SmallBusinessInfo } from './Info'
import { RisingIcons } from './RisingIcons'
import './smallbusiness.css'

export function SmallBusinessPage() {
  const [mounted, setMounted] = useState(false)
  // the information shows under the first screen (and under the computer's
  // send-to-your-phone screen), never under a step of the flow
  const [at, setAt] = useState<string>('welcome')
  useEffect(() => { setMounted(true) }, [])
  const toTop = () => { try { window.scrollTo({ top: 0, behavior: 'smooth' }) } catch { /* noop */ } }
  return (
    <>
      {mounted ? <SmallBusinessFlow onStep={setAt} /> : (
        <div className="sb">
          <div className="sb-phone">
            <div className="sb-top" />
            <div className="sb-screen">
              <div className="sb-hero"><RisingIcons variant="hero" /></div>
              <div className="sb-sheet">
                <p className="sb-eyebrow">SAY IT FUNNIER</p>
                <h1 className="sb-h1" style={{ marginBottom: 26 }}>The <b>creative team</b> your small business doesn’t have.</h1>
                <a className="sb-btn" style={{ alignSelf: 'stretch' }} href="/smallbusiness">Make my first video</a>
                <p className="sb-note" style={{ marginTop: 16 }}>First 3 videos free</p>
              </div>
            </div>
          </div>
        </div>
      )}
      {(at === 'welcome' || at === 'desk') && <SmallBusinessInfo onStart={toTop} />}
    </>
  )
}
