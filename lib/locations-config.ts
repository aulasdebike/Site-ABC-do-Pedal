export type RegionId = 'sao_paulo' | 'abc_paulista' | 'outras_localidades';

export interface RegionCardConfig {
  id: RegionId;
  title: string;
  text: string;
  image: string;
}

export interface LocationConfigItem {
  id: string;
  region: RegionId;
  name: string;
  city: string;
  price: number;
  isFixed: boolean;
  fixedNote?: string;
  description?: string;
  address?: string;
  image: string;
  requiresCustomAddress?: boolean;
}

export interface BookingSelectedLocation {
  region: RegionId;
  regionTitle: string;
  locationId: string;
  locationName: string;
  city: string;
  state?: string;
  address?: string;
  cep?: string;
  number?: string;
  price: number;
  isFixed: boolean;
  fixedNote?: string;
  priceNote?: string;
  mapsUrl?: string;
  requiresCustomAddress?: boolean;
}

export const INITIAL_REGIONS: RegionCardConfig[] = [
  {
    id: 'sao_paulo',
    title: 'São Paulo',
    text: 'Polo Ibirapuera (Desafio do Pedal) ou atendimento sob demanda em outras localidades (Aprenda a Pedalar).',
    image: '/locations/sao_paulo.jpg'
  },
  {
    id: 'abc_paulista',
    title: 'ABC Paulista',
    text: 'Santo André e São Bernardo do Campo (Desafio do Pedal) ou outros municípios do ABC (Aprenda a Pedalar).',
    image: '/locations/abc_paulista.jpg'
  },
  {
    id: 'outras_localidades',
    title: 'Outras Regiões',
    text: 'Cidades fora de São Paulo e ABC com atendimento exclusivo (Imersão do Pedal).',
    image: '/locations/outras_localidades.jpg'
  }
];

export const INITIAL_LOCATIONS: LocationConfigItem[] = [
  // SÃO PAULO
  {
    id: 'ibirapuera',
    region: 'sao_paulo',
    name: 'Parque do Ibirapuera',
    city: 'São Paulo',
    price: 499.00,
    isFixed: true,
    fixedNote: 'Local fixo de atendimento da ABC do Pedal.',
    description: 'Pista plana, asfaltada e 100% isolada do trânsito de automóveis. Ambiente ideal e seguro para as primeiras pedaladas.',
    address: 'Avenida Pedro Álvares Cabral, s/n — Vila Mariana, São Paulo/SP (Portão 10)',
    image: '/locations/ibirapuera.jpg'
  },
  {
    id: 'sp_outras_localidades',
    region: 'sao_paulo',
    name: 'Outras localidades',
    city: 'São Paulo',
    price: 499.00,
    isFixed: false,
    requiresCustomAddress: true,
    description: 'Parques, praças, condomínios e outros espaços adequados podem receber a aula, desde que atendam aos requisitos de segurança e espaço necessários para a atividade.',
    image: '/locations/outras_localidades.jpg'
  },
  // ABC PAULISTA
  {
    id: 'santo_andre',
    region: 'abc_paulista',
    name: 'Santo André',
    city: 'Santo André',
    price: 399.00,
    isFixed: true,
    fixedNote: 'Local cadastrado no ABC Paulista.',
    description: 'Polos planos e seguros em Santo André, selecionados pela ABC do Pedal para um aprendizado acolhedor e progressivo.',
    address: 'Parques e ciclovias selecionadas — Santo André/SP',
    image: '/locations/santo_andre.jpg'
  },
  {
    id: 'sao_bernardo',
    region: 'abc_paulista',
    name: 'São Bernardo do Campo',
    city: 'São Bernardo do Campo',
    price: 399.00,
    isFixed: true,
    fixedNote: 'Local cadastrado no ABC Paulista.',
    description: 'Espaços amplos, asfaltados e protegidos em São Bernardo do Campo para desenvolver equilíbrio e coordenação com total segurança.',
    address: 'Parques e ciclovias selecionadas — São Bernardo do Campo/SP',
    image: '/locations/sao_bernardo.jpg'
  },
  // OUTRAS LOCALIDADES (Direto do card 3)
  {
    id: 'outras_localidades_direto',
    region: 'outras_localidades',
    name: 'Outras localidades',
    city: 'A definir pelo CEP',
    price: 499.00,
    isFixed: false,
    requiresCustomAddress: true,
    description: 'Parques, praças, condomínios e outros espaços adequados podem receber a aula, desde que atendam aos requisitos de segurança e espaço necessários para a atividade.',
    image: '/locations/outras_localidades.jpg'
  }
];

