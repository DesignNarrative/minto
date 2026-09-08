import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Minto — AI Meeting MOM Generator',
    short_name: 'Minto',
    description:
      'Ultra-detailed AI meeting minutes generator with automatic Hindi, Marathi, and English detection.',
    start_url: '/',
    display: 'standalone',
    background_color: '#09090b',
    theme_color: '#e11d48',
    icons: [
      {
        src: '/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon',
      },
    ],
  };
}
