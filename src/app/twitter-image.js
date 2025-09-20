import { ImageResponse } from 'next/og';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function TwitterImage() {
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
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              fontSize: 68,
              fontWeight: 800,
              color: '#fff',
              textTransform: 'uppercase',
              letterSpacing: 1,
            }}
          >
            Evolution Tracker
          </div>
          <div style={{ fontSize: 26, color: '#b0b0b0', marginTop: 10 }}>
            EVO.ST • Finansiell översikt och återköp
          </div>
        </div>
        <div
          style={{ position: 'absolute', top: 40, right: 48, color: '#00e676', fontSize: 22 }}
        >
          @Alexand93085679
        </div>
      </div>
    ),
    size
  );
}