const LOCATIONS_STORAGE_KEY = 'abc_do_pedal_configurable_locations_v1';

export function getStoredLocations(): LocationConfigItem[] {
  if (typeof window === 'undefined') return INITIAL_LOCATIONS;
  try {
    const raw = localStorage.getItem(LOCATIONS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(LOCATIONS_STORAGE_KEY, JSON.stringify(INITIAL_LOCATIONS));
      return INITIAL_LOCATIONS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_LOCATIONS;
  } catch (err) {
    console.error('Erro ao ler locais configurados:', err);
    return INITIAL_LOCATIONS;
  }
}

export function saveStoredLocations(locations: LocationConfigItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCATIONS_STORAGE_KEY, JSON.stringify(locations));
  } catch (err) {
    console.error('Erro ao salvar locais configurados:', err);
  }
}

export function addConfigurableLocation(newLoc: LocationConfigItem): LocationConfigItem[] {
  const current = getStoredLocations();
  const exists = current.some((l) => l.id === newLoc.id);
  const updated = exists ? current.map((l) => (l.id === newLoc.id ? newLoc : l)) : [...current, newLoc];
  saveStoredLocations(updated);
  return updated;
}

export interface DirectServiceCityConfig {
  id: string;
  cityName: string;
  normalizedName: string;
  state: string;
  active: boolean;
  pricingType: 'distance_formula' | 'fixed';
  basePrice: number;
  pricePerKm?: number;
  fixedPrice?: number;
  allowedSubRegions?: string[];
  onlyAllowedSubRegions?: boolean;
  subRegionNotes?: string;
  notes?: string;
}

export const INITIAL_DIRECT_SERVICE_CITIES: DirectServiceCityConfig[] = [
  {
    id: 'osasco',
    cityName: 'Osasco',
    normalizedName: 'osasco',
    state: 'SP',
    active: true,
    pricingType: 'distance_formula',
    basePrice: 499.00,
    pricePerKm: 4.00,
    notes: 'Atendimento direto - cálculo por distância Google Maps (R$ 499,00 + km × R$ 4,00)'
  },
  {
    id: 'diadema',
    cityName: 'Diadema',
    normalizedName: 'diadema',
    state: 'SP',
    active: true,
    pricingType: 'distance_formula',
    basePrice: 499.00,
    pricePerKm: 4.00,
    notes: 'Atendimento direto - cálculo por distância Google Maps (R$ 499,00 + km × R$ 4,00)'
  },
  {
    id: 'maua',
    cityName: 'Mauá',
    normalizedName: 'maua',
    state: 'SP',
    active: true,
    pricingType: 'distance_formula',
    basePrice: 499.00,
    pricePerKm: 4.00,
    notes: 'Atendimento direto - cálculo por distância Google Maps (R$ 499,00 + km × R$ 4,00)'
  },
  {
    id: 'ribeirao_pires',
    cityName: 'Ribeirão Pires',
    normalizedName: 'ribeirao pires',
    state: 'SP',
    active: true,
    pricingType: 'distance_formula',
    basePrice: 499.00,
    pricePerKm: 4.00,
    notes: 'Atendimento direto - cálculo por distância Google Maps (R$ 499,00 + km × R$ 4,00)'
  },
  {
    id: 'taboao_da_serra',
    cityName: 'Taboão da Serra',
    normalizedName: 'taboao da serra',
    state: 'SP',
    active: true,
    pricingType: 'distance_formula',
    basePrice: 499.00,
    pricePerKm: 4.00,
    notes: 'Atendimento direto - cálculo por distância Google Maps (R$ 499,00 + km × R$ 4,00)'
  },
  {
    id: 'embu_das_artes',
    cityName: 'Embu das Artes',
    normalizedName: 'embu das artes',
    state: 'SP',
    active: true,
    pricingType: 'distance_formula',
    basePrice: 499.00,
    pricePerKm: 4.00,
    notes: 'Atendimento direto - cálculo por distância Google Maps (R$ 499,00 + km × R$ 4,00)'
  },
  {
    id: 'barueri_alphaville',
    cityName: 'Barueri',
    normalizedName: 'barueri',
    state: 'SP',
    active: true,
    pricingType: 'distance_formula',
    basePrice: 499.00,
    pricePerKm: 4.00,
    allowedSubRegions: ['alphaville', 'alpha'],
    onlyAllowedSubRegions: true,
    subRegionNotes: 'Somente Alphaville',
    notes: 'Atendimento direto restrito à região de Alphaville'
  }
];

