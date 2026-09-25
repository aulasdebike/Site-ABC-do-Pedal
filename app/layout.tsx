import type {Metadata} from 'next';
import { Inter, Outfit } from 'next/font/google';
import './globals.css'; // Global styles

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'ABC do Pedal | Escola de Bicicleta do Zero',
  description: 'Aprenda a andar de bicicleta do zero com segurança, acolhimento e sem traumas. Método exclusivo ABCDE para adultos, crianças e idosos.',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${outfit.variable}`}>
      <body suppressHydrationWarning className="font-sans antialiased bg-[#0a0a0c] text-slate-100 selection:bg-pink-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
