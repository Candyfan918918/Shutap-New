/* Section: Finale + Footer inline — byte-for-byte port of
 * /tmp/bundle/template.html (lines 893-923). */
export function Finale() {
  const foot: React.CSSProperties = { color: '#443c42' }
  return (
    <section data-screen-label="Finale" style={{ position: 'relative', background: '#ffffff', padding: '60px 30px 40px', overflow: 'hidden' }}>
      <div style={{ maxWidth: '1360px', margin: '0 auto', textAlign: 'center', position: 'relative' }}>
        <div data-rv="zoom" style={{ padding: '60px 0 70px' }}>
          <div style={{ fontFamily: "'Newsreader',serif", fontStyle: 'italic', fontSize: 'clamp(17px,1.6vw,22px)', color: '#443c42', marginBottom: '18px' }}>ready when you are.</div>
          <h2 data-words="" style={{ fontFamily: "'Sora',sans-serif", fontWeight: 800, fontSize: 'clamp(44px,8vw,110px)', lineHeight: 1, letterSpacing: '-.05em', margin: '0 0 44px', color: '#0b080f' }}>
            say it <em style={{ fontFamily: "'Newsreader',serif", fontStyle: 'italic', fontWeight: 400, background: 'linear-gradient(92deg,#a52a5f,#890041 70%)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>here.</em>
          </h2>
          <a href="/welcome" data-link="/welcome" data-hover="" data-mag="" style={{ display: 'inline-flex', alignItems: 'center', gap: '12px', fontFamily: "'Sora',sans-serif", fontWeight: 700, fontSize: '18px', color: '#fff', background: 'linear-gradient(155deg,#ff7eb3,#a52a5f 55%,#c1216b)', borderRadius: '999px', padding: '22px 46px', boxShadow: '0 20px 44px -16px rgba(193,33,107,.6)' }}>join shutap →</a>
        </div>
        <div style={{ borderTop: '.5px solid rgba(11,8,15,.1)', paddingTop: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px', flexWrap: 'wrap' }}>
            <span style={{ fontFamily: "'Sora',sans-serif", fontWeight: 800, fontSize: '16px', letterSpacing: '-.04em', color: '#0b080f' }}>
              shut<span style={{ color: '#a52a5f' }}>ap</span> <span style={{ fontFamily: "'Newsreader',serif", fontStyle: 'italic', fontWeight: 400, fontSize: '13px', color: '#6f666c', letterSpacing: 0 }}>— say it funnier.</span>
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 18px', fontFamily: "'Newsreader',serif", fontStyle: 'italic', fontSize: '14px' }}>
              <a href="/stream" data-link="/stream" data-hover="">rooms</a>
              <a href="/halls" data-link="/halls" data-hover="">halls</a>
              <a href="/vent/family" data-link="/vent/family" data-hover="">what people bring</a>
            </div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px 16px', justifyContent: 'center', fontFamily: "'Sora',sans-serif", fontSize: '12px' }}>
            <a href="/relationships" data-link="/relationships" data-hover="" style={foot}>relationships</a>
            <a href="/marriage" data-link="/marriage" data-hover="" style={foot}>marriage</a>
            <a href="/family" data-link="/family" data-hover="" style={foot}>family</a>
            <a href="/career" data-link="/career" data-hover="" style={foot}>career & work</a>
            <a href="/lived-intelligence" data-link="/lived-intelligence" data-hover="" style={foot}>what is lived intelligence?</a>
            <a href="/about" data-link="/about" data-hover="" style={foot}>about</a>
            <a href="/how-it-works" data-link="/how-it-works" data-hover="" style={foot}>how it works</a>
            <a href="/faq" data-link="/faq" data-hover="" style={foot}>faq</a>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px 16px', justifyContent: 'center', fontFamily: "'Sora',sans-serif", fontSize: '12px' }}>
            <a href="/terms" data-link="/terms" data-hover="" style={foot}>Terms</a>
            <a href="/privacy" data-link="/privacy" data-hover="" style={foot}>Privacy</a>
            <a href="/guidelines" data-link="/guidelines" data-hover="" style={foot}>Guidelines</a>
            <a href="/safety" data-link="/safety" data-hover="" style={foot}>Safety</a>
            <a href="/ai-disclosure" data-link="/ai-disclosure" data-hover="" style={foot}>AI Disclosure</a>
            <a href="/legal" data-link="/legal" data-hover="" style={foot}>Disclaimer</a>
            <a href="mailto:hello@shutap.com" data-hover="" style={foot}>Contact</a>
          </div>
          <div style={{ textAlign: 'center', fontFamily: "'Newsreader',serif", fontStyle: 'italic', fontSize: '12px', color: '#6f666c', lineHeight: 1.7 }}>
            18+ · pseudonymous · your real name never shows · jokes at the situation, never at you 🤍<br />
            shutap writes jokes, not prescriptions. not therapy, not advice, not a diagnosis. in an emergency, call or text 988 (US).
          </div>
          <div style={{ textAlign: 'center', fontFamily: "'Sora',sans-serif", fontWeight: 700, fontSize: '10px', letterSpacing: '.18em', textTransform: 'uppercase', color: '#443c42' }}>you already have the material.</div>
        </div>
      </div>
    </section>
  )
}