const DIRECT_CITIES_STORAGE_KEY = 'abc_do_pedal_direct_service_cities_v1';

export function normalizeCityString(str: string): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function getStoredDirectServiceCities(): DirectServiceCityConfig[] {
  if (typeof window === 'undefined') return INITIAL_DIRECT_SERVICE_CITIES;
  try {
    const raw = localStorage.getItem(DIRECT_CITIES_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(DIRECT_CITIES_STORAGE_KEY, JSON.stringify(INITIAL_DIRECT_SERVICE_CITIES));
      return INITIAL_DIRECT_SERVICE_CITIES;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_DIRECT_SERVICE_CITIES;
  } catch (err) {
    console.error('Erro ao ler cidades de atendimento direto:', err);
    return INITIAL_DIRECT_SERVICE_CITIES;
  }
}

export function saveStoredDirectServiceCities(cities: DirectServiceCityConfig[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(DIRECT_CITIES_STORAGE_KEY, JSON.stringify(cities));
  } catch (err) {
    console.error('Erro ao salvar cidades de atendimento direto:', err);
  }
}

export function checkDirectServiceEligibility(
  city: string,
  neighborhood?: string,
  street?: string,
  cep?: string
): {
  eligible: boolean;
  cityConfig?: DirectServiceCityConfig;
  reason?: 'outside_service_area' | 'barueri_non_alphaville' | 'inactive';
  identifiedCity: string;
  identifiedSubRegion?: string;
} {
  const normCity = normalizeCityString(city);
  const cities = getStoredDirectServiceCities();

  const match = cities.find((c) => {
    const cNorm = normalizeCityString(c.cityName);
    const keyNorm = normalizeCityString(c.normalizedName);
    return normCity === cNorm || normCity === keyNorm || (normCity === 'embu' && cNorm.includes('embu'));
  });

  if (!match || !match.active) {
    return {
      eligible: false,
      reason: match && !match.active ? 'inactive' : 'outside_service_area',
      identifiedCity: city
    };
  }

  // Regra especial para Barueri (somente Alphaville)
  if (match.onlyAllowedSubRegions && match.allowedSubRegions && match.allowedSubRegions.length > 0) {
    const normBairro = normalizeCityString(neighborhood || '');
    const normStreet = normalizeCityString(street || '');
    const cleanCep = (cep || '').replace(/\D/g, '');

    const isAlphavilleBairro = match.allowedSubRegions.some((sub) =>
      normBairro.includes(normalizeCityString(sub))
    );
    const isAlphavilleStreet = match.allowedSubRegions.some((sub) =>
      normStreet.includes(normalizeCityString(sub))
    );
    // Faixas CEP comuns de Alphaville Barueri: 06453xxx a 06455xxx, 06472xxx a 06474xxx, 06485xxx
    const isAlphavilleCep =
      cleanCep.startsWith('06453') ||
      cleanCep.startsWith('06454') ||
      cleanCep.startsWith('06455') ||
      cleanCep.startsWith('06472') ||
      cleanCep.startsWith('06473') ||
      cleanCep.startsWith('06474') ||
      cleanCep.startsWith('06485');

    const isAllowed = isAlphavilleBairro || isAlphavilleStreet || isAlphavilleCep;

    if (!isAllowed) {
      return {
        eligible: false,
        cityConfig: match,
        reason: 'barueri_non_alphaville',
        identifiedCity: match.cityName,
        identifiedSubRegion: neighborhood || 'Fora de Alphaville'
      };
    }

    return {
      eligible: true,
      cityConfig: match,
      identifiedCity: match.cityName,
      identifiedSubRegion: 'Alphaville'
    };
  }

  return {
    eligible: true,
    cityConfig: match,
    identifiedCity: match.cityName
  };
}

/**
 * Cidades específicas do ABC Paulista com regra especial de transição para o WhatsApp oficial
 */
export const SPECIAL_ABC_PAYMENT_CITIES = [
  'Diadema',
  'Mauá',
  'São Caetano do Sul',
  'Ribeirão Pires'
] as const;

/**
 * Verifica se a localidade selecionada corresponde exclusivamente a uma das outras localidades do ABC:
 * - Diadema
 * - Mauá
 * - São Caetano do Sul
 * - Ribeirão Pires
 * 
 * Regra de exclusão estrita:
 * - NÃO se aplica a Ibirapuera
 * - NÃO se aplica a outras localidades de São Paulo (capital)
 * - NÃO se aplica a Santo André
 * - NÃO se aplica a São Bernardo do Campo
 * - NÃO se aplica a outras regiões fora dessas 4 cidades
 */
export function isSpecialAbcPaymentCity(location?: BookingSelectedLocation | null): boolean {
  if (!location) return false;

  const locId = (location.locationId || '').toLowerCase().trim();
  const locName = (location.locationName || '').toLowerCase().trim();
  const city = (location.city || '').toLowerCase().trim();

  // 1. Exclusão explícita: Ibirapuera
  if (locId === 'ibirapuera' || locName.includes('ibirapuera')) return false;

  // 2. Exclusão explícita: São Paulo capital
  if (location.region === 'sao_paulo' || locId.startsWith('sp_') || city === 'são paulo' || city === 'sao paulo') {
    return false;
  }

  // 3. Exclusão explícita: Santo André
  if (locId === 'santo_andre' || city === 'santo andré' || city === 'santo andre') return false;

  // 4. Exclusão explícita: São Bernardo do Campo
  if (
    locId === 'sao_bernardo' ||
    city === 'são bernardo do campo' ||
    city === 'sao bernardo do campo' ||
    city === 'são bernardo' ||
    city === 'sao bernardo'
  ) {
    return false;
  }

  // Normalização sem acentos para correspondência exata e segura
  const normalize = (str: string) =>
    str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, ' ')
      .trim();

  const normCity = normalize(city);
  const normLocName = normalize(locName);
  const normLocId = normalize(locId);

  const isDiadema = normCity.includes('diadema') || normLocName.includes('diadema') || normLocId.includes('diadema');
  const isMaua = normCity.includes('maua') || normLocName.includes('maua') || normLocId.includes('maua');
  const isSaoCaetano =
    normCity.includes('sao caetano') ||
    normLocName.includes('sao caetano') ||
    normLocId.includes('sao caetano');
  const isRibeiraoPires =
    normCity.includes('ribeirao pires') ||
    normLocName.includes('ribeirao pires') ||
    normLocId.includes('ribeirao pires');

  return isDiadema || isMaua || isSaoCaetano || isRibeiraoPires;
}

