import { ImageResponse } from 'next/og';
import { getDatabase } from '@/lib/db/client';
import { createWritingRepository } from '@/lib/writing/repository';

export const alt = 'Perfil de escritor no Open Wrimo';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const formatWords = (words: number): string => new Intl.NumberFormat('pt-BR').format(words);

export default async function ProfileImage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const writing = createWritingRepository(await getDatabase());
  const writer = await writing.findPublicWriter(username.toLowerCase());
  const name = writer?.name ?? 'Open Wrimo';
  const community = writer ? await writing.listCommunity({ query: writer.username, sort: 'words', page: 1 }) : null;
  const card = community?.writers.find((item) => item.username === writer?.username);

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: 28,
        padding: '0 110px',
        background: '#f7f1e3',
        color: '#2a2118',
        fontFamily: 'serif',
        borderLeft: '36px solid #7d2a26',
      }}>
      <div style={{ fontSize: 30, letterSpacing: 6, color: '#7d2a26' }}>OPEN WRIMO</div>
      <div style={{ fontSize: 84, lineHeight: 1.05 }}>{name}</div>
      {writer ? <div style={{ fontSize: 38, color: '#5f4f3e' }}>{`@${writer.username}`}</div> : null}
      {card ? (
        <div style={{ fontSize: 40 }}>{`${formatWords(card.words)} palavras · ${card.novels} romances`}</div>
      ) : null}
    </div>,
    size,
  );
}
