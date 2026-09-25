'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'motion/react';
import {
  Bike,
  Clock,
  MapPin,
  Sparkles,
  Award,
  Check,
  Calendar,
  ShieldCheck,
  MessageCircle,
  ArrowRight,
  ChevronRight,
  Info,
  X,
  Shield
} from 'lucide-react';
import { PRODUCTS_CATALOG, ProductConfig } from '@/lib/products';

interface NossosPlanosViewProps {
  onSelectPlan: (planId: 'desafio-do-pedal' | 'aprenda-a-pedalar' | 'imersao-do-pedal') => void;
  onGoToBooking: () => void;
}

interface ModalityData {
  id: 'desafio-do-pedal' | 'aprenda-a-pedalar' | 'imersao-do-pedal';
  number: string;
  name: string;
  category: string;
  badgeText: string;
  durationHighlight: string;
  durationExplanation: string;
  briefExplanation: string;
  locationsSummary: string;
  locationsList: { title: string; subtitle?: string }[];
  keyHighlights: string[];
  productName: string;
  pricingTag?: string;
  productValueNote?: string;
  imageSrc: string;
  imageAlt: string;
  imageCaption: string;
  whatsAppType: 'desafio' | 'aprenda' | 'imersao';
  accentColor: string;
}

const MODALITIES: ModalityData[] = [
  {
    id: 'desafio-do-pedal',
    number: '01',
    name: 'DESAFIO DO PEDAL',
    category: 'Conquista do Aprendizado',
    badgeText: 'Polos Fixos de Treino • Autonomia Total',
    durationHighlight: 'Sem quantidade fixa de aulas',
    durationExplanation: 'O processo acompanha a evolução individual até a conquista do domínio e da autonomia para pedalar. Sem contagem regressiva de aulas para vencer.',
    briefExplanation: 'Programa destinado a quem quer aprender a pedalar. O aluno não compra uma quantidade fixa de aulas. O processo acompanha a evolução individual até a conquista do domínio e autonomia para pedalar.',
    locationsSummary: 'Parque do Ibirapuera, Santo André e São Bernardo do Campo',
    locationsList: [
      { title: 'Parque do Ibirapuera — Arena de Eventos', subtitle: 'Acesso pelos Portões 10, 3 e 4' },
      { title: 'Santo André', subtitle: 'Parques e espaços públicos, conforme disponibilidade do espaço' },
      { title: 'São Bernardo do Campo', subtitle: 'Parques e espaços públicos, conforme disponibilidade do espaço' }
    ],
    keyHighlights: [
      'Sem contagem regressiva de aulas para vencer',
      'Avanço gradual e seguro, respeitando o seu ritmo',
      'Instrutor ao lado com suporte técnico e acolhedor',
      'Pistas planas, seguras e 100% isoladas de trânsito de automóveis'
    ],
    productName: 'DESAFIO DO PEDAL',
    pricingTag: 'R$ 499,00 (Ibirapuera) / R$ 399,00 (Polos ABC)',
    productValueNote: '(Você investe no aprendizado e na autonomia, não na quantidade de aulas.)',
    imageSrc: '/locations/ibirapuera.jpg',
    imageAlt: 'Desafio do Pedal no Parque do Ibirapuera e Polos do ABC',
    imageCaption: 'Polo Parque do Ibirapuera — Arena de Eventos e Polos no ABC',
    whatsAppType: 'desafio',
    accentColor: 'from-pink-600 via-pink-500 to-[#ff007f]'
  },
  {
    id: 'aprenda-a-pedalar',
    number: '02',
    name: 'APRENDA A PEDALAR',
    category: 'Atendimento Personalizado',
    badgeText: 'São Paulo & Grande ABC • Atendimento Sob Medida',
    durationHighlight: '2 encontros de 1 hora',
    durationExplanation: 'Realizado em 2 sessões estruturadas de 60 minutos, com acompanhamento direcionado às suas necessidades.',
    briefExplanation: 'Atendimento personalizado realizado em 2 encontros de 1 hora, com acompanhamento direcionado às necessidades e ao nível de cada aluno.',
    locationsSummary: 'Outras localidades de São Paulo e municípios do ABC',
    locationsList: [
      { title: 'Outras localidades de São Paulo capital', subtitle: 'Parques, condomínios ou praças da sua região' },
      { title: 'Municípios do Grande ABC', subtitle: 'São Caetano do Sul, Diadema, Mauá, Ribeirão Pires e outros' }
    ],
    keyHighlights: [
      'Acompanhamento direcionado ao seu nível e necessidades',
      'Divisão em 2 encontros de 1h para melhor assimilação',
      'Prática guiada com foco em controle, postura e equilíbrio',
      'Treino personalizado no condomínio ou espaço público do seu bairro'
    ],
    productName: 'APRENDA A PEDALAR',
    pricingTag: 'R$ 499,00',
    productValueNote: '(Atendimento personalizado em 2 encontros de 1 hora direcionados ao seu nível)',
    imageSrc: '/locations/abc_paulista.jpg',
    imageAlt: 'Aprenda a Pedalar em São Paulo e Grande ABC',
    imageCaption: 'Atendimento Personalizado em São Paulo e Cidades do ABC',
    whatsAppType: 'aprenda',
    accentColor: 'from-pink-500 via-rose-500 to-pink-600'
  },
  {
    id: 'imersao-do-pedal',
    number: '03',
    name: 'IMERSÃO DO PEDAL',
    category: 'Encontro Intensivo Dedicado',
    badgeText: 'Demais Regiões • Sessão Intensiva Contínua',
    durationHighlight: '1 encontro de 2 horas',
    durationExplanation: 'Sessão única intensiva de 2 horas contínuas, em local previamente combinado com o aluno.',
    briefExplanation: 'Atendimento personalizado realizado em um encontro de 2 horas, em local previamente combinado com o aluno.',
    locationsSummary: 'Cidades fora de São Paulo e ABC',
    locationsList: [
      { title: 'Cidades fora de São Paulo e ABC', subtitle: 'Interior paulista, litoral e outras regiões metropolitanas' },
      { title: 'Local previamente combinado', subtitle: 'Condomínios residenciais, praças ou vias tranquilas da sua cidade' }
    ],
    keyHighlights: [
      'Treino intensivo de 2h contínuas no mesmo dia',
      'Local acordado com antecedência para sua comodidade',
      'Ideal para quem mora em outras cidades e busca metodologia comprovada',
      'Planejamento personalizado da aula pelo instrutor'
    ],
    productName: 'IMERSÃO DO PEDAL',
    pricingTag: 'R$ 499,00',
    productValueNote: '(Atendimento intensivo em 1 encontro de 2 horas em local previamente combinado)',
    imageSrc: '/locations/outras_localidades.jpg',
    imageAlt: 'Imersão do Pedal em cidades fora de São Paulo e ABC',
    imageCaption: 'Atendimento Dedicado em Cidades fora de SP e ABC',
    whatsAppType: 'imersao',
    accentColor: 'from-pink-600 via-pink-400 to-[#ff007f]'
  }
];