// ============================================================================
// LOCAIS DISPONÍVEIS PARA AS AULAS POR MUNICÍPIO (PAINEL DO INSTRUTOR)
// ============================================================================

export type MunicipalLocationStatus = 'disponivel' | 'indisponivel';

export interface MunicipalClassLocation {
  id: string;
  name: string;
  city: string; // Ex: 'São Bernardo do Campo', 'Santo André', 'São Paulo'
  status: MunicipalLocationStatus;
  restrictionNote?: string; // Ex: 'Exclusivo para crianças', 'Inativo inicialmente'
  isKidsOnly?: boolean;
  notes?: string;
  address?: string;
  createdAt: string;
  updatedAt?: string;
}

export const INITIAL_MUNICIPAL_CLASS_LOCATIONS: MunicipalClassLocation[] = [
  // SÃO BERNARDO DO CAMPO
  {
    id: 'sbc_poliesportivo_kennedy',
    name: 'Poliesportivo da Kennedy',
    city: 'São Bernardo do Campo',
    status: 'disponivel',
    address: 'Av. Kennedy, 1155 - Parque São Diogo, São Bernardo do Campo - SP',
    notes: 'Espaço amplo, plano e seguro, ideal para treino de equilíbrio e autonomia.',
    createdAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'sbc_paco_municipal',
    name: 'Paço Municipal',
    city: 'São Bernardo do Campo',
    status: 'disponivel',
    address: 'Praça Samuel Sabatini, 50 - Centro, São Bernardo do Campo - SP',
    notes: 'Esplanada asfaltada, plana e protegida para as primeiras manobras.',
    createdAt: '2026-01-01T00:00:00.000Z'
  },

  // SANTO ANDRÉ
  {
    id: 'sa_paco_municipal',
    name: 'Paço Municipal',
    city: 'Santo André',
    status: 'disponivel',
    address: 'Praça IV Centenário, s/n - Centro, Santo André - SP',
    notes: 'Piso regular, amplo e excelente para desenvolvimento gradual com segurança.',
    createdAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'sa_parque_celso_daniel',
    name: 'Parque Celso Daniel',
    city: 'Santo André',
    status: 'disponivel',
    restrictionNote: 'Exclusivo para crianças',
    isKidsOnly: true,
    address: 'Av. Dom Pedro II, 940 - Bairro Jardim, Santo André - SP',
    notes: 'Ambiente acolhedor e seguro, com restrição de uso exclusivo para crianças.',
    createdAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'sa_parque_central',
    name: 'Parque Central',
    city: 'Santo André',
    status: 'indisponivel',
    restrictionNote: 'Inativo inicialmente',
    address: 'Rua José Bonifácio, s/n - Vila Assunção, Santo André - SP',
    notes: 'Inativo inicialmente — podendo ser ativado pelo instrutor quando estiver liberado para utilização.',
    createdAt: '2026-01-01T00:00:00.000Z'
  },

  // SÃO PAULO / IBIRAPUERA (Preservado e inalterado)
  {
    id: 'sp_parque_ibirapuera',
    name: 'Parque Ibirapuera',
    city: 'São Paulo',
    status: 'disponivel',
    restrictionNote: 'Polo fixo (Portão 10)',
    address: 'Av. Pedro Álvares Cabral, s/n - Vila Mariana, São Paulo - SP (Portão 10)',
    notes: 'Polo fixo tradicional da ABC do Pedal em São Paulo.',
    createdAt: '2026-01-01T00:00:00.000Z'
  }
];

