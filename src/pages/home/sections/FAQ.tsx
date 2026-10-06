/* Section: FAQ — byte-for-byte port of /tmp/bundle/template.html (lines 863-891). */
export function FAQ() {
  const summaryStyle: React.CSSProperties = { fontFamily: "'Sora',sans-serif", fontWeight: 600, fontSize: '14px', cursor: 'pointer', color: '#0b080f', display: 'flex', justifyContent: 'space-between', alignItems: 'center', listStyle: 'none' }
  const plus: React.CSSProperties = { color: '#2b2630', fontSize: '20px', fontWeight: 300 }
  const p: React.CSSProperties = { fontFamily: "'Newsreader',serif", fontStyle: 'italic', fontSize: '15px', color: '#443c42', lineHeight: 1.6, margin: '10px 0 0', maxWidth: '52ch' }
  return (
    <section data-screen-label="FAQ" style={{ position: 'relative', background: '#ffffff', padding: 'clamp(46px,7vh,80px) 22px clamp(36px,5vh,60px)' }}>
      <div style={{ maxWidth: '740px', margin: '0 auto' }}>
        <div data-rv="">
          <div style={{ fontFamily: "'Sora',sans-serif", fontWeight: 700, fontSize: '11px', letterSpacing: '.18em', textTransform: 'uppercase', color: '#2b2630', marginBottom: '14px' }}>what is shutap</div>
          <h2 data-words="" style={{ fontFamily: "'Sora',sans-serif", fontWeight: 800, fontSize: 'clamp(26px,3.4vw,44px)', lineHeight: 1.08, letterSpacing: '-.03em', margin: '0 0 16px', color: '#0b080f' }}>
            questions, <em style={{ fontFamily: "'Newsreader',serif", fontStyle: 'italic', fontWeight: 400, color: '#17131a' }}>answered.</em>
          </h2>
          <p style={{ fontFamily: "'Newsreader',serif", fontStyle: 'italic', fontSize: '17px', lineHeight: 1.65, color: '#100c14', margin: '0 0 10px', maxWidth: '52ch' }}>
            a pseudonymous place to vent about relationships, marriage, family, and work — and see what actually happened next for people who lived your exact thing.
          </p>
          <p style={{ fontFamily: "'Newsreader',serif", fontStyle: 'italic', fontSize: '15.5px', lineHeight: 1.65, color: '#443c42', margin: '0 0 24px', maxWidth: '52ch' }}>
            <a href="#spill" data-cta="spill">spill it</a> — one question at a time, the companion helps you find the words. or <a href="#scan" data-cta="scan">scan it</a> — sixty seconds of questions, a private read saved just for you.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <details style={{ borderTop: '.5px solid rgba(11,8,15,.08)', padding: '15px 0' }}>
              <summary style={summaryStyle}>is this pseudonymous?<span style={plus}>+</span></summary>
              <p style={p}>pseudonymous. you get a persistent alias — something like 🦉 Quiet Indonesian Owl — generated the first time you sit down. your real name is never attached to anything, anywhere, including us.</p>
            </details>
            <details style={{ borderTop: '.5px solid rgba(11,8,15,.08)', padding: '15px 0' }}>
              <summary style={summaryStyle}>what happens when i vent?<span style={plus}>+</span></summary>
              <p style={p}>shutap writes you a set of joke cards about it — every card a different angle on the same situation. you keep the ones that land, and nothing is published unless you post it.</p>
            </details>
            <details style={{ borderTop: '.5px solid rgba(11,8,15,.08)', padding: '15px 0' }}>
              <summary style={summaryStyle}>what does the companion do?<span style={plus}>+</span></summary>
              <p style={p}>it helps you put words to it. asks one question at a time, reflects back what it heard, and helps you decide whether you want the room to hear it — or whether you just needed to say it to yourself first.</p>
            </details>
            <details style={{ borderTop: '.5px solid rgba(11,8,15,.08)', borderBottom: '.5px solid rgba(11,8,15,.08)', padding: '15px 0' }}>
              <summary style={summaryStyle}>what happens after I share?<span style={plus}>+</span></summary>
              <p style={p}>your story opens a room. people can sit in it, relate to it, react to it. when the room goes quiet for 72 hours — it rests. if it's carried enough resonance, it finds its way into the hall of fame.</p>
            </details>
          </div>
        </div>
      </div>
    </section>
  )
}
