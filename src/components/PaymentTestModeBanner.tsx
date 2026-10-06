const clientToken = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN as string | undefined;

const BANNER_H = 32;

const wrap: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  zIndex: 70,
  height: BANNER_H,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '0 16px',
  background: '#100c14',
  color: '#fdfbf9',
  fontFamily: "'Sora',system-ui,sans-serif",
  fontWeight: 600,
  fontSize: 12,
  textTransform: 'lowercase',
  letterSpacing: '.02em',
  borderBottom: '1px solid rgba(226,221,224,.14)',
  textAlign: 'center',
  lineHeight: 1.2,
};
const linkStyle: React.CSSProperties = { color: '#e2dde0', textDecoration: 'underline', marginLeft: 6 };
const spacer: React.CSSProperties = { height: BANNER_H, flex: 'none' };

export function PaymentTestModeBanner() {
  if (!clientToken) {
    return (
      <>
        <div style={wrap} role="status">
          production checkout is not configured — complete stripe go-live to accept real payments.
        </div>
        <div aria-hidden style={spacer} />
      </>
    );
  }
  if (clientToken.startsWith('pk_test_')) {
    return (
      <>
        <div style={wrap} role="status">
          all payments in the preview are in test mode.
          <a
            href="https://docs.lovable.dev/features/payments#test-and-live-environments"
            target="_blank"
            rel="noopener noreferrer"
            style={linkStyle}
          >
            read more
          </a>
        </div>
        <div aria-hidden style={spacer} />
      </>
    );
  }
  return null;
}