export function NossosPlanosView({ onSelectPlan, onGoToBooking }: NossosPlanosViewProps) {
  const [selectedModalPlan, setSelectedModalPlan] = useState<ModalityData | null>(null);

  const getWhatsAppURL = (type: 'desafio' | 'aprenda' | 'imersao') => {
    const phoneNumber = '5511950438948';
    let message = '';
    if (type === 'desafio') {
      message = 'Olá, ABC do Pedal! Gostaria de saber mais sobre o programa DESAFIO DO PEDAL (sem quantidade fixa de aulas, foco em aprender a pedalar) no Parque do Ibirapuera, Santo André ou São Bernardo do Campo.';
    } else if (type === 'aprenda') {
      message = 'Olá, ABC do Pedal! Gostaria de saber mais sobre a modalidade APRENDA A PEDALAR (2 encontros de 1 hora) em São Paulo / ABC.';
    } else {
      message = 'Olá, ABC do Pedal! Gostaria de informações sobre a IMERSÃO DO PEDAL (1 encontro de 2 horas) para atendimento na minha cidade fora de São Paulo e ABC.';
    }
    return `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
  };

  const handleContract = (planId: 'desafio-do-pedal' | 'aprenda-a-pedalar' | 'imersao-do-pedal') => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('abc_preferred_plan', planId);
    }
    onSelectPlan(planId);
  };

  return (
    <div className="relative py-12 sm:py-16 lg:py-20 overflow-hidden" id="nossos-planos-view">
      
      {/* Background ambient lighting */}
      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[850px] h-[550px] bg-pink-600/5 blur-[180px] rounded-full pointer-events-none" />
      <div className="absolute bottom-40 right-[-10%] w-[600px] h-[600px] bg-pink-600/5 blur-[160px] rounded-full pointer-events-none" />

      <div className="w-[92vw] lg:w-[80vw] max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* PAGE HERO HEADER */}
        <div className="max-w-4xl mx-auto text-center space-y-4 mb-16 sm:mb-20">
          <span className="text-xs sm:text-sm font-mono tracking-widest uppercase text-pink-500 font-extrabold block">
            Modelos de Atendimento Sob Medida
          </span>
          <h1 className="font-display text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight">
            Nossos Planos
          </h1>
          <p className="text-slate-300 max-w-3xl mx-auto font-light text-base sm:text-lg lg:text-xl leading-relaxed">
            Criamos formatos diferenciados para respeitar sua localização, disponibilidade e objetivo. Cada modalidade possui um modelo pedagógico próprio, sem pacotes genéricos.
          </p>

          {/* Quick jump navigation between modalities */}
          <div className="pt-4 flex flex-wrap items-center justify-center gap-3 sm:gap-4 text-xs font-mono font-bold">
            {MODALITIES.map((mod) => (
              <a
                key={mod.id}
                href={`#section-${mod.id}`}
                className="px-4 py-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 hover:border-pink-500/50 transition-all flex items-center gap-2"
              >
                <span className="text-pink-400 font-mono">{mod.number}</span>
                <span>{mod.name}</span>
              </a>
            ))}
          </div>
        </div>

        {/* 3 DEDICATED SECTIONS FOR EACH MODALITY */}
        <div className="space-y-20 sm:space-y-28 lg:space-y-36">
          {MODALITIES.map((mod, index) => {
            const isReversed = index % 2 === 1;

            return (
              <section
                key={mod.id}
                id={`section-${mod.id}`}
                className="relative rounded-3xl bg-[#08060c] border border-slate-800/80 p-6 sm:p-10 lg:p-14 shadow-2xl transition-all duration-300 hover:border-pink-500/30"
              >
                {/* Subtle top neon accent line */}
                <div className="absolute top-0 inset-x-12 h-[2px] bg-gradient-to-r from-transparent via-pink-500/60 to-transparent" />

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
                  
                  {/* TEXT & ESSENTIAL INFORMATION COLUMN (7 COLS) */}
                  <div className={`space-y-6 lg:col-span-7 ${isReversed ? 'lg:order-2' : 'lg:order-1'}`}>
                    
                    {/* Header tags: Zero-pill discipline (no rounded-full tags) */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-3 text-xs font-mono uppercase tracking-wider text-pink-400 font-bold">
                        <span className="text-pink-500 font-black text-sm">{mod.number}</span>
                        <span>•</span>
                        <span>{mod.badgeText}</span>
                      </div>

                      <h2 className="font-display text-2xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
                        {mod.name}
                      </h2>
                      
                      <p className="text-xs sm:text-sm font-mono text-pink-300 font-bold uppercase tracking-wide">
                        {mod.category}
                      </p>
                    </div>

                    {/* Duração & Formato - Highlight card */}
                    <div className="p-4 sm:p-5 rounded-2xl bg-pink-950/20 border border-pink-500/30 text-left space-y-2">
                      <div className="flex items-center gap-2 text-pink-300 font-bold text-xs sm:text-sm font-mono uppercase">
                        {mod.id === 'desafio-do-pedal' ? (
                          <Award className="w-4 h-4 text-pink-400 shrink-0" />
                        ) : (
                          <Clock className="w-4 h-4 text-pink-400 shrink-0" />
                        )}
                        <span>Duração & Formato</span>
                      </div>
                      <p className="text-base sm:text-lg font-bold text-white">
                        {mod.durationHighlight}
                      </p>
                      <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-light">
                        {mod.durationExplanation}
                      </p>
                    </div>

                    {/* Breve Explicação já existente na Home */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
                        Como Funciona:
                      </h4>
                      <p className="text-sm sm:text-base text-slate-200 leading-relaxed font-light">
                        {mod.briefExplanation}
                      </p>
                    </div>

                    {/* Locais Atendidos */}
                    <div className="p-4 sm:p-5 rounded-2xl bg-black/60 border border-slate-800/90 space-y-2.5">
                      <div className="flex items-center gap-2 text-xs font-mono font-bold text-pink-400 uppercase">
                        <MapPin className="w-4 h-4 text-pink-500 shrink-0" />
                        <span>Locais Atendidos</span>
                      </div>
                      <ul className="space-y-2 text-xs sm:text-sm text-slate-200">
                        {mod.locationsList.map((locItem, idx) => (
                          <li key={idx} className="flex items-start gap-2.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-pink-500 mt-1.5 shrink-0" />
                            <div>
                              <strong className="text-white font-semibold">{locItem.title}</strong>
                              {locItem.subtitle && (
                                <span className="block text-slate-400 text-xs mt-0.5">{locItem.subtitle}</span>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Características Essenciais */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
                        Informações Essenciais:
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {mod.keyHighlights.map((highlight, hIdx) => (
                          <div key={hIdx} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-300">
                            <Check className="w-4 h-4 text-pink-500 shrink-0 mt-0.5" />
                            <span>{highlight}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Produto Correspondente */}
                    <div className="pt-2 border-t border-slate-800/70">
                      <div>
                        <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">
                          Produto Correspondente
                        </span>
                        <span className="text-sm sm:text-base font-bold text-white font-mono">
                          {mod.productName}
                        </span>
                      </div>
                    </div>

                    {/* Botões CONHECER PLANO & CONTRATAR */}
                    <div className="pt-4 flex flex-col sm:flex-row items-center gap-3">
                      {/* Botão CONTRATAR */}
                      <button
                        onClick={() => handleContract(mod.id)}
                        className="w-full sm:w-auto flex-1 py-4 px-6 rounded-xl bg-gradient-to-r from-pink-600 to-[#ff007f] hover:from-pink-500 hover:to-[#ff2a85] text-white font-black text-sm uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(255,0,127,0.35)] hover:shadow-[0_0_30px_rgba(255,0,127,0.55)] flex items-center justify-center gap-2 cursor-pointer"
                        id={`btn-contratar-${mod.id}`}
                      >
                        <Calendar className="w-4 h-4 fill-white/10" />
                        <span>Contratar {mod.name}</span>
                      </button>

                      {/* Botão CONHECER PLANO */}
                      <button
                        onClick={() => setSelectedModalPlan(mod)}
                        className="w-full sm:w-auto py-4 px-6 rounded-xl bg-slate-900 hover:bg-slate-850 text-slate-200 hover:text-white border border-slate-700 hover:border-pink-500/50 font-bold text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer"
                        id={`btn-conhecer-${mod.id}`}
                      >
                        <Info className="w-4 h-4 text-pink-400" />
                        <span>Conhecer Plano</span>
                      </button>

                      {/* WhatsApp tira-dúvidas */}
                      <a
                        href={getWhatsAppURL(mod.whatsAppType)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full sm:w-auto p-4 rounded-xl bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-emerald-500/40 text-slate-300 hover:text-white transition-all flex items-center justify-center gap-1.5"
                        title="Tirar Dúvidas no WhatsApp"
                      >
                        <MessageCircle className="w-4 h-4 text-emerald-400" />
                        <span className="sm:hidden text-xs font-mono">Dúvidas no WhatsApp</span>
                      </a>
                    </div>

                  </div>

                  {/* REAL PHOTOGRAPHY & VISUAL CARD COLUMN (5 COLS) */}
                  <div className={`lg:col-span-5 ${isReversed ? 'lg:order-1' : 'lg:order-2'}`}>
                    <div className="relative rounded-2xl overflow-hidden border border-slate-800 group shadow-2xl">
                      
                      {/* Image Frame */}
                      <div className="relative h-72 sm:h-96 lg:h-[460px] w-full overflow-hidden bg-slate-950">
                        <Image
                          src={mod.imageSrc}
                          alt={mod.imageAlt}
                          fill
                          sizes="(max-width: 768px) 100vw, 40vw"
                          className="object-cover object-center transition-transform duration-700 group-hover:scale-105"
                          referrerPolicy="no-referrer"
                        />
                        
                        {/* Gradient overlays for readability and luxury tone */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
                        <div className="absolute inset-0 ring-1 ring-inset ring-white/10" />

                        {/* Top badge */}
                        <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none">
                          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-pink-300 bg-black/75 backdrop-blur-md px-3 py-1.5 rounded-lg border border-pink-500/30">
                            {mod.locationsSummary}
                          </span>
                        </div>

                        {/* Bottom caption overlay */}
                        <div className="absolute bottom-4 left-4 right-4 p-4 rounded-xl bg-black/80 backdrop-blur-md border border-slate-800 text-left space-y-1">
                          <span className="text-[11px] font-mono uppercase tracking-wider text-pink-400 font-bold block">
                            Ambiente de Treino
                          </span>
                          <p className="text-xs sm:text-sm font-semibold text-white">
                            {mod.imageCaption}
                          </p>
                        </div>
                      </div>

                    </div>
                  </div>

                </div>
              </section>
            );
          })}
        </div>

        {/* CLARIFICATION & PEDAGOGICAL TRANSPARENCY STRIP */}
        <div className="mt-20 max-w-5xl mx-auto p-6 sm:p-8 rounded-2xl bg-[#09070d] border border-pink-500/20 text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl">
          <div className="space-y-2">
            <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2 justify-center sm:justify-start">
              <ShieldCheck className="w-5 h-5 text-pink-500 shrink-0" />
              <span>Transparência Pedagógica ABC do Pedal</span>
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-light">
              Os 3 produtos não são pacotes iguais: enquanto o <strong className="text-white font-semibold">Desafio do Pedal</strong> não possui limite fixo de aulas focando na conquista do aprendizado, o <strong className="text-white font-semibold">Aprenda a Pedalar</strong> conta com 2 encontros de 1h e a <strong className="text-white font-semibold">Imersão do Pedal</strong> concentra o atendimento em 1 encontro único de 2h para cidades fora de SP e ABC.
            </p>
          </div>
          <button
            onClick={onGoToBooking}
            className="shrink-0 px-6 py-3.5 rounded-xl bg-gradient-to-r from-pink-600 to-[#ff007f] hover:from-pink-500 hover:to-[#ff2a85] text-white font-black text-xs sm:text-sm uppercase tracking-wider transition-all shadow-md cursor-pointer whitespace-nowrap"
            id="btn-transparencia-agendar"
          >
            Ir para Agendamento
          </button>
        </div>

      </div>

      {/* MODAL "CONHECER PLANO" */}
      <AnimatePresence>
        {selectedModalPlan && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedModalPlan(null)}
              className="absolute inset-0 bg-black/85 backdrop-blur-md"
            />

            {/* Modal Dialog */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-2xl bg-[#09070e] border border-pink-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl text-left overflow-y-auto max-h-[90vh] z-10 space-y-6"
            >
              {/* Close Button */}
              <button
                onClick={() => setSelectedModalPlan(null)}
                className="absolute top-5 right-5 p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-all cursor-pointer"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Modal Header */}
              <div className="space-y-1">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-pink-400">
                  Detalhes Oficiais do Plano • {selectedModalPlan.number}
                </span>
                <h3 className="font-display text-2xl sm:text-3xl font-black text-white tracking-tight">
                  {selectedModalPlan.name}
                </h3>
                <p className="text-xs font-mono text-slate-400 uppercase">
                  {selectedModalPlan.category}
                </p>
              </div>

              {/* Image banner inside modal */}
              <div className="relative h-44 sm:h-52 w-full rounded-2xl overflow-hidden border border-slate-800">
                <Image
                  src={selectedModalPlan.imageSrc}
                  alt={selectedModalPlan.imageAlt}
                  fill
                  className="object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                <div className="absolute bottom-3 left-4 right-4">
                  <span className="text-xs font-mono text-pink-300 font-bold uppercase">
                    {selectedModalPlan.locationsSummary}
                  </span>
                </div>
              </div>

              {/* Duração & Modelo */}
              <div className="p-4 rounded-2xl bg-pink-950/20 border border-pink-500/30 space-y-1.5">
                <span className="text-xs font-mono font-bold text-pink-400 uppercase flex items-center gap-1.5">
                  <Award className="w-4 h-4" /> Duração & Formato Pedagógico
                </span>
                <p className="text-base font-bold text-white">
                  {selectedModalPlan.durationHighlight}
                </p>
                <p className="text-xs sm:text-sm text-slate-300 font-light leading-relaxed">
                  {selectedModalPlan.durationExplanation}
                </p>
              </div>

              {/* Como Funciona */}
              <div className="space-y-1.5">
                <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
                  Como Funciona o Atendimento:
                </h4>
                <p className="text-sm text-slate-200 leading-relaxed font-light">
                  {selectedModalPlan.briefExplanation}
                </p>
              </div>

              {/* Locais Atendidos */}
              <div className="space-y-2">
                <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
                  Locais Atendidos:
                </h4>
                <div className="space-y-1.5">
                  {selectedModalPlan.locationsList.map((loc, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs sm:text-sm text-slate-200">
                      <MapPin className="w-4 h-4 text-pink-500 shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-white">{loc.title}</strong>
                        {loc.subtitle && <span className="block text-slate-400 text-xs">{loc.subtitle}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Modal CTAs */}
              <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                <button
                  onClick={() => {
                    const planId = selectedModalPlan.id;
                    setSelectedModalPlan(null);
                    handleContract(planId);
                  }}
                  className="w-full flex-1 py-3.5 px-6 rounded-xl bg-gradient-to-r from-pink-600 to-[#ff007f] hover:from-pink-500 hover:to-[#ff2a85] text-white font-black text-sm uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(255,0,127,0.35)] flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Calendar className="w-4 h-4 fill-white/10" />
                  <span>Contratar Agora</span>
                </button>

                <a
                  href={getWhatsAppURL(selectedModalPlan.whatsAppType)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto py-3.5 px-6 rounded-xl bg-slate-900 hover:bg-slate-850 text-slate-200 hover:text-white border border-slate-700 font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2"
                >
                  <MessageCircle className="w-4 h-4 text-emerald-400" />
                  <span>Falar no WhatsApp</span>
                </a>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
