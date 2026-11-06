import { ImageResponse } from 'next/og';

export const alt = 'Open Wrimo: escreva seu romance, uma palavra por dia';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 64,
        padding: '0 96px',
        background: '#f7f1e3',
        fontFamily: 'serif',
      }}>
      <div
        style={{
          width: 260,
          height: 380,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 10,
          background: 'linear-gradient(90deg, #5a1d1a 0%, #7d2a26 12%, #7d2a26 100%)',
          boxShadow: '18px 24px 0 #e3d7bd',
          color: '#fdf8ee',
          fontSize: 44,
        }}>
        <div style={{ fontSize: 120 }}>✍</div>
        <div>Open Wrimo</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24, color: '#2a2118', maxWidth: 640 }}>
        <div style={{ fontSize: 30, letterSpacing: 6, color: '#7d2a26' }}>SEU CADERNO DE ESCRITA</div>
        <div style={{ fontSize: 68, lineHeight: 1.1 }}>Escreva seu romance, uma palavra por dia.</div>
        <div style={{ fontSize: 30, color: '#5f4f3e' }}>Metas, sprints, estatísticas e conquistas.</div>
      </div>
    </div>,
    size,
  );
}
