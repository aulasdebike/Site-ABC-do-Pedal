export interface ProductAccessPoints {
  car: string;
  uber: string;
  walking: string;
}

export interface ProductLocation {
  name: string;
  address: string;
  access: ProductAccessPoints;
  mapsUrl: string;
}

export interface ProductRules {
  cancelHoursFree: number;
  lateFee: number;
  weatherGuarantee: boolean;
  strictPunctuality: boolean;
}

export interface ProductConfig {
  id: string;
  name: string;
  badge: string;
  subtitle: string;
  format: string;
  formatBadge: string;
  explanation: string;
  valueTag: string;
  description: string;
  locationsSummary: string;
  sessionDurationMinutes: number;
  price: number;
  currency: string;
  location: ProductLocation;
  rules: ProductRules;
  isPubliclyAvailable: boolean;
}

/**
 * Catálogo Oficial dos 3 Produtos Diferenciados da ABC do Pedal
 * 1. DESAFIO DO PEDAL: Parque Ibirapuera, Santo André e São Bernardo do Campo
 * 2. APRENDA A PEDALAR: Outras localidades de São Paulo e municípios do ABC
 * 3. IMERSÃO DO PEDAL: Cidades fora de São Paulo e ABC
 */
export const PRODUCTS_CATALOG: Record<string, ProductConfig> = {
  'desafio-do-pedal': {
    id: 'desafio-do-pedal',
    name: 'DESAFIO DO PEDAL',
    badge: 'Programa de Domínio & Autonomia',
    subtitle: 'Programa para aprender a pedalar',
    format: 'Sem quantidade fixa de aulas',
    formatBadge: 'Sem quantidade fixa de aulas',
    explanation: 'Programa para quem quer aprender a pedalar. O aluno não compra uma quantidade fixa de aulas. O processo acompanha sua evolução até conquistar o domínio e a autonomia para pedalar.',
    description: 'Programa para quem quer aprender a pedalar. O aluno não compra uma quantidade fixa de aulas. O processo acompanha sua evolução até conquistar o domínio e a autonomia para pedalar.',
    locationsSummary: 'Parque do Ibirapuera, Santo André e São Bernardo do Campo',
    valueTag: '(Você investe no aprendizado e na autonomia, não na quantidade de aulas.)',
    sessionDurationMinutes: 50,
    price: 499.00,
    currency: 'BRL',
    location: {
      name: 'Parque do Ibirapuera — Arena de Eventos',
      address: 'Acesso pelos Portões 10, 3 e 4 (Ibirapuera) / Santo André e São Bernardo do Campo',
      access: {
        car: 'Portões 3 e 4 (Ibirapuera)',
        uber: 'Portão 10 (Ibirapuera)',
        walking: 'Portões 10, 3 e 4 (Ibirapuera)'
      },
      mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Parque+do+Ibirapuera+Arena+de+Eventos'
    },
    rules: {
      cancelHoursFree: 24,
      lateFee: 50.00,
      weatherGuarantee: true,
      strictPunctuality: true
    },
    isPubliclyAvailable: true
  },

  'aprenda-a-pedalar': {
    id: 'aprenda-a-pedalar',
    name: 'APRENDA A PEDALAR',
    badge: 'Atendimento Personalizado',
    subtitle: 'Atendimento personalizado em 2 encontros de 1h',
    format: '2 encontros de 1 hora',
    formatBadge: '2 encontros de 1 hora',
    explanation: 'Atendimento personalizado realizado em dois encontros de 1 hora, direcionado às necessidades e ao nível de cada aluno.',
    description: 'Atendimento personalizado realizado em dois encontros de 1 hora, direcionado às necessidades e ao nível de cada aluno.',
    locationsSummary: 'Outras localidades de São Paulo e municípios do ABC',
    valueTag: '(Atendimento personalizado em 2 encontros de 1 hora direcionados ao seu nível)',
    sessionDurationMinutes: 60,
    price: 499.00,
    currency: 'BRL',
    location: {
      name: 'São Paulo & Municípios do ABC',
      address: 'Locais conveniados e endereços combinados',
      access: {
        car: 'Conforme ponto combinado',
        uber: 'Conforme ponto combinado',
        walking: 'Conforme ponto combinado'
      },
      mapsUrl: ''
    },
    rules: {
      cancelHoursFree: 24,
      lateFee: 50.00,
      weatherGuarantee: true,
      strictPunctuality: true
    },
    isPubliclyAvailable: true
  },

  'imersao-do-pedal': {
    id: 'imersao-do-pedal',
    name: 'IMERSÃO DO PEDAL',
    badge: 'Encontro Intensivo Dedicado',
    subtitle: 'Atendimento personalizado em 1 encontro de 2h',
    format: '1 encontro de 2 horas',
    formatBadge: '1 encontro de 2 horas',
    explanation: 'Atendimento personalizado realizado em um encontro de 2 horas, em local previamente combinado com o aluno.',
    description: 'Atendimento personalizado realizado em um encontro de 2 horas, em local previamente combinado com o aluno.',
    locationsSummary: 'Cidades fora de São Paulo e ABC',
    valueTag: '(Atendimento intensivo em 1 encontro de 2 horas em local previamente combinado)',
    sessionDurationMinutes: 120,
    price: 499.00,
    currency: 'BRL',
    location: {
      name: 'Cidades fora de São Paulo e ABC',
      address: 'Local previamente combinado com o aluno',
      access: {
        car: 'Conforme ponto combinado',
        uber: 'Conforme ponto combinado',
        walking: 'Conforme ponto combinado'
      },
      mapsUrl: ''
    },
    rules: {
      cancelHoursFree: 24,
      lateFee: 50.00,
      weatherGuarantee: true,
      strictPunctuality: true
    },
    isPubliclyAvailable: true
  }
};

