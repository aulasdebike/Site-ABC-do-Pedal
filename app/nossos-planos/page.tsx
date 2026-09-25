'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { 
  Home, 
  Bike, 
  Compass, 
  Users, 
  ShieldCheck, 
  Calendar, 
  Sparkles,
  ArrowLeft 
} from 'lucide-react';
import { NossosPlanosView } from '@/components/plans/NossosPlanosView';

export default function NossosPlanosPage() {
  const router = useRouter();

  const handleSelectPlan = (planId: string) => {
    router.push(`/agendamento?plan=${planId}`);
  };

  const handleGoToBooking = () => {
    router.push('/agendamento');
  };

  return (
    <div className="min-h-screen text-slate-100 bg-[#060608] selection:bg-pink-500 selection:text-white relative overflow-hidden">
      
      {/* Background Neon Glow Orbs */}
      <div className="absolute top-[-10%] left-[50%] -translate-x-1/2 w-[700px] h-[700px] bg-pink-600/10 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute top-[20%] right-[-10%] w-[500px] h-[500px] bg-pink-600/5 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[10%] left-[-10%] w-[600px] h-[600px] bg-pink-700/5 rounded-full blur-[150px] pointer-events-none" />

      {/* HEADER */}
      <header className="sticky top-0 z-50 bg-[#060608]/95 border-b border-pink-500/10 backdrop-blur-md">
        <div className="w-[92vw] lg:w-[80vw] max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-3.5 sm:space-x-4 cursor-pointer group select-none">
            <div className="relative flex items-center justify-center shrink-0">
              <div className="absolute -inset-1.5 bg-gradient-to-tr from-pink-600 via-rose-500 to-pink-400 rounded-full blur-md opacity-60 group-hover:opacity-100 transition duration-300 group-hover:scale-110" />
              <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-full p-[2px] bg-gradient-to-tr from-pink-500 via-white/80 to-pink-400 shadow-[0_0_25px_rgba(236,72,153,0.6)] group-hover:shadow-[0_0_35px_rgba(236,72,153,0.9)] transition-all duration-300 group-hover:scale-105">
                <div className="w-full h-full rounded-full bg-[#0d0712] flex items-center justify-center p-1 relative overflow-hidden ring-1 ring-pink-500/40">
                  <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_center,rgba(244,114,182,0.22)_0%,rgba(10,5,15,0.95)_75%)] pointer-events-none" />
                  <Image 
                    src="https://i.postimg.cc/xqLCZR63/Design-sem-nome-(3).png" 
                    alt="ABC do Pedal Logo" 
                    width={64} 
                    height={64} 
                    className="w-full h-full object-contain drop-shadow-[0_0_10px_rgba(236,72,153,0.7)] transition-transform duration-300 group-hover:scale-105 relative z-10"
                    referrerPolicy="no-referrer"
                    priority
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col">
              <span className="font-display text-xl sm:text-2xl font-black tracking-tight text-white uppercase flex items-center gap-1.5 leading-none">
                ABC <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-rose-400 to-pink-500">do Pedal</span>
              </span>
              <span className="block text-[10px] sm:text-[11px] tracking-wider text-pink-300/80 font-mono uppercase font-semibold mt-1">
                Aprenda a pedalar com liberdade
              </span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center space-x-2 lg:space-x-3 bg-slate-950/50 p-1.5 rounded-xl border border-slate-900/60">
            <Link
              href="/"
              className="text-xs lg:text-sm font-bold flex items-center gap-1.5 px-3 py-2 rounded-lg text-slate-400 hover:text-slate-200 transition-colors"
            >
              <Home className="w-3.5 h-3.5 text-slate-400" />
              <span>Inicio</span>
            </Link>

            <Link
              href="/?view=perfis"
              className="text-xs lg:text-sm font-bold flex items-center gap-1.5 px-3 py-2 rounded-lg text-slate-400 hover:text-slate-200 transition-colors"
            >
              <Users className="w-3.5 h-3.5 text-slate-400" />
              <span>Quem ensinamos</span>
            </Link>

            <Link
              href="/?view=metodo"
              className="text-xs lg:text-sm font-bold flex items-center gap-1.5 px-3 py-2 rounded-lg text-slate-400 hover:text-slate-200 transition-colors"
            >
              <Compass className="w-3.5 h-3.5 text-slate-400" />
              <span>Metodologia</span>
            </Link>

            <Link
              href="/?view=sobre"
              className="text-xs lg:text-sm font-bold flex items-center gap-1.5 px-3 py-2 rounded-lg text-slate-400 hover:text-slate-200 transition-colors"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
              <span>Instrutor & Dúvidas</span>
            </Link>

            <Link
              href="/nossos-planos"
              className="text-xs lg:text-sm font-bold flex items-center gap-1.5 px-3 py-2 rounded-lg text-white bg-pink-500/10 border border-pink-500/20"
            >
              <Bike className="w-3.5 h-3.5 text-pink-500" />
              <span>Nossos Planos</span>
            </Link>

            <Link
              href="/galeria-viva"
              className="text-xs lg:text-sm font-bold flex items-center gap-1.5 px-3 py-2 rounded-lg text-slate-400 hover:text-slate-200 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-slate-400" />
              <span>Galeria Viva</span>
            </Link>
          </nav>

          {/* CTA Header */}
          <div className="flex items-center space-x-3">
            <Link 
              href="/agendamento"
              className="flex items-center space-x-2 bg-[#ff007f] hover:bg-pink-600 text-white text-xs sm:text-sm font-black px-4 py-2 rounded-lg sm:px-5 sm:py-2.5 shadow-[0_4px_15px_rgba(255,0,127,0.3)] hover:shadow-[0_4px_25px_rgba(255,0,127,0.5)] transition-all duration-300 transform hover:-translate-y-0.5 cursor-pointer"
            >
              <Calendar className="w-4 h-4 fill-white/10" />
              <span>Agendar Aula</span>
            </Link>
          </div>

        </div>
      </header>

      {/* MAIN VIEW */}
      <main>
        <NossosPlanosView
          onSelectPlan={handleSelectPlan}
          onGoToBooking={handleGoToBooking}
        />
      </main>

      {/* FOOTER */}
      <footer className="bg-black py-8 border-t border-slate-900 text-center text-xs sm:text-sm text-slate-400">
        <div className="w-[92vw] lg:w-[80vw] max-w-[1600px] mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-full p-[1.5px] bg-gradient-to-tr from-pink-500 to-rose-400 shadow-[0_0_12px_rgba(236,72,153,0.45)] shrink-0">
              <div className="w-full h-full rounded-full bg-[#0d0712] flex items-center justify-center p-0.5 overflow-hidden">
                <Image 
                  src="https://i.postimg.cc/xqLCZR63/Design-sem-nome-(3).png" 
                  alt="ABC do Pedal Logo" 
                  width={36} 
                  height={36} 
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>
            <p>© {new Date().getFullYear()} ABC do Pedal. Todos os direitos reservados. Foco em Realização Pessoal e Segurança.</p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
            <Link href="/" className="hover:text-white transition-colors cursor-pointer select-none">Inicio</Link>
            <Link href="/?view=perfis" className="hover:text-white transition-colors cursor-pointer select-none">Quem ensinamos</Link>
            <Link href="/?view=metodo" className="hover:text-white transition-colors cursor-pointer select-none">Metodologia</Link>
            <Link href="/?view=sobre" className="hover:text-white transition-colors cursor-pointer select-none">Instrutor & Dúvidas</Link>
            <Link href="/nossos-planos" className="text-pink-400 font-bold hover:text-white transition-colors cursor-pointer select-none">Nossos Planos</Link>
            <Link href="/galeria-viva" className="hover:text-white transition-colors cursor-pointer select-none">Galeria Viva</Link>
            <Link href="/agendamento" className="hover:text-pink-400 font-bold transition-colors cursor-pointer select-none">Agendar Aula</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
