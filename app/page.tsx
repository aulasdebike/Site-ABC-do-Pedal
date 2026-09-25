'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bike, 
  MapPin, 
  Check, 
  ChevronRight, 
  MessageCircle, 
  Award, 
  GraduationCap, 
  Calendar, 
  ShieldCheck, 
  Sparkles, 
  Clock, 
  Heart, 
  Compass, 
  AlertCircle,
  ThumbsUp, 
  ChevronDown,
  Play,
  Users,
  Shield,
  HeartHandshake,
  UserCheck,
  Smile,
  Home,
  Star,
  Lock
} from 'lucide-react';
import { BookingFlow } from '@/components/booking/BookingFlow';
import { StudentPortal } from '@/components/booking/StudentPortal';
import { AdminPanel } from '@/components/booking/AdminPanel';
import { NossosPlanosView } from '@/components/plans/NossosPlanosView';
import { GaleriaVivaView } from '@/components/gallery/GaleriaVivaView';

export default function ABCDoPedalHome() {
  // Page Tab Navigation
  // Page Navigation - Independent Pages
  const [activePage, setActivePage] = useState<'inicio' | 'perfis' | 'metodo' | 'sobre' | 'planos' | 'galeria' | 'agendamento'>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const view = params.get('view');
      if (view === 'agendamento') return 'agendamento';
      if (view === 'perfis' || view === 'quem-ensinamos') return 'perfis';
      if (view === 'metodo' || view === 'metodologia') return 'metodo';
      if (view === 'sobre' || view === 'instrutor') return 'sobre';
      if (view === 'planos' || view === 'modalidades' || view === 'nossos-planos') return 'planos';
      if (view === 'galeria' || view === 'galeria-viva') return 'galeria';
    }
    return 'inicio';
  });

  const [agendamentoSubView, setAgendamentoSubView] = useState<'booking' | 'student_portal' | 'admin'>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const sub = params.get('sub');
      if (sub === 'student_portal') return 'student_portal';
      if (sub === 'admin') return 'admin';
    }
    return 'booking';
  });
  const [studentBookingId, setStudentBookingId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('bookingId');
    }
    return null;
  });

  const handlePageChange = (page: string) => {
    let targetPage: 'inicio' | 'perfis' | 'metodo' | 'sobre' | 'planos' | 'galeria' | 'agendamento' = 'inicio';
    if (page === 'agendamento') targetPage = 'agendamento';
    else if (page === 'perfis' || page === 'quem-ensinamos') targetPage = 'perfis';
    else if (page === 'metodo' || page === 'metodologia') targetPage = 'metodo';
    else if (page === 'sobre' || page === 'instrutor') targetPage = 'sobre';
    else if (page === 'planos' || page === 'modalidades' || page === 'nossos-planos') targetPage = 'planos';
    else if (page === 'galeria' || page === 'galeria-viva') targetPage = 'galeria';
    else targetPage = 'inicio';

    setActivePage(targetPage);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Method State
  const [activeMethod, setActiveMethod] = useState<'A' | 'B' | 'C' | 'D' | 'E'>('A');
  const [whatsappName, setWhatsappName] = useState('');
  const [whatsappPhone, setWhatsappPhone] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('Parque Ibirapuera');

  // Dynamic Profile Tabs state
  const [activeProfileTab, setActiveProfileTab] = useState<'adulto' | 'idoso' | 'crianca'>('adulto');

  // Interactive FAQ state
  const [activeFaqIndex, setActiveFaqIndex] = useState<number | null>(0);

  // Diagnostic Quiz/Simulation states
  const [quizAge, setQuizAge] = useState('');
  const [quizMotivation, setQuizMotivation] = useState('');
  const [quizSent, setQuizSent] = useState(false);

  // Generate WhatsApp Message
  const getWhatsAppURL = (type: 'direct' | 'custom' | 'lead' | 'desafio' | 'aprenda' | 'imersao') => {
    const phoneNumber = '5511950438948'; // ABC do Pedal official WhatsApp: wa.me/+5511950438948
    let message = '';

    if (type === 'desafio') {
      message = 'Olá, ABC do Pedal! Gostaria de saber mais sobre o programa DESAFIO DO PEDAL (sem quantidade fixa de aulas, foco em aprender a pedalar) no Parque do Ibirapuera, Santo André ou São Bernardo do Campo.';
    } else if (type === 'aprenda') {
      message = 'Olá, ABC do Pedal! Gostaria de saber mais sobre a modalidade APRENDA A PEDALAR (2 encontros de 1 hora) em São Paulo / ABC.';
    } else if (type === 'imersao') {
      message = 'Olá, ABC do Pedal! Gostaria de informações sobre a IMERSÃO DO PEDAL (1 encontro de 2 horas) para atendimento na minha cidade fora de São Paulo e ABC.';
    } else if (type === 'direct') {
      message = 'Olá, ABC do Pedal! Gostaria de agendar uma aula de bicicleta de início imediato do zero absoluto.';
    } else if (type === 'custom') {
      message = `Olá ABC do Pedal! Acessei o site e me identifiquei muito com a metodologia. Desejo ter a minha primeira experiência prática de liberdade sobre duas rodas.\n\nLocal preferido: ${selectedLocation}.\nNo aguardo de mais informações sobre horários disponíveis!`;
    } else {
      message = `Olá ABC do Pedal! Meu nome é ${whatsappName || 'Iniciante'}.\n- Preferência de local: ${selectedLocation}\n- Idade: ${quizAge || 'Não informada'}\n- Desejo principal: ${quizMotivation || 'Começar a pedalar do zero!'}\n\nQuero muito iniciar minha jornada com o Método ABC-DE para atingir a minha autonomia!`;
    }

    return `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
  };

  return (
    <div className="min-h-screen text-slate-100 bg-[#060608] selection:bg-pink-500 selection:text-white relative overflow-hidden" id="homepage">
      
      {/* Background Neon Glow Orbs */}
      <div className="absolute top-[-10%] left-[50%] -translate-x-1/2 w-[700px] h-[700px] bg-pink-600/10 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute top-[20%] right-[-10%] w-[500px] h-[500px] bg-pink-600/5 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[10%] left-[-10%] w-[600px] h-[600px] bg-pink-700/5 rounded-full blur-[150px] pointer-events-none" />

      {/* HEADER / NAV */}
      <header className="sticky top-0 z-50 bg-[#060608]/95 border-b border-pink-500/10 backdrop-blur-md">
        <div className="w-[92vw] lg:w-[80vw] max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          
          {/* Logo */}
          <div className="flex items-center space-x-3.5 sm:space-x-4 cursor-pointer group select-none" onClick={() => handlePageChange('inicio')} id="header-logo">
            {/* Logo Icon / Emblem with Custom Image - Highly Visible & Prominent */}
            <div className="relative flex items-center justify-center shrink-0">
              {/* Outer Neon Glow */}
              <div className="absolute -inset-1.5 bg-gradient-to-tr from-pink-600 via-rose-500 to-pink-400 rounded-full blur-md opacity-60 group-hover:opacity-100 transition duration-300 group-hover:scale-110" />
              
              {/* Main Circular Badge with Illuminated Contrast Rim */}
              <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-full p-[2px] bg-gradient-to-tr from-pink-500 via-white/80 to-pink-400 shadow-[0_0_25px_rgba(236,72,153,0.6)] group-hover:shadow-[0_0_35px_rgba(236,72,153,0.9)] transition-all duration-300 group-hover:scale-105">
                <div className="w-full h-full rounded-full bg-[#0d0712] flex items-center justify-center p-1 relative overflow-hidden ring-1 ring-pink-500/40">
                  {/* Subtle radial inner backlight to make dark logo details clearly visible against black theme */}
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
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center space-x-2 lg:space-x-3 bg-slate-950/50 p-1.5 rounded-xl border border-slate-900/60" id="desktop-nav">
            {[
              { id: 'inicio', label: 'Inicio', icon: Home },
              { id: 'perfis', label: 'Quem ensinamos', icon: Users },
              { id: 'metodo', label: 'Metodologia', icon: Compass },
              { id: 'sobre', label: 'Instrutor & Dúvidas', icon: ShieldCheck },
              { id: 'planos', label: 'Nossos Planos', icon: Bike },
              { id: 'galeria', label: 'Galeria Viva', icon: Sparkles },
            ].map((tab) => {
              const isSelected = activePage === tab.id;
              const IconComp = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => handlePageChange(tab.id)}
                  className={`text-xs lg:text-sm font-bold flex items-center gap-1.5 px-3 py-2 rounded-lg transition-all duration-300 relative cursor-pointer select-none ${
                    isSelected ? 'text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {isSelected && (
                    <motion.div
                      layoutId="headerActiveTab"
                      className="absolute inset-0 bg-pink-500/10 border border-pink-500/20 rounded-lg"
                      transition={{ type: 'spring', stiffness: 350, damping: 28 }}
                    />
                  )}
                  <IconComp className={`w-3.5 h-3.5 ${isSelected ? 'text-pink-500' : 'text-slate-400'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>

          {/* CTA Header */}
          <div className="flex items-center space-x-3">
            <button 
              onClick={() => handlePageChange('agendamento')}
              className={`flex items-center space-x-2 text-white text-xs sm:text-sm font-black px-4 py-2 rounded-lg sm:px-5 sm:py-2.5 transition-all duration-300 transform hover:-translate-y-0.5 cursor-pointer ${
                activePage === 'agendamento'
                  ? 'bg-pink-600 shadow-[0_4px_25px_rgba(255,0,127,0.6)] ring-2 ring-pink-400'
                  : 'bg-[#ff007f] hover:bg-pink-600 shadow-[0_4px_15px_rgba(255,0,127,0.3)] hover:shadow-[0_4px_25px_rgba(255,0,127,0.5)]'
              }`}
              id="header-cta"
            >
              <Calendar className="w-4 h-4 fill-white/10" />
              <span>Agendar Aula</span>
            </button>
          </div>

        </div>
      </header>

      {/* Mobile Sub-Header Navigation */}
      <div className="md:hidden sticky top-[80px] z-40 bg-[#060608]/95 border-b border-pink-500/10 backdrop-blur-md px-4 py-3 flex items-center overflow-x-auto gap-2 scrollbar-none" id="mobile-nav-bar">
        {[
          { id: 'inicio', label: 'Inicio', icon: Home },
          { id: 'perfis', label: 'Quem ensinamos', icon: Users },
          { id: 'metodo', label: 'Metodologia', icon: Compass },
          { id: 'sobre', label: 'Instrutor & Dúvidas', icon: ShieldCheck },
          { id: 'planos', label: 'Nossos Planos', icon: Bike },
          { id: 'galeria', label: 'Galeria Viva', icon: Sparkles },
          { id: 'agendamento', label: 'Agendar Aula', icon: Calendar },
        ].map((tab) => {
          const isSelected = activePage === tab.id;
          const IconComp = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => handlePageChange(tab.id)}
              className={`flex items-center gap-1.5 text-xs px-4 py-2.5 rounded-full font-extrabold whitespace-nowrap transition-all duration-350 cursor-pointer select-none ${
                isSelected 
                  ? 'bg-pink-500/10 border border-pink-500/40 text-white shadow-[0_0_12px_rgba(236,72,153,0.15)]' 
                  : 'bg-slate-950/60 border border-slate-900 text-slate-400 hover:text-slate-200'
              }`}
            >
              <IconComp className={`w-3.5 h-3.5 ${isSelected ? 'text-pink-500' : 'text-slate-500'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 
        ========================================
        PAGE: INÍCIO (PARTE 1)
        ========================================
      */}
      {activePage === 'inicio' && (
        <motion.div
          key="inicio-part1"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          {/* SECTION 1: HERO (PRIMEIRA DOBRA) */}
          <section className="relative py-8 sm:py-10 lg:py-12 min-h-[calc(100vh-5rem)] flex items-center justify-center border-b border-pink-500/5" id="hero">
        <div className="w-[92vw] lg:w-[80vw] max-w-[1600px] mx-auto px-2 sm:px-4 lg:px-6 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10 xl:gap-14 items-center justify-between">
            
            {/* Left Column Text details - 50% width on Desktop */}
            <div className="w-full space-y-6 lg:space-y-7 text-center lg:text-left">
              

              {/* Title headlines with strict requested copies */}
              <div className="space-y-4 sm:space-y-5">
                <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl xl:text-6xl 2xl:text-[3.5rem] font-black tracking-tight text-white leading-[1.1]" id="hero-headline">
                  “Nunca é tarde para <br className="hidden sm:inline" />
                  <span className="bg-gradient-to-r from-pink-500 via-pink-400 to-[#ff2a85] bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(236,72,153,0.15)]">
                    aprender a pedalar.”
                  </span>
                </h1>
                
                <h2 className="text-lg sm:text-xl xl:text-2xl text-slate-200 font-medium leading-relaxed" id="hero-subheadline">
                  Muitas pessoas acreditaram por anos que não eram capazes… <br className="hidden sm:inline" />
                  mas descobriram que o problema nunca foi elas — foi a falta do método certo.
                </h2>

                <p className="text-base sm:text-lg xl:text-xl text-slate-300 leading-relaxed font-light">
                  Com a <strong className="text-white font-bold">ABC do Pedal</strong>, você aprende com segurança, no seu tempo e sem vergonha. <br className="hidden lg:inline" />
                  Não existe pressão, comparação ou julgamento — existe um método que te leva, passo a passo, até você perceber que já está pedalando.
                </p>
              </div>

              {/* Bullet list of advantages */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 text-left" id="hero-bullets">
                <div className="flex items-center space-x-3 bg-slate-905/40 border border-slate-800/80 px-4 py-3.5 rounded-xl">
                  <div className="p-1 bg-pink-500/15 rounded-full text-pink-400 shrink-0">
                    <Check className="w-4 h-4" />
                  </div>
                  <span className="text-xs sm:text-sm font-semibold text-slate-200">Em condomínios, praças e parques</span>
                </div>
                
                <div className="flex items-center space-x-3 bg-slate-905/40 border border-slate-800/80 px-4 py-3.5 rounded-xl">
                  <div className="p-1 bg-pink-500/15 rounded-full text-pink-400 shrink-0">
                    <Check className="w-4 h-4" />
                  </div>
                  <span className="text-xs sm:text-sm font-semibold text-slate-200">Método seguro e progressivo</span>
                </div>

                <div className="flex items-center space-x-3 bg-slate-905/40 border border-slate-800/80 px-4 py-3.5 rounded-xl">
                  <div className="p-1 bg-pink-500/15 rounded-full text-pink-400 shrink-0">
                    <Check className="w-4 h-4" />
                  </div>
                  <span className="text-xs sm:text-sm font-semibold text-slate-200">Atendimento individual ou adaptado</span>
                </div>
              </div>

              {/* Action Buttons conversion oriented */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-1" id="hero-actions">
                <button 
                  onClick={() => handlePageChange('agendamento')}
                  className="w-full sm:w-auto text-center flex items-center justify-center space-x-3 bg-gradient-to-r from-pink-600 to-[#ff007f] hover:from-pink-500 hover:to-[#ff2a85] text-white px-8 py-4 rounded-xl text-base sm:text-lg font-black shadow-[0_0_25px_rgba(255,0,127,0.35)] hover:shadow-[0_0_35px_rgba(255,0,127,0.55)] transition-all duration-300 transform hover:-translate-y-0.5 cursor-pointer whitespace-nowrap"
                  id="hero-primary-cta"
                >
                  <Calendar className="w-5 h-5 fill-white/10" />
                  <span>Comece já Aprender a Pedalar</span>
                </button>
                
                <button 
                  onClick={() => handlePageChange('planos')}
                  className="w-full sm:w-auto text-center flex items-center justify-center space-x-2 text-pink-300 hover:text-white bg-pink-950/20 hover:bg-pink-900/30 border border-pink-500/30 hover:border-pink-500/60 px-6 py-4 rounded-xl text-base sm:text-lg font-semibold transition-all duration-300 cursor-pointer whitespace-nowrap"
                  id="hero-planos-cta"
                >
                  <Bike className="w-4 h-4 text-pink-400" />
                  <span>Nossos Planos</span>
                </button>

                <button 
                  onClick={() => handlePageChange('metodo')}
                  className="w-full sm:w-auto text-center flex items-center justify-center space-x-2 text-slate-200 hover:text-white bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-pink-500/40 px-6 py-4 rounded-xl text-base sm:text-lg font-semibold transition-all duration-300 cursor-pointer whitespace-nowrap"
                  id="hero-secondary-cta"
                >
                  <span>Método ABC-DE</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

            </div>

            {/* Right Column Visual Video Presentation - 9:16 Central Window */}
            <div className="w-full relative z-20 flex items-center justify-center" id="hero-visual-card">
              <div className="relative w-full flex flex-col items-center justify-center">
                {/* 9:16 Viewing Window: Exibe estritamente a região central 9:16 do vídeo 16:9 em escala 1:1 */}
                <div 
                  className="relative w-full max-w-[340px] sm:max-w-[360px] lg:max-w-[380px] aspect-[9/16] mx-auto rounded-2xl overflow-hidden bg-black shadow-2xl"
                  id="hero-video-viewport"
                >
                  <iframe 
                    src="https://www.youtube.com/embed/R_uOXPJf3zc?autoplay=1&mute=1&loop=1&playlist=R_uOXPJf3zc&playsinline=1" 
                    title="ABC do Pedal Prova Real de Aprendizado" 
                    className="absolute top-0 left-1/2 -translate-x-1/2 h-full w-[316.05%] min-w-[316.05%] max-w-none"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                    allowFullScreen
                  />
                </div>

                {/* Legenda do Vídeo */}
                <div id="hero-video-caption-container" className="mt-3 text-center">
                  <p id="hero-video-caption" className="text-xs sm:text-sm text-slate-300 font-medium tracking-wide flex items-center justify-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-pink-500 animate-pulse shrink-0" />
                    <span>Alunos reais aprendendo a pedalar.</span>
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>
        </motion.div>
      )}

      {/* 
        ========================================
        PÁGINA: QUEM ENSINAMOS (PERFIS INDIVIDUALIZADOS)
        ========================================
      */}
      {activePage === 'perfis' && (
        <motion.div
          key="perfis-page"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          <section className="py-24 bg-gradient-to-b from-[#040406] to-[#060608] relative border-b border-pink-500/5 overflow-hidden" id="perfis-individualizados">
        <div className="w-[92vw] lg:w-[80vw] max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          
          <div className="max-w-4xl mx-auto text-center space-y-4 mb-16">
            <span className="text-xs sm:text-sm font-mono tracking-widest uppercase text-pink-500 font-extrabold block">
              Atendimento Sob Medida
            </span>
            <h3 className="font-display text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-black text-white tracking-tight">
              Para quem ensinamos?
            </h3>
            <p className="text-slate-300 max-w-3xl mx-auto font-light text-base sm:text-lg lg:text-xl leading-relaxed">
              Cada pessoa possui uma história, uma facilidade motora e medos diferentes. Escolha abaixo a aba que melhor se conecta com o seu momento atual:
            </p>
          </div>

          {/* Harmonious Profile Tabs Navigation with layoutId */}
          <div className="bg-black/45 p-2.5 rounded-2xl border border-slate-900 max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-12">
            {[
              { id: 'adulto', label: 'Adultos', icon: UserCheck },
              { id: 'idoso', label: 'Melhor Idade (60+)', icon: ShieldCheck },
              { id: 'crianca', label: 'Crianças e Adolescentes', icon: Smile },
            ].map((tab) => {
              const TabIcon = tab.icon;
              const isSelected = activeProfileTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveProfileTab(tab.id as any)}
                  className="relative py-3.5 px-4 rounded-xl flex flex-col sm:flex-row items-center justify-center gap-2.5 text-center sm:text-left transition-all duration-300 z-10 font-bold text-xs sm:text-sm cursor-pointer select-none"
                  id={`profile-tab-button-${tab.id}`}
                >
                  {isSelected && (
                    <motion.div
                      layoutId="activeProfileTabBubble"
                      className="absolute inset-0 bg-pink-500/10 border border-pink-500/30 rounded-xl"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                  <TabIcon className={`w-4 h-4 sm:w-5 sm:h-5 shrink-0 transition-colors ${isSelected ? 'text-pink-500' : 'text-slate-400'}`} />
                  <span className={isSelected ? 'text-white' : 'text-slate-400 hover:text-slate-200'}>
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Tab Content Display - Full width matching header */}
          <div className="w-full mx-auto" id="profile-tab-content-panel">
            <AnimatePresence mode="wait">
              {activeProfileTab === 'adulto' && (
                <motion.div
                  key="adulto"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.3 }}
                  className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 bg-[#08080b] border border-slate-800/80 rounded-3xl p-8 sm:p-12 lg:p-14 shadow-2xl"
                >
                  <div className="lg:col-span-7 space-y-6">
                    <span className="text-xs font-mono tracking-widest text-pink-500 font-extrabold uppercase bg-pink-500/5 border border-pink-500/10 px-3.5 py-1.5 rounded-full inline-block">
                      Aprendizado Seguro, Respeitoso e Progressivo
                    </span>
                    <h4 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white leading-tight">
                      Adultos com Medo ou Vergonha de Tentar
                    </h4>
                    <p className="text-slate-200 text-base sm:text-lg lg:text-xl leading-relaxed font-light">
                      Muitos adultos adiam o sonho de pedalar por vergonha de admitir que não sabem ou pelo medo de cair e se machucar. Nosso método foi desenvolvido para acolher essas inseguranças e transformar o aprendizado em uma experiência segura, respeitosa e progressiva.
                    </p>
                    <p className="text-slate-200 text-base sm:text-lg leading-relaxed font-light">
                      As aulas são individuais e acontecem em <strong className="text-white font-semibold">espaços adequados e apropriados para a prática</strong>, com acompanhamento próximo do professor durante todo o processo.
                    </p>

                    <ul className="space-y-3.5 pt-2">
                      {[
                        "Espaços adequados e apropriados para a aula",
                        "Bicicleta adequada ao peso e à altura do aluno",
                        "Acompanhamento individual e progressivo",
                        "Sem competição ou comparação com outros alunos",
                        "Orientação e apoio físico quando necessário",
                        "Exercícios específicos para desenvolver equilíbrio, coordenação e controle corporal"
                      ].map((benefit, idx) => (
                        <li key={idx} className="flex items-start space-x-3 text-sm sm:text-base text-slate-300">
                          <Check className="w-5 h-5 text-pink-500 shrink-0 mt-0.5" />
                          <span className="font-medium text-slate-200">{benefit}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="lg:col-span-5 flex flex-col justify-between space-y-6 bg-slate-950/80 border border-slate-900 p-6 sm:p-8 rounded-2xl">
                    <div className="space-y-4">
                      <h5 className="text-xs sm:text-sm font-mono font-bold tracking-wider text-pink-400 uppercase">Indicadores de Foco</h5>
                      <div className="space-y-3.5">
                        {[
                          { name: "Resguardo Emocional", val: 100 },
                          { name: "Segurança de Equilíbrio", val: 100 },
                          { name: "Retorno da Autonomia", val: 98 }
                        ].map((metric, idx) => (
                          <div key={idx} className="space-y-1.5">
                            <div className="flex justify-between text-xs sm:text-sm font-mono">
                              <span className="text-slate-300">{metric.name}</span>
                              <span className="text-pink-400 font-bold">{metric.val}%</span>
                            </div>
                            <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden">
                              <div className="h-full bg-pink-500 rounded-full" style={{ width: `${metric.val}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-900 space-y-3">
                      <p className="text-xs sm:text-sm font-mono text-slate-300 italic">
                        “Pedalar é uma conquista possível em qualquer momento da vida. Com o método certo e acompanhamento individual, você descobre que é capaz.”
                      </p>
                      <a 
                        href={`https://wa.me/5511950438948?text=${encodeURIComponent("Olá! Desejo agendar uma aula de bike individual focada para adultos com medo/vergonha.")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full text-center flex items-center justify-center space-x-2 bg-pink-600 hover:bg-pink-505 text-white py-3.5 px-4 rounded-xl text-sm font-bold transition-all shadow-[0_0_15px_rgba(236,72,153,0.15)]"
                      >
                        <MessageCircle className="w-4 h-4 fill-white/10" />
                        <span>Falar com o Professor</span>
                      </a>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeProfileTab === 'idoso' && (
                <motion.div
                  key="idoso"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.3 }}
                  className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 bg-[#08080b] border border-slate-800/80 rounded-3xl p-8 sm:p-12 lg:p-14 shadow-2xl"
                >
                  <div className="lg:col-span-7 space-y-6">
                    <span className="text-xs font-mono tracking-widest text-pink-500 font-extrabold uppercase bg-pink-500/5 border border-pink-500/10 px-3.5 py-1.5 rounded-full inline-block">
                      Autonomia, Confiança e Segurança
                    </span>
                    <h4 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white leading-tight">
                      Melhor Idade e Adultos Ativos (60+)
                    </h4>
                    <p className="text-slate-200 text-base sm:text-lg lg:text-xl leading-relaxed font-light">
                      Aprender a andar de bicicleta depois dos 60 é uma oportunidade de desenvolver novas habilidades, ampliar a confiança corporal e conquistar mais autonomia.
                    </p>
                    <p className="text-slate-200 text-base sm:text-lg leading-relaxed font-light">
                      As aulas são conduzidas por Educador Físico habilitado, com acompanhamento individual e atenção às características, experiências e necessidades de cada aluno.
                    </p>
                    <p className="text-slate-200 text-base sm:text-lg leading-relaxed font-light">
                      O processo respeita o tempo de aprendizagem e prioriza a segurança em todas as etapas, desde o primeiro contato com a bicicleta até a condução com autonomia.
                    </p>

                    <ul className="space-y-3.5 pt-2">
                      {[
                        "Aulas individualizadas, respeitando as características e o ritmo de cada aluno",
                        "Bicicleta adequada ao peso e à altura, proporcionando uma posição mais segura e confortável",
                        "Orientação para subir, iniciar, conduzir, frear e descer da bicicleta",
                        "Acompanhamento próximo do professor durante todo o processo",
                        "Progressão das habilidades de acordo com a evolução do aluno",
                        "Foco no equilíbrio, coordenação, controle corporal e autonomia",
                        "Espaço adequado e apropriado para a realização da aula"
                      ].map((benefit, idx) => (
                        <li key={idx} className="flex items-start space-x-3 text-sm sm:text-base text-slate-300">
                          <Check className="w-5 h-5 text-pink-500 shrink-0 mt-0.5" />
                          <span className="font-medium text-slate-200">{benefit}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="lg:col-span-5 flex flex-col justify-between space-y-6 bg-slate-950/80 border border-slate-900 p-6 sm:p-8 rounded-2xl">
                    <div className="space-y-4">
                      <h5 className="text-xs sm:text-sm font-mono font-bold tracking-wider text-pink-400 uppercase">Indicadores de Foco</h5>
                      <div className="space-y-3.5">
                        {[
                          { name: "Segurança e Prevenção de Quedas", val: 100 },
                          { name: "Equilíbrio e Coordenação Motora", val: 95 },
                          { name: "Autonomia e Confiança Corporal", val: 100 }
                        ].map((metric, idx) => (
                          <div key={idx} className="space-y-1.5">
                            <div className="flex justify-between text-xs sm:text-sm font-mono">
                              <span className="text-slate-300">{metric.name}</span>
                              <span className="text-pink-400 font-bold">{metric.val}%</span>
                            </div>
                            <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden">
                              <div className="h-full bg-pink-500 rounded-full" style={{ width: `${metric.val}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-900 space-y-3">
                      <p className="text-xs sm:text-sm font-mono text-slate-300 italic">
                        “Aprender a andar de bicicleta depois dos 60 é desenvolver novas habilidades, ampliar a confiança corporal e conquistar mais autonomia.”
                      </p>
                      <a 
                        href={`https://wa.me/5511950438948?text=${encodeURIComponent("Olá! Gostaria de obter informações sobre as aulas individuais para 60+ (Melhor Idade e Adultos Ativos).")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full text-center flex items-center justify-center space-x-2 bg-pink-600 hover:bg-pink-505 text-white py-3.5 px-4 rounded-xl text-sm font-bold transition-all shadow-[0_0_15px_rgba(236,72,153,0.15)]"
                      >
                        <MessageCircle className="w-4 h-4 fill-white/10" />
                        <span>Agendar com Segurança</span>
                      </a>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeProfileTab === 'crianca' && (
                <motion.div
                  key="crianca"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.3 }}
                  className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 bg-[#08080b] border border-slate-800/80 rounded-3xl p-8 sm:p-12 lg:p-14 shadow-2xl"
                >
                  <div className="lg:col-span-7 space-y-6">
                    <span className="text-xs font-mono tracking-widest text-pink-500 font-extrabold uppercase bg-pink-500/5 border border-pink-500/10 px-3.5 py-1.5 rounded-full inline-block">
                      Aprendizagem Sem Rodinhas de Apoio
                    </span>
                    <h4 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white leading-tight">
                      Crianças e Adolescentes — Sem Rodinhas!
                    </h4>
                    <p className="text-slate-200 text-base sm:text-lg lg:text-xl leading-relaxed font-light">
                      Aprender a andar de bicicleta vai muito além de retirar as rodinhas de apoio. A criança precisa desenvolver equilíbrio, coordenação, controle corporal e confiança para compreender e conduzir a bicicleta.
                    </p>
                    <p className="text-slate-200 text-base sm:text-lg leading-relaxed font-light">
                      No Método ABCDE, a aprendizagem acontece <strong className="text-white font-semibold">sem o uso de rodinhas de apoio</strong>, desde o início. A criança é conduzida por etapas progressivas, desenvolvendo as habilidades necessárias até conquistar a pedalada livre e, posteriormente, aperfeiçoar o controle e a precisão sobre a bicicleta.
                    </p>

                    <ul className="space-y-3.5 pt-2">
                      {[
                        "Abordagem dinâmica e descontraída, adequada à idade e às características de cada criança",
                        "Aprendizagem sem rodinhas de apoio, desde o início do processo",
                        "Desenvolvimento do equilíbrio, coordenação e controle corporal",
                        "Construção progressiva da confiança e do controle sobre a bicicleta",
                        "Conquista da pedalada livre, sem contato físico do professor",
                        "Desenvolvimento da direção, curvas, frenagem e controle da trajetória",
                        "Refinamento da condução, buscando maior precisão, segurança e autonomia"
                      ].map((benefit, idx) => (
                        <li key={idx} className="flex items-start space-x-3 text-sm sm:text-base text-slate-300">
                          <Check className="w-5 h-5 text-pink-500 shrink-0 mt-0.5" />
                          <span className="font-medium text-slate-200">{benefit}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="lg:col-span-5 flex flex-col justify-between space-y-6 bg-slate-950/80 border border-slate-900 p-6 sm:p-8 rounded-2xl">
                    <div className="space-y-4">
                      <h5 className="text-xs sm:text-sm font-mono font-bold tracking-wider text-pink-400 uppercase">Indicadores de Foco</h5>
                      <div className="space-y-3.5">
                        {[
                          { name: "Equilíbrio e Controle Corporal", val: 100 },
                          { name: "Confiança e Condução Autônoma", val: 100 },
                          { name: "Precisão, Curvas e Frenagens", val: 95 }
                        ].map((metric, idx) => (
                          <div key={idx} className="space-y-1.5">
                            <div className="flex justify-between text-xs sm:text-sm font-mono">
                              <span className="text-slate-300">{metric.name}</span>
                              <span className="text-pink-400 font-bold">{metric.val}%</span>
                            </div>
                            <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden">
                              <div className="h-full bg-pink-500 rounded-full" style={{ width: `${metric.val}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-900 space-y-3">
                      <p className="text-xs sm:text-sm font-mono text-slate-300 italic">
                        “Aprender a andar de bicicleta vai muito além de retirar rodinhas: é desenvolver equilíbrio, coordenação e a liberdade de pedalar.”
                      </p>
                      <a 
                        href={`https://wa.me/5511950438948?text=${encodeURIComponent("Olá! Gostaria de agendar uma aula de bike sem rodinhas para criança/adolescente com o Método ABCDE.")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full text-center flex items-center justify-center space-x-2 bg-pink-600 hover:bg-pink-505 text-white py-3.5 px-4 rounded-xl text-sm font-bold transition-all shadow-[0_0_15px_rgba(236,72,153,0.15)]"
                      >
                        <MessageCircle className="w-4 h-4 fill-white/10" />
                        <span>Agendar Aula Sem Rodinhas</span>
                      </a>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </div>
            </section>
        </motion.div>
      )}

      {/* 
        ========================================
        PÁGINA: METODOLOGIA (MÉTODO ABC-DE DO PEDAL)
        ========================================
      */}
      {activePage === 'metodo' && (
        <motion.div
          key="metodo-page"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          <section className="py-24 bg-[#040406] relative border-b border-pink-500/5" id="metodo">
        <div className="w-[92vw] lg:w-[80vw] max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Header */}
          <div className="max-w-4xl mx-auto text-center space-y-4 mb-16">
            <span className="text-xs sm:text-sm font-mono tracking-widest uppercase text-pink-500 font-extrabold block">
              Inovação Biomecânica
            </span>
            <h3 className="font-display text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-black text-white tracking-tight">
              O Método ABC-DE do Pedal
            </h3>
            <p className="text-slate-300 max-w-3xl mx-auto font-light text-base sm:text-lg lg:text-xl leading-relaxed">
              Desenvolvemos uma estrutura didática comprovada que respeita a biomecânica humana e a neuroplasticidade, garantindo resultados livres de traumas.
            </p>
          </div>

          {/* Interactive Method Tabs Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3.5 sm:gap-4 mb-12 relative w-full" id="metodo-steps-navigation">
            {[
              { 
                id: 'A', 
                title: 'Autoconhecimento', 
                subtitle: 'Primeiro contato estruturado'
              },
              { 
                id: 'B', 
                title: 'Base', 
                subtitle: 'Capacidades essenciais'
              },
              { 
                id: 'C', 
                title: 'Controle', 
                subtitle: 'O corpo comanda a bicicleta'
              },
              { 
                id: 'D', 
                title: 'Domínio', 
                subtitle: 'Pedalar livremente'
              },
              { 
                id: 'E', 
                title: 'Excelência', 
                subtitle: 'Aperfeiçoar a condução'
              }
            ].map((step) => {
              const isSelected = activeMethod === step.id;
              return (
                <button
                  key={step.id}
                  onClick={() => setActiveMethod(step.id as any)}
                  className={`p-5 sm:p-6 rounded-2xl text-left border relative transition-all duration-300 cursor-pointer select-none flex flex-col justify-between group ${
                    isSelected
                      ? 'border-pink-500 shadow-[0_0_25px_rgba(236,72,153,0.18)] bg-[#100d14] text-white'
                      : 'bg-[#09090c]/70 border-slate-800/80 text-slate-400 hover:text-slate-200 hover:border-slate-700 hover:bg-[#0d0d12]'
                  }`}
                  id={`method-tab-${step.id.toLowerCase()}`}
                >
                  {isSelected && (
                    <motion.div
                      layoutId="activeMethodTabBubble"
                      className="absolute inset-0 bg-gradient-to-b from-pink-950/25 to-black/80 rounded-2xl -z-10"
                      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                    />
                  )}

                  <div>
                    <div className="flex items-center justify-between w-full mb-3 z-10 relative">
                      <div className={`w-10 h-10 rounded-xl font-mono text-base font-black flex items-center justify-center border transition-all ${
                        isSelected 
                          ? 'bg-pink-600 border-pink-400 text-white shadow-[0_0_10px_rgba(236,72,153,0.35)]' 
                          : 'bg-slate-950 border-slate-800 text-slate-300 group-hover:border-slate-700'
                      }`}>
                        {step.id}
                      </div>
                      <span className={`text-[11px] font-mono font-bold uppercase tracking-wider ${
                        isSelected ? 'text-pink-400' : 'text-slate-500 group-hover:text-slate-400'
                      }`}>
                        Etapa {step.id}
                      </span>
                    </div>

                    <p className={`text-base sm:text-lg font-bold leading-tight transition-colors z-10 relative ${
                      isSelected ? 'text-white' : 'text-slate-200'
                    }`}>
                      {step.title}
                    </p>
                  </div>

                  <p className={`text-xs sm:text-sm font-light mt-3 leading-snug transition-colors z-10 relative ${
                    isSelected ? 'text-pink-200/90' : 'text-slate-400 group-hover:text-slate-300'
                  }`}>
                    {step.subtitle}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Active Tab Explanation frame - Matches Header Width */}
          <div className="w-full mx-auto" id="active-method-description">
            <div className="bg-[#0b0b0e] border border-pink-500/20 rounded-3xl p-8 sm:p-12 lg:p-14 shadow-2xl relative overflow-hidden">
              
              {/* Highlight background lines */}
              <div className="absolute top-0 right-0 w-48 h-48 bg-radial-glow from-pink-500/10 to-transparent rounded-full pointer-events-none" />

              <AnimatePresence mode="wait">
                <motion.div
                  key={activeMethod}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-8"
                >
                  
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center space-x-4">
                      <div className="w-14 h-14 bg-pink-500/10 border border-pink-500/20 rounded-2xl flex items-center justify-center text-pink-500 font-mono font-black text-2xl shadow-inner">
                        {activeMethod}
                      </div>
                      <div>
                        <span className="text-xs sm:text-sm font-mono text-pink-400 font-bold uppercase tracking-wider">Metodologia Exclusiva</span>
                        <h4 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white leading-tight">
                          {
                            activeMethod === 'A' ? (
                              <>
                                <span>Etapa A: Autoconhecimento</span>
                                <span className="block text-base sm:text-lg lg:text-xl font-medium text-pink-300/90 mt-1 font-sans">Primeiro contato estruturado</span>
                              </>
                            ) :
                            activeMethod === 'B' ? (
                              <>
                                <span>Etapa B: Base</span>
                                <span className="block text-base sm:text-lg lg:text-xl font-medium text-pink-300/90 mt-1 font-sans">Desenvolver as capacidades essenciais</span>
                              </>
                            ) :
                            activeMethod === 'C' ? (
                              <>
                                <span>Etapa C: Controle</span>
                                <span className="block text-base sm:text-lg lg:text-xl font-medium text-pink-300/90 mt-1 font-sans">O corpo começa a comandar a bicicleta</span>
                              </>
                            ) :
                            activeMethod === 'D' ? (
                              <>
                                <span>Etapa D: Domínio</span>
                                <span className="block text-base sm:text-lg lg:text-xl font-medium text-pink-300/90 mt-1 font-sans">Pedalar livremente</span>
                              </>
                            ) : (
                              <>
                                <span>Etapa E: Excelência</span>
                                <span className="block text-base sm:text-lg lg:text-xl font-medium text-pink-300/90 mt-1 font-sans">Aperfeiçoar a condução</span>
                              </>
                            )
                          }
                        </h4>
                      </div>
                    </div>
                    
                    {activeMethod === 'C' && (
                      <span className="bg-pink-900/30 border border-pink-600/60 text-pink-300 font-mono text-xs font-bold uppercase rounded-full px-4 py-1.5 shadow-md">
                        Etapa Central do Método
                      </span>
                    )}


                    {activeMethod === 'E' && (
                      <span className="bg-slate-900/90 border border-pink-500/40 text-pink-300 font-mono text-xs font-bold uppercase rounded-full px-4 py-1.5 shadow-md">
                        Nível Avançado
                      </span>
                    )}
                  </div>

                  <div className="text-base sm:text-lg lg:text-xl text-slate-200 font-light leading-relaxed space-y-5">
                    {activeMethod === 'A' ? (
                      <>
                        <p>
                          É o primeiro contato estruturado do aluno com a bicicleta.
                        </p>
                        <p>
                          Nesta etapa, o aluno sobe na bicicleta, reconhece seus componentes e começa a perceber como seu corpo se comporta sobre ela. São realizadas experiências de equilíbrio estático e adaptação à posição, enquanto o professor observa o aluno, compreende suas características e identifica suas necessidades.
                        </p>
                        <p>
                          Nesta etapa, trabalhamos a familiarização, a consciência corporal, os movimentos básicos e a confiança na relação entre aluno, professor e bicicleta.
                        </p>
                        <p className="text-pink-400 font-medium text-lg sm:text-xl">
                          Aqui começa a construção da confiança.
                        </p>
                      </>
                    ) : activeMethod === 'B' ? (
                      <>
                        <p>
                          Com a confiança inicial estabelecida, o aluno passa a desenvolver as bases motoras e perceptivas necessárias para o movimento.
                        </p>
                        <p>
                          São trabalhados o equilíbrio dinâmico, a coordenação motora, a postura, o centro de gravidade, a percepção corporal e espacial, a visão espacial, o tempo de reação e a capacidade de responder aos movimentos da bicicleta.
                        </p>
                        <p>
                          O objetivo é preparar o corpo e a percepção do aluno para que ele consiga compreender e responder às mudanças que acontecem enquanto a bicicleta se movimenta.
                        </p>
                        <p className="text-pink-400 font-medium text-lg sm:text-xl">
                          Antes de exigir que o aluno pedale, construímos a base para que ele consiga pedalar.
                        </p>
                      </>
                    ) : activeMethod === 'C' ? (
                      <>
                        <p className="text-white font-bold text-lg sm:text-xl">
                          O corpo começa a comandar a bicicleta
                        </p>
                        <p>
                          É o momento em que as habilidades desenvolvidas anteriormente começam a ser transferidas para a bicicleta.
                        </p>
                        <p>
                          O aluno aprende a controlar sua postura, seus movimentos, sua trajetória e a relação entre o corpo e a bicicleta.
                        </p>
                        <p>
                          É também onde surgem as primeiras pedaladas.
                        </p>
                        <p className="text-pink-300 font-medium text-base sm:text-lg lg:text-xl">
                          Experimentar, perceber, compreender e ajustar.
                        </p>
                        <p className="text-pink-400 font-medium text-lg sm:text-xl">
                          É assim que o aluno começa a descobrir que pode controlar a bicicleta.
                        </p>
                      </>
                    ) : activeMethod === 'D' ? (
                      <>
                        <p className="text-white font-bold text-lg sm:text-xl">
                          Pedalar livremente
                        </p>
                        <p>
                          Aqui acontece uma das maiores conquistas da aprendizagem: o aluno passa a pedalar livremente.
                        </p>
                        <p>
                          Sem o contato físico do professor, ele consegue iniciar o movimento, manter a pedalada e deslocar-se continuamente com a bicicleta.
                        </p>
                        <p>
                          O professor permanece próximo, supervisionando e orientando, mas o aluno já não depende de sua intervenção física para permanecer sobre a bicicleta.
                        </p>
                        <p className="text-pink-300 font-medium text-base sm:text-lg lg:text-xl">
                          Ele começa a experimentar a liberdade de simplesmente pedalar.
                        </p>
                        <p className="text-slate-100 font-medium text-base sm:text-lg">
                          Sair, pedalar, deslocar-se, reduzir, parar e retomar.
                        </p>
                        <p className="text-pink-400 font-semibold text-lg sm:text-xl">
                          O objetivo desta etapa é que o aluno conquiste a autonomia funcional para pedalar livremente, construindo segurança e confiança para conduzir a bicicleta por conta própria.
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-white font-bold text-lg sm:text-xl">
                          Depois de conquistar a capacidade de pedalar, chega o momento de aperfeiçoar a condução.
                        </p>
                        <p>
                          O aluno passa a controlar seus movimentos de forma mais consciente e intencional, desenvolvendo precisão nas trajetórias, curvas, velocidade, frenagens, paradas e retomadas.
                        </p>
                        <p className="text-pink-300 font-medium text-base sm:text-lg lg:text-xl">
                          A bicicleta deixa de ser apenas algo que ele consegue conduzir e passa a ser algo que ele sabe controlar.
                        </p>
                        <p className="text-pink-400 font-semibold text-lg sm:text-xl">
                          No E, o aluno transforma a capacidade de pedalar em domínio, precisão e segurança.
                        </p>
                      </>
                    )}
                  </div>

                  {/* Mandatory Phrase Section */}
                  <div className="pt-8 border-t border-slate-900 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
                    
                    <div className="flex items-start space-x-3 max-w-2xl">
                      <span className="inline-block w-3 h-3 rounded-full bg-pink-500 shrink-0 mt-1.5" />
                      <p className="text-sm sm:text-base lg:text-lg font-bold text-pink-400 italic">
                        {
                          activeMethod === 'A' ? '“Nesta etapa, o aluno começa a descobrir que é capaz.”' :
                          activeMethod === 'B' ? '“Aqui, o aluno constrói as ferramentas necessárias para controlar a bicicleta.”' :
                          activeMethod === 'C' ? '“O C representa a transformação das habilidades desenvolvidas nas etapas anteriores em autonomia real sobre a bicicleta.”' :
                          activeMethod === 'D' ? '“No D, o aluno conquista a autonomia funcional para pedalar livremente, com segurança e confiança.”' :
                          '“No E, o aluno transforma a capacidade de pedalar em domínio, precisão e segurança.”'
                        }
                      </p>
                    </div>

                    <a 
                      href={getWhatsAppURL('direct')}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 flex items-center justify-center space-x-2 bg-pink-600 hover:bg-pink-505 text-white font-bold text-sm sm:text-base px-7 py-4 rounded-xl w-full sm:w-auto text-center transition-all shadow-[0_0_20px_rgba(236,72,153,0.3)]"
                      id="metodo-action-cta"
                    >
                      <span>Quero iniciar no meu plano</span>
                      <ChevronRight className="w-5 h-5" />
                    </a>
                  </div>
                </motion.div>
              </AnimatePresence>

            </div>
          </div>

        </div>
      </section>
        </motion.div>
      )}

      {/* 
        ========================================
        PÁGINA: INSTRUTOR & DÚVIDAS
        ========================================
      */}
      {activePage === 'sobre' && (
        <motion.div
          key="sobre-page"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          <section className="py-24 relative overflow-hidden" id="instrutor">
        <div className="w-[92vw] lg:w-[80vw] max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Column Text details */}
            <div className="lg:col-span-7 space-y-8">
              
              <div className="space-y-4">
                <span className="text-xs sm:text-sm font-mono tracking-widest uppercase text-pink-500 font-extrabold block">
                  Cuidado Acadêmico e Técnico
                </span>
                
                <h3 className="font-display text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-black text-white tracking-tight leading-tight">
                  Apoio de Quem Entende de Verdade.
                </h3>
              </div>

              <p className="text-slate-200 text-base sm:text-lg lg:text-xl font-light leading-relaxed">
                Esqueça falsas promessas de pessoas que apenas andam de bicicleta mas não entendem as leis físicas e biológicas da locomoção. Na <strong className="text-white font-bold">ABC do Pedal</strong>, todo o seu processo de adaptação de equilíbrio é monitorado diretamente por um profissional de educação física registrado.
              </p>

              {/* Specific required credits list */}
              <div className="flex flex-col gap-4 pt-2">
                
                {/* 1. Educação Física */}
                <div className="flex flex-col space-y-4 bg-slate-950/60 border border-slate-900 p-5 sm:p-6 rounded-2xl">
                  <div className="flex items-start space-x-3.5">
                    <div className="p-3 bg-pink-500/10 rounded-xl text-pink-500 shrink-0">
                      <GraduationCap className="w-6 h-6" />
                    </div>
                    <div>
                      <h5 className="text-base sm:text-lg font-bold text-white leading-none">Educação Física</h5>
                      <p className="text-sm sm:text-base text-slate-300 mt-2 leading-relaxed font-light">
                        Formado em Educação Física há mais de 18 anos. Especialização em Desenvolvimento e Aprendizagem Motora.
                      </p>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-900/80">
                    <h6 className="text-xs sm:text-sm font-mono font-bold tracking-wider text-pink-400 uppercase mb-3">
                      Competências Profissionais
                    </h6>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs sm:text-sm text-slate-300">
                      {[
                        "Análise e desenvolvimento das capacidades e habilidades motoras",
                        "Desenvolvimento do controle postural e da estabilidade dinâmica",
                        "Estímulo à integração entre equilíbrio, coordenação e controle corporal",
                        "Desenvolvimento da coordenação bilateral e óculo-motora",
                        "Estímulo à percepção corporal, espacial e cinestésica",
                        "Adaptação dos estímulos motores às características e respostas individuais do aluno",
                        "Promoção da aprendizagem motora por meio de experiências sensório-motoras progressivas"
                      ].map((comp, idx) => (
                        <li key={idx} className="flex items-start space-x-2">
                          <Check className="w-4 h-4 text-pink-500 shrink-0 mt-0.5" />
                          <span className="leading-snug">{comp}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* 2. Educação Social */}
                <div className="flex flex-col space-y-4 bg-slate-950/60 border border-slate-900 p-5 sm:p-6 rounded-2xl">
                  <div className="flex items-start space-x-3.5">
                    <div className="p-3 bg-pink-500/10 rounded-xl text-pink-500 shrink-0">
                      <HeartHandshake className="w-6 h-6" />
                    </div>
                    <div>
                      <h5 className="text-base sm:text-lg font-bold text-white leading-none">Educação Social</h5>
                      <p className="text-sm sm:text-base text-slate-300 mt-2 leading-relaxed font-light">
                        Formação em Educação Social. Especialização em Desenvolvimento de Habilidades Socioemocionais e Capacidades Socioafetivas.
                      </p>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-900/80">
                    <h6 className="text-xs sm:text-sm font-mono font-bold tracking-wider text-pink-400 uppercase mb-3">
                      Competências Profissionais
                    </h6>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs sm:text-sm text-slate-300">
                      {[
                        "Acolhimento e escuta qualificada",
                        "Desenvolvimento da autoconfiança e da percepção das próprias capacidades",
                        "Estímulo à autonomia e à tomada de decisão",
                        "Desenvolvimento da autorregulação emocional diante de desafios",
                        "Promoção da capacidade de lidar com inseguranças e frustrações",
                        "Estímulo à persistência e à capacidade de enfrentamento",
                        "Desenvolvimento da percepção e expressão das emoções",
                        "Construção de vínculos educativos baseados em confiança e respeito",
                        "Promoção do protagonismo e da autonomia do aluno"
                      ].map((comp, idx) => (
                        <li key={idx} className="flex items-start space-x-2">
                          <Check className="w-4 h-4 text-pink-500 shrink-0 mt-0.5" />
                          <span className="leading-snug">{comp}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

              </div>

            </div>

            {/* Right Column Image details */}
            <div className="lg:col-span-1" />
            <div className="lg:col-span-4 relative" id="instrutor-avatar-frame">
              <div className="relative mx-auto max-w-[360px] lg:max-w-none">
                
                {/* Decorative Neon pink Border */}
                <div className="absolute inset-0 bg-pink-500/15 rounded-3xl blur-xl" />
                
                <div className="relative border border-slate-800 bg-[#0b0b0e] p-5 rounded-3xl text-center">
                  
                  <div className="relative w-full h-[380px] sm:h-[420px] rounded-2xl overflow-hidden bg-slate-900 mb-4">
                    <Image 
                      src="https://i.postimg.cc/G2r8WFx0/Quem-e-o-Professor-Zigui-(3).png" 
                      alt="Instrutor profissional da ABC do Pedal - Anderson Zigui"
                      fill
                      className="object-cover object-top hover:scale-105 transition-transform duration-500"
                      referrerPolicy="no-referrer"
                    />
                  </div>

                  <div className="space-y-2 text-center">
                    <div>
                      <h4 className="text-xl font-black text-white tracking-tight uppercase">ABC DO PEDAL</h4>
                      <span className="block text-xs font-mono tracking-wider text-pink-400 font-bold uppercase mt-0.5">
                        Escola de Iniciação ao Ciclismo
                      </span>
                    </div>

                    <div className="pt-2.5 border-t border-slate-800/80">
                      <h5 className="text-base sm:text-lg font-bold text-white leading-tight">Anderson Zigui</h5>
                      <span className="text-xs font-mono text-slate-400 font-semibold tracking-wide">
                        Instrutor e CEO
                      </span>
                    </div>

                    <p className="text-xs sm:text-sm text-slate-300 pt-1 font-light leading-relaxed">
                      Especializada no ensino e na aprendizagem da bicicleta, a ABC do Pedal desenvolve processos educativos que integram aprendizagem motora, desenvolvimento humano e habilidades socioemocionais.
                    </p>
                  </div>

                </div>

              </div>
            </div>

          </div>
        </div>
      </section>

      {/* SECTION 8: FAQ ACCORDION (Aesthetic trust elements) */}
      <section className="py-24 bg-[#040406] border-t border-pink-500/5" id="perguntas-frequentes">
        <div className="w-[92vw] lg:w-[80vw] max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center space-y-4 mb-16 max-w-4xl mx-auto">
            <span className="text-xs sm:text-sm font-mono tracking-widest uppercase text-pink-500 font-extrabold block">Tire Suas Dúvidas</span>
            <h3 className="font-display text-3xl sm:text-4xl lg:text-5xl font-black text-white">Perguntas Comuns de Quem Deseja Aprender</h3>
            <p className="text-slate-300 text-base sm:text-lg lg:text-xl font-light">Compilamos as principais perguntas de quem deseja ingressar e realizar o seu sonho.</p>
          </div>

          {/* Accordion List */}
          <div className="space-y-4 max-w-5xl mx-auto" id="faq-accordions">
            {[
              {
                q: "A escola fornece a bicicleta e os materiais de proteção?",
                a: "Sim, absolutamente! Fornecemos todas as bicicletas de treino, adaptadas para adolescentes, adultos e idosos de qualquer altura, bem como capacetes higienizados e os equipamentos indispensáveis de segurança."
              },
              {
                q: "Tenho mais de 60 anos ou sofro com bloqueio corporal. Eu consigo aprender?",
                a: "Claro que sim. O Método ABC-DE é focado exatamente em idades e bloqueios variados. Nossos alunos são, em sua enorme maioria, adultos e idosos. Não realizamos qualquer movimento brusco ou forçado, respeitando seu limite motriz."
              },
              {
                q: "Como agendo meu horário e escolho o local da aula?",
                a: "Todo o processo é ajustado com simplicidade pelo WhatsApp. Você pode escolher treinar em áreas privadas do seu condomínio, praças tranquilas ou diretamente no Parque Ibirapuera em horários planos e pacíficos."
              }
            ].map((faq, i) => {
              const isExpanded = activeFaqIndex === i;
              return (
                <div key={i} className={`border rounded-2xl overflow-hidden transition-all duration-300 ${
                  isExpanded ? 'border-pink-500/30 bg-[#0c0c10]' : 'border-slate-900 bg-[#09090c]'
                }`}>
                  <button 
                    onClick={() => setActiveFaqIndex(isExpanded ? null : i)}
                    className="w-full text-left p-6 sm:p-7 text-white font-bold text-base sm:text-lg lg:text-xl flex items-center justify-between gap-4 cursor-pointer select-none focus:outline-none"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown className={`w-6 h-6 text-pink-500 shrink-0 transition-transform duration-300 ${
                      isExpanded ? 'rotate-180' : ''
                    }`} />
                  </button>
                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="border-t border-slate-900/40"
                      >
                        <p className="px-6 sm:px-7 pb-7 pt-4 text-base sm:text-lg text-slate-200 font-light leading-relaxed">
                          {faq.a}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>

        </div>
      </section>
        </motion.div>
      )}

      {/* 
        ========================================
        PAGE: NOSSOS PLANOS (PÁGINA DEDICADA)
        ========================================
      */}
      {activePage === 'planos' && (
        <motion.div
          key="planos-dedicated"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          <NossosPlanosView
            onSelectPlan={(planId) => {
              handlePageChange('agendamento');
            }}
            onGoToBooking={() => handlePageChange('agendamento')}
          />
        </motion.div>
      )}

      {/* 
        ========================================
        PÁGINA: GALERIA VIVA (EXPERIÊNCIA EM TELA CHEIA)
        ========================================
      */}
      {activePage === 'galeria' && (
        <motion.div
          key="galeria-viva-view"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          <GaleriaVivaView
            onGoToBooking={() => handlePageChange('agendamento')}
          />
        </motion.div>
      )}

      {/* 
        ========================================
        PAGE: AGENDAMENTO (PROGRAMA APRENDER A PEDALAR)
        ========================================
      */}
      {activePage === 'agendamento' && (
        <motion.div
          key="agendamento-view"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="pt-6 pb-20 relative z-10"
        >
          {/* Quick Subnavigation */}
          <div className="w-[92vw] lg:w-[80vw] max-w-[1600px] mx-auto px-4 mb-6 flex flex-wrap items-center justify-between gap-3 bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800 backdrop-blur-md">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setAgendamentoSubView('booking')}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-mono font-bold transition-all ${
                  agendamentoSubView === 'booking'
                    ? 'bg-pink-600 text-white shadow-md'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                1. Contratação & Agendamento
              </button>
              <button
                type="button"
                onClick={() => setAgendamentoSubView('student_portal')}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-mono font-bold flex items-center gap-1.5 transition-all ${
                  agendamentoSubView === 'student_portal'
                    ? 'bg-pink-600 text-white shadow-md'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <UserCheck className="w-4 h-4 text-pink-400" />
                <span>2. Área do Aluno</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setAgendamentoSubView('admin')}
              className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-mono font-bold flex items-center gap-2 transition-all cursor-pointer ${
                agendamentoSubView === 'admin'
                  ? 'bg-pink-600 text-white shadow-lg shadow-pink-600/30 ring-1 ring-pink-400'
                  : 'bg-slate-900 text-slate-300 hover:text-white border border-slate-800 hover:border-pink-500/40'
              }`}
              title="Painel do Instrutor (Bloqueado para alunos - Acesso com senha 16090424)"
              id="btn-painel-instrutor"
            >
              <Lock className="w-4 h-4 text-amber-400" />
              <span>Painel do Instrutor</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300 font-normal">
                Bloqueado
              </span>
            </button>
          </div>

          {agendamentoSubView === 'booking' && (
            <BookingFlow
              onGoToStudentPortal={(id) => {
                setStudentBookingId(id);
                setAgendamentoSubView('student_portal');
                if (typeof window !== 'undefined') {
                  window.scrollTo({ top: 120, behavior: 'smooth' });
                }
              }}
              onGoToAdmin={() => setAgendamentoSubView('admin')}
            />
          )}

          {agendamentoSubView === 'student_portal' && (
            <StudentPortal
              initialBookingId={studentBookingId}
              onBackToBooking={() => setAgendamentoSubView('booking')}
            />
          )}

          {agendamentoSubView === 'admin' && (
            <AdminPanel
              onExitAdmin={() => setAgendamentoSubView('booking')}
            />
          )}
        </motion.div>
      )}

      {/* SECTION 9: CTA FINAL (RODAPÉ CONVERSOR) */}
      <section className="py-24 relative overflow-hidden bg-gradient-to-b from-[#060608] to-black border-t border-pink-500/10" id="cta-final">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,rgba(236,72,153,0.06),transparent_70%)] pointer-events-none" />
        
        <div className="w-[92vw] lg:w-[80vw] max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center space-y-10">
          
          {/* Logo Brand Emblem in CTA Final */}
          <div className="relative inline-flex items-center justify-center mx-auto">
            {/* Ambient Neon Glow */}
            <div className="absolute -inset-2 bg-gradient-to-tr from-pink-600 via-rose-500 to-pink-400 rounded-full blur-lg opacity-60 pointer-events-none" />
            
            {/* Illuminated Emblem Badge */}
            <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full p-[2px] bg-gradient-to-tr from-pink-500 via-white/80 to-pink-400 shadow-[0_0_35px_rgba(236,72,153,0.6)]">
              <div className="w-full h-full rounded-full bg-[#0d0712] flex items-center justify-center p-2 relative overflow-hidden ring-1 ring-pink-500/40">
                <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_center,rgba(244,114,182,0.22)_0%,rgba(10,5,15,0.95)_75%)] pointer-events-none" />
                <Image 
                  src="https://i.postimg.cc/xqLCZR63/Design-sem-nome-(3).png" 
                  alt="ABC do Pedal" 
                  width={96} 
                  height={96} 
                  className="w-full h-full object-contain drop-shadow-[0_0_12px_rgba(236,72,153,0.7)] relative z-10"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            
            {/* Specific required Phrase text */}
            <h3 className="font-display text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-black text-white tracking-tight leading-tight" id="cta-final-heading">
              “Hoje pode ser o dia em que <br className="hidden sm:inline" />
              você finalmente começa.”
            </h3>
            
            {/* Specific requested subtitle */}
            <p className="text-pink-400 font-mono text-base sm:text-lg lg:text-xl font-bold tracking-wider" id="cta-final-subtext">
              Sem vergonha. Sem pressão. No seu tempo.
            </p>

            <p className="text-slate-200 max-w-3xl mx-auto text-base sm:text-lg lg:text-xl font-light leading-relaxed">
              O seu desejo de poder pedalar ao lado de quem você ama é uma meta totalmente alcançável. Agende a sua experiência agora mesmo e conquiste sua autonomia com quem tem didática profissional comprovada.
            </p>
          </div>

          {/* Core high persuasive Call to Action button */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button 
              onClick={() => handlePageChange('agendamento')}
              className="inline-flex items-center space-x-3 bg-gradient-to-r from-pink-600 to-[#ff007f] hover:from-pink-500 hover:to-[#ff2a85] text-white px-9 py-5 rounded-2xl text-base sm:text-lg lg:text-xl font-black shadow-[0_0_30px_rgba(255,0,127,0.4)] hover:shadow-[0_0_45px_rgba(255,0,127,0.6)] transition-all duration-300 transform hover:-translate-y-1 cursor-pointer"
              id="cta-final-schedule-button"
            >
              <Calendar className="w-6 h-6 fill-white/10 shrink-0" />
              <span>Agendar Aula</span>
            </button>

            <a 
              href={getWhatsAppURL('custom')}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-2.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 px-8 py-5 rounded-2xl text-base sm:text-lg font-bold transition-all"
              id="cta-final-whatsapp-button"
            >
              <MessageCircle className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>Tirar Dúvidas</span>
            </a>
          </div>

          <span className="block text-xs sm:text-sm font-mono text-slate-400 uppercase tracking-widest pt-4">
            ABC DO PEDAL • WHATSAPP: (11) 95043-8948 • PARQUE IBIRAPUERA • SÃO PAULO
          </span>

        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-black py-8 border-t border-slate-900 text-center text-xs sm:text-sm text-slate-400" id="footer">
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
            <button onClick={() => handlePageChange('inicio')} className={`hover:text-white transition-colors cursor-pointer select-none ${activePage === 'inicio' ? 'text-pink-400 font-bold' : ''}`}>Inicio</button>
            <button onClick={() => handlePageChange('perfis')} className={`hover:text-white transition-colors cursor-pointer select-none ${activePage === 'perfis' ? 'text-pink-400 font-bold' : ''}`}>Quem ensinamos</button>
            <button onClick={() => handlePageChange('metodo')} className={`hover:text-white transition-colors cursor-pointer select-none ${activePage === 'metodo' ? 'text-pink-400 font-bold' : ''}`}>Metodologia</button>
            <button onClick={() => handlePageChange('sobre')} className={`hover:text-white transition-colors cursor-pointer select-none ${activePage === 'sobre' ? 'text-pink-400 font-bold' : ''}`}>Instrutor & Dúvidas</button>
            <button onClick={() => handlePageChange('planos')} className={`hover:text-white transition-colors cursor-pointer select-none ${activePage === 'planos' ? 'text-pink-400 font-bold' : ''}`}>Nossos Planos</button>
            <button onClick={() => handlePageChange('galeria')} className={`hover:text-white transition-colors cursor-pointer select-none ${activePage === 'galeria' ? 'text-pink-400 font-bold' : ''}`}>Galeria Viva</button>
            <button onClick={() => handlePageChange('agendamento')} className={`hover:text-pink-400 font-bold transition-colors cursor-pointer select-none ${activePage === 'agendamento' ? 'text-pink-400 font-bold' : ''}`}>Agendar Aula</button>
          </div>
        </div>
      </footer>

    </div>
  );
}