const MUNICIPAL_LOCATIONS_STORAGE_KEY = 'abc_do_pedal_municipal_class_locations_v2';

export function getStoredMunicipalClassLocations(): MunicipalClassLocation[] {
  if (typeof window === 'undefined') return INITIAL_MUNICIPAL_CLASS_LOCATIONS;
  try {
    const raw = localStorage.getItem(MUNICIPAL_LOCATIONS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(MUNICIPAL_LOCATIONS_STORAGE_KEY, JSON.stringify(INITIAL_MUNICIPAL_CLASS_LOCATIONS));
      return INITIAL_MUNICIPAL_CLASS_LOCATIONS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return INITIAL_MUNICIPAL_CLASS_LOCATIONS;
  } catch (e) {
    console.error('Erro ao ler locais municipais:', e);
    return INITIAL_MUNICIPAL_CLASS_LOCATIONS;
  }
}

export function saveStoredMunicipalClassLocations(locations: MunicipalClassLocation[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(MUNICIPAL_LOCATIONS_STORAGE_KEY, JSON.stringify(locations));
    window.dispatchEvent(new CustomEvent('abc_municipal_locations_updated', { detail: locations }));
  } catch (e) {
    console.error('Erro ao salvar locais municipais:', e);
  }
}

export function addMunicipalClassLocation(
  item: Omit<MunicipalClassLocation, 'id' | 'createdAt'>
): MunicipalClassLocation[] {
  const current = getStoredMunicipalClassLocations();
  const newLocation: MunicipalClassLocation = {
    ...item,
    id: `loc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    createdAt: new Date().toISOString()
  };
  const updated = [...current, newLocation];
  saveStoredMunicipalClassLocations(updated);
  return updated;
}

export function updateMunicipalClassLocation(
  id: string,
  updates: Partial<MunicipalClassLocation>
): MunicipalClassLocation[] {
  const current = getStoredMunicipalClassLocations();
  const updated = current.map((loc) => {
    if (loc.id === id) {
      return {
        ...loc,
        ...updates,
        updatedAt: new Date().toISOString()
      };
    }
    return loc;
  });
  saveStoredMunicipalClassLocations(updated);
  return updated;
}

export function toggleMunicipalLocationStatus(id: string): MunicipalClassLocation[] {
  const current = getStoredMunicipalClassLocations();
  const target = current.find((l) => l.id === id);
  if (!target) return current;
  const newStatus: MunicipalLocationStatus = target.status === 'disponivel' ? 'indisponivel' : 'disponivel';
  return updateMunicipalClassLocation(id, { status: newStatus });
}

export function deleteMunicipalClassLocation(id: string): MunicipalClassLocation[] {
  const current = getStoredMunicipalClassLocations();
  const updated = current.filter((l) => l.id !== id);
  saveStoredMunicipalClassLocations(updated);
  return updated;
}

export function resetMunicipalClassLocationsToDefault(): MunicipalClassLocation[] {
  saveStoredMunicipalClassLocations(INITIAL_MUNICIPAL_CLASS_LOCATIONS);
  return INITIAL_MUNICIPAL_CLASS_LOCATIONS;
}

export function normalizeCityName(city?: string): string {
  if (!city) return '';
  return city
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Retorna somente os locais com status 'disponivel' para um dado município.
 * Locais 'indisponivel' (como o Parque Central inicial) são ocultados para novos agendamentos.
 */
export function getAvailableClassLocationsForCity(city?: string): MunicipalClassLocation[] {
  const all = getStoredMunicipalClassLocations();
  const availableOnly = all.filter((l) => l.status === 'disponivel');
  if (!city) return availableOnly;

  const normCity = normalizeCityName(city);
  return availableOnly.filter((l) => {
    const normLocCity = normalizeCityName(l.city);
    return normLocCity.includes(normCity) || normCity.includes(normLocCity);
  });
}

/**
 * Retorna todos os locais (disponíveis e indisponíveis) para um município,
 * permitindo preservar registros históricos de agendamentos antigos.
 */
export function getAllClassLocationsForCity(city?: string): MunicipalClassLocation[] {
  const all = getStoredMunicipalClassLocations();
  if (!city) return all;

  const normCity = normalizeCityName(city);
  return all.filter((l) => {
    const normLocCity = normalizeCityName(l.city);
    return normLocCity.includes(normCity) || normCity.includes(normLocCity);
  });
}

