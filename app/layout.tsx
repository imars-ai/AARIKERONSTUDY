import type {Metadata} from 'next';
import { Inter, Outfit } from 'next/font/google';
import './globals.css'; // Global styles

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-title',
});

export const metadata: Metadata = {
  title: 'Aarikeron Study',
  description: 'Plataforma inteligente de organización académica y gestión de tiempo.',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="es" className={`${inter.variable} ${outfit.variable} h-full`}>
      <body suppressHydrationWarning className="h-full bg-[#faf8ff] text-[#191b23]">
        {children}
      </body>
    </html>
  );
}