// Aliases para compatibilidade legada
PRODUCTS_CATALOG['aprender-a-pedalar'] = PRODUCTS_CATALOG['desafio-do-pedal'];

export const CURRENT_PRODUCT = PRODUCTS_CATALOG['desafio-do-pedal'];

/**
 * Determina automaticamente o produto correspondente conforme o local e modelo de atendimento
 * 1. DESAFIO DO PEDAL -> Parque Ibirapuera, Santo André e São Bernardo do Campo
 * 2. APRENDA A PEDALAR -> Outras localidades de São Paulo e municípios do ABC
 * 3. IMERSÃO DO PEDAL -> Cidades fora de São Paulo e ABC
 */
export function getProductForLocation(loc?: {
  region?: string;
  locationId?: string;
  locationName?: string;
  city?: string;
  isFixed?: boolean;
} | null): ProductConfig {
  if (!loc) {
    return PRODUCTS_CATALOG['desafio-do-pedal'];
  }

  const locId = (loc.locationId || '').toLowerCase();
  const city = (loc.city || '').toLowerCase();
  const locName = (loc.locationName || '').toLowerCase();

  // 1. DESAFIO DO PEDAL: Parque Ibirapuera, Santo André e São Bernardo do Campo
  if (
    locId === 'ibirapuera' || 
    locId === 'santo_andre' || 
    locId === 'sao_bernardo' ||
    city === 'santo andré' ||
    city === 'santo andre' ||
    city === 'são bernardo do campo' ||
    city === 'sao bernardo do campo' ||
    locName.includes('ibirapuera') ||
    locName.includes('santo andré') ||
    locName.includes('santo andre') ||
    locName.includes('são bernardo') ||
    locName.includes('sao bernardo')
  ) {
    return PRODUCTS_CATALOG['desafio-do-pedal'];
  }

  // 3. IMERSÃO DO PEDAL: Cidades fora de São Paulo e ABC
  if (
    loc.region === 'outras_localidades' ||
    locId === 'outras_localidades' ||
    locId === 'outras_localidades_direto' ||
    locName.includes('outras regiões') ||
    locName.includes('cidades fora')
  ) {
    return PRODUCTS_CATALOG['imersao-do-pedal'];
  }

  // 2. APRENDA A PEDALAR: Outras localidades de São Paulo e municípios do ABC
  if (
    loc.region === 'sao_paulo' || 
    loc.region === 'abc_paulista' ||
    locId === 'sp_outras_localidades'
  ) {
    return PRODUCTS_CATALOG['aprenda-a-pedalar'];
  }

  return PRODUCTS_CATALOG['desafio-do-pedal'];
}
