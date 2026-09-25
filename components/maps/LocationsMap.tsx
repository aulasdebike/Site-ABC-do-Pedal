'use client';

import React, { useState } from 'react';
import { APIProvider, Map, AdvancedMarker, Pin, InfoWindow } from '@vis.gl/react-google-maps';
import { MapPin, Navigation, Bike, CheckCircle2, ShieldCheck, Compass } from 'lucide-react';

export interface LocationSpot {
  id: string;
  name: string;
  tag: string;
  lat: number;
  lng: number;
  address: string;
  gate: string;
  features: string[];
  description: string;
}

export const ABC_LOCATIONS: LocationSpot[] = [
  {
    id: 'ibirapuera',
    name: 'Parque do Ibirapuera',
    tag: 'Ponto Principal (Pista Segura)',
    lat: -23.5874,
    lng: -46.6576,
    address: 'Av. Pedro Álvares Cabral - Vila Mariana, São Paulo - SP',
    gate: 'Portão 10 (Próximo à marquise e ciclovia interna)',
    features: ['Pista plana sem tráfego automotivo', 'Área arborizada com sombra', 'Banheiros e bebedouros próximos', 'Piso ideal para primeiras pedaladas'],
    description: 'Nosso polo de referência! Espaço seguro, asfaltado e 100% isolado de carros, com calçada larga para treinar equilíbrio e partida independente.'
  },
  {
    id: 'villa-lobos',
    name: 'Parque Villa-Lobos',
    tag: 'Polo Zona Oeste',
    lat: -23.5469,
    lng: -46.7237,
    address: 'Av. Prof. Fonseca Rodrigues, 2001 - Alto de Pinheiros, São Paulo - SP',
    gate: 'Portão Principal (Ao lado do aluguel de bikes)',
    features: ['Ciclovia plana e espaçosa', 'Excelente visibilidade', 'Circuito de curvas suaves', 'Facilidade de estacionamento'],
    description: 'Ambiente amplo e plano, ideal para quem busca praticar mudanças de direção, controle de trajetória e frenagens com segurança total.'
  },
  {
    id: 'parque-do-povo',
    name: 'Parque do Povo',
    tag: 'Polo Itaim Bibi / Faria Lima',
    lat: -23.5902,
    lng: -46.6896,
    address: 'Av. Henrique Chamma, 420 - Pinheiros, São Paulo - SP',
    gate: 'Acesso Principal pela Av. Henrique Chamma',
    features: ['Pistas tranquilas', 'Segurança monitorada', 'Gramados e calçadas amplas', 'Fácil acesso via ciclofaixa'],
    description: 'Localização central e discreta para alunos adultos e idosos que valorizam ambiente tranquilo para ganhar confiança.'
  },
  {
    id: 'pacaembu',
    name: 'Praça Charles Miller (Pacaembu)',
    tag: 'Polo Zona Central / Pacaembu',
    lat: -23.5412,
    lng: -46.6653,
    address: 'Praça Charles Miller, s/n - Pacaembu, São Paulo - SP',
    gate: 'Em frente à fachada histórica do Estádio do Pacaembu',
    features: ['Vão livre gigante', 'Espaço aberto para raio de curvas', 'Supervisão pedagógica', 'Ideal para treinar aceleração e frenagem'],
    description: 'Área com amplo vão livre, excelente para exercícios com cones, treino de curvas abertas e simulação de dinâmica urbana sem carros.'
  }
];

