'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { 
  MapPin, 
  ArrowRight, 
  ArrowLeft, 
  CheckCircle2, 
  Sparkles, 
  ShieldCheck, 
  Search, 
  Loader2, 
  AlertCircle,
  MessageCircle
} from 'lucide-react';
import { 
  RegionId, 
  RegionCardConfig, 
  LocationConfigItem, 
  BookingSelectedLocation,
  INITIAL_REGIONS, 
  getStoredLocations 
} from '@/lib/locations-config';

interface LocationSelectionCardsProps {
  onLocationSelected: (location: BookingSelectedLocation) => void;
  initialSelection?: BookingSelectedLocation | null;
}

export function LocationSelectionCards({
  onLocationSelected,
  initialSelection
}: LocationSelectionCardsProps) {
  // Navigation internal view: 'regions' | 'sao_paulo' | 'abc_paulista' | 'custom_address'
  const [currentView, setCurrentView] = useState<'regions' | 'sao_paulo' | 'abc_paulista' | 'custom_address'>(
    initialSelection?.requiresCustomAddress ? 'custom_address' : 'regions'
  );

  const [parentRegion, setParentRegion] = useState<RegionId | null>(
    initialSelection?.region || null
  );

  // Address inputs for Outras Localidades
  const [cepInput, setCepInput] = useState<string>(initialSelection?.cep || '');
  const [numberInput, setNumberInput] = useState<string>(initialSelection?.number || '');
  const [isLoadingPrice, setIsLoadingPrice] = useState<boolean>(false);
  const [priceResult, setPriceResult] = useState<{
    price: number;
    formattedPrice: string;
    address: string;
    city: string;
    state: string;
    neighborhood?: string;
  } | null>(null);
  const [ineligibleResult, setIneligibleResult] = useState<{
    city: string;
    subRegion?: string;
    reason?: string;
  } | null>(null);
  const [addressError, setAddressError] = useState<string | null>(null);

  const allLocations = getStoredLocations();

  // Filter configurable locations by region
  const spLocations = allLocations.filter((l) => l.region === 'sao_paulo');
  const abcLocations = allLocations.filter((l) => l.region === 'abc_paulista');

  // Format CEP (00000-000)
  const handleCepChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length > 8) val = val.slice(0, 8);
    if (val.length > 5) {
      val = `${val.slice(0, 5)}-${val.slice(5)}`;
    }
    setCepInput(val);
    setAddressError(null);
    setPriceResult(null);
    setIneligibleResult(null);
  };

  // Calculate Price Internally via API
  const handleConsultAddress = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanCep = cepInput.replace(/\D/g, '');
    if (cleanCep.length !== 8) {
      setAddressError('Por favor, informe um CEP válido com 8 dígitos.');
      return;
    }

    setIsLoadingPrice(true);
    setAddressError(null);
    setPriceResult(null);
    setIneligibleResult(null);

    try {
      const res = await fetch('/api/locations/calculate-price', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cep: cleanCep,
          number: numberInput.trim(),
          region: parentRegion || 'sao_paulo'
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setAddressError(data.message || 'Não foi possível consultar este CEP.');
        setIsLoadingPrice(false);
        return;
      }

      // Validação estrita para a região de São Paulo: deve ser logradouro do município de São Paulo
      if (parentRegion === 'sao_paulo') {
        const cityLower = (data.city || '').toLowerCase().trim();
        const stateUpper = (data.state || '').toUpperCase().trim();
        const isSpCity = (cityLower === 'são paulo' || cityLower === 'sao paulo') && (stateUpper === 'SP' || !stateUpper);
        if (!isSpCity) {
          setAddressError('Local inválido, esse CEP não pertence a Cidade de São Paulo');
          setIsLoadingPrice(false);
          return;
        }
      }

      if (data.eligible === false) {
        // Interrompe o fluxo de contratação automática!
        // Não calcula preço, não apresenta horários, não permite avanço para pagamento
        setIneligibleResult({
          city: data.identifiedCity || data.city || 'Local informado',
          subRegion: data.identifiedSubRegion || data.neighborhood,
          reason: data.reason
        });
        setIsLoadingPrice(false);
        return;
      }

      setPriceResult({
        price: data.price,
        formattedPrice: data.formattedPrice,
        address: data.address,
        city: data.city,
        state: data.state,
        neighborhood: data.neighborhood
      });
    } catch {
      setAddressError('Erro de conexão ao consultar local. Tente novamente.');
    } finally {
      setIsLoadingPrice(false);
    }
  };

  // Confirm custom location
  const handleConfirmCustomLocation = () => {
    if (!priceResult) return;

    const calculatedPrice = Number(priceResult.price);
    const selected: BookingSelectedLocation = {
      region: parentRegion || 'outras_localidades',
      regionTitle: parentRegion === 'sao_paulo' ? 'São Paulo' : (parentRegion === 'abc_paulista' ? 'ABC Paulista' : 'Outras Regiões'),
      locationId: parentRegion === 'sao_paulo' ? 'sp_outras_localidades' : 'outras_localidades',
      locationName: parentRegion === 'outras_localidades' ? `Outras Regiões (${priceResult.city})` : (parentRegion === 'sao_paulo' ? `São Paulo - Outras localidades (${priceResult.city})` : `Outras localidades (${priceResult.city})`),
      city: priceResult.city || 'São Paulo',
      state: priceResult.state || 'SP',
      address: priceResult.address,
      cep: cepInput.replace(/\D/g, ''),
      number: numberInput.trim(),
      price: calculatedPrice,
      isFixed: false,
      fixedNote: `Atendimento sob demanda no local informado (${priceResult.city})`
    };

    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem('abc_calculated_price', String(calculatedPrice));
        sessionStorage.setItem('abc_selected_location', JSON.stringify(selected));
        localStorage.setItem('abc_last_calculated_price', String(calculatedPrice));
      } catch (e) {
        console.warn('Could not persist location price to storage', e);
      }
    }

    onLocationSelected(selected);
  };

  // Direct selection of a fixed location
  const handleSelectFixedLocation = (loc: LocationConfigItem, regionTitle: string) => {
    const fixedPrice = Number(loc.price);
    const selected: BookingSelectedLocation = {
      region: loc.region,
      regionTitle,
      locationId: loc.id,
      locationName: loc.name,
      city: loc.city,
      address: loc.address,
      price: fixedPrice,
      isFixed: loc.isFixed,
      fixedNote: loc.fixedNote
    };

    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem('abc_calculated_price', String(fixedPrice));
        sessionStorage.setItem('abc_selected_location', JSON.stringify(selected));
        localStorage.setItem('abc_last_calculated_price', String(fixedPrice));
      } catch (e) {
        console.warn('Could not persist location price to storage', e);
      }
    }

    onLocationSelected(selected);
  };

  return (
    <div id="location-selection-wrapper" className="w-full">
      {/* 1. INITIAL REGION SELECTION (3 CARDS) */}
      {currentView === 'regions' && (
        <div id="regions-selection-step" className="space-y-6">
          {/* Header Texts */}
          <div className="text-center sm:text-left">
            <h2 
              id="location-step-heading" 
              className="text-2xl sm:text-3xl font-black text-white tracking-tight"
            >
              Onde será sua aula?
            </h2>
            <p 
              id="location-step-subheading" 
              className="text-stone-400 text-sm sm:text-base mt-1"
            >
              Escolha a região onde deseja realizar sua aula.
            </p>
          </div>

          {/* 3 Main Cards Grid */}
          <div 
            id="regions-cards-grid" 
            className="grid grid-cols-1 md:grid-cols-3 gap-5 lg:gap-6 pt-2"
          >
            {INITIAL_REGIONS.map((region) => (
              <button
                key={region.id}
                id={`card-region-${region.id}`}
                type="button"
                onClick={() => {
                  setParentRegion(region.id);
                  if (region.id === 'sao_paulo') {
                    setCurrentView('sao_paulo');
                  } else if (region.id === 'abc_paulista') {
                    setCurrentView('abc_paulista');
                  } else {
                    // Outras localidades abre diretamente a inserção de CEP
                    setCurrentView('custom_address');
                  }
                }}
                className="group relative overflow-hidden rounded-2xl bg-black border border-stone-800 text-left transition-all duration-300 ease-out hover:scale-[1.02] hover:border-fuchsia-500 hover:shadow-[0_0_30px_-5px_rgba(217,70,239,0.3)] focus:outline-none focus:ring-2 focus:ring-fuchsia-500 flex flex-col justify-between min-h-[340px] sm:min-h-[380px]"
              >
                {/* Dynamic Photographic Background with Dark Overlay */}
                <div className="absolute inset-0 z-0 overflow-hidden">
                  <Image
                    src={region.image}
                    alt={region.title}
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="object-cover object-center brightness-75 transition-transform duration-700 ease-out group-hover:scale-105"
                    priority
                  />
                  {/* Gradient Dark Overlay for supreme legibility */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/75 to-black/35 z-10" />
                </div>

                {/* Top Badge / Accent */}
                <div className="relative z-20 p-5 flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tracking-wide bg-stone-900/85 text-stone-300 border border-stone-700/60 backdrop-blur-md">
                    <MapPin className="w-3.5 h-3.5 text-fuchsia-400" />
                    Região
                  </span>

                  <div className="w-8 h-8 rounded-full bg-stone-900/80 border border-stone-700/60 flex items-center justify-center text-stone-300 group-hover:bg-fuchsia-600 group-hover:text-white group-hover:border-fuchsia-500 transition-colors">
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </div>

                {/* Bottom Content Area */}
                <div className="relative z-20 p-5 sm:p-6 mt-auto">
                  <h3 
                    id={`region-title-${region.id}`}
                    className="text-2xl font-black text-white tracking-tight group-hover:text-fuchsia-300 transition-colors"
                  >
                    {region.id === 'outras_localidades' ? 'Outras Regiões' : region.title}
                  </h3>
                  <p className="text-stone-300 text-sm leading-relaxed mt-2 line-clamp-3">
                    {region.text}
                  </p>

                  <div className="mt-4 pt-3 border-t border-stone-800/80 flex items-center gap-2 text-xs font-semibold text-fuchsia-400 group-hover:text-fuchsia-300">
                    <span>Ver opções disponíveis</span>
                    <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 2. SUB-VIEW: SÃO PAULO (PARQUE DO IBIRAPUERA OU OUTRAS LOCALIDADES) */}
      {currentView === 'sao_paulo' && (
        <div id="sao-paulo-options-step" className="space-y-6">
          {/* Back Button & Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-stone-800">
            <div>
              <div className="flex items-center gap-2 text-fuchsia-400 text-xs font-bold uppercase tracking-wider mb-1">
                <span>São Paulo</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Escolha o local da sua aula
              </h2>
              <p className="text-stone-400 text-sm mt-1">
                Selecione nosso polo oficial no Ibirapuera ou informe outro espaço em São Paulo.
              </p>
            </div>

            <button
              id="btn-back-to-regions-sp"
              type="button"
              onClick={() => setCurrentView('regions')}
              className="inline-flex items-center gap-2 self-start px-3.5 py-2 rounded-xl text-xs font-semibold text-stone-300 bg-stone-900 border border-stone-800 hover:border-stone-700 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar para Regiões</span>
            </button>
          </div>

          {/* 2 Cards Grid for SP */}
          <div id="sp-cards-grid" className="grid grid-cols-1 md:grid-cols-2 gap-5 lg:gap-6">
            {/* CARD 1: PARQUE DO IBIRAPUERA */}
            <button
              id="card-parque-do-ibirapuera"
              type="button"
              onClick={() => {
                const ibira = spLocations.find((l) => l.id === 'ibirapuera') || {
                  id: 'ibirapuera',
                  region: 'sao_paulo' as const,
                  name: 'Parque do Ibirapuera',
                  city: 'São Paulo',
                  price: 499.00,
                  isFixed: true,
                  fixedNote: 'Local fixo de atendimento da ABC do Pedal.',
                  address: 'Avenida Pedro Álvares Cabral, s/n — Vila Mariana, São Paulo/SP (Portão 10)',
                  image: '/locations/ibirapuera.jpg'
                };
                handleSelectFixedLocation(ibira, 'São Paulo');
              }}
              className="group relative overflow-hidden rounded-2xl bg-black border border-stone-800 text-left transition-all duration-300 ease-out hover:scale-[1.02] hover:border-fuchsia-500 hover:shadow-[0_0_30px_-5px_rgba(217,70,239,0.3)] focus:outline-none focus:ring-2 focus:ring-fuchsia-500 flex flex-col justify-between min-h-[360px]"
            >
              <div className="absolute inset-0 z-0 overflow-hidden">
                <Image
                  src="/locations/ibirapuera.jpg"
                  alt="Parque do Ibirapuera"
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover object-center brightness-75 transition-transform duration-700 ease-out group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-black/35 z-10" />
              </div>

              {/* Top Details */}
              <div className="relative z-20 p-5 flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-wide bg-fuchsia-950/90 text-fuchsia-300 border border-fuchsia-600/40 backdrop-blur-md">
                  <ShieldCheck className="w-3.5 h-3.5 text-fuchsia-400" />
                  Local Fixo de Atendimento
                </span>

                <div className="text-right">
                  <span className="text-xs text-stone-400 block font-medium">Investimento</span>
                  <span className="text-2xl font-black text-white group-hover:text-fuchsia-400 transition-colors">
                    R$ 499,00
                  </span>
                </div>
              </div>

              {/* Bottom Details */}
              <div className="relative z-20 p-5 sm:p-6 mt-auto">
                <div className="mb-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black tracking-wide bg-pink-500/20 text-pink-300 border border-pink-500/50">
                    DESAFIO DO PEDAL
                  </span>
                  <span className="block text-[11px] font-mono text-pink-400 font-bold mt-1">
                    Sem quantidade fixa de aulas • Foco na autonomia
                  </span>
                </div>
                <h3 className="text-2xl font-black text-white tracking-tight group-hover:text-fuchsia-300 transition-colors">
                  Parque do Ibirapuera
                </h3>
                <p className="text-stone-300 text-sm leading-relaxed mt-2">
                  Programa para quem quer aprender a pedalar. O aluno não compra uma quantidade fixa de aulas. O processo acompanha sua evolução até conquistar o domínio e a autonomia para pedalar.
                </p>
                <div className="mt-2 text-xs text-stone-400 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-stone-500 shrink-0" />
                  <span>Av. Pedro Álvares Cabral, s/n — Portão 10</span>
                </div>

                <div className="mt-4 pt-3 border-t border-stone-800/80 flex items-center justify-between">
                  <span className="text-xs font-semibold text-fuchsia-400">
                    Selecionar Desafio do Pedal
                  </span>
                  <div className="w-7 h-7 rounded-full bg-fuchsia-600 text-white flex items-center justify-center group-hover:scale-110 transition-transform">
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            </button>

            {/* CARD 2: OUTRAS LOCALIDADES (SP) */}
            <button
              id="card-sp-outras-localidades"
              type="button"
              onClick={() => {
                setParentRegion('sao_paulo');
                setCurrentView('custom_address');
              }}
              className="group relative overflow-hidden rounded-2xl bg-black border border-stone-800 text-left transition-all duration-300 ease-out hover:scale-[1.02] hover:border-fuchsia-500 hover:shadow-[0_0_30px_-5px_rgba(217,70,239,0.3)] focus:outline-none focus:ring-2 focus:ring-fuchsia-500 flex flex-col justify-between min-h-[360px]"
            >
              <div className="absolute inset-0 z-0 overflow-hidden">
                <Image
                  src="/locations/outras_localidades.jpg"
                  alt="Outras localidades"
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover object-center brightness-70 transition-transform duration-700 ease-out group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/85 to-black/40 z-10" />
              </div>

              {/* Top Badge */}
              <div className="relative z-20 p-5 flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-wide bg-stone-900/90 text-stone-300 border border-stone-700/60 backdrop-blur-md">
                  <Sparkles className="w-3.5 h-3.5 text-fuchsia-400" />
                  Atendimento Personalizado
                </span>

                <span className="text-xs font-medium text-stone-400 bg-stone-900/80 px-2.5 py-1 rounded-lg border border-stone-800">
                  Sob consulta de CEP
                </span>
              </div>

              {/* Bottom Content */}
              <div className="relative z-20 p-5 sm:p-6 mt-auto">
                <div className="mb-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black tracking-wide bg-pink-500/20 text-pink-300 border border-pink-500/50">
                    APRENDA A PEDALAR
                  </span>
                  <span className="block text-[11px] font-mono text-pink-400 font-bold mt-1">
                    Formato: 2 encontros de 1 hora
                  </span>
                </div>
                <h3 className="text-2xl font-black text-white tracking-tight group-hover:text-fuchsia-300 transition-colors">
                  Outras localidades (São Paulo)
                </h3>
                <p className="text-stone-300 text-sm leading-relaxed mt-2">
                  Atendimento personalizado realizado em dois encontros de 1 hora, direcionado às necessidades e ao nível de cada aluno.
                </p>

                <div className="mt-4 pt-3 border-t border-stone-800/80 flex items-center justify-between">
                  <span className="text-xs font-semibold text-fuchsia-400">
                    Informar endereço e consultar
                  </span>
                  <div className="w-7 h-7 rounded-full bg-stone-800 border border-stone-700 text-stone-300 flex items-center justify-center group-hover:bg-fuchsia-600 group-hover:text-white group-hover:border-fuchsia-500 transition-colors">
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* 3. SUB-VIEW: ABC PAULISTA (SANTO ANDRÉ, SÃO BERNARDO DO CAMPO, E PREPARADO PARA NOVAS CIDADES) */}
      {currentView === 'abc_paulista' && (
        <div id="abc-options-step" className="space-y-6">
          {/* Back Button & Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-stone-800">
            <div>
              <div className="flex items-center gap-2 text-fuchsia-400 text-xs font-bold uppercase tracking-wider mb-1">
                <span>ABC Paulista</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Locais disponíveis no ABC Paulista
              </h2>
              <p className="text-stone-400 text-sm mt-1">
                Aulas personalizadas com valor especial para o ABC Paulista.
              </p>
            </div>

            <button
              id="btn-back-to-regions-abc"
              type="button"
              onClick={() => setCurrentView('regions')}
              className="inline-flex items-center gap-2 self-start px-3.5 py-2 rounded-xl text-xs font-semibold text-stone-300 bg-stone-900 border border-stone-800 hover:border-stone-700 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar para Regiões</span>
            </button>
          </div>

          {/* Configurable Cities Grid (Santo André, São Bernardo do Campo + extensível) */}
          <div 
            id="abc-cards-grid" 
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-5 lg:gap-6"
          >
            {abcLocations.map((loc) => (
              <button
                key={loc.id}
                id={`card-location-${loc.id}`}
                type="button"
                onClick={() => handleSelectFixedLocation(loc, 'ABC Paulista')}
                className="group relative overflow-hidden rounded-2xl bg-black border border-stone-800 text-left transition-all duration-300 ease-out hover:scale-[1.02] hover:border-fuchsia-500 hover:shadow-[0_0_30px_-5px_rgba(217,70,239,0.3)] focus:outline-none focus:ring-2 focus:ring-fuchsia-500 flex flex-col justify-between min-h-[360px]"
              >
                <div className="absolute inset-0 z-0 overflow-hidden">
                  <Image
                    src={loc.image}
                    alt={loc.name}
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="object-cover object-center brightness-75 transition-transform duration-700 ease-out group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-black/35 z-10" />
                </div>

                {/* Top Price Badge */}
                <div className="relative z-20 p-5 flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-wide bg-fuchsia-950/90 text-fuchsia-300 border border-fuchsia-600/40 backdrop-blur-md">
                    <MapPin className="w-3.5 h-3.5 text-fuchsia-400" />
                    {loc.city}
                  </span>

                  <div className="text-right">
                    <span className="text-xs text-stone-400 block font-medium">Investimento</span>
                    <span className="text-2xl font-black text-white group-hover:text-fuchsia-400 transition-colors">
                      R$ {loc.price.toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                </div>

                {/* Bottom Details */}
                <div className="relative z-20 p-5 sm:p-6 mt-auto">
                  <div className="mb-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black tracking-wide bg-pink-500/20 text-pink-300 border border-pink-500/50">
                      DESAFIO DO PEDAL
                    </span>
                    <span className="block text-[11px] font-mono text-pink-400 font-bold mt-1">
                      Sem quantidade fixa de aulas • Foco na autonomia
                    </span>
                  </div>
                  <h3 className="text-2xl font-black text-white tracking-tight group-hover:text-fuchsia-300 transition-colors">
                    {loc.name}
                  </h3>
                  <p className="text-stone-300 text-sm leading-relaxed mt-2">
                    Programa para quem quer aprender a pedalar. O aluno não compra uma quantidade fixa de aulas. O processo acompanha sua evolução até conquistar o domínio e a autonomia para pedalar.
                  </p>

                  <div className="mt-4 pt-3 border-t border-stone-800/80 flex items-center justify-between">
                    <span className="text-xs font-semibold text-fuchsia-400">
                      Selecionar Desafio do Pedal
                    </span>
                    <div className="w-7 h-7 rounded-full bg-fuchsia-600 text-white flex items-center justify-center group-hover:scale-110 transition-transform">
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Notice about additional ABC locations */}
          <div className="p-4 rounded-xl bg-stone-900/60 border border-stone-800/80 flex items-start gap-3 text-xs text-stone-300">
            <Sparkles className="w-4 h-4 text-fuchsia-400 shrink-0 mt-0.5" />
            <p>
              Deseja realizar a aula em outro município do ABC Paulista ou em seu condomínio? Atendimento na modalidade <strong className="text-pink-400">Aprenda a Pedalar</strong> (2 encontros de 1 hora).{' '}
              <button
                type="button"
                onClick={() => {
                  setParentRegion('abc_paulista');
                  setCurrentView('custom_address');
                }}
                className="text-fuchsia-400 underline font-semibold hover:text-fuchsia-300 ml-1"
              >
                Clique aqui para informar seu endereço e consultar.
              </button>
            </p>
          </div>
        </div>
      )}

      {/* 4. SUB-VIEW: INSERÇÃO DO LOCAL (OUTRAS LOCALIDADES / SOB DEMANDA) */}
      {currentView === 'custom_address' && (
        <div id="custom-address-step" className="space-y-6 max-w-2xl mx-auto">
          {/* Back Button & Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-stone-800">
            <div>
              <div className="flex items-center gap-2 text-fuchsia-400 text-xs font-bold uppercase tracking-wider mb-1">
                <span>
                  {parentRegion === 'outras_localidades'
                    ? 'IMERSÃO DO PEDAL • 1 ENCONTRO DE 2 HORAS'
                    : 'APRENDA A PEDALAR • 2 ENCONTROS DE 1 HORA'}
                </span>
              </div>
              <h2 id="custom-address-heading" className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                {parentRegion === 'outras_localidades' ? 'Imersão do Pedal' : 'Aprenda a Pedalar'} — Insira o local
              </h2>
              <p className="text-stone-300 text-sm mt-1">
                {parentRegion === 'outras_localidades'
                  ? 'Atendimento personalizado realizado em um encontro de 2 horas, em local previamente combinado com o aluno.'
                  : 'Atendimento personalizado realizado em dois encontros de 1 hora, direcionado às necessidades e ao nível de cada aluno.'}
              </p>
            </div>

            <button
              id="btn-back-from-custom"
              type="button"
              onClick={() => {
                if (parentRegion === 'sao_paulo') {
                  setCurrentView('sao_paulo');
                } else if (parentRegion === 'abc_paulista') {
                  setCurrentView('abc_paulista');
                } else {
                  setCurrentView('regions');
                }
              }}
              className="inline-flex items-center gap-2 self-start px-3.5 py-2 rounded-xl text-xs font-semibold text-stone-300 bg-stone-900 border border-stone-800 hover:border-stone-700 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar</span>
            </button>
          </div>

          {/* Form Container */}
          <div className="p-6 sm:p-8 rounded-2xl bg-stone-950 border border-stone-800/90 shadow-2xl space-y-6">
            <form onSubmit={handleConsultAddress} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* CEP Input */}
                <div className="sm:col-span-2">
                  <label htmlFor="input-cep" className="block text-xs font-bold uppercase tracking-wider text-stone-300 mb-2">
                    CEP do Local *
                  </label>
                  <div className="relative">
                    <input
                      id="input-cep"
                      type="text"
                      value={cepInput}
                      onChange={handleCepChange}
                      placeholder="00000-000"
                      maxLength={9}
                      className="w-full bg-stone-900/90 border border-stone-700 rounded-xl px-4 py-3.5 text-white font-mono text-base placeholder-stone-500 focus:outline-none focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500"
                    />
                    <MapPin className="absolute right-3.5 top-3.5 w-5 h-5 text-stone-500 pointer-events-none" />
                  </div>
                </div>

                {/* Número Input */}
                <div>
                  <label htmlFor="input-number" className="block text-xs font-bold uppercase tracking-wider text-stone-300 mb-2">
                    Número / Portaria
                  </label>
                  <input
                    id="input-number"
                    type="text"
                    value={numberInput}
                    onChange={(e) => {
                      setNumberInput(e.target.value);
                      setPriceResult(null);
                    }}
                    placeholder="Ex: 500"
                    className="w-full bg-stone-900/90 border border-stone-700 rounded-xl px-4 py-3.5 text-white text-base placeholder-stone-500 focus:outline-none focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500"
                  />
                </div>
              </div>

              {/* Error Notice */}
              {addressError && (
                <div id="address-error-alert" className="p-3.5 rounded-xl bg-rose-950/70 border border-rose-700/80 text-rose-200 text-xs font-medium flex items-center gap-2.5 shadow-lg shadow-rose-950/40 animate-fadeIn">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span className="leading-relaxed">{addressError}</span>
                </div>
              )}

              {/* Consult Button */}
              <button
                id="btn-calculate-location-price"
                type="submit"
                disabled={isLoadingPrice || cepInput.replace(/\D/g, '').length !== 8}
                className="w-full py-3.5 px-6 rounded-xl font-bold text-sm bg-stone-900 hover:bg-stone-800 border border-stone-700 hover:border-fuchsia-500 text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoadingPrice ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-fuchsia-400" />
                    <span>Calculando viabilidade e valor...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4 text-fuchsia-400" />
                    <span>Verificar local e calcular investimento</span>
                  </>
                )}
              </button>
            </form>

            {/* Ineligible Location in Outras Localidades - Stops auto flow and offers WhatsApp Consultation */}
            {ineligibleResult && (
              <div
                id="ineligible-location-card"
                className="mt-6 p-6 sm:p-7 rounded-2xl bg-stone-900/95 border border-amber-500/50 shadow-xl space-y-4 animate-fadeIn"
              >
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                    <MessageCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-white tracking-tight">
                      Atendimento mediante consulta
                    </h3>
                    <p className="text-xs font-mono text-amber-400 font-semibold mt-0.5">
                      Localidade identificada: {ineligibleResult.city}{ineligibleResult.subRegion ? ` (${ineligibleResult.subRegion})` : ''}
                    </p>
                  </div>
                </div>

                <div className="space-y-2 text-stone-300 text-sm leading-relaxed">
                  <p className="font-semibold text-stone-200">
                    Esta localidade não faz parte da nossa área de atendimento direto pelo site.
                  </p>
                  <p className="text-stone-400">
                    Mas podemos verificar a possibilidade de realizar sua aula nesse local. Consulte nossa equipe pelo WhatsApp.
                  </p>
                  {ineligibleResult.reason === 'barueri_non_alphaville' && (
                    <p className="text-xs text-amber-300/90 bg-amber-950/40 p-2.5 rounded-lg border border-amber-800/40">
                      Nota: Em Barueri, o atendimento direto pelo site é disponibilizado para a região de Alphaville. Para outros bairros de Barueri, consulte nossa equipe.
                    </p>
                  )}
                </div>

                <div className="pt-2">
                  <a
                    id="btn-whatsapp-consult-ineligible"
                    href={`https://wa.me/5511950438948?text=${encodeURIComponent('Olá! Vim pelo site da ABC do Pedal e gostaria de consultar a possibilidade de atendimento em outra localidade.')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2.5 w-full sm:w-auto px-7 py-3.5 rounded-xl font-bold text-sm bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30 transition-all hover:scale-[1.01]"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>CONSULTAR VIA WHATSAPP</span>
                  </a>
                </div>
              </div>
            )}

            {/* Price & Address Confirmation Result (Showing ONLY Final Price, strictly NO internal km/formula) */}
            {priceResult && (
              <div 
                id="location-price-result-card" 
                className="mt-6 p-5 sm:p-6 rounded-xl bg-stone-900/90 border border-fuchsia-500/50 shadow-[0_0_25px_-5px_rgba(217,70,239,0.2)] space-y-4 animate-fadeIn"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-950 text-emerald-300 border border-emerald-500/30">
                        <CheckCircle2 className="w-3 h-3" />
                        Local com atendimento direto
                      </span>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-pink-950/80 text-pink-300 border border-pink-500/40">
                        {parentRegion === 'outras_localidades' ? 'IMERSÃO DO PEDAL • 1 ENCONTRO DE 2H' : 'APRENDA A PEDALAR • 2 ENCONTROS DE 1H'}
                      </span>
                    </div>
                    <p className="text-white text-base font-semibold leading-snug">
                      {priceResult.address}
                    </p>
                    <p className="text-stone-400 text-xs mt-1">
                      Cidade: {priceResult.city} — {priceResult.state}
                    </p>
                    <p className="text-xs text-pink-300/90 mt-2 bg-pink-950/30 p-2.5 rounded-lg border border-pink-500/20">
                      {parentRegion === 'outras_localidades'
                        ? 'Atendimento personalizado realizado em um encontro de 2 horas, em local previamente combinado com o aluno.'
                        : 'Atendimento personalizado realizado em dois encontros de 1 hora, direcionado às necessidades e ao nível de cada aluno.'}
                    </p>
                  </div>

                  {/* Strictly Final Price Display */}
                  <div className="text-left sm:text-right shrink-0 bg-stone-950/60 sm:bg-transparent p-3 sm:p-0 rounded-lg sm:rounded-none border sm:border-0 border-stone-800">
                    <span className="text-xs text-stone-400 block font-medium">Valor da aula</span>
                    <span className="text-2xl sm:text-3xl font-black text-fuchsia-400 tracking-tight font-mono">
                      {priceResult.formattedPrice}
                    </span>
                  </div>
                </div>

                <div className="pt-3 border-t border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <p className="text-xs text-stone-400">
                    Local validado para atendimento direto. Avance para escolher a data e horário da sua aula.
                  </p>
                  <button
                    id="btn-confirm-custom-location"
                    type="button"
                    onClick={handleConfirmCustomLocation}
                    className="w-full sm:w-auto px-6 py-3 rounded-xl font-bold text-sm bg-fuchsia-600 hover:bg-fuchsia-500 text-white shadow-lg shadow-fuchsia-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Confirmar local e ver horários</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
