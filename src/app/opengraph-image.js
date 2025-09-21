import { ImageResponse } from 'next/og';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          background: 'linear-gradient(135deg,#111,#1f1f1f)',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          fontFamily: 'system-ui, Segoe UI, Roboto, Helvetica, Arial',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 48,
            left: 64,
            color: '#00e676',
            fontSize: 24,
            letterSpacing: 1,
          }}
        >
          EVO.ST • Nasdaq Stockholm
        </div>
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div
            style={{
              fontSize: 72,
              fontWeight: 800,
              color: '#fff',
              textTransform: 'uppercase',
              letterSpacing: 1,
            }}
          >
            Evolution Tracker
          </div>
          <div style={{ fontSize: 28, color: '#b0b0b0', marginTop: 12 }}>
            Finansiell översikt • Återköp • Utdelning • Nyheter
          </div>
        </div>
        <div
          style={{
            position: 'absolute',
            bottom: 48,
            right: 64,
            color: '#b0b0b0',
            fontSize: 22,
          }}
        >
          evodata
        </div>
      </div>
    ),
    size
  );
}