export default function LocationsMap() {
  const [selectedSpot, setSelectedSpot] = useState<LocationSpot>(ABC_LOCATIONS[0]);
  const [activeMarker, setActiveMarker] = useState<LocationSpot | null>(ABC_LOCATIONS[0]);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

  const getGoogleMapsDirectionsUrl = (spot: LocationSpot) => {
    return `https://www.google.com/maps/dir/?api=1&destination=${spot.lat},${spot.lng}`;
  };

  return (
    <div id="abc-locations-map-section" className="w-full bg-stone-900 rounded-3xl p-6 sm:p-8 text-stone-100 border border-stone-800 shadow-xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-6 border-b border-stone-800">
        <div>
          <div className="flex items-center gap-2 text-amber-400 text-sm font-medium mb-1">
            <Compass className="w-4 h-4" />
            <span>Polos e Pontos de Encontro Oficiais</span>
          </div>
          <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Onde Acontecem as Nossas Aulas
          </h3>
          <p className="text-stone-400 text-sm mt-1 max-w-2xl">
            Ambientes especialmente selecionados pela ABC do Pedal: 100% livres de trânsito de automóveis, com piso regular e infraestrutura completa para acolher você.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-stone-800/80 border border-stone-700/60 rounded-xl px-4 py-2 text-xs text-stone-300 self-start">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Locais seguros e autorizados</span>
        </div>
      </div>

      {/* Grid Layout: Map and Spot Selector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Spot List Tabs */}
        <div className="lg:col-span-5 space-y-3">
          <p className="text-xs uppercase font-semibold tracking-wider text-stone-400 mb-2">
            Escolha o ponto de encontro:
          </p>
          {ABC_LOCATIONS.map((spot) => {
            const isSelected = selectedSpot.id === spot.id;
            return (
              <div
                key={spot.id}
                id={`spot-card-${spot.id}`}
                onClick={() => {
                  setSelectedSpot(spot);
                  setActiveMarker(spot);
                }}
                className={`p-4 rounded-2xl cursor-pointer transition-all duration-200 border text-left ${
                  isSelected
                    ? 'bg-amber-500/10 border-amber-500 text-white shadow-lg'
                    : 'bg-stone-800/50 border-stone-800 text-stone-300 hover:bg-stone-800 hover:border-stone-700'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 mb-1">
                      {spot.tag}
                    </span>
                    <h4 className="font-bold text-base text-white">{spot.name}</h4>
                  </div>
                  <MapPin className={`w-5 h-5 shrink-0 ${isSelected ? 'text-amber-400' : 'text-stone-500'}`} />
                </div>
                <p className="text-xs text-stone-400 mt-1 line-clamp-1">{spot.address}</p>
                <p className="text-xs text-stone-300 mt-2 font-medium flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                  {spot.gate}
                </p>
              </div>
            );
          })}

          {/* Selected Spot Details Card */}
          <div className="p-5 rounded-2xl bg-stone-800/80 border border-stone-700 mt-4">
            <h5 className="text-xs uppercase font-semibold tracking-wider text-amber-400 mb-2">
              Estrutura & Benefícios do Local
            </h5>
            <p className="text-xs text-stone-300 leading-relaxed mb-3">
              {selectedSpot.description}
            </p>
            <div className="space-y-1.5 mb-4">
              {selectedSpot.features.map((feat, idx) => (
                <div key={idx} className="flex items-center gap-2 text-xs text-stone-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>{feat}</span>
                </div>
              ))}
            </div>
            <a
              href={getGoogleMapsDirectionsUrl(selectedSpot)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs transition shadow"
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>Traçar Rota no Google Maps</span>
            </a>
          </div>
        </div>

        {/* Map Container */}
        <div className="lg:col-span-7 flex flex-col h-full">
          <div 
            id="google-maps-canvas-container"
            className="w-full h-[450px] sm:h-[520px] rounded-2xl overflow-hidden border border-stone-700 relative bg-stone-800"
          >
            {apiKey ? (
              <APIProvider apiKey={apiKey}>
                <Map
                  mapId="DEMO_MAP_ID"
                  defaultZoom={12}
                  defaultCenter={{ lat: -23.565, lng: -46.67 }}
                  center={{ lat: selectedSpot.lat, lng: selectedSpot.lng }}
                  zoom={14}
                  gestureHandling="greedy"
                  disableDefaultUI={false}
                  internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                  className="w-full h-full"
                >
                  {ABC_LOCATIONS.map((spot) => (
                    <AdvancedMarker
                      key={spot.id}
                      position={{ lat: spot.lat, lng: spot.lng }}
                      title={spot.name}
                      onClick={() => {
                        setSelectedSpot(spot);
                        setActiveMarker(spot);
                      }}
                    >
                      <Pin
                        background={selectedSpot.id === spot.id ? '#f59e0b' : '#10b981'}
                        borderColor="#ffffff"
                        glyphColor="#ffffff"
                        scale={selectedSpot.id === spot.id ? 1.25 : 1.0}
                      />
                    </AdvancedMarker>
                  ))}

                  {activeMarker && (
                    <InfoWindow
                      position={{ lat: activeMarker.lat, lng: activeMarker.lng }}
                      onCloseClick={() => setActiveMarker(null)}
                    >
                      <div className="text-stone-900 p-2 max-w-[220px]">
                        <p className="font-bold text-sm text-stone-950">{activeMarker.name}</p>
                        <p className="text-xs text-stone-600 mt-0.5">{activeMarker.gate}</p>
                        <a
                          href={getGoogleMapsDirectionsUrl(activeMarker)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 hover:text-amber-800"
                        >
                          Como chegar &rarr;
                        </a>
                      </div>
                    </InfoWindow>
                  )}
                </Map>
              </APIProvider>
            ) : (
              /* Fallback preview if NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is awaiting configuration */
              <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center bg-stone-800/90 backdrop-blur-sm">
                <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 mb-4">
                  <MapPin className="w-8 h-8 animate-bounce" />
                </div>
                <h4 className="text-lg font-bold text-white mb-1">
                  {selectedSpot.name}
                </h4>
                <p className="text-xs text-stone-400 mb-4 max-w-sm">
                  {selectedSpot.address} • {selectedSpot.gate}
                </p>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-stone-900 border border-stone-700 text-xs text-stone-300 mb-5">
                  <Bike className="w-4 h-4 text-emerald-400" />
                  <span>Ponto de Aula Ativo & Monitorado</span>
                </div>
                <a
                  href={getGoogleMapsDirectionsUrl(selectedSpot)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs transition shadow-lg"
                >
                  <Navigation className="w-4 h-4" />
                  <span>Abrir no Google Maps Oficial</span>
                </a>
                <p className="text-[11px] text-stone-500 mt-4">
                  Configure NEXT_PUBLIC_GOOGLE_MAPS_API_KEY para visualização interativa contínua.
                </p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between mt-3 text-xs text-stone-400 px-1">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
              Polo selecionado
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
              Outros polos ABC do Pedal
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
