import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Open Wrimo',
    short_name: 'Open Wrimo',
    description: 'Escreva seu romance, acompanhe cada palavra e bata suas metas.',
    lang: 'pt-BR',
    start_url: '/write',
    scope: '/',
    display: 'standalone',
    background_color: '#f7f1e3',
    theme_color: '#7d2a26',
    categories: ['books', 'productivity', 'lifestyle'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
