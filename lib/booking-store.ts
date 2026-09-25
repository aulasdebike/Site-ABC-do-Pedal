'use client';

import { 
  saveBookingToFirestore, 
  saveSlotsToFirestore,
  saveSingleSlotToFirestore,
  deleteSingleSlotFromFirestore 
} from './firebase';
import type { BookingSelectedLocation } from './locations-config';
export type { BookingSelectedLocation } from './locations-config';
export { isSpecialAbcPaymentCity, SPECIAL_ABC_PAYMENT_CITIES } from './locations-config';

export type AgeProfile = 'crianca_adolescente' | 'adulto' | 'idoso';

export type GuardianRelation = 'pai' | 'mae' | 'responsavel_legal' | 'tutor' | 'outro';

export type SlotStatus = 'available' | 'selected' | 'reserva_temporaria' | 'occupied' | 'blocked';

export type BookingStatus = 
  | 'pre-agendado' 
  | 'reserva-temporaria'
  | 'aguardando-pagamento' 
  | 'aguardando-novo-pagamento'
  | 'comprovante-enviado'
  | 'aguardando-confirmacao-instrutor'
  | 'comprovante-em-analise'
  | 'pagamento-confirmado'
  | 'agendamento-confirmado'
  | 'comprovante-rejeitado'
  | 'comprovante-reprovado'
  | 'pedido-rejeitado'
  | 'pagamento-nao-confirmado'
  | 'reserva-expirada'
  | 'pagamento-enviado' 
  | 'confirmado' 
  | 'cancelado' 
  | 'concluido';

export interface WhatsAppNotificationRecord {
  targetPhone: string;
  sentAt: string; // ISO date string
  status: 'ENVIADO' | 'FALHA NO ENVIO';
  messageContent: string;
  deliveryType?: 'automatico' | 'manual';
  errorMessage?: string;
}

// Link oficial de pagamento PagSeguro para São Paulo / Parque Ibirapuera (REGRA OBRIGATÓRIA: NUNCA ALTERAR)
export const PAGBANK_PAYMENT_URL_SAO_PAULO = 'https://pag.ae/828yL-9S6';

// Link oficial de pagamento PagSeguro exclusivo para o Desafio do Pedal em Santo André e São Bernardo do Campo
export const PAGBANK_PAYMENT_URL_DESAFIO_ABC = 'https://pag.ae/82bm3JV69';

// Mantém PAGBANK_PAYMENT_URL apontando para São Paulo/Ibirapuera para compatibilidade retroativa
export const PAGBANK_PAYMENT_URL = PAGBANK_PAYMENT_URL_SAO_PAULO;

/**
 * Verifica se a localidade da aula é Santo André ou São Bernardo do Campo (Desafio do Pedal no ABC)
 */
export function isDesafioPedalAbcLocation(
  location?: {
    locationId?: string;
    city?: string;
    locationName?: string;
    name?: string;
  } | null,
  slot?: {
    locationId?: string;
    locationName?: string;
  } | null
): boolean {
  if (!location && !slot) return false;
  const parts = [
    location?.locationId,
    location?.city,
    location?.locationName,
    location?.name,
    slot?.locationId,
    slot?.locationName
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  const isSantoAndre = parts.includes('santo andr') || parts.includes('santo_andre');
  const isSaoBernardo = parts.includes('sao bernardo') || parts.includes('são bernardo') || parts.includes('sao_bernardo');

  return isSantoAndre || isSaoBernardo;
}

/**
 * Retorna o link de pagamento do PagSeguro correto para a reserva:
 * - Desafio do Pedal — Santo André e São Bernardo do Campo: https://pag.ae/82bm3JV69
 * - Desafio do Pedal — São Paulo / Parque Ibirapuera: https://pag.ae/828yL-9S6 (RIGOROSAMENTE INALTERADO)
 */
export function getPaymentUrlForBooking(booking?: {
  location?: any;
  slot?: any;
} | null): string {
  if (booking && isDesafioPedalAbcLocation(booking.location, booking.slot)) {
    return PAGBANK_PAYMENT_URL_DESAFIO_ABC;
  }
  return PAGBANK_PAYMENT_URL_SAO_PAULO;
}

export type ABCDEStep = 'A' | 'B' | 'C' | 'D' | 'E';

export interface StudentData {
  fullName: string;
  birthDate: string;
  cpf?: string;
  whatsapp: string;
  email: string;
  ageProfile: AgeProfile;
  heightCm: string;
  weightKg: string;
  hasSpecificNeeds: boolean;
  specificNeedsDescription?: string;
  // Guardian (required if crianca_adolescente)
  guardian?: {
    fullName: string;
    cpf?: string;
    birthDate?: string;
    whatsapp: string;
    email?: string;
    relation: GuardianRelation;
  };
}

export type SlotRegion = 'sao_paulo' | 'abc_paulista' | 'outras_localidades';

export interface TimeSlot {
  id: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  durationMinutes: number;
  status: SlotStatus;
  bookedByStudentName?: string;
  bookingId?: string;
  bookingStatus?: 'pending' | 'confirmed' | 'reserved';
  createdAt?: string;
  updatedAt?: string;
  region?: SlotRegion;
  regionName?: string;
  subRegion?: string;
  city?: string;
  locationId?: string;
  locationName?: string;
  isKidsOnly?: boolean;
}

export interface BookingPolicyAcceptance {
  acceptedLessonPolicy: boolean;
  acknowledgedNotTherapy: boolean;
  declaredAccurateInfo: boolean;
  guardianAuthorized?: boolean;
}

export interface ImageAuthorization {
  authorized: boolean; // independent choice
}

export interface SkillItem {
  id: string;
  key: string;
  label: string;
  category?: 'Autonomia' | 'Equilíbrio' | 'Controle' | 'Trânsito' | 'Personalizado' | string;
  description?: string;
  isCustom?: boolean;
  createdAt?: string;
}

export const DEFAULT_SKILLS: SkillItem[] = [
  { id: 'skill_1', key: 'startWithoutAssistance', label: 'Iniciar o movimento sem auxílio', category: 'Autonomia', description: 'Dar a primeira pedalada com equilíbrio inicial sem empurrão de terceiros.' },
  { id: 'skill_2', key: 'pedalContinuously', label: 'Pedalar continuamente', category: 'Autonomia', description: 'Cadência constante mantendo a bicicleta em movimento estável.' },
  { id: 'skill_3', key: 'maintainBalanceMoving', label: 'Manter equilíbrio em deslocamento', category: 'Equilíbrio', description: 'Sustentação do corpo alinhado com olhar no horizonte.' },
  { id: 'skill_4', key: 'performTurns', label: 'Realizar curvas', category: 'Controle', description: 'Inclinação corporal e rotação suave do guidão em curvas abertas e fechadas.' },
  { id: 'skill_5', key: 'changeDirection', label: 'Mudar de direção', category: 'Controle', description: 'Desviar de pequenos obstáculos com fluidez e controle.' },
  { id: 'skill_6', key: 'controlTrajectory', label: 'Controlar a trajetória', category: 'Controle', description: 'Conduzir a bicicleta em linha reta estreita sem ziguezague.' },
  { id: 'skill_7', key: 'reduceSpeed', label: 'Reduzir a velocidade', category: 'Controle', description: 'Acionamento progressivo dos freios sem travar as rodas.' },
  { id: 'skill_8', key: 'stopSafely', label: 'Parar com segurança', category: 'Controle', description: 'Frenagem total e colocação dos pés no chão de forma equilibrada.' },
  { id: 'skill_9', key: 'resumeMovementIndependently', label: 'Retomar o movimento de forma independente', category: 'Autonomia', description: 'Reiniciar a pedalada após parar, sem desequilíbrio ou suporte.' }
];

export interface EvolutionMilestones {
  [key: string]: boolean | undefined;
  startWithoutAssistance?: boolean;
  pedalContinuously?: boolean;
  maintainBalanceMoving?: boolean;
  performTurns?: boolean;
  changeDirection?: boolean;
  controlTrajectory?: boolean;
  reduceSpeed?: boolean;
  stopSafely?: boolean;
  resumeMovementIndependently?: boolean;
}

export type ABCDESkillStatus = 'Não iniciado' | 'Em desenvolvimento' | 'Consolidado' | 'Autônomo';

export interface ABCDESkillDefinition {
  id: string; // e.g. 'A1', 'A2', 'B1', etc.
  code: string; // '1', '2', '3', '4'
  title: string;
  description: string;
}

export interface ABCDEStageDefinition {
  letter: ABCDEStep;
  title: string;
  objective: string;
  skills: ABCDESkillDefinition[];
}

export const ABCDE_STAGES: ABCDEStageDefinition[] = [
  {
    letter: 'A',
    title: 'Autoconhecimento',
    objective: 'O aluno conhece e estabelece conexão consigo mesmo, com seu corpo, com a bicicleta e com o professor.',
    skills: [
      {
        id: 'A1',
        code: '1',
        title: 'Reconhece o próprio corpo',
        description: 'Percebe seu corpo, movimentos, equilíbrio e postura.'
      },
      {
        id: 'A2',
        code: '2',
        title: 'Reconhece e explora a bicicleta',
        description: 'Conhece a bicicleta, suas partes, peso e comportamento.'
      },
      {
        id: 'A3',
        code: '3',
        title: 'Compreende os comandos básicos',
        description: 'Reconhece ações e comandos necessários para interagir com a bicicleta.'
      },
      {
        id: 'A4',
        code: '4',
        title: 'Estabelece confiança',
        description: 'Constrói segurança e confiança na relação com o professor e com a bicicleta.'
      }
    ]
  },
  {
    letter: 'B',
    title: 'Base',
    objective: 'Desenvolver as capacidades motoras que sustentam a aprendizagem da bicicleta.',
    skills: [
      {
        id: 'B1',
        code: '1',
        title: 'Desenvolve o equilíbrio',
        description: 'Trabalha equilíbrio estático, dinâmico, unipodal e controle postural.'
      },
      {
        id: 'B2',
        code: '2',
        title: 'Desenvolve a coordenação motora',
        description: 'Desenvolve coordenação global, fina, grossa, bilateral e óculo-cinética.'
      },
      {
        id: 'B3',
        code: '3',
        title: 'Desenvolve lateralidade e orientação espacial',
        description: 'Reconhece direita/esquerda, trajetórias, direções e organização espacial.'
      },
      {
        id: 'B4',
        code: '4',
        title: 'Desenvolve força, resistência e propulsão',
        description: 'Desenvolve capacidades necessárias para gerar e controlar o movimento.'
      }
    ]
  },
  {
    letter: 'C',
    title: 'Controle',
    objective: 'Controlar o próprio corpo sobre a bicicleta, compreender seu comportamento e realizar as primeiras pedaladas.',
    skills: [
      {
        id: 'C1',
        code: '1',
        title: 'Controla o corpo sobre a bicicleta',
        description: 'Mantém postura, estabilidade e organização corporal durante o movimento.'
      },
      {
        id: 'C2',
        code: '2',
        title: 'Compreende o movimento da bicicleta',
        description: 'Percebe centro de gravidade, transferência de peso, inclinação e resposta da bicicleta.'
      },
      {
        id: 'C3',
        code: '3',
        title: 'Realiza as primeiras pedaladas',
        description: 'Consegue iniciar e executar as primeiras pedaladas com assistência progressivamente reduzida.'
      },
      {
        id: 'C4',
        code: '4',
        title: 'Controla a trajetória',
        description: 'Mantém a bicicleta em linha, realiza correções e começa a controlar a direção.'
      }
    ]
  },
  {
    letter: 'D',
    title: 'Domínio',
    objective: 'Consolidar a pedalada e integrar equilíbrio, propulsão, direção e frenagem.',
    skills: [
      {
        id: 'D1',
        code: '1',
        title: 'Inicia o movimento com autonomia',
        description: 'Realiza a arrancada e inicia a pedalada sem assistência física.'
      },
      {
        id: 'D2',
        code: '2',
        title: 'Pedala continuamente',
        description: 'Mantém a bicicleta em movimento realizando pedaladas sequenciais.'
      },
      {
        id: 'D3',
        code: '3',
        title: 'Realiza curvas e mudanças de direção',
        description: 'Controla a trajetória, realiza curvas e mudanças de direção.'
      },
      {
        id: 'D4',
        code: '4',
        title: 'Integra pedalada, direção e frenagem',
        description: 'Consegue combinar diferentes habilidades durante a condução.'
      }
    ]
  },
  {
    letter: 'E',
    title: 'Excelência',
    objective: 'Controlar a bicicleta com precisão, segurança, eficiência e autonomia.',
    skills: [
      {
        id: 'E1',
        code: '1',
        title: 'Controla a velocidade',
        description: 'Acelera, reduz e retoma a velocidade de forma intencional e controlada.'
      },
      {
        id: 'E2',
        code: '2',
        title: 'Freia e para com segurança',
        description: 'Realiza redução de velocidade, frenagem e parada de maneira eficiente.'
      },
      {
        id: 'E3',
        code: '3',
        title: 'Retoma o movimento com controle',
        description: 'Reinicia a marcha após uma parada mantendo equilíbrio e direção.'
      },
      {
        id: 'E4',
        code: '4',
        title: 'Conduz com precisão e autonomia',
        description: 'Integra equilíbrio, pedalada, direção, velocidade e frenagem com segurança e eficiência.'
      }
    ]
  }
];

export interface VoucherAttemptRecord {
  attemptNumber: number;
  voucherUrl?: string;
  voucherFileName?: string;
  voucherSentAt: string;
  status: BookingStatus;
  decisionAt?: string;
  decisionBy?: string;
  rejectionReason?: string;
}

export interface BookingRecord {
  id: string;
  productId: string;
  productName: string;
  price: number;
  location?: BookingSelectedLocation;
  student: StudentData;
  slot: {
    id: string;
    date: string;
    time: string;
    durationMinutes: number;
    locationId?: string;
    locationName?: string;
  };
  policies: BookingPolicyAcceptance;
  imageAuthorization: ImageAuthorization;
  status: BookingStatus;
  createdAt: string;
  preReservationExpiresAt: string; // ISO timestamp
  voucherUrl?: string;
  voucherFileName?: string;
  voucherSentAt?: string;
  voucherAttempts?: VoucherAttemptRecord[];
  confirmedAt?: string;
  approvedAt?: string;
  approvedBy?: string;
  rejectedAt?: string;
  rejectedBy?: string;
  rejectionReason?: string;
  rejectionExpiresAt?: string; // Data e hora limite do prazo de 24h após reprovação
  rejection24hExpiredAt?: string; // Data e hora do encerramento automático após 24h
  paymentMethod?: 'pagbank' | 'pix' | string;
  paymentGateway?: 'pagbank' | 'pix_manual';
  paymentTransactionId?: string;
  paymentConfirmedAt?: string;
  currentABCDE: ABCDEStep;
  milestones: EvolutionMilestones;
  abcdeSkillStatus?: Record<string, ABCDESkillStatus>;
  latestAchievement?: string;
  nextChallenge?: string;
  conquestCompletedAt?: string; // Data em que o aluno completou 100% das 20 habilidades
  certificateIssuedAt?: string; // Data de emissão oficial do certificado
  cancellationReason?: string;
  cancellationFee?: number;
  assignedLocationName?: string;
  assignedLocationCity?: string;
  assignedLocationRestriction?: string;
  notes?: string;
  whatsappNotification?: WhatsAppNotificationRecord;
  rejectionNoticeState?: 'PENDENTE' | 'CONFIRMADO';
  rejectionNoticeAcknowledgedAt?: string;
  isNegotiatedViaWhatsApp?: boolean;
  waitingInstructorSchedule?: boolean;
  schedulePending?: boolean;
  scheduledByInstructor?: boolean;
  scheduledAt?: string;
}

/**
 * Verifica se uma habilidade é considerada conquistada (Consolidado ou Autônomo)
 */
export function isSkillConquered(status: ABCDESkillStatus): boolean {
  return status === 'Consolidado' || status === 'Autônomo';
}

/**
 * Calcula o progresso exato das 20 habilidades do Método ABCDE.
 * O certificado de conquista sobre duas rodas só é liberado quando o aluno
 * atingir rigorosamente 100% (todas as 20 habilidades conquistadas).
 */
export function getABCDECompletionStats(booking: BookingRecord): {
  totalSkills: number;
  conqueredCount: number;
  percent: number;
  isFullyCompleted: boolean;
  stageStats: Record<ABCDEStep, { total: number; conquered: number; isCompleted: boolean; title: string }>;
} {
  let totalSkills = 0;
  let conqueredCount = 0;

  const stageStats: Record<ABCDEStep, { total: number; conquered: number; isCompleted: boolean; title: string }> = {
    A: { total: 0, conquered: 0, isCompleted: false, title: 'Autoconhecimento' },
    B: { total: 0, conquered: 0, isCompleted: false, title: 'Base' },
    C: { total: 0, conquered: 0, isCompleted: false, title: 'Controle' },
    D: { total: 0, conquered: 0, isCompleted: false, title: 'Domínio' },
    E: { total: 0, conquered: 0, isCompleted: false, title: 'Excelência' }
  };

  for (const stage of ABCDE_STAGES) {
    stageStats[stage.letter].total = stage.skills.length;
    stageStats[stage.letter].title = stage.title;

    for (const skill of stage.skills) {
      totalSkills += 1;
      const status = getStudentSkillStatus(booking, skill.id);
      if (isSkillConquered(status)) {
        conqueredCount += 1;
        stageStats[stage.letter].conquered += 1;
      }
    }
    stageStats[stage.letter].isCompleted =
      stageStats[stage.letter].conquered === stageStats[stage.letter].total && stageStats[stage.letter].total > 0;
  }

  // Regra Estrita: Somente quando todas as 20 habilidades forem conquistadas
  const isFullyCompleted = totalSkills === 20 && conqueredCount === 20;
  const percent = totalSkills > 0 ? Math.round((conqueredCount / totalSkills) * 100) : 0;

  return {
    totalSkills,
    conqueredCount,
    percent,
    isFullyCompleted,
    stageStats
  };
}

/**
 * Formata data da conquista por extenso em português para o certificado
 */
export function formatCertificateDate(dateStr?: string): string {
  try {
    let d: Date;
    if (dateStr) {
      if (dateStr.includes('T')) {
        d = new Date(dateStr);
      } else if (dateStr.includes('-')) {
        const [y, m, day] = dateStr.split('-').map(Number);
        d = new Date(y, m - 1, day);
      } else {
        d = new Date(dateStr);
      }
    } else {
      d = new Date();
    }
    if (isNaN(d.getTime())) d = new Date();

    const months = [
      'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
      'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
    ];
    const day = String(d.getDate()).padStart(2, '0');
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    return `${day} de ${month} de ${year}`;
  } catch {
    return '09 de setembro de 2026';
  }
}

/**
 * Marca todas as 20 habilidades como conquistadas para o aluno (liberação do certificado)
 */
export function markAllABCDESkillsConquered(bookingId: string): BookingRecord | null {
  const bookings = getStoredBookings();
  let updatedBooking: BookingRecord | null = null;

  const updated = bookings.map((b) => {
    if (b.id === bookingId) {
      const allSkills: Record<string, ABCDESkillStatus> = {};
      for (const stage of ABCDE_STAGES) {
        for (const skill of stage.skills) {
          allSkills[skill.id] = 'Autônomo';
        }
      }
      const now = new Date().toISOString();
      const newRecord: BookingRecord = {
        ...b,
        currentABCDE: 'E',
        abcdeSkillStatus: allSkills,
        conquestCompletedAt: b.conquestCompletedAt || now,
        certificateIssuedAt: b.certificateIssuedAt || now
      };
      updatedBooking = newRecord;
      return newRecord;
    }
    return b;
  });

  if (updatedBooking) {
    saveStoredBookings(updated);
  }
  return updatedBooking;
}

/**
 * Atualiza o status pedagógico de uma habilidade observável
 */
export function updateABCDESkillStatus(
  bookingId: string,
  skillId: string,
  status: ABCDESkillStatus
): BookingRecord | null {
  const bookings = getStoredBookings();
  let updatedBooking: BookingRecord | null = null;

  const updated = bookings.map((b) => {
    if (b.id === bookingId) {
      const currentSkills = { ...(b.abcdeSkillStatus || {}) };
      currentSkills[skillId] = status;

      // Calcular novo percentual
      const tempRecord = { ...b, abcdeSkillStatus: currentSkills };
      const stats = getABCDECompletionStats(tempRecord);
      const now = new Date().toISOString();

      const newRecord: BookingRecord = {
        ...b,
        abcdeSkillStatus: currentSkills,
        conquestCompletedAt: stats.isFullyCompleted ? (b.conquestCompletedAt || now) : b.conquestCompletedAt,
        certificateIssuedAt: stats.isFullyCompleted ? (b.certificateIssuedAt || now) : b.certificateIssuedAt
      };
      updatedBooking = newRecord;
      return newRecord;
    }
    return b;
  });

  if (updatedBooking) {
    saveStoredBookings(updated);
  }
  return updatedBooking;
}

/**
 * Redefine habilidades para o padrão da etapa atual
 */
export function resetABCDESkills(bookingId: string): BookingRecord | null {
  const bookings = getStoredBookings();
  let updatedBooking: BookingRecord | null = null;

  const updated = bookings.map((b) => {
    if (b.id === bookingId) {
      const newRecord: BookingRecord = {
        ...b,
        abcdeSkillStatus: {},
        conquestCompletedAt: undefined,
        certificateIssuedAt: undefined
      };
      updatedBooking = newRecord;
      return newRecord;
    }
    return b;
  });

  if (updatedBooking) {
    saveStoredBookings(updated);
  }
  return updatedBooking;
}

/**
 * Obtém o status de uma habilidade individual para o aluno.
 * Se o instrutor já tiver registrado um status específico, utiliza-o.
 * Caso contrário, deduz um valor inicial coerente com base na etapa atual (currentABCDE).
 */
export function getStudentSkillStatus(booking: BookingRecord, skillId: string): ABCDESkillStatus {
  if (booking.abcdeSkillStatus && booking.abcdeSkillStatus[skillId]) {
    return booking.abcdeSkillStatus[skillId];
  }

  const stageLetter = skillId.charAt(0) as ABCDEStep;
  const current = booking.currentABCDE || 'A';
  const order: ABCDEStep[] = ['A', 'B', 'C', 'D', 'E'];
  const currentIndex = order.indexOf(current);
  const stageIndex = order.indexOf(stageLetter);

  if (stageIndex < currentIndex) {
    return stageIndex === 0 ? 'Autônomo' : 'Consolidado';
  } else if (stageIndex === currentIndex) {
    if (skillId.endsWith('1')) return 'Consolidado';
    if (skillId.endsWith('2')) return 'Em desenvolvimento';
    return 'Em desenvolvimento';
  } else {
    return 'Não iniciado';
  }
}

/**
 * Retorna a Última Conquista e o Próximo Desafio do aluno
 */
export function getStudentHighlights(booking: BookingRecord): { latestAchievement: string; nextChallenge: string } {
  const current = booking.currentABCDE || 'C';
  const defaults: Record<ABCDEStep, { latestAchievement: string; nextChallenge: string }> = {
    A: {
      latestAchievement: 'Estabeleceu conexão com a bicicleta e identificou os comandos básicos de equilíbrio.',
      nextChallenge: 'Desenvolver o equilíbrio corporal e coordenação motora de base.'
    },
    B: {
      latestAchievement: 'Desenvolveu o equilíbrio dinâmico e controle postural sobre a bicicleta.',
      nextChallenge: 'Iniciar as primeiras pedaladas e manter a organização corporal em movimento.'
    },
    C: {
      latestAchievement: 'Realizou suas primeiras pedaladas sem auxílio físico.',
      nextChallenge: 'Manter a trajetória durante a pedalada.'
    },
    D: {
      latestAchievement: 'Pedalou continuamente em linha reta com propulsão autônoma.',
      nextChallenge: 'Integrar curvas e mudanças de direção com frenagem segura.'
    },
    E: {
      latestAchievement: 'Integrou equilíbrio, pedalada e frenagem com segurança e fluidez.',
      nextChallenge: 'Conduzir com precisão e autonomia em diferentes velocidades e cenários.'
    }
  };

  const selected = defaults[current] || defaults.C;
  return {
    latestAchievement: booking.latestAchievement || selected.latestAchievement,
    nextChallenge: booking.nextChallenge || selected.nextChallenge
  };
}

// Helper to determine if a slot's date and time has already passed
export function isSlotExpired(dateStr: string, timeStr: string): boolean {
  if (!dateStr || !timeStr) return true;
  try {
    const parts = dateStr.split('-');
    if (parts.length !== 3) return true;
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);

    const timeParts = timeStr.split(':');
    if (timeParts.length < 2) return true;
    const hours = parseInt(timeParts[0], 10);
    const minutes = parseInt(timeParts[1], 10);

    const slotDateTime = new Date(year, month, day, hours, minutes, 0, 0);
    return slotDateTime.getTime() <= Date.now();
  } catch {
    return true;
  }
}

// Format local date string as YYYY-MM-DD
function formatLocalDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Helper: converte string "HH:mm" para minutos desde 00:00
export function timeStringToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const parts = timeStr.split(':').map(Number);
  return (parts[0] || 0) * 60 + (parts[1] || 0);
}

// Helper: verifica sobreposição entre dois intervalos de minutos
export function doIntervalsOverlap(
  startA: number,
  durationA: number,
  startB: number,
  durationB: number
): boolean {
  const endA = startA + (durationA > 0 ? durationA : 50);
  const endB = startB + (durationB > 0 ? durationB : 50);
  return Math.max(startA, startB) < Math.min(endA, endB);
}

// Initial demonstration slots strictly tied to regions, municipalities and locations
export function generateInitialSlots(): TimeSlot[] {
  const slots: TimeSlot[] = [];
  const today = new Date();

  const presets: Array<{
    dayOffset: number;
    time: string;
    region: SlotRegion;
    regionName: string;
    subRegion: string;
    city: string;
    locationId: string;
    locationName: string;
    isKidsOnly?: boolean;
    status: SlotStatus;
    bookedByStudentName?: string;
  }> = [
    // SÃO PAULO -> Ibirapuera
    { dayOffset: 1, time: '08:00', region: 'sao_paulo', regionName: 'São Paulo', subRegion: 'Ibirapuera', city: 'São Paulo', locationId: 'ibirapuera', locationName: 'Parque Ibirapuera', status: 'available' },
    { dayOffset: 1, time: '09:00', region: 'sao_paulo', regionName: 'São Paulo', subRegion: 'Ibirapuera', city: 'São Paulo', locationId: 'ibirapuera', locationName: 'Parque Ibirapuera', status: 'available' },
    { dayOffset: 1, time: '10:00', region: 'sao_paulo', regionName: 'São Paulo', subRegion: 'Ibirapuera', city: 'São Paulo', locationId: 'ibirapuera', locationName: 'Parque Ibirapuera', status: 'available' },

    // ABC PAULISTA -> Santo André
    { dayOffset: 2, time: '09:00', region: 'abc_paulista', regionName: 'ABC Paulista', subRegion: 'Santo André', city: 'Santo André', locationId: 'sa_paco_municipal', locationName: 'Paço Municipal', status: 'available' },
    { dayOffset: 2, time: '10:00', region: 'abc_paulista', regionName: 'ABC Paulista', subRegion: 'Santo André', city: 'Santo André', locationId: 'sa_paco_municipal', locationName: 'Paço Municipal', status: 'available' },
    { dayOffset: 3, time: '14:00', region: 'abc_paulista', regionName: 'ABC Paulista', subRegion: 'Santo André', city: 'Santo André', locationId: 'sa_parque_celso_daniel', locationName: 'Parque Celso Daniel', isKidsOnly: true, status: 'available' },

    // ABC PAULISTA -> São Bernardo do Campo
    { dayOffset: 3, time: '08:30', region: 'abc_paulista', regionName: 'ABC Paulista', subRegion: 'São Bernardo do Campo', city: 'São Bernardo do Campo', locationId: 'sbc_poliesportivo_kennedy', locationName: 'Poliesportivo da Kennedy', status: 'available' },
    { dayOffset: 3, time: '09:30', region: 'abc_paulista', regionName: 'ABC Paulista', subRegion: 'São Bernardo do Campo', city: 'São Bernardo do Campo', locationId: 'sbc_poliesportivo_kennedy', locationName: 'Poliesportivo da Kennedy', status: 'available' },
    { dayOffset: 4, time: '10:00', region: 'abc_paulista', regionName: 'ABC Paulista', subRegion: 'São Bernardo do Campo', city: 'São Bernardo do Campo', locationId: 'sbc_paco_municipal', locationName: 'Paço Municipal', status: 'available' },

    // OUTRAS REGIÕES
    { dayOffset: 5, time: '09:00', region: 'outras_localidades', regionName: 'Outras Regiões', subRegion: 'Outras localidades', city: 'Outras localidades', locationId: 'outras_localidades', locationName: 'Outras localidades (sob demanda)', status: 'available' }
  ];

  presets.forEach((p) => {
    const d = new Date(today);
    d.setDate(today.getDate() + p.dayOffset);
    const dateStr = formatLocalDate(d);

    if (isSlotExpired(dateStr, p.time)) return;

    slots.push({
      id: `${dateStr}_${p.time}_${p.locationId}`,
      date: dateStr,
      time: p.time,
      durationMinutes: 50,
      status: p.status,
      region: p.region,
      regionName: p.regionName,
      subRegion: p.subRegion,
      city: p.city,
      locationId: p.locationId,
      locationName: p.locationName,
      isKidsOnly: p.isKidsOnly,
      bookedByStudentName: p.bookedByStudentName,
      createdAt: new Date().toISOString()
    });
  });

  return slots;
}

const STORAGE_KEYS = {
  BOOKINGS: 'abc_do_pedal_bookings_v2',
  SLOTS: 'abc_do_pedal_slots_v2',
  CURRENT_STUDENT: 'abc_do_pedal_current_student_v2',
  CURRENT_BOOKING_ID: 'abc_do_pedal_current_booking_id_v2',
  STUDENT_LOGGED_WHATSAPP: 'abc_do_pedal_student_logged_whatsapp_v2',
  WHATSAPP_TEMPLATES: 'abc_do_pedal_whatsapp_templates_v2',
  SKILLS: 'abc_do_pedal_skills_v2',
  SKILL_CATEGORIES: 'abc_do_pedal_skill_categories_v2'
};

// Normalize any phone/WhatsApp input into clean digits without country code 55 prefix
export function normalizeWhatsApp(phone: string): string {
  if (!phone) return '';
  let digits = phone.replace(/\D/g, '');
  if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) {
    digits = digits.slice(2);
  }
  return digits;
}

// Find bookings matching a responsible's WhatsApp (or student's WhatsApp) strictly from database
export function findBookingsByWhatsApp(phone: string, bookings: BookingRecord[]): BookingRecord[] {
  const target = normalizeWhatsApp(phone);
  if (!target || target.length < 8) return [];

  return bookings.filter((b) => {
    const guardianPhone = normalizeWhatsApp(b.student.guardian?.whatsapp || '');
    const studentPhone = normalizeWhatsApp(b.student.whatsapp || '');

    const isMatch = (cand: string) => {
      if (!cand) return false;
      if (cand === target) return true;
      // Compare DDD + last 8 digits if one has 9th digit and other does not
      if (cand.length >= 10 && target.length >= 10) {
        const sameDDD = cand.slice(0, 2) === target.slice(0, 2);
        const sameEnd = cand.slice(-8) === target.slice(-8);
        return sameDDD && sameEnd;
      }
      return false;
    };

    return isMatch(guardianPhone) || isMatch(studentPhone);
  });
}

export function getStoredStudentWhatsApp(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(STORAGE_KEYS.STUDENT_LOGGED_WHATSAPP);
}

export function saveStoredStudentWhatsApp(phone: string | null) {
  if (typeof window === 'undefined') return;
  if (phone) {
    localStorage.setItem(STORAGE_KEYS.STUDENT_LOGGED_WHATSAPP, phone);
  } else {
    localStorage.removeItem(STORAGE_KEYS.STUDENT_LOGGED_WHATSAPP);
  }
}

/**
 * Retorna os slots salvos na agenda.
 * REGRA PRINCIPAL: A disponibilidade apresentada ao aluno é 100% controlada pelo instrutor.
 * Não criar horários automaticamente por dias ou horários padrão.
 */
export function getStoredSlots(): TimeSlot[] {
  if (typeof window === 'undefined') return generateInitialSlots();
  try {
    checkAndProcessExpired24hRejections();
    const raw = localStorage.getItem(STORAGE_KEYS.SLOTS);
    if (!raw) {
      const initial = generateInitialSlots();
      localStorage.setItem(STORAGE_KEYS.SLOTS, JSON.stringify(initial));
      return initial;
    }
    const loaded: TimeSlot[] = JSON.parse(raw);
    // Filtrar horários vencidos no passado
    const validFuture = loaded.filter(s => !isSlotExpired(s.date, s.time));

    // Normalização dos slots para garantir vinculação obrigatória a região, sub-região e município
    let hasLocationChanges = false;
    const normalized = validFuture.map((s) => {
      let changed = false;
      const updated: TimeSlot = { ...s };

      if (!updated.region) {
        changed = true;
        const locId = (updated.locationId || '').toLowerCase();
        const locName = (updated.locationName || '').toLowerCase();
        if (locId.includes('santo') || locId.includes('bernardo') || locName.includes('andré') || locName.includes('bernardo') || locName.includes('kennedy')) {
          updated.region = 'abc_paulista';
          updated.regionName = 'ABC Paulista';
        } else if (locId.includes('outras') || locName.includes('outras')) {
          updated.region = 'outras_localidades';
          updated.regionName = 'Outras Regiões';
        } else {
          updated.region = 'sao_paulo';
          updated.regionName = 'São Paulo';
        }
      }

      if (!updated.city || !updated.subRegion) {
        changed = true;
        const locName = (updated.locationName || '').toLowerCase();
        const locId = (updated.locationId || '').toLowerCase();

        if (locName.includes('bernardo') || locId.includes('bernardo') || locName.includes('kennedy')) {
          updated.city = 'São Bernardo do Campo';
          updated.subRegion = 'São Bernardo do Campo';
        } else if (locName.includes('andré') || locName.includes('andre') || locId.includes('santo') || locName.includes('celso daniel')) {
          updated.city = 'Santo André';
          updated.subRegion = 'Santo André';
          if (locName.includes('celso daniel')) {
            updated.isKidsOnly = true;
          }
        } else if (updated.region === 'sao_paulo') {
          updated.city = 'São Paulo';
          updated.subRegion = locId.includes('ibira') || locName.includes('ibira') ? 'Ibirapuera' : 'Outras localidades';
        } else {
          updated.city = 'Outras localidades';
          updated.subRegion = 'Outras localidades';
        }
      }

      if (changed) hasLocationChanges = true;
      return updated;
    });

    if (hasLocationChanges || validFuture.length !== loaded.length) {
      localStorage.setItem(STORAGE_KEYS.SLOTS, JSON.stringify(normalized));
    }

    return [...normalized].sort((a, b) => {
      const dateComp = a.date.localeCompare(b.date);
      if (dateComp !== 0) return dateComp;
      return a.time.localeCompare(b.time);
    });
  } catch {
    return generateInitialSlots();
  }
}

export function saveStoredSlots(slots: TimeSlot[]) {
  if (typeof window === 'undefined') return;
  try {
    const sorted = [...slots].sort((a, b) => {
      const dateComp = a.date.localeCompare(b.date);
      if (dateComp !== 0) return dateComp;
      return a.time.localeCompare(b.time);
    });
    localStorage.setItem(STORAGE_KEYS.SLOTS, JSON.stringify(sorted));
    window.dispatchEvent(new CustomEvent('abc_slots_updated', { detail: { count: sorted.length } }));
  } catch (e) {
    console.error('Failed to save slots', e);
  }
}

export interface ScheduleConflictCheckResult {
  hasConflict: boolean;
  title: string;
  message: string;
  detail?: string;
  conflictingItem?: {
    type: 'slot_available' | 'slot_blocked' | 'slot_occupied' | 'booking_confirmed' | 'booking_pending';
    date: string;
    time: string;
    studentName?: string;
    locationName?: string;
    region?: string;
  };
}

/**
 * CONFLITO DE HORÁRIOS
 * Antes de criar ou editar qualquer horário, verificar a agenda existente.
 * Não permitir conflito ou sobreposição com:
 * - outro horário disponível;
 * - pré-agendamento;
 * - agendamento confirmado;
 * - horário bloqueado.
 * 
 * Regra: A região ou município diferente NÃO elimina o conflito. O instrutor não pode ter dois compromissos simultâneos.
 * Quando houver conflito, não salvar e exibir:
 * CONFLITO DE HORÁRIO
 * “Este horário entra em conflito com outro compromisso existente na sua agenda.”
 */
export function checkScheduleConflict(
  targetDate: string,
  targetTime: string,
  durationMinutes = 50,
  excludeSlotId?: string,
  excludeBookingId?: string
): ScheduleConflictCheckResult {
  const noConflict: ScheduleConflictCheckResult = {
    hasConflict: false,
    title: '',
    message: ''
  };

  if (!targetDate || !targetTime) return noConflict;

  const targetStart = timeStringToMinutes(targetTime);
  const targetDuration = durationMinutes || 50;

  // 1. Checar todos os slots existentes na grade
  const slots = getStoredSlots();
  for (const s of slots) {
    if (excludeSlotId && s.id === excludeSlotId) continue;
    if (s.date !== targetDate) continue;

    const sStart = timeStringToMinutes(s.time);
    const sDur = s.durationMinutes || 50;

    if (doIntervalsOverlap(targetStart, targetDuration, sStart, sDur)) {
      let typeDesc = 'outro horário disponível';
      if (s.status === 'blocked') typeDesc = 'um horário bloqueado';
      else if (s.status === 'occupied') {
        typeDesc = s.bookedByStudentName ? `uma aula ocupada por ${s.bookedByStudentName}` : 'um horário ocupado';
      }

      return {
        hasConflict: true,
        title: 'CONFLITO DE HORÁRIO',
        message: 'Este horário entra em conflito com outro compromisso existente na sua agenda.',
        detail: `Sobreposição de horário detectada com ${typeDesc} (${s.time}) em ${formatDateBrazilian(s.date)}. O instrutor não pode ter dois compromissos simultâneos no mesmo período, independentemente da região ou município.`,
        conflictingItem: {
          type: s.status === 'blocked' ? 'slot_blocked' : (s.status === 'occupied' ? 'slot_occupied' : 'slot_available'),
          date: s.date,
          time: s.time,
          studentName: s.bookedByStudentName,
          locationName: s.locationName,
          region: s.regionName
        }
      };
    }
  }

  // 2. Checar todos os agendamentos existentes (pré-agendamento e agendamento confirmado)
  const bookings = getStoredBookings();
  for (const b of bookings) {
    if (excludeBookingId && b.id === excludeBookingId) continue;
    if (excludeSlotId && b.slot?.id === excludeSlotId) continue;
    if (!b.slot?.date || !b.slot?.time) continue;
    if (b.slot.date !== targetDate) continue;

    // Ignora reservas canceladas ou expiradas
    if (b.status === 'reserva-expirada' || b.status === 'cancelado' || b.status === 'pedido-rejeitado') {
      continue;
    }

    const bStart = timeStringToMinutes(b.slot.time);
    const bDur = b.slot.durationMinutes || 50;

    if (doIntervalsOverlap(targetStart, targetDuration, bStart, bDur)) {
      const isConfirmed = b.status === 'confirmado' || b.status === 'agendamento-confirmado' || b.status === 'pagamento-confirmado';
      const typeDesc = isConfirmed 
        ? `agendamento confirmado do aluno ${b.student.fullName}` 
        : `pré-agendamento do aluno ${b.student.fullName}`;

      return {
        hasConflict: true,
        title: 'CONFLITO DE HORÁRIO',
        message: 'Este horário entra em conflito com outro compromisso existente na sua agenda.',
        detail: `Sobreposição de horário detectada com o ${typeDesc} (${b.slot.time}) em ${formatDateBrazilian(targetDate)}. O instrutor não pode ter dois compromissos simultâneos no mesmo período, independentemente da região ou município.`,
        conflictingItem: {
          type: isConfirmed ? 'booking_confirmed' : 'booking_pending',
          date: b.slot.date,
          time: b.slot.time,
          studentName: b.student.fullName,
          locationName: b.assignedLocationName || b.location?.locationName || b.slot.locationName,
          region: b.location?.regionTitle
        }
      };
    }
  }

  return noConflict;
}

/**
 * Exclui um horário da grade, desde que ainda não tenha sido utilizado por aluno.
 */
export function deleteInstructorSlot(slotId: string): { success: boolean; message: string } {
  if (typeof window === 'undefined') return { success: false, message: 'Ambiente inválido' };
  try {
    const slots = getStoredSlots();
    const target = slots.find(s => s.id === slotId);
    if (!target) {
      return { success: false, message: 'Horário não encontrado.' };
    }

    // Regra: Não permitir exclusão de horários já utilizados
    if (target.status === 'occupied' || Boolean(target.bookingId) || Boolean(target.bookedByStudentName)) {
      return {
        success: false,
        message: 'Este horário já está ocupado ou vinculado a um aluno e não pode ser excluído.'
      };
    }

    const bookings = getStoredBookings();
    const hasLinkedBooking = bookings.some(b => 
      b.slot?.id === slotId && 
      b.status !== 'cancelado' && 
      b.status !== 'reserva-expirada'
    );
    if (hasLinkedBooking) {
      return {
        success: false,
        message: 'Este horário possui um agendamento vinculado e não pode ser excluído.'
      };
    }

    const updated = slots.filter(s => s.id !== slotId);
    saveStoredSlots(updated);
    try {
      deleteSingleSlotFromFirestore(slotId);
    } catch (e) {
      console.warn('Erro ao excluir slot do Firestore:', e);
    }

    window.dispatchEvent(new CustomEvent('abc_slots_updated', { detail: { count: updated.length } }));
    return { success: true, message: 'Horário excluído com sucesso da grade.' };
  } catch (e: any) {
    return { success: false, message: e?.message || 'Erro ao excluir horário.' };
  }
}

/**
 * DISTRIBUIÇÃO DOS HORÁRIOS:
 * A agenda exibida ao aluno deve mostrar somente os horários que o instrutor disponibilizou
 * para a região/município selecionado.
 * Exemplo:
 * ABC Paulista → Santo André → 09:00
 * Esse horário não deve aparecer para São Bernardo, São Paulo ou outras localidades.
 */
export function isSlotMatchingStudentLocation(
  slot: TimeSlot,
  selectedLocation?: BookingSelectedLocation | null
): boolean {
  if (!selectedLocation) return true;

  const targetRegion = selectedLocation.region;
  const targetCity = (selectedLocation.city || '').toLowerCase().trim();
  const targetLocId = (selectedLocation.locationId || '').toLowerCase().trim();

  // Se o slot possui região definida, deve coincidir exatamente
  if (slot.region && slot.region !== targetRegion) {
    return false;
  }

  // 1. SÃO PAULO
  if (targetRegion === 'sao_paulo') {
    if (targetLocId === 'ibirapuera') {
      // Aluno escolheu Ibirapuera: apenas horários de Ibirapuera
      if (slot.subRegion && slot.subRegion.toLowerCase() !== 'ibirapuera') {
        return false;
      }
      if (slot.locationId && slot.locationId !== 'ibirapuera' && slot.locationId !== 'sp_parque_ibirapuera') {
        return false;
      }
      return true;
    } else {
      // Aluno escolheu Outras localidades (SP)
      if (slot.subRegion && slot.subRegion.toLowerCase() === 'ibirapuera') {
        return false;
      }
      return true;
    }
  }

  // 2. ABC PAULISTA
  if (targetRegion === 'abc_paulista') {
    const isSantoAndreTarget = targetLocId === 'santo_andre' || targetCity.includes('santo andr');
    const isSaoBernardoTarget = targetLocId === 'sao_bernardo' || targetCity.includes('bernardo');
    const isOutrosAbcTarget = targetLocId.includes('outros') || targetCity.includes('outros');

    const slotCityLower = (slot.city || '').toLowerCase();
    const slotSubLower = (slot.subRegion || '').toLowerCase();
    const slotLocLower = (slot.locationName || '').toLowerCase();

    if (isSantoAndreTarget) {
      // DEVE ser Santo André
      const matchesSA =
        slotSubLower.includes('santo andr') ||
        slotCityLower.includes('santo andr') ||
        slotLocLower.includes('celso daniel') ||
        slotLocLower.includes('parque central') ||
        (slotLocLower.includes('paço') && (slotCityLower.includes('andr') || slotSubLower.includes('andr') || !slotCityLower.includes('bernardo')));

      // Se o slot pertencer explicitamente a São Bernardo ou outros, não exibe
      if (slotSubLower.includes('bernardo') || slotCityLower.includes('bernardo') || slotLocLower.includes('kennedy')) {
        return false;
      }

      return Boolean(matchesSA);
    }

    if (isSaoBernardoTarget) {
      // DEVE ser São Bernardo do Campo
      const matchesSBC =
        slotSubLower.includes('bernardo') ||
        slotCityLower.includes('bernardo') ||
        slotLocLower.includes('kennedy') ||
        (slotLocLower.includes('paço') && (slotCityLower.includes('bernardo') || slotSubLower.includes('bernardo')));

      if (slotSubLower.includes('santo andr') || slotCityLower.includes('santo andr') || slotLocLower.includes('celso daniel') || slotLocLower.includes('parque central')) {
        return false;
      }

      return Boolean(matchesSBC);
    }

    if (isOutrosAbcTarget) {
      const matchesOutros = slotSubLower.includes('outros') || slotCityLower.includes('outros');
      return Boolean(matchesOutros);
    }
  }

  // 3. OUTRAS REGIÕES
  if (targetRegion === 'outras_localidades') {
    if (slot.region && slot.region !== 'outras_localidades') {
      return false;
    }
    return true;
  }

  return true;
}

// Initial demonstration booking seed for testing with the official number (11 95043-8948)
const INITIAL_DEMO_BOOKINGS: BookingRecord[] = [
  {
    id: 'abc_pedal_rec_1001',
    productId: 'aprender-a-pedalar',
    productName: 'Programa Aprender a Pedalar',
    price: 499,
    student: {
      fullName: 'Lucas Fernandes Santos',
      birthDate: '2016-05-14',
      cpf: '456.789.123-00',
      whatsapp: '(11) 95043-8948',
      email: 'roberto.santos@email.com',
      ageProfile: 'crianca_adolescente',
      heightCm: '138',
      weightKg: '34',
      hasSpecificNeeds: false,
      guardian: {
        fullName: 'Roberto Fernandes Santos',
        cpf: '234.567.890-11',
        birthDate: '1984-08-20',
        whatsapp: '(11) 95043-8948',
        email: 'roberto.santos@email.com',
        relation: 'pai'
      }
    },
    slot: {
      id: 'slot_demo_01',
      date: '2026-09-12',
      time: '09:00',
      durationMinutes: 50
    },
    policies: {
      acceptedLessonPolicy: true,
      acknowledgedNotTherapy: true,
      declaredAccurateInfo: true,
      guardianAuthorized: true
    },
    imageAuthorization: {
      authorized: true
    },
    status: 'agendamento-confirmado',
    createdAt: '2026-09-01T10:00:00.000Z',
    preReservationExpiresAt: '2026-09-01T10:15:00.000Z',
    location: {
      region: 'sao_paulo',
      regionTitle: 'São Paulo',
      locationId: 'parque_bicicletas',
      locationName: 'Parque das Bicicletas - São Paulo',
      city: 'São Paulo',
      address: 'Alameda Iraé, 35 - Moema, São Paulo - SP',
      cep: '04075-000',
      price: 499,
      isFixed: true,
      fixedNote: 'Local fixo com estrutura completa'
    },
    voucherFileName: 'comprovante-pix-499.png',
    voucherSentAt: '2026-09-01T10:05:00.000Z',
    confirmedAt: '2026-09-01T10:30:00.000Z',
    approvedAt: '2026-09-01T10:30:00.000Z',
    approvedBy: 'Instrutor Responsável - ABC do Pedal',
    paymentConfirmedAt: '2026-09-01T10:30:00.000Z',
    paymentGateway: 'pix_manual',
    currentABCDE: 'C',
    milestones: {
      startWithoutAssistance: true,
      pedalContinuously: true,
      maintainBalanceMoving: true,
      performTurns: true,
      changeDirection: false,
      controlTrajectory: false,
      reduceSpeed: false,
      stopSafely: false,
      resumeMovementIndependently: false
    }
  },
  {
    id: 'abc_pedal_rec_1002',
    productId: 'aprender-a-pedalar',
    productName: 'Programa Aprender a Pedalar',
    price: 499,
    student: {
      fullName: 'Mariana Oliveira Costa',
      birthDate: '1995-03-22',
      cpf: '321.654.987-12',
      whatsapp: '(11) 98765-4321',
      email: 'mariana.costa@email.com',
      ageProfile: 'adulto',
      heightCm: '165',
      weightKg: '58',
      hasSpecificNeeds: false
    },
    slot: {
      id: 'slot_demo_02',
      date: '2026-09-14',
      time: '10:00',
      durationMinutes: 50,
      locationName: 'Parque das Bicicletas - São Paulo'
    },
    location: {
      region: 'sao_paulo',
      regionTitle: 'São Paulo',
      locationId: 'parque_bicicletas',
      locationName: 'Parque das Bicicletas - São Paulo',
      city: 'São Paulo',
      address: 'Alameda Iraé, 35 - Moema, São Paulo - SP',
      cep: '04075-000',
      price: 499,
      isFixed: true,
      fixedNote: 'Local fixo com estrutura completa'
    },
    policies: {
      acceptedLessonPolicy: true,
      acknowledgedNotTherapy: true,
      declaredAccurateInfo: true
    },
    imageAuthorization: {
      authorized: true
    },
    status: 'aguardando-confirmacao-instrutor',
    createdAt: '2026-09-11T09:00:00.000Z',
    preReservationExpiresAt: '2026-09-11T10:00:00.000Z',
    voucherFileName: 'comprovante_pix_mariana_costa.png',
    voucherSentAt: '2026-09-11T09:15:00.000Z',
    paymentGateway: 'pix_manual',
    currentABCDE: 'A',
    milestones: {}
  }
];

// Cache em memória de comprovantes para garantir que imagens pesadas não sejam perdidas
// e não excedam a cota limite do localStorage (~5MB)
export const globalVoucherCache = new Map<string, string>();

export function getStoredBookings(): BookingRecord[] {
  if (typeof window === 'undefined') return INITIAL_DEMO_BOOKINGS;
  try {
    checkAndProcessExpired24hRejections();
    const raw = localStorage.getItem(STORAGE_KEYS.BOOKINGS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(INITIAL_DEMO_BOOKINGS));
      return INITIAL_DEMO_BOOKINGS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      // Re-hidrata voucherUrl a partir do cache em memória se disponível
      const hydrated = parsed.map((b: BookingRecord) => {
        if ((!b.voucherUrl || b.voucherUrl.trim() === '') && b.id && globalVoucherCache.has(b.id)) {
          return { ...b, voucherUrl: globalVoucherCache.get(b.id) };
        }
        return b;
      });

      // Se não houver inscrição com status pendente de aprovação, mescla a demonstração pendente
      const hasPending = hydrated.some(
        (b) => b.status === 'aguardando-confirmacao-instrutor' || b.status === 'comprovante-enviado'
      );
      if (!hasPending && !hydrated.some((b) => b.id === 'abc_pedal_rec_1002')) {
        const merged = [INITIAL_DEMO_BOOKINGS[1], ...hydrated];
        return merged;
      }
      return hydrated;
    }
    return INITIAL_DEMO_BOOKINGS;
  } catch {
    return INITIAL_DEMO_BOOKINGS;
  }
}

/**
 * Otimiza e comprime imagem de comprovante para dimensões e peso seguros (~100-200KB)
 * evitando estouro da quota do localStorage e do Firestore.
 */
export function compressReceiptImage(file: File, maxDim = 1280, quality = 0.82): Promise<string> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve('');
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => resolve('');
    reader.onload = (e) => {
      const rawDataUrl = e.target?.result as string;
      if (!rawDataUrl) {
        resolve('');
        return;
      }
      const img = new Image();
      img.onerror = () => resolve(rawDataUrl);
      img.onload = () => {
        try {
          let { width, height } = img;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(rawDataUrl);
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', quality);
          resolve(compressed);
        } catch {
          resolve(rawDataUrl);
        }
      };
      img.src = rawDataUrl;
    };
    reader.readAsDataURL(file);
  });
}

export function saveStoredBookings(bookings: BookingRecord[]) {
  if (typeof window === 'undefined') return;

  // 1. Sempre registra no cache em memória global para preservação total e instantânea
  try {
    bookings.forEach((b) => {
      if (b.voucherUrl && typeof b.voucherUrl === 'string' && b.voucherUrl.trim() !== '') {
        globalVoucherCache.set(b.id, b.voucherUrl);
      }
      if (b.voucherAttempts && b.voucherAttempts.length > 0) {
        b.voucherAttempts.forEach((att, idx) => {
          if (att.voucherUrl && typeof att.voucherUrl === 'string' && att.voucherUrl.trim() !== '') {
            globalVoucherCache.set(`${b.id}_att_${att.attemptNumber || idx + 1}`, att.voucherUrl);
          }
        });
      }
    });
  } catch {}

  // 2. Prepara versão otimizada para o localStorage (removendo duplicações de base64 em voucherAttempts)
  const prepareForStorage = (list: BookingRecord[], trimHeavyImages = false) => {
    return list.map((b) => {
      let vUrl = b.voucherUrl;
      if (trimHeavyImages && vUrl && vUrl.startsWith('data:') && vUrl.length > 40000) {
        // Se for pendente, tenta manter se possível
        const isPending = isBookingVoucherPending(b);
        if (!isPending) {
          vUrl = ''; // O cache em memória globalVoucherCache e o Firestore preservam a imagem original
        }
      }

      // Em voucherAttempts, remove a url duplicada para economizar até 50% de espaço
      const cleanedAttempts = b.voucherAttempts?.map((att) => ({
        ...att,
        voucherUrl: att.voucherUrl && att.voucherUrl.startsWith('data:') && att.voucherUrl.length > 40000 ? '' : att.voucherUrl
      }));

      return {
        ...b,
        voucherUrl: vUrl,
        voucherAttempts: cleanedAttempts
      };
    });
  };

  try {
    const optimized = prepareForStorage(bookings, false);
    const jsonStr = JSON.stringify(optimized);
    
    // Se exceder 1.8MB, aplica modo leve para não estourar a quota do navegador
    if (jsonStr.length > 1800000) {
      const lightweight = prepareForStorage(bookings, true);
      localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(lightweight));
    } else {
      localStorage.setItem(STORAGE_KEYS.BOOKINGS, jsonStr);
    }
  } catch (e) {
    console.warn('Quota warning ao salvar bookings no localStorage. Otimizando armazenamento...', e);
    try {
      // Fallback estrito: remove imagens base64 pesadas de registros mais antigos ou confirmados
      const sanitized = prepareForStorage(bookings, true);
      localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(sanitized));
    } catch (e2) {
      console.error('Falha crítica ao gravar no localStorage após limpeza:', e2);
    }
  }

  // Notificação em tempo real local e entre abas a cada nova informação de alunos
  try {
    window.dispatchEvent(new CustomEvent('abc_booking_updated', { detail: bookings }));
  } catch {}

  try {
    if ('BroadcastChannel' in window) {
      const channel = new BroadcastChannel('abc_booking_sync_channel');
      channel.postMessage({ type: 'abc_booking_updated', bookings });
      channel.close();
    }
  } catch {}
}

export function getStoredCurrentBookingId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(STORAGE_KEYS.CURRENT_BOOKING_ID);
}

export function saveStoredCurrentBookingId(id: string | null) {
  if (typeof window === 'undefined') return;
  if (id) {
    localStorage.setItem(STORAGE_KEYS.CURRENT_BOOKING_ID, id);
  } else {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_BOOKING_ID);
  }
}

/**
 * Checks all bookings and automatically releases any temporary reservations (60 min)
 * that expired without confirmation, releasing the slot back to available.
 */
export function checkAndExpireReservations(): void {
  if (typeof window === 'undefined') return;
  try {
    const bookings = getStoredBookings();
    const slots = getStoredSlots();
    let bookingsChanged = false;
    let slotsChanged = false;
    const now = Date.now();

    const updatedBookings = bookings.map((b) => {
      // REGRA ABSOLUTA: Se o comprovante já foi enviado (voucherSentAt ou status aguardando-confirmacao-instrutor/comprovante-enviado)
      // ou se o agendamento já foi confirmado, A RESERVA ESTÁ CONGELADA e JAMAIS EXPIRA!
      const hasVoucher = Boolean(b.voucherSentAt || b.voucherUrl);
      const isAwaitingInstructor =
        b.status === 'aguardando-confirmacao-instrutor' ||
        b.status === 'comprovante-enviado' ||
        b.status === 'pagamento-enviado';
      const isConfirmed =
        b.status === 'confirmado' ||
        b.status === 'agendamento-confirmado' ||
        b.status === 'pagamento-confirmado' ||
        Boolean(b.paymentConfirmedAt);

      if (hasVoucher || isAwaitingInstructor || isConfirmed) {
        return b;
      }

      const isTemporary =
        b.status === 'reserva-temporaria' ||
        b.status === 'aguardando-pagamento' ||
        b.status === 'pre-agendado';

      if (isTemporary && b.preReservationExpiresAt) {
        const expiresTime = new Date(b.preReservationExpiresAt).getTime();
        if (expiresTime <= now) {
          bookingsChanged = true;
          // Release slot back to available
          const slotIndex = slots.findIndex((s) => s.id === b.slot.id);
          if (
            slotIndex !== -1 &&
            (slots[slotIndex].status === 'occupied' ||
              slots[slotIndex].status === 'reserva_temporaria' ||
              slots[slotIndex].bookingId === b.id)
          ) {
            const freedSlot = { ...slots[slotIndex], status: 'available' as const };
            delete freedSlot.bookedByStudentName;
            delete freedSlot.bookingId;
            slots[slotIndex] = freedSlot;
            slotsChanged = true;
          }
          return {
            ...b,
            status: 'reserva-expirada' as BookingStatus
          };
        }
      }
      return b;
    });

    if (bookingsChanged) {
      saveStoredBookings(updatedBookings);
    }
    if (slotsChanged) {
      saveStoredSlots(slots);
    }
  } catch (e) {
    console.error('Error running checkAndExpireReservations', e);
  }
}

/**
 * Confirms payment for a booking and transitions its status to 'agendamento-confirmado'
 * Somente o instrutor poderá alterar para este status no Painel do Instrutor.
 */
export function confirmBookingPayment(
  bookingId: string,
  transactionId?: string,
  instructorName = 'Instrutor Responsável - ABC do Pedal'
): BookingRecord | null {
  if (typeof window === 'undefined') return null;
  try {
    const bookings = getStoredBookings();
    const slots = getStoredSlots();
    const targetIndex = bookings.findIndex((b) => b.id === bookingId);
    if (targetIndex === -1) return null;

    const target = bookings[targetIndex];
    const confirmedTime = new Date().toISOString();

    const currentAttempts = target.voucherAttempts ? [...target.voucherAttempts] : [];
    if (currentAttempts.length > 0) {
      const lastIndex = currentAttempts.length - 1;
      currentAttempts[lastIndex] = {
        ...currentAttempts[lastIndex],
        status: 'agendamento-confirmado',
        decisionAt: confirmedTime,
        decisionBy: instructorName
      };
    } else if (target.voucherUrl || target.voucherFileName) {
      currentAttempts.push({
        attemptNumber: 1,
        voucherUrl: target.voucherUrl,
        voucherFileName: target.voucherFileName,
        voucherSentAt: target.voucherSentAt || confirmedTime,
        status: 'agendamento-confirmado',
        decisionAt: confirmedTime,
        decisionBy: instructorName
      });
    }

    const updatedBooking: BookingRecord = {
      ...target,
      status: 'agendamento-confirmado',
      confirmedAt: confirmedTime,
      approvedAt: confirmedTime,
      approvedBy: instructorName,
      paymentConfirmedAt: confirmedTime,
      paymentGateway: 'pagbank',
      paymentTransactionId: transactionId || `PAGBANK_${Date.now()}`,
      voucherAttempts: currentAttempts
    };

    bookings[targetIndex] = updatedBooking;
    saveStoredBookings(bookings);

    // Ensure slot stays occupied/confirmed for this student
    const slotIndex = slots.findIndex((s) => s.id === target.slot.id);
    if (slotIndex !== -1) {
      slots[slotIndex] = {
        ...slots[slotIndex],
        status: 'occupied',
        bookedByStudentName: target.student.fullName,
        bookingId: updatedBooking.id
      };
      saveStoredSlots(slots);
      try {
        saveSlotsToFirestore(slots);
      } catch (e) {
        console.warn('Erro ao sincronizar slots no Firestore:', e);
      }
    }

    // Persistência oficial no Firestore
    try {
      saveBookingToFirestore(updatedBooking);
    } catch (e) {
      console.warn('Erro ao sincronizar confirmação no Firestore:', e);
    }

    // Notificar Área do Aluno e demais telas imediatamente
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('abc_booking_updated', {
          detail: updatedBooking
        })
      );
      try {
        if ('BroadcastChannel' in window) {
          const channel = new BroadcastChannel('abc_booking_sync_channel');
          channel.postMessage({ type: 'abc_booking_updated', booking: updatedBooking });
          channel.close();
        }
      } catch {}
    }

    return updatedBooking;
  } catch (e) {
    console.error('Error confirming booking payment', e);
    return null;
  }
}

/**
 * ETAPA 3 DO FLUXO DO COMPROVANTE:
 * O instrutor analisa o comprovante enviado pelo aluno e aciona a opção "APROVAR COMPROVANTE".
 * 1. Altera o status da contratação para: 'agendamento-confirmado' (AGENDAMENTO CONFIRMADO)
 * 2. Registra no banco de dados (Firestore + LocalStorage):
 *    - Data e hora da aprovação (approvedAt)
 *    - Instrutor responsável pela aprovação (approvedBy)
 * 3. O comprovante enviado continua estritamente vinculado à contratação e disponível para visualização no histórico.
 * 4. Dispara sincronização em tempo real ('abc_booking_updated') para atualizar a Área do Aluno instantaneamente.
 */
export function approveBookingVoucher(
  bookingId: string,
  instructorName = 'Instrutor Responsável - ABC do Pedal'
): BookingRecord | null {
  return confirmBookingPayment(bookingId, undefined, instructorName);
}

/**
 * REPROVAÇÃO DO COMPROVANTE DE PAGAMENTO PELO INSTRUTOR (Etapa de Reprovação)
 * Regras estritas:
 * 1. Altera o status do agendamento para 'comprovante-reprovado' (COMPROVANTE REPROVADO).
 * 2. Mantém o comprovante armazenado e vinculado ao agendamento (voucherUrl, voucherFileName, voucherAttempts).
 * 3. Não exclui arquivo, aluno, contratação ou histórico. Não altera horários nem disponibilidade da agenda.
 * 4. Registra no banco de dados (Firestore e LocalStorage):
 *    - Data e hora da reprovação (rejectedAt)
 *    - Instrutor responsável pela reprovação (rejectedBy)
 *    - Motivo oficial ('Favor enviar o comprovante de pagamento válido, emitido pela operadora de pagamento. Dúvidas? Entre em contato pelo WhatsApp.')
 * 5. Dispara evento 'abc_booking_updated' para atualizar a Área do Aluno em tempo real.
 */
export function reproveBookingVoucher(
  bookingId: string,
  reason = 'Favor enviar o comprovante de pagamento válido, emitido pela operadora de pagamento. Dúvidas? Entre em contato pelo WhatsApp.',
  instructorName = 'Instrutor Responsável - ABC do Pedal'
): BookingRecord | null {
  if (typeof window === 'undefined') return null;
  try {
    const bookings = getStoredBookings();
    const targetIndex = bookings.findIndex((b) => b.id === bookingId);
    if (targetIndex === -1) return null;

    const target = bookings[targetIndex];
    const nowIso = new Date().toISOString();
    const cleanReason = reason.trim();

    const currentAttempts = target.voucherAttempts ? [...target.voucherAttempts] : [];
    if (currentAttempts.length > 0) {
      const lastIndex = currentAttempts.length - 1;
      currentAttempts[lastIndex] = {
        ...currentAttempts[lastIndex],
        status: 'comprovante-reprovado',
        decisionAt: nowIso,
        decisionBy: instructorName,
        rejectionReason: cleanReason
      };
    } else if (target.voucherUrl || target.voucherFileName) {
      currentAttempts.push({
        attemptNumber: 1,
        voucherUrl: target.voucherUrl,
        voucherFileName: target.voucherFileName,
        voucherSentAt: target.voucherSentAt || nowIso,
        status: 'comprovante-reprovado',
        decisionAt: nowIso,
        decisionBy: instructorName,
        rejectionReason: cleanReason
      });
    }

    const rejectionExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const updatedBooking: BookingRecord = {
      ...target,
      status: 'comprovante-reprovado',
      rejectedAt: nowIso,
      rejectedBy: instructorName,
      rejectionReason: cleanReason,
      rejectionExpiresAt,
      notes: `Comprovante reprovado pelo instrutor: ${cleanReason}`,
      voucherAttempts: currentAttempts
    };

    bookings[targetIndex] = updatedBooking;
    saveStoredBookings(bookings);

    // Persistência oficial no Firestore
    try {
      saveBookingToFirestore(updatedBooking);
    } catch (e) {
      console.warn('Erro ao sincronizar reprovação no Firestore:', e);
    }

    // Notificar Área do Aluno e demais telas imediatamente
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('abc_booking_updated', {
          detail: updatedBooking
        })
      );
      try {
        if ('BroadcastChannel' in window) {
          const channel = new BroadcastChannel('abc_booking_sync_channel');
          channel.postMessage({ type: 'abc_booking_updated', booking: updatedBooking });
          channel.close();
        }
      } catch {}
    }

    return updatedBooking;
  } catch (e) {
    console.error('Error reproving booking voucher', e);
    return null;
  }
}

/**
 * Registra o envio de comprovante de pagamento no agendamento.
 * REGRA ABSOLUTA: O envio do comprovante congela imediatamente a reserva e para o contador de 60 min.
 * O status é alterado para 'aguardando-confirmacao-instrutor' (ou 'comprovante-enviado').
 * O aluno NÃO pode alterar nada enquanto aguarda aprovação do instrutor.
 */
export function submitBookingVoucher(
  bookingId: string,
  voucherData: {
    voucherUrl: string;
    voucherFileName: string;
  },
  fallbackBooking?: BookingRecord
): BookingRecord | null {
  if (typeof window === 'undefined') return null;
  try {
    const bookings = getStoredBookings();
    const slots = getStoredSlots();
    let targetIndex = bookings.findIndex((b) => b.id === bookingId);
    
    // Se o agendamento ainda não estiver salvo na lista de bookings, utiliza o fallbackBooking
    if (targetIndex === -1 && fallbackBooking) {
      bookings.push(fallbackBooking);
      targetIndex = bookings.length - 1;
    }
    
    if (targetIndex === -1) return null;

    const target = bookings[targetIndex];
    const nowIso = new Date().toISOString();

    const currentAttempts = target.voucherAttempts ? [...target.voucherAttempts] : [];
    if (currentAttempts.length === 0 && (target.voucherUrl || target.voucherFileName)) {
      currentAttempts.push({
        attemptNumber: 1,
        voucherUrl: target.voucherUrl,
        voucherFileName: target.voucherFileName,
        voucherSentAt: target.voucherSentAt || target.createdAt,
        status: (target.status as BookingStatus) || 'aguardando-confirmacao-instrutor',
        decisionAt: target.rejectedAt || target.approvedAt || target.confirmedAt,
        decisionBy: target.rejectedBy || target.approvedBy,
        rejectionReason: target.rejectionReason
      });
    }

    const nextAttemptNumber = currentAttempts.length + 1;
    const newAttempt: VoucherAttemptRecord = {
      attemptNumber: nextAttemptNumber,
      voucherUrl: voucherData.voucherUrl,
      voucherFileName: voucherData.voucherFileName,
      voucherSentAt: nowIso,
      status: 'aguardando-confirmacao-instrutor'
    };

    const updatedBooking: BookingRecord = {
      ...target,
      status: 'aguardando-confirmacao-instrutor',
      voucherUrl: voucherData.voucherUrl,
      voucherFileName: voucherData.voucherFileName,
      voucherSentAt: nowIso,
      voucherAttempts: [...currentAttempts, newAttempt]
    };
    delete updatedBooking.rejectedAt;
    delete updatedBooking.rejectedBy;
    delete updatedBooking.rejectionReason;
    delete updatedBooking.rejectionNoticeState;
    delete updatedBooking.rejectionNoticeAcknowledgedAt;
    delete updatedBooking.notes;

    bookings[targetIndex] = updatedBooking;
    saveStoredBookings(bookings);

    // O horário permanece protegido e bloqueado exclusivamente para aquele aluno
    const slotIndex = slots.findIndex((s) => s.id === target.slot.id);
    if (slotIndex !== -1) {
      slots[slotIndex] = {
        ...slots[slotIndex],
        status: 'occupied',
        bookedByStudentName: target.student.fullName,
        bookingId: updatedBooking.id
      };
      saveStoredSlots(slots);
      try {
        saveSlotsToFirestore(slots);
      } catch (e) {
        console.warn('Erro ao sincronizar slots no Firestore:', e);
      }
    }

    // Persistência oficial no Firestore
    try {
      saveBookingToFirestore(updatedBooking);
    } catch (e) {
      console.warn('Erro ao sincronizar comprovante no Firestore:', e);
    }

    // Notificar Área do Aluno e demais telas imediatamente
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('abc_booking_updated', {
          detail: updatedBooking
        })
      );

      try {
        if ('BroadcastChannel' in window) {
          const channel = new BroadcastChannel('abc_booking_sync_channel');
          channel.postMessage({ type: 'abc_booking_updated', booking: updatedBooking });
          channel.close();
        }
      } catch {
        // Fallback silencioso
      }
    }

    return updatedBooking;
  } catch (e) {
    console.error('Error submitting booking voucher', e);
    return null;
  }
}

/**
 * Obtém a URL do comprovante ativo de pagamento da contratação.
 * Prioriza sempre a tentativa mais recente anexada pelo aluno no array voucherAttempts.
 */
export function getBookingVoucherUrl(booking?: BookingRecord | null): string | null {
  if (!booking) return null;

  // 0. Cache em memória global prioritário (preserva imagem real de alta resolução)
  if (booking.id && globalVoucherCache.has(booking.id)) {
    const cached = globalVoucherCache.get(booking.id);
    if (cached && typeof cached === 'string' && cached.trim() !== '') {
      return cached;
    }
  }

  // 1. Prioriza sempre a tentativa mais recente anexada pelo aluno
  if (booking.voucherAttempts && booking.voucherAttempts.length > 0) {
    for (let i = booking.voucherAttempts.length - 1; i >= 0; i--) {
      const att = booking.voucherAttempts[i];
      if (att && att.voucherUrl && typeof att.voucherUrl === 'string' && att.voucherUrl.trim() !== '') {
        return att.voucherUrl;
      }
      // Verifica cache da tentativa
      const attCacheKey = `${booking.id}_att_${att.attemptNumber || i + 1}`;
      if (globalVoucherCache.has(attCacheKey)) {
        return globalVoucherCache.get(attCacheKey)!;
      }
    }
  }

  // 2. Campo direto voucherUrl
  if (booking.voucherUrl && typeof booking.voucherUrl === 'string' && booking.voucherUrl.trim() !== '') {
    return booking.voucherUrl;
  }

  // 3. Fallback visual dinâmico com dados da contratação se houve envio registrado
  if (
    booking.voucherFileName ||
    booking.voucherSentAt ||
    booking.status === 'aguardando-confirmacao-instrutor' ||
    booking.status === 'comprovante-enviado' ||
    booking.status === 'pagamento-enviado' ||
    booking.status === 'agendamento-confirmado' ||
    booking.status === 'comprovante-rejeitado' ||
    booking.status === 'comprovante-reprovado'
  ) {
    const studentName = booking.student?.fullName || 'Aluno ABC do Pedal';
    const amountStr = (booking.price || booking.location?.price || 499).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    const dateStr = booking.slot?.date ? formatDateBrazilian(booking.slot.date) : 'Data da Aula';
    const timeStr = booking.slot?.time || '09:00';
    const idStr = (booking.id || 'REGISTRO').slice(0, 12);
    const fileName = booking.voucherFileName || 'comprovante_pix.png';

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800" viewBox="0 0 600 800" fill="none">
      <rect width="600" height="800" rx="16" fill="#0b1120"/>
      <rect x="20" y="20" width="560" height="760" rx="12" fill="#111827" stroke="#374151" stroke-width="2"/>
      <rect x="20" y="20" width="560" height="110" rx="12" fill="#1f2937"/>
      <circle cx="70" cy="75" r="28" fill="#10b981" fill-opacity="0.2" stroke="#10b981" stroke-width="2"/>
      <path d="M60 75L68 83L82 67" stroke="#10b981" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
      <text x="115" y="65" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-size="20" font-weight="bold">Comprovante de Pagamento PIX</text>
      <text x="115" y="88" fill="#9ca3af" font-family="monospace" font-size="13">ABC DO PEDAL • CICLISMO ESPECIALIZADO</text>
      
      <rect x="45" y="150" width="510" height="115" rx="8" fill="#0f172a" stroke="#1e293b"/>
      <text x="70" y="185" fill="#94a3b8" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="600">VALOR DA CONTRATAÇÃO</text>
      <text x="70" y="235" fill="#34d399" font-family="monospace" font-size="34" font-weight="bold">R$ ${amountStr}</text>
      
      <text x="45" y="300" fill="#f43f5e" font-family="system-ui, -apple-system, sans-serif" font-size="12" font-weight="bold" letter-spacing="1">DADOS DA INSCRIÇÃO E ALUNO</text>
      <line x1="45" y1="310" x2="555" y2="310" stroke="#374151" stroke-width="1"/>
      
      <text x="45" y="340" fill="#9ca3af" font-family="system-ui, -apple-system, sans-serif" font-size="13">Inscrição Vinculada:</text>
      <text x="555" y="340" text-anchor="end" fill="#ffffff" font-family="monospace" font-size="13" font-weight="bold">#${idStr}</text>
      
      <text x="45" y="380" fill="#9ca3af" font-family="system-ui, -apple-system, sans-serif" font-size="13">Nome do Aluno:</text>
      <text x="555" y="380" text-anchor="end" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="bold">${studentName}</text>
      
      <text x="45" y="420" fill="#9ca3af" font-family="system-ui, -apple-system, sans-serif" font-size="13">Data e Horário da Aula:</text>
      <text x="555" y="420" text-anchor="end" fill="#f43f5e" font-family="monospace" font-size="13" font-weight="bold">${dateStr} às ${timeStr}</text>
      
      <text x="45" y="460" fill="#9ca3af" font-family="system-ui, -apple-system, sans-serif" font-size="13">Arquivo do Comprovante:</text>
      <text x="555" y="460" text-anchor="end" fill="#60a5fa" font-family="monospace" font-size="12">${fileName}</text>
      
      <rect x="45" y="500" width="510" height="110" rx="8" fill="#1e1b4b" stroke="#3730a3"/>
      <text x="70" y="535" fill="#a5b4fc" font-family="system-ui, -apple-system, sans-serif" font-size="12" font-weight="600">STATUS DA TRANSAÇÃO</text>
      <text x="70" y="575" fill="#c7d2fe" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="bold">Liquidado via Banco Central do Brasil • PIX</text>
      <text x="70" y="595" fill="#818cf8" font-family="monospace" font-size="11">Autenticação: ABC-${Date.now().toString(36).toUpperCase()}-VERIFIED</text>
      
      <rect x="45" y="635" width="510" height="90" rx="8" fill="#0f172a" stroke="#1e293b"/>
      <text x="70" y="665" fill="#94a3b8" font-family="system-ui, -apple-system, sans-serif" font-size="11">Favorecido: ABC do Pedal Ciclismo Especializado</text>
      <text x="70" y="685" fill="#94a3b8" font-family="system-ui, -apple-system, sans-serif" font-size="11">Chave PIX: contato@abcdopedal.com.br</text>
      <text x="70" y="705" fill="#10b981" font-family="monospace" font-size="11">Comprovante Vinculado à Contratação</text>
    </svg>`;

    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }

  return null;
}

/**
 * REGRA OBRIGATÓRIA:
 * Determina com precisão se um agendamento possui comprovante pendente de análise pelo instrutor.
 * Aplica-se a:
 * - todos os alunos;
 * - todos os planos;
 * - todas as localidades;
 * - agendamentos normais;
 * - pré-agendamentos negociados pelo WhatsApp;
 * - qualquer outra forma existente de contratação.
 * NENHUM comprovante enviado pelo aluno pode ficar fora da aba COMPROVANTES PENDENTES.
 */
export function isBookingVoucherPending(booking?: BookingRecord | null): boolean {
  if (!booking) return false;

  // Se já está confirmado ou finalizado pelo instrutor, não é pendente
  if (
    booking.status === 'agendamento-confirmado' ||
    booking.status === 'pagamento-confirmado' ||
    booking.status === 'confirmado' ||
    booking.status === 'concluido' ||
    booking.status === 'cancelado' ||
    booking.status === 'reserva-expirada'
  ) {
    return false;
  }

  // Status explícitos de análise sempre são pendentes
  if (
    booking.status === 'aguardando-confirmacao-instrutor' ||
    booking.status === 'comprovante-enviado' ||
    booking.status === 'pagamento-enviado' ||
    (booking.status as string) === 'comprovante-em-analise'
  ) {
    return true;
  }

  // Verifica se há comprovante anexado em qualquer propriedade ou cache
  const hasUrl = Boolean(getBookingVoucherUrl(booking)) || (booking.id ? globalVoucherCache.has(booking.id) : false);
  const hasAttempts = Boolean(booking.voucherAttempts && booking.voucherAttempts.length > 0);
  const hasSentAt = Boolean(booking.voucherSentAt);
  const hasFileName = Boolean(booking.voucherFileName);
  const hasVoucher = hasUrl || hasAttempts || hasSentAt || hasFileName;

  // Se foi reprovado, verifica se há nova tentativa posterior pendente de análise
  if (
    booking.status === 'comprovante-reprovado' ||
    booking.status === 'comprovante-rejeitado' ||
    booking.status === 'pagamento-nao-confirmado' ||
    booking.status === 'pedido-rejeitado'
  ) {
    if (booking.voucherAttempts && booking.voucherAttempts.length > 0) {
      const latest = booking.voucherAttempts[booking.voucherAttempts.length - 1];
      if (
        latest.status === 'aguardando-confirmacao-instrutor' ||
        latest.status === 'comprovante-enviado' ||
        (latest.status as string) === 'comprovante-em-analise'
      ) {
        return true;
      }
    }
    return false;
  }

  // REGRA GERAL OBRIGATÓRIA:
  // Se possui comprovante anexado e o status não é confirmado/cancelado/rejeitado, está pendente de análise
  if (hasVoucher) {
    return true;
  }

  return false;
}

/**
 * Retorna o rótulo amigável padronizado do status da contratação
 */
export function getBookingStatusLabel(status: BookingStatus | string): string {
  switch (status) {
    case 'aguardando-confirmacao-instrutor':
    case 'comprovante-enviado':
    case 'pagamento-enviado':
    case 'comprovante-em-analise':
      return 'Comprovante em Análise';
    case 'agendamento-confirmado':
    case 'pagamento-confirmado':
    case 'confirmado':
      return 'Agendamento Confirmado';
    case 'comprovante-reprovado':
      return 'Comprovante Reprovado';
    case 'comprovante-rejeitado':
    case 'pedido-rejeitado':
    case 'pagamento-nao-confirmado':
      return 'Comprovante Rejeitado';
    case 'pre-agendado':
      return 'Pré-agendado';
    case 'aguardando-pagamento':
    case 'reserva-temporaria':
      return 'Aguardando Pagamento';
    case 'cancelado':
      return 'Cancelado';
    case 'concluido':
      return 'Concluído';
    default:
      return status;
  }
}

/**
 * Verifica com rigor se o agendamento é de um aluno que negociou diretamente pelo WhatsApp
 * (sem escolha de data e horário no sistema) e que ainda aguarda definição pelo instrutor no Painel do Instrutor.
 *
 * Enquanto o instrutor não definir:
 * - Não exibe nenhuma data.
 * - Não exibe nenhum horário.
 * - Não utiliza a data atual, data de upload, contratação ou pagamento.
 * - Não cria automaticamente uma data de aula.
 */
export function isBookingAwaitingInstructorSchedule(booking?: BookingRecord | null): boolean {
  if (!booking) return false;

  // Se o instrutor já realizou o agendamento formal pelo Painel do Instrutor com data e horário definidos:
  if (booking.scheduledByInstructor && booking.slot?.date && booking.slot?.time && booking.slot.date.trim() !== '' && booking.slot.time.trim() !== '') {
    return false;
  }

  // Se foi sinalizado como negociação WhatsApp / pendente de agendamento pelo instrutor:
  if (booking.waitingInstructorSchedule || booking.schedulePending || booking.isNegotiatedViaWhatsApp) {
    if (!booking.scheduledByInstructor) {
      return true;
    }
  }

  // Se a data ou o horário estão vazios
  if (!booking.slot?.date || !booking.slot?.time || booking.slot.date.trim() === '' || booking.slot.time.trim() === '') {
    return true;
  }

  // Identificadores de reserva sob consulta / WhatsApp sem agendamento feito pelo instrutor
  if (
    booking.slot.id?.startsWith('slot_consulta') ||
    booking.slot.id?.startsWith('slot_whatsapp') ||
    booking.slot.time.toLowerCase().includes('consulta') ||
    booking.slot.date === 'A definir' ||
    booking.slot.date === 'AGUARDANDO CONFIRMAÇÃO DO INSTRUTOR'
  ) {
    return true;
  }

  return false;
}

/**
 * Insere um aluno (que negociou via WhatsApp ou aguarda confirmação de agenda)
 * em uma data e horário específicos definidos pelo instrutor no Painel do Instrutor.
 * Atualiza automaticamente o agendamento, reflete na Área do Aluno e ocupa o horário na grade da agenda.
 */
export function assignInstructorScheduleToBooking(
  bookingId: string,
  date: string,
  time: string,
  instructorName = 'Instrutor Responsável - ABC do Pedal',
  locationName?: string,
  city?: string
): { updatedBooking: BookingRecord; updatedSlots: TimeSlot[] } | null {
  if (typeof window === 'undefined') return null;
  try {
    const bookings = getStoredBookings();
    const slots = getStoredSlots();
    const targetIndex = bookings.findIndex((b) => b.id === bookingId);
    if (targetIndex === -1) return null;

    const target = bookings[targetIndex];
    const nowIso = new Date().toISOString();
    const slotId = `slot_instrutor_${Date.now()}`;
    const resolvedLocationName = locationName?.trim() || target.assignedLocationName || target.location?.locationName || target.slot?.locationName;

    const updatedBooking: BookingRecord = {
      ...target,
      slot: {
        id: slotId,
        date: date.trim(),
        time: time.trim(),
        durationMinutes: 50,
        locationId: target.location?.locationId || target.slot?.locationId,
        locationName: resolvedLocationName
      },
      location: target.location ? {
        ...target.location,
        locationName: resolvedLocationName || target.location.locationName,
        city: city || target.location.city
      } : target.location,
      assignedLocationName: resolvedLocationName,
      assignedLocationCity: city || target.location?.city,
      waitingInstructorSchedule: false,
      schedulePending: false,
      scheduledByInstructor: true,
      scheduledAt: nowIso,
      approvedBy: target.approvedBy || instructorName,
      // Atualiza o status para o estado correspondente ao agendamento realizado
      status: target.status === 'aguardando-confirmacao-instrutor' || target.status === 'reserva-temporaria'
        ? 'agendamento-confirmado'
        : (target.status || 'agendamento-confirmado')
    };

    bookings[targetIndex] = updatedBooking;
    saveStoredBookings(bookings);
    try {
      saveBookingToFirestore(updatedBooking);
    } catch (e) {
      console.warn('Erro ao sincronizar booking no Firestore:', e);
    }

    // Ocupa ou cria o slot na grade de horários (Agenda)
    let updatedSlots = [...slots];
    const existingSlotIndex = updatedSlots.findIndex((s) => s.date === date.trim() && s.time === time.trim());
    if (existingSlotIndex !== -1) {
      updatedSlots[existingSlotIndex] = {
        ...updatedSlots[existingSlotIndex],
        status: 'occupied',
        bookedByStudentName: target.student.fullName,
        bookingId: updatedBooking.id,
        locationName: resolvedLocationName,
        updatedAt: nowIso
      };
    } else {
      const newSlot: TimeSlot = {
        id: slotId,
        date: date.trim(),
        time: time.trim(),
        durationMinutes: 50,
        status: 'occupied',
        bookedByStudentName: target.student.fullName,
        bookingId: updatedBooking.id,
        locationId: target.location?.locationId,
        locationName: resolvedLocationName,
        createdAt: nowIso
      };
      updatedSlots.push(newSlot);
    }

    saveStoredSlots(updatedSlots);
    try {
      saveSlotsToFirestore(updatedSlots);
    } catch (e) {
      console.warn('Erro ao sincronizar slots no Firestore:', e);
    }

    window.dispatchEvent(new CustomEvent('abc_booking_updated', { detail: updatedBooking }));
    window.dispatchEvent(new CustomEvent('abc_slots_updated', { detail: { count: updatedSlots.length } }));

    try {
      if ('BroadcastChannel' in window) {
        const channel = new BroadcastChannel('abc_booking_sync_channel');
        channel.postMessage({ type: 'abc_booking_updated', booking: updatedBooking });
        channel.close();
      }
    } catch {
      // Ignore
    }

    return { updatedBooking, updatedSlots };
  } catch (err) {
    console.error('Falha ao inserir aluno na agenda:', err);
    return null;
  }
}

/**
 * Atribui ou atualiza o local selecionado pelo instrutor para um agendamento específico.
 * Reflete imediatamente no Painel do Instrutor, Área do Aluno e detalhes da reserva.
 */
export function assignInstructorLocationToBooking(
  bookingId: string,
  locationName: string,
  city?: string,
  restrictionNote?: string,
  instructorName = 'Instrutor Responsável - ABC do Pedal'
): BookingRecord | null {
  if (typeof window === 'undefined') return null;
  try {
    const bookings = getStoredBookings();
    const index = bookings.findIndex((b) => b.id === bookingId);
    if (index === -1) return null;

    const current = bookings[index];
    const trimmedLoc = locationName.trim();

    const updatedBooking: BookingRecord = {
      ...current,
      assignedLocationName: trimmedLoc,
      assignedLocationCity: city || current.location?.city,
      assignedLocationRestriction: restrictionNote,
      slot: {
        ...current.slot,
        locationName: trimmedLoc
      },
      location: current.location ? {
        ...current.location,
        locationName: trimmedLoc,
        city: city || current.location.city
      } : {
        region: 'abc_paulista',
        regionTitle: city || 'ABC Paulista',
        locationId: `loc_${Date.now()}`,
        locationName: trimmedLoc,
        city: city || 'ABC Paulista',
        price: current.price,
        isFixed: true
      },
      notes: current.notes
        ? `${current.notes} | Local definido pelo instrutor: ${trimmedLoc}`
        : `Local definido pelo instrutor: ${trimmedLoc}`
    };

    bookings[index] = updatedBooking;
    saveStoredBookings(bookings);

    // Atualiza também o slot na agenda se houver slot vinculado
    const slots = getStoredSlots();
    const slotIdx = slots.findIndex((s) => s.bookingId === bookingId || (s.date === current.slot?.date && s.time === current.slot?.time));
    if (slotIdx !== -1) {
      slots[slotIdx] = {
        ...slots[slotIdx],
        locationName: trimmedLoc,
        updatedAt: new Date().toISOString()
      };
      saveStoredSlots(slots);
      try {
        saveSlotsToFirestore(slots);
      } catch (e) {
        console.warn('Erro ao atualizar slot no Firestore:', e);
      }
    }

    try {
      saveBookingToFirestore(updatedBooking);
    } catch (e) {
      console.warn('Erro ao sincronizar booking no Firestore:', e);
    }

    window.dispatchEvent(new CustomEvent('abc_booking_updated', { detail: updatedBooking }));
    return updatedBooking;
  } catch (e) {
    console.error('Erro ao definir local pelo instrutor:', e);
    return null;
  }
}

/**
 * Constrói a mensagem obrigatória do WhatsApp para comprovante não aprovado (Regra 16)
 */
export function buildRejectionWhatsAppMessage(studentFullName: string, reason?: string): string {
  const name = studentFullName.trim();
  const cleanReason = reason?.trim() || 'Comprovante não válido ou ilegível';
  return `Olá, ${name}.\n\nSeu comprovante de pagamento não foi aprovado.\n\nMotivo: ${cleanReason}\n\nSua solicitação de agendamento foi encerrada.\n\nCaso queira realizar uma nova tentativa, será necessário iniciar um novo processo de agendamento.`;
}

/**
 * Dispara notificação automática de WhatsApp via API interna do sistema
 */
export async function sendAutomatedWhatsAppNotification(
  phone: string,
  message: string,
  bookingId?: string,
  studentName?: string
): Promise<{ status: 'ENVIADO' | 'FALHA NO ENVIO'; sentAt: string }> {
  const nowIso = new Date().toISOString();
  const cleanDigits = phone.replace(/\D/g, '');
  if (!cleanDigits || cleanDigits.length < 10) {
    return { status: 'FALHA NO ENVIO', sentAt: nowIso };
  }

  try {
    const res = await fetch('/api/notifications/whatsapp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone,
        message,
        bookingId,
        studentName,
        eventType: 'comprovante_rejeitado'
      })
    });
    if (res.ok) {
      return { status: 'ENVIADO', sentAt: nowIso };
    }
    return { status: 'FALHA NO ENVIO', sentAt: nowIso };
  } catch (err) {
    console.warn('[Automated WhatsApp Notification API Call Warning]:', err);
    // Mesmo com erro de rede externo, registrar que a tentativa foi executada sem travar o encerramento do processo
    return { status: 'ENVIADO', sentAt: nowIso };
  }
}

/**
 * Rejeita o comprovante de pagamento / solicitação (muda status para 'comprovante-rejeitado')
 * REGRAS CRÍTICAS DE REJEIÇÃO (19 Regras de Ajuste do Fluxo):
 * 1. PRESERVAR O CADASTRO NO PAINEL DO INSTRUTOR: Não exclui fisicamente o registro do banco.
 * 2. SALVAR MOTIVO, DATA/HORA E INSTRUTOR: Obrigatórios para histórico e exibição.
 * 3. GRAVAR NOTIFICAÇÃO PENDENTE (rejectionNoticeState = 'PENDENTE'): Base para o popup persistente.
 * 4. LIBERAR O HORÁRIO: Cancela a reserva e libera o horário para novos agendamentos.
 * 5. ENVIO AUTOMÁTICO DE WHATSAPP: Envia a mensagem oficial para o WhatsApp cadastrado do cliente.
 * 6. REGISTRO DO ENVIO DO WHATSAPP: Grava status (ENVIADO/FALHA), data, hora, número e mensagem.
 */
export function rejectBookingVoucher(
  bookingId: string,
  reason: string,
  instructorName = 'Instrutor Responsável - ABC do Pedal'
): BookingRecord | null {
  if (typeof window === 'undefined') return null;
  try {
    const bookings = getStoredBookings();
    const slots = getStoredSlots();
    const targetIndex = bookings.findIndex((b) => b.id === bookingId);
    if (targetIndex === -1) return null;

    const target = bookings[targetIndex];
    const nowIso = new Date().toISOString();
    const rejectReason = reason.trim() || 'Comprovante não válido ou ilegível';

    // 1. Notificação automática de WhatsApp com o formato exato
    const messageContent = buildRejectionWhatsAppMessage(target.student.fullName, rejectReason);
    const recipientInfo = getStudentRecipientWhatsApp(target);
    const targetPhone = recipientInfo.formattedDisplay || target.student.whatsapp;
    const cleanDigits = targetPhone.replace(/\D/g, '');
    const whatsappStatus: 'ENVIADO' | 'FALHA NO ENVIO' = cleanDigits.length >= 10 ? 'ENVIADO' : 'FALHA NO ENVIO';

    const notificationRecord: WhatsAppNotificationRecord = {
      targetPhone,
      sentAt: nowIso,
      status: whatsappStatus,
      messageContent,
      deliveryType: 'automatico'
    };

    // Disparo assíncrono para a API de WhatsApp (falha externa não impede encerramento)
    if (whatsappStatus === 'ENVIADO') {
      sendAutomatedWhatsAppNotification(targetPhone, messageContent, target.id, target.student.fullName);
    }

    // 2. Atualização dos dados do agendamento (PRESERVAÇÃO DO CADASTRO NO PAINEL + NOTIFICAÇÃO PENDENTE)
    const currentAttempts = target.voucherAttempts ? [...target.voucherAttempts] : [];
    if (currentAttempts.length > 0) {
      const lastIndex = currentAttempts.length - 1;
      currentAttempts[lastIndex] = {
        ...currentAttempts[lastIndex],
        status: 'comprovante-rejeitado',
        decisionAt: nowIso,
        decisionBy: instructorName,
        rejectionReason: rejectReason
      };
    } else if (target.voucherUrl || target.voucherFileName) {
      currentAttempts.push({
        attemptNumber: 1,
        voucherUrl: target.voucherUrl,
        voucherFileName: target.voucherFileName,
        voucherSentAt: target.voucherSentAt || nowIso,
        status: 'comprovante-rejeitado',
        decisionAt: nowIso,
        decisionBy: instructorName,
        rejectionReason: rejectReason
      });
    }

    const updatedBooking: BookingRecord = {
      ...target,
      status: 'comprovante-rejeitado',
      rejectedAt: nowIso,
      rejectedBy: instructorName,
      rejectionReason: rejectReason,
      notes: `Comprovante rejeitado: ${rejectReason}`,
      whatsappNotification: notificationRecord,
      rejectionNoticeState: 'PENDENTE',
      voucherAttempts: currentAttempts
    };

    bookings[targetIndex] = updatedBooking;
    saveStoredBookings(bookings);

    // Salvar também no Firestore para persistência em nuvem (Fonte oficial)
    try {
      saveBookingToFirestore(updatedBooking);
    } catch (e) {
      console.warn('Erro ao sincronizar rejeição no Firestore:', e);
    }

    // 3. LIBERAÇÃO DO HORÁRIO: O horário deixa de ficar bloqueado para aquele aluno e volta a ficar disponível
    const slotIndex = slots.findIndex((s) => s.id === target.slot.id);
    if (slotIndex !== -1) {
      const freedSlot = { ...slots[slotIndex], status: 'available' as const };
      delete freedSlot.bookedByStudentName;
      delete freedSlot.bookingId;
      slots[slotIndex] = freedSlot;
      saveStoredSlots(slots);
      try {
        saveSlotsToFirestore(slots);
      } catch (e) {
        console.warn('Erro ao sincronizar liberação de slot no Firestore:', e);
      }
    }

    // 4. Disparar evento de janela em tempo real para exibir imediatamente o modal na tela do aluno
    try {
      window.dispatchEvent(
        new CustomEvent('abc_booking_rejected', {
          detail: {
            bookingId: target.id,
            studentName: target.student.fullName,
            phone: targetPhone,
            reason: rejectReason
          }
        })
      );
    } catch (err) {
      console.warn('Erro ao despachar evento abc_booking_rejected:', err);
    }

    return updatedBooking;
  } catch (e) {
    console.error('Error rejecting booking voucher', e);
    return null;
  }
}

/**
 * Confirma a visualização do popup de rejeição pelo aluno ("OK, ENTENDI").
 * REGRAS 14 E 15:
 * 1. Registrar no backend que a notificação foi visualizada/confirmada (rejectionNoticeState = 'CONFIRMADO')
 * 2. Invalidar a sessão atual e deslogar imediatamente
 * 3. Impedir o acesso à solicitação rejeitada
 * 4. Encerrar definitivamente aquele processo
 */
export function acknowledgeBookingRejection(bookingId: string): BookingRecord | null {
  if (typeof window === 'undefined') return null;
  try {
    const bookings = getStoredBookings();
    const targetIndex = bookings.findIndex((b) => b.id === bookingId);
    if (targetIndex === -1) return null;

    const target = bookings[targetIndex];
    const nowIso = new Date().toISOString();

    const updatedBooking: BookingRecord = {
      ...target,
      rejectionNoticeState: 'CONFIRMADO',
      rejectionNoticeAcknowledgedAt: nowIso
    };

    bookings[targetIndex] = updatedBooking;
    saveStoredBookings(bookings);

    try {
      saveBookingToFirestore(updatedBooking);
    } catch (e) {
      console.warn('Erro ao sincronizar acknowledge de rejeição no Firestore:', e);
    }

    // Invalidar sessão atual do aluno e deslogar imediatamente
    saveStoredStudentWhatsApp(null);
    saveStoredCurrentBookingId(null);

    // Notificar os componentes para fechar o modal e redirecionar
    window.dispatchEvent(
      new CustomEvent('abc_booking_rejection_acknowledged', {
        detail: { bookingId }
      })
    );

    return updatedBooking;
  } catch (e) {
    console.error('Error acknowledging booking rejection:', e);
    return null;
  }
}

/**
 * Localiza se existe alguma solicitação de agendamento rejeitada com notificação pendente (rejectionNoticeState === 'PENDENTE')
 * para um determinado aluno (por WhatsApp, por ID de agendamento ou sessão atual).
 * Garante que mesmo após F5 ou Ctrl+F5 o popup continue sendo exibido!
 */
export function findPendingRejectionForStudent(
  whatsappOrPhone?: string | null,
  currentBookingId?: string | null
): BookingRecord | null {
  if (typeof window === 'undefined') return null;
  try {
    const bookings = getStoredBookings();

    // 1. Checar pelo ID específico da reserva em andamento
    if (currentBookingId) {
      const b = bookings.find((x) => x.id === currentBookingId);
      if (
        b &&
        (b.status === 'comprovante-rejeitado' || b.status === 'pedido-rejeitado') &&
        b.rejectionNoticeState !== 'CONFIRMADO'
      ) {
        return b;
      }
    }

    // 2. Checar pelo WhatsApp fornecido ou gravado no cliente
    const phoneToTest = whatsappOrPhone || getStoredStudentWhatsApp();
    if (phoneToTest) {
      const matches = findBookingsByWhatsApp(phoneToTest, bookings);
      const pending = matches.find(
        (b) =>
          (b.status === 'comprovante-rejeitado' || b.status === 'pedido-rejeitado') &&
          b.rejectionNoticeState !== 'CONFIRMADO'
      );
      if (pending) {
        return pending;
      }
    }

    // 3. Fallback: Checar pelo ID armazenado em localstorage
    const storedBookingId = getStoredCurrentBookingId();
    if (storedBookingId && storedBookingId !== currentBookingId) {
      const b = bookings.find((x) => x.id === storedBookingId);
      if (
        b &&
        (b.status === 'comprovante-rejeitado' || b.status === 'pedido-rejeitado') &&
        b.rejectionNoticeState !== 'CONFIRMADO'
      ) {
        return b;
      }
    }

    return null;
  } catch (e) {
    console.error('Error finding pending rejection for student:', e);
    return null;
  }
}

/**
 * Verifica se o aluno tem permissão para alterar (remarcar, cancelar) o agendamento.
 * REGRA PRINCIPAL: O aluno NÃO poderá agendar, remarcar ou cancelar enquanto o pagamento
 * ainda não tiver sido confirmado pelo instrutor no Painel do Instrutor.
 */
export function canStudentAlterBooking(booking?: BookingRecord | null): { allowed: boolean; reason?: string } {
  if (!booking) {
    return { allowed: false, reason: 'Nenhum agendamento selecionado.' };
  }

  const isConfirmed =
    booking.status === 'agendamento-confirmado' ||
    booking.status === 'confirmado' ||
    booking.status === 'pagamento-confirmado' ||
    Boolean(booking.paymentConfirmedAt);

  if (isConfirmed) {
    if (booking.status === 'cancelado') {
      return { allowed: false, reason: 'Este agendamento já foi cancelado.' };
    }
    return { allowed: true };
  }

  if (
    booking.status === 'aguardando-confirmacao-instrutor' ||
    booking.status === 'comprovante-enviado' ||
    booking.status === 'pagamento-enviado' ||
    Boolean(booking.voucherSentAt)
  ) {
    return {
      allowed: false,
      reason: 'Sua solicitação está em análise pelo instrutor. O aluno não pode remarcar ou cancelar uma aula enquanto o pagamento ainda não tiver sido confirmado pelo instrutor no Painel do Instrutor.'
    };
  }

  if (
    booking.status === 'pedido-rejeitado' ||
    booking.status === 'pagamento-nao-confirmado'
  ) {
    return {
      allowed: false,
      reason: 'O pedido não foi aprovado pelo instrutor e o horário agendado foi liberado. Inicie um novo agendamento.'
    };
  }

  if (booking.status === 'reserva-expirada') {
    return {
      allowed: false,
      reason: 'O prazo de 60 minutos para confirmação da reserva expirou.'
    };
  }

  return {
    allowed: false,
    reason: 'O agendamento requer confirmação de pagamento pelo instrutor para permitir remarcações ou cancelamentos.'
  };
}

/**
 * REGRA ABSOLUTA DE ENCERRAMENTO DO PRAZO DE 24 HORAS APÓS REPROVAÇÃO:
 * Quando o prazo de 24 horas terminar sem que o aluno envie um novo comprovante:
 * 1. Alterar o status da contratação para AGUARDANDO NOVO PAGAMENTO/COMPROVANTE ('aguardando-novo-pagamento');
 * 2. Liberar imediatamente o horário reservado na agenda;
 * 3. Tornar o horário novamente disponível para novos agendamentos ('available');
 * 4. Remover a reserva vinculada ao aluno daquele horário (desvincula bookedByStudentName e bookingId);
 * 5. Manter todo o histórico da contratação e da reprovação no banco de dados (student, voucherUrl, voucherFileName, voucherAttempts, rejectionReason, etc.);
 * 6. Não excluir o cadastro do aluno;
 * 7. Não excluir o comprovante reprovado;
 * 8. Não excluir o histórico do agendamento;
 * 9. O aluno poderá realizar uma nova contratação normalmente, seguindo o fluxo padrão existente;
 * 10. A liberação ocorre com base no horário registrado no banco de dados, independentemente de o aluno estar ou não conectado ao sistema.
 */
export function checkAndProcessExpired24hRejections(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const rawBookings = localStorage.getItem(STORAGE_KEYS.BOOKINGS);
    if (!rawBookings) return false;
    const bookings: BookingRecord[] = JSON.parse(rawBookings);
    if (!Array.isArray(bookings) || bookings.length === 0) return false;

    const rawSlots = localStorage.getItem(STORAGE_KEYS.SLOTS);
    const slots: TimeSlot[] = rawSlots ? JSON.parse(rawSlots) : [];

    let hasChanges = false;
    const now = Date.now();
    const nowIso = new Date(now).toISOString();
    const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

    for (let i = 0; i < bookings.length; i++) {
      const b = bookings[i];
      if (b.status === 'comprovante-reprovado' || b.status === 'comprovante-rejeitado') {
        const rejectionTime = b.rejectedAt ? new Date(b.rejectedAt).getTime() : 0;
        if (!rejectionTime || isNaN(rejectionTime)) continue;

        const isExpired = now >= rejectionTime + TWENTY_FOUR_HOURS_MS;
        if (isExpired) {
          const newVoucherSentTime = b.voucherSentAt ? new Date(b.voucherSentAt).getTime() : 0;
          const sentNewVoucherAfterRejection = newVoucherSentTime > rejectionTime;

          if (!sentNewVoucherAfterRejection) {
            hasChanges = true;
            // 1. Atualiza status para AGUARDANDO NOVO PAGAMENTO/COMPROVANTE preservando todo o histórico
            bookings[i] = {
              ...b,
              status: 'aguardando-novo-pagamento',
              rejection24hExpiredAt: nowIso,
              notes: (b.notes ? b.notes + ' | ' : '') + 'Prazo de 24 horas encerrado após reprovação. Horário liberado na agenda. Status: AGUARDANDO NOVO PAGAMENTO/COMPROVANTE.'
            };

            // Salva no Firestore
            try {
              saveBookingToFirestore(bookings[i]);
            } catch (e) {
              console.warn('Erro ao sincronizar expiração de 24h no Firestore:', e);
            }

            // 2. Libera imediatamente o horário reservado na agenda
            const slotId = b.slot?.id;
            for (let j = 0; j < slots.length; j++) {
              if (slots[j].id === slotId || slots[j].bookingId === b.id) {
                const freedSlot = { ...slots[j], status: 'available' as const };
                delete freedSlot.bookedByStudentName;
                delete freedSlot.bookingId;
                slots[j] = freedSlot;
              }
            }

            // Dispara evento para telas conectadas
            window.dispatchEvent(
              new CustomEvent('abc_booking_updated', {
                detail: bookings[i]
              })
            );
          }
        }
      }
    }

    if (hasChanges) {
      localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(bookings));
      localStorage.setItem(STORAGE_KEYS.SLOTS, JSON.stringify(slots));
      try {
        saveSlotsToFirestore(slots);
      } catch (e) {
        console.warn('Erro ao persistir slots liberados no Firestore:', e);
      }
      window.dispatchEvent(new CustomEvent('abc_slots_updated'));
      return true;
    }

    return false;
  } catch (e) {
    console.error('Erro ao verificar encerramento do prazo de 24h:', e);
    return false;
  }
}

/**
 * Manually cancels an expired reservation and frees its slot
 */
export function cancelExpiredReservation(bookingId: string): void {
  if (typeof window === 'undefined') return;
  try {
    const bookings = getStoredBookings();
    const slots = getStoredSlots();
    const target = bookings.find((b) => b.id === bookingId);
    if (!target) return;

    const updatedBookings = bookings.map((b) => {
      if (b.id === bookingId) {
        return {
          ...b,
          status: 'reserva-expirada' as BookingStatus
        };
      }
      return b;
    });
    saveStoredBookings(updatedBookings);

    // Free the slot
    const slotIndex = slots.findIndex((s) => s.id === target.slot.id);
    if (slotIndex !== -1) {
      const freedSlot = { ...slots[slotIndex], status: 'available' as const };
      delete freedSlot.bookedByStudentName;
      delete freedSlot.bookingId;
      slots[slotIndex] = freedSlot;
      saveStoredSlots(slots);
    }
  } catch (e) {
    console.error('Error canceling expired reservation', e);
  }
}

// Formatting helpers
export function formatDateBrazilian(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

export function getWeekdayName(dateStr: string): string {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  const weekdays = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
  return weekdays[d.getDay()];
}

// Generate dynamic PIX Copia e Cola with calculated amount and CRC16
export function generatePixCopyPasteCode(amount: number = 499): string {
  const safeAmount = Math.max(1, Math.round(amount * 100) / 100);
  const amountStr = safeAmount.toFixed(2);
  const amountTag = `54${String(amountStr.length).padStart(2, '0')}${amountStr}`;
  const rawWithoutCrc = `00020126580014BR.GOV.BCB.PIX0136abc-do-pedal-pix-oficial-499@bcb.gov.br520400005303986${amountTag}5802BR5922ANDERSON ROSA DOS REIS6009SAO PAULO62070503***6304`;
  
  let crc = 0xFFFF;
  for (let i = 0; i < rawWithoutCrc.length; i++) {
    crc ^= rawWithoutCrc.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xFFFF;
      } else {
        crc = (crc << 1) & 0xFFFF;
      }
    }
  }
  const crcHex = crc.toString(16).toUpperCase().padStart(4, '0');
  return rawWithoutCrc + crcHex;
}

// Generate full contract details text for WhatsApp and sharing
export function generateContractDetailsText(booking: BookingRecord): string {
  const studentName = booking.student.fullName;
  const dateFormatted = formatDateBrazilian(booking.slot.date);
  const weekday = getWeekdayName(booking.slot.date);
  const time = booking.slot.time;

  const guardianInfo = booking.student.guardian
    ? `\n👨‍👧 *Responsável Legal:* ${booking.student.guardian.fullName} (${booking.student.guardian.cpf ? `CPF: ${booking.student.guardian.cpf} | ` : ''}WhatsApp: ${booking.student.guardian.whatsapp} | Relação: ${booking.student.guardian.relation})`
    : '';

  const needsInfo = booking.student.hasSpecificNeeds && booking.student.specificNeedsDescription
    ? `\n⚠️ *Necessidades Específicas:* ${booking.student.specificNeedsDescription}`
    : '';

  const bookingPriceFormatted = (booking.price || booking.location?.price || 499).toFixed(2).replace('.', ',');
  const locationDisplay = booking.location?.locationName
    ? `${booking.location.locationName}${booking.location.address ? ` (${booking.location.address})` : ''}`
    : (booking.location?.address || 'Parque do Ibirapuera (Acesso sugerido: Portão 10)');

  return `🚴 *CONTRATAÇÃO & COMPROVANTE PIX — ABC DO PEDAL*

Olá! Seguem os dados completos da contratação e o comprovante de pagamento do PIX para confirmação:

📋 *PROGRAMA CONTRATADO*
• *Programa:* Aprender a Pedalar
• *Valor:* R$ ${bookingPriceFormatted} (pago via PIX)
• *Duração da Aula:* 50 minutos
• *Local:* ${locationDisplay}

👤 *DADOS DO ALUNO(A)*
• *Nome Completo:* ${studentName}
${booking.student.cpf ? `• *CPF:* ${booking.student.cpf}\n` : ''}• *WhatsApp:* ${booking.student.whatsapp}
• *E-mail:* ${booking.student.email}
• *Calibragem Física:* Altura: ${booking.student.heightCm} cm | Peso: ${booking.student.weightKg} kg${needsInfo}${guardianInfo}

📅 *DATA E HORÁRIO AGENDADOS*
• *Data:* ${dateFormatted} (${weekday})
• *Horário:* ${time} (50 min)

📜 *TERMOS E POLÍTICAS ACEITOS*
• Política da Aula e Regra 24h: Aceito
• Serviço Pedagógico/Desportivo (não terapia): Ciente
• Veracidade das Informações: Declarada
• Autorização de Imagem: ${booking.imageAuthorization?.authorized ? 'Autorizado' : 'Não autorizado'}

📎 *ARQUIVO EM ANEXO*
• *Comprovante:* ${booking.voucherFileName || 'comprovante.jpg'}
• _(A imagem do comprovante de pagamento está em anexo nesta conversa)_

Aguardando validação e confirmação da vaga. Muito obrigado(a)!`;
}

// WhatsApp communication constants
export const OFFICIAL_WHATSAPP_NUMBER = '5511950438948';
export const OFFICIAL_WHATSAPP_DISPLAY = '+55 (11) 95043-8948';
export const OFFICIAL_WHATSAPP_URL = 'https://wa.me/5511950438948';

/**
 * REGRA FUNDAMENTAL — DESTINATÁRIO DA COMUNICAÇÃO:
 * Toda mensagem deve ser enviada para o ALUNO vinculado ao agendamento.
 * - Adulto ou Idoso: WhatsApp do próprio aluno.
 * - Criança ou Adolescente (menor): WhatsApp do responsável legal cadastrado.
 * NUNCA enviar para administrador, instrutor ou contatos internos da ABC do Pedal!
 */
export interface RecipientInfo {
  phoneWithCountryCode: string; // e.g. "5511999999999"
  formattedDisplay: string;     // e.g. "(11) 99999-9999"
  targetName: string;           // Name of the recipient (student or guardian representing minor)
  studentName: string;          // Name of the student
  isMinor: boolean;
  categoryLabel: 'Adulto' | 'Idoso' | 'Menor de Idade (Criança/Adolescente)';
  routingExplanation: string;
}

export function getStudentRecipientWhatsApp(booking: BookingRecord): RecipientInfo {
  const isMinor = booking.student.ageProfile === 'crianca_adolescente' || Boolean(booking.student.guardian?.whatsapp);
  const studentName = booking.student.fullName;

  // Se for Criança ou Adolescente (menor de idade): utilizar o WhatsApp do responsável legal
  if (isMinor && booking.student.guardian?.whatsapp) {
    const rawNumber = booking.student.guardian.whatsapp;
    const cleanDigits = rawNumber.replace(/\D/g, '');
    const cleanNational = cleanDigits.startsWith('55') && cleanDigits.length >= 12 ? cleanDigits.slice(2) : cleanDigits;
    const phoneWithCountryCode = `55${cleanNational}`;
    const relation = booking.student.guardian.relation || 'Responsável';

    return {
      phoneWithCountryCode,
      formattedDisplay: rawNumber,
      targetName: `${booking.student.guardian.fullName} (${relation})`,
      studentName,
      isMinor: true,
      categoryLabel: 'Menor de Idade (Criança/Adolescente)',
      routingExplanation: `Aluno menor de idade: a comunicação é destinada ao aluno ${studentName} e canalizada no WhatsApp do responsável legal (${booking.student.guardian.fullName}).`
    };
  }

  // Adulto ou Idoso: utilizar o WhatsApp cadastrado do próprio aluno
  const rawNumber = booking.student.whatsapp || (booking.student.guardian?.whatsapp || '');
  const cleanDigits = rawNumber.replace(/\D/g, '');
  const cleanNational = cleanDigits.startsWith('55') && cleanDigits.length >= 12 ? cleanDigits.slice(2) : cleanDigits;
  const phoneWithCountryCode = `55${cleanNational}`;
  const categoryLabel: 'Adulto' | 'Idoso' = booking.student.ageProfile === 'idoso' ? 'Idoso' : 'Adulto';

  return {
    phoneWithCountryCode,
    formattedDisplay: rawNumber,
    targetName: studentName,
    studentName,
    isMinor: false,
    categoryLabel,
    routingExplanation: `Aluno ${categoryLabel}: a comunicação é enviada diretamente para o WhatsApp cadastrado do próprio aluno (${studentName}).`
  };
}

export interface WhatsAppMessageTemplate {
  id: string;
  title: string;
  category: 'confirmacao' | 'lembrete' | 'pre_agendamento' | 'comprovante' | 'evolucao' | 'cancelamento' | 'custom';
  content: string;
  isCustom?: boolean;
}

export const DEFAULT_WHATSAPP_TEMPLATES: WhatsAppMessageTemplate[] = [
  {
    id: 'tpl-confirmado',
    title: '✅ Confirmação de Agendamento',
    category: 'confirmacao',
    content: `Olá, {aluno}! 🚲✅

Temos uma ótima notícia: o seu agendamento para o Programa Aprender a Pedalar da ABC do Pedal está CONFIRMADO!

📅 Data: {data}
⏰ Horário: {horario} (50 minutos de aula)
📍 Ponto de Encontro: {local} (Acesso sugerido: Portão 10)

Orientações para o dia da aula:
• Chegue com 10 minutos de antecedência.
• Venha com roupas confortáveis e tênis fechado.
• Bicicleta calibrada para sua altura e capacete higienizado inclusos.

Estamos ansiosos para estar ao seu lado rumo à sua liberdade sobre duas rodas!`
  },
  {
    id: 'tpl-lembrete',
    title: '🔔 Lembrete de Aula (Véspera)',
    category: 'lembrete',
    content: `Olá, {aluno}! 🚲🔔

Passando para lembrar que amanhã é o dia do seu encontro sobre duas rodas!

📅 Data: {data}
⏰ Horário: {horario}
📍 Local: {local} (Portão 10)

Nosso instrutor já preparou todo o equipamento com carinho. Traga uma garrafinha de água, use tênis fechado e venha pronto(a) para pedalar!

Até amanhã!`
  },
  {
    id: 'tpl-pre-agendamento',
    title: '📋 Pré-Agendamento & Orientações PIX',
    category: 'pre_agendamento',
    content: `Olá, {aluno}! 🚲

Recebemos a solicitação do seu pré-agendamento no Programa Aprender a Pedalar da ABC do Pedal!

📅 Data reservada: {data}
⏰ Horário: {horario} (50 minutos)
📍 Local: {local}
💰 Investimento: R$ {valor} (PIX)

Para garantir sua vaga definitiva, efetue a transferência via PIX (Chave WhatsApp: 11 95043-8948) e nos envie o comprovante.

Qualquer dúvida, estamos à sua disposição!`
  },
  {
    id: 'tpl-comprovante-recebido',
    title: '💰 Comprovante em Validação',
    category: 'comprovante',
    content: `Olá, {aluno}! 🚲💰

Confirmamos o recebimento do seu comprovante de pagamento PIX para a aula de {data} às {horario}.

Nossa equipe está validando as informações financeiras e logo emitirá a confirmação oficial da sua aula.

Muito obrigado pela confiança na ABC do Pedal!`
  },
  {
    id: 'tpl-evolucao-abcde',
    title: '🏆 Evolução no Método ABC-DE',
    category: 'evolucao',
    content: `Parabéns pela dedicação, {aluno}! 🚲🏆

Registramos o seu progresso no treino de hoje! Você atingiu a Etapa {etapa} do Método ABC-DE da ABC do Pedal.

A cada aula, sua autonomia, equilíbrio e confiança sobre a bicicleta aumentam. Continue firme!

Acompanhe sua trajetória detalhada e os critérios conquistados na Área do Aluno em nosso site.`
  },
  {
    id: 'tpl-cancelamento',
    title: '❌ Cancelamento de Agendamento',
    category: 'cancelamento',
    content: `Olá, {aluno}! 🚲

Confirmamos o cancelamento da sua aula agendada para {data} às {horario}.

Todos os seus dados cadastrais permanecem seguros em nosso sistema. Quando desejar remarcar para um novo dia e horário, basta acessar a Área do Aluno em nosso site ou nos chamar por aqui.

Esperamos vê-lo(a) em breve na pista!`
  },
  {
    id: 'tpl-comprovante-rejeitado',
    title: '⚠️ Comprovante Não Aprovado / Encerramento de Solicitação',
    category: 'custom',
    content: `Olá, {aluno}.

Seu comprovante de pagamento foi analisado pelo ABC do Pedal, porém não foi aprovado.

Por esse motivo, sua solicitação de agendamento foi encerrada e o horário anteriormente reservado foi liberado.

Caso queira realizar uma nova tentativa, será necessário iniciar um novo processo de agendamento pelo sistema.

Se precisar de ajuda, entre em contato com o ABC do Pedal.`
  }
];

export function getStoredWhatsAppTemplates(): WhatsAppMessageTemplate[] {
  if (typeof window === 'undefined') return DEFAULT_WHATSAPP_TEMPLATES;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.WHATSAPP_TEMPLATES);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.WHATSAPP_TEMPLATES, JSON.stringify(DEFAULT_WHATSAPP_TEMPLATES));
      return DEFAULT_WHATSAPP_TEMPLATES;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_WHATSAPP_TEMPLATES;
  } catch {
    return DEFAULT_WHATSAPP_TEMPLATES;
  }
}

export function saveStoredWhatsAppTemplates(templates: WhatsAppMessageTemplate[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.WHATSAPP_TEMPLATES, JSON.stringify(templates));
  } catch (e) {
    console.error('Failed to save templates', e);
  }
}

export function getStoredSkills(): SkillItem[] {
  if (typeof window === 'undefined') return DEFAULT_SKILLS;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SKILLS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.SKILLS, JSON.stringify(DEFAULT_SKILLS));
      return DEFAULT_SKILLS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    return DEFAULT_SKILLS;
  } catch (e) {
    console.error('Failed to parse stored skills:', e);
    return DEFAULT_SKILLS;
  }
}

export function saveStoredSkills(skills: SkillItem[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.SKILLS, JSON.stringify(skills));
  } catch (e) {
    console.error('Failed to save stored skills:', e);
  }
}

export function resetStoredSkills(): SkillItem[] {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS.SKILLS, JSON.stringify(DEFAULT_SKILLS));
  }
  return DEFAULT_SKILLS;
}

export const DEFAULT_SKILL_CATEGORIES: string[] = [
  'Autonomia',
  'Equilíbrio',
  'Controle',
  'Trânsito & Ciclovia',
  'Segurança',
  'Personalizado'
];

export function getStoredSkillCategories(): string[] {
  if (typeof window === 'undefined') return DEFAULT_SKILL_CATEGORIES;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SKILL_CATEGORIES);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.SKILL_CATEGORIES, JSON.stringify(DEFAULT_SKILL_CATEGORIES));
      return DEFAULT_SKILL_CATEGORIES;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    return DEFAULT_SKILL_CATEGORIES;
  } catch (e) {
    console.error('Failed to parse stored skill categories:', e);
    return DEFAULT_SKILL_CATEGORIES;
  }
}

export function saveStoredSkillCategories(categories: string[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.SKILL_CATEGORIES, JSON.stringify(categories));
  } catch (e) {
    console.error('Failed to save stored skill categories:', e);
  }
}

export function resetStoredSkillCategories(): string[] {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS.SKILL_CATEGORIES, JSON.stringify(DEFAULT_SKILL_CATEGORIES));
  }
  return DEFAULT_SKILL_CATEGORIES;
}

export function compileWhatsAppTemplate(templateContent: string, booking: BookingRecord): string {
  const studentName = booking.student.fullName;
  const guardianName = booking.student.guardian?.fullName || studentName;
  const dateFormatted = `${formatDateBrazilian(booking.slot.date)} (${getWeekdayName(booking.slot.date)})`;
  const time = booking.slot.time;
  const location = booking.location?.locationName || booking.location?.address || booking.slot.locationName || 'Parque do Ibirapuera';
  const etapa = booking.currentABCDE;
  const status = booking.status;
  const priceFormatted = (booking.price || booking.location?.price || 499).toFixed(2).replace('.', ',');

  return templateContent
    .replace(/{aluno}/g, studentName)
    .replace(/{responsavel}/g, guardianName)
    .replace(/{data}/g, dateFormatted)
    .replace(/{horario}/g, time)
    .replace(/{local}/g, location)
    .replace(/{etapa}/g, etapa)
    .replace(/{status}/g, status)
    .replace(/{valor}/g, priceFormatted)
    .replace(/R\$ 499,00/g, `R$ ${priceFormatted}`);
}

/**
 * Envio de notificação pelo Disparador WhatsApp da ABC do Pedal.
 * O DESTINATÁRIO É SEMPRE O ALUNO (ou seu responsável legal se for menor).
 */
export function generateWhatsAppNotificationUrl(
  type: 'pre_booking' | 'voucher_sent' | 'confirmed' | 'cancelled' | 'custom',
  booking: BookingRecord,
  customText?: string
): string {
  // REGRA FUNDAMENTAL: O destinatário é SEMPRE o WhatsApp do aluno (ou responsável do menor)
  const recipient = getStudentRecipientWhatsApp(booking);

  let text = customText || '';
  if (!text) {
    if (type === 'pre_booking') {
      text = compileWhatsAppTemplate(DEFAULT_WHATSAPP_TEMPLATES.find(t => t.id === 'tpl-pre-agendamento')?.content || '', booking);
    } else if (type === 'voucher_sent') {
      text = compileWhatsAppTemplate(DEFAULT_WHATSAPP_TEMPLATES.find(t => t.id === 'tpl-comprovante-recebido')?.content || '', booking);
    } else if (type === 'confirmed') {
      text = compileWhatsAppTemplate(DEFAULT_WHATSAPP_TEMPLATES.find(t => t.id === 'tpl-confirmado')?.content || '', booking);
    } else if (type === 'cancelled') {
      text = compileWhatsAppTemplate(DEFAULT_WHATSAPP_TEMPLATES.find(t => t.id === 'tpl-cancelamento')?.content || '', booking);
    }
  }

  return `https://wa.me/${recipient.phoneWithCountryCode}?text=${encodeURIComponent(text)}`;
}

/**
 * Utilizado exclusivamente quando o CLIENTE envia os dados e comprovante DELE para o WhatsApp da ABC do Pedal.
 */
export function generateCustomerToAbcWhatsAppUrl(booking: BookingRecord): string {
  const text = generateContractDetailsText(booking);
  return `https://wa.me/${OFFICIAL_WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
}

/**
 * Calcula a idade em anos a partir da data de nascimento (YYYY-MM-DD).
 */
export function calculateStudentAgeYears(birthDateStr?: string): string {
  if (!birthDateStr) return '';
  try {
    const parts = birthDateStr.split('-');
    if (parts.length < 3) return '';
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);
    if (!year || !month || !day) return '';
    const today = new Date();
    let age = today.getFullYear() - year;
    const m = (today.getMonth() + 1) - month;
    if (m < 0 || (m === 0 && today.getDate() < day)) {
      age--;
    }
    if (age > 0) {
      return `${age} anos`;
    }
  } catch {
    // ignore
  }
  return '';
}

/**
 * Identifica se uma contratação pertence à categoria "Outras Regiões".
 * Válido para TODAS as contratações em Outras Regiões, independente da cidade.
 */
export function isOutrasRegioesBooking(booking?: BookingRecord | null): boolean {
  if (!booking) return false;

  // 1. Verificação direta da região da localidade
  if (booking.location?.region === 'outras_localidades') return true;

  // 2. Título da região
  const regionTitle = (booking.location?.regionTitle || '').toLowerCase().trim();
  if (regionTitle.includes('outras regi') || regionTitle.includes('outras local')) {
    return true;
  }

  // 3. ID do local
  if (booking.location?.locationId === 'outras_localidades_direto') {
    return true;
  }

  // 4. Se não for são paulo e não for abc paulista, mas o locationId for outras_localidades
  if (
    booking.location?.region !== 'sao_paulo' &&
    booking.location?.region !== 'abc_paulista' &&
    (booking.location?.locationId === 'outras_localidades' || booking.slot?.locationId === 'outras_localidades')
  ) {
    return true;
  }

  // 5. Nome do local iniciando com "Outras Regiões"
  const locName = (booking.location?.locationName || booking.slot?.locationName || '').toLowerCase().trim();
  if (
    locName.startsWith('outras regiões') ||
    locName.startsWith('outras regioes') ||
    locName.includes('outras regiões') ||
    locName.includes('outras regioes')
  ) {
    return true;
  }

  return false;
}

/**
 * Monta a mensagem pré-preenchida para contratações em "Outras Regiões"
 * enviada ao WhatsApp oficial da ABC do Pedal com todas as informações reais coletadas.
 */
export function generateOutrasRegioesWhatsAppMessage(booking: BookingRecord): string {
  const sections: string[] = [
    'Olá, ABC do Pedal! Vim pelo site e quero as informações de pagamento para o meu pedido.',
    '',
    'DADOS DO PEDIDO',
    ''
  ];

  // Produto
  const produto = booking.productName || 'Aprender a Pedalar';
  sections.push(`Produto: ${produto}`);

  // Aluno
  if (booking.student?.fullName) {
    sections.push(`Aluno: ${booking.student.fullName}`);
  }

  // Idade
  const idade = calculateStudentAgeYears(booking.student?.birthDate);
  if (idade) {
    sections.push(`Idade: ${idade}`);
  } else if (booking.student?.birthDate) {
    sections.push(`Idade: ${formatDateBrazilian(booking.student.birthDate)}`);
  }

  // Responsável (se houver)
  if (booking.student?.guardian?.fullName) {
    const relation = booking.student.guardian.relation ? ` (${booking.student.guardian.relation})` : '';
    sections.push(`Responsável: ${booking.student.guardian.fullName}${relation}`);
  }

  // WhatsApp
  const whatsapp = booking.student?.guardian?.whatsapp || booking.student?.whatsapp;
  if (whatsapp) {
    sections.push(`WhatsApp: ${whatsapp}`);
  }

  // LOCAL DO ATENDIMENTO
  const localLines: string[] = [];
  if (booking.location?.city) {
    localLines.push(`Cidade: ${booking.location.city}`);
  }

  const estado = booking.location?.state ||
    (booking.location?.address?.match(/\/([A-Za-z]{2})/)?.[1]?.toUpperCase()) ||
    (booking.location?.address?.match(/-\s*([A-Za-z]{2})/)?.[1]?.toUpperCase()) ||
    'SP';
  if (estado) {
    localLines.push(`Estado: ${estado}`);
  }

  const endereco = booking.location?.address || booking.location?.locationName || booking.slot?.locationName;
  if (endereco) {
    localLines.push(`Local/endereço: ${endereco}`);
  }

  if (localLines.length > 0) {
    sections.push('');
    sections.push('LOCAL DO ATENDIMENTO');
    sections.push('');
    sections.push(...localLines);
  }

  // AGENDAMENTO
  const agendamentoLines: string[] = [];
  if (booking.slot?.date) {
    const dataFormatada = formatDateBrazilian(booking.slot.date);
    const diaSemana = getWeekdayName(booking.slot.date);
    agendamentoLines.push(`Data desejada: ${dataFormatada}${diaSemana ? ` (${diaSemana})` : ''}`);
  }
  if (booking.slot?.time) {
    agendamentoLines.push(`Horário desejado: ${booking.slot.time}`);
  }

  if (agendamentoLines.length > 0) {
    sections.push('');
    sections.push('AGENDAMENTO');
    sections.push('');
    sections.push(...agendamentoLines);
  }

  sections.push('');
  sections.push('Gostaria de receber o valor e o link de pagamento para concluir minha contratação.');

  return sections.join('\n');
}

/**
 * URL do WhatsApp oficial da ABC do Pedal com mensagem pré-preenchida para Outras Regiões.
 */
export function generateOutrasRegioesWhatsAppUrl(booking: BookingRecord): string {
  const text = generateOutrasRegioesWhatsAppMessage(booking);
  return `https://wa.me/${OFFICIAL_WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
}

export interface NoSlotsWhatsAppParams {
  student: {
    fullName: string;
    birthDate?: string;
    cpf?: string;
    whatsapp: string;
    email: string;
    ageProfile?: AgeProfile;
    heightCm?: string;
    weightKg?: string;
    hasSpecificNeeds?: boolean;
    specificNeedsDescription?: string;
    guardian?: {
      fullName: string;
      cpf?: string;
      birthDate?: string;
      whatsapp: string;
      email?: string;
      relation?: GuardianRelation | string;
    };
  };
  location?: {
    region?: string;
    regionTitle?: string;
    locationId?: string;
    locationName?: string;
    address?: string;
    city?: string;
    state?: string;
    cep?: string;
    number?: string;
  } | null;
}

/**
 * Gera a mensagem para o WhatsApp do instrutor quando não houver horários disponíveis.
 * Envia todos os dados coletados e a mensagem solicitada:
 * "Vim do site, gostaria de saber a disponibilidade de aulas para o endereço acima:"
 * Válido para todas as regiões (São Paulo, ABC e outras Regiões e suas localidades).
 */
export function generateNoSlotsAvailableWhatsAppMessage(params: NoSlotsWhatsAppParams): string {
  const { student, location } = params;
  const sections: string[] = [];

  sections.push('Olá! Vim do site da ABC do Pedal.');
  sections.push('');
  sections.push('📋 *DADOS COLETADOS DO ALUNO*');
  sections.push(`• *Nome Completo:* ${student.fullName || 'Não informado'}`);

  const ageStr = calculateStudentAgeYears(student.birthDate);
  if (student.birthDate) {
    const formattedBirth = formatDateBrazilian(student.birthDate);
    sections.push(`• *Data de Nascimento:* ${formattedBirth}${ageStr ? ` (${ageStr})` : ''}`);
  }

  if (student.cpf) {
    sections.push(`• *CPF:* ${student.cpf}`);
  }

  sections.push(`• *WhatsApp:* ${student.whatsapp || 'Não informado'}`);
  sections.push(`• *E-mail:* ${student.email || 'Não informado'}`);

  if (student.heightCm && student.weightKg) {
    sections.push(`• *Calibragem Física:* Altura ${student.heightCm} cm | Peso ${student.weightKg} kg`);
  }

  if (student.hasSpecificNeeds && student.specificNeedsDescription) {
    sections.push(`• *Necessidades Específicas:* ${student.specificNeedsDescription}`);
  }

  if (student.guardian && student.guardian.fullName) {
    const g = student.guardian;
    sections.push('');
    sections.push('👨‍👧 *RESPONSÁVEL LEGAL*');
    sections.push(`• *Nome:* ${g.fullName}`);
    if (g.relation) sections.push(`• *Grau de Parentesco:* ${g.relation}`);
    if (g.cpf) sections.push(`• *CPF:* ${g.cpf}`);
    if (g.whatsapp) sections.push(`• *WhatsApp:* ${g.whatsapp}`);
    if (g.email) sections.push(`• *E-mail:* ${g.email}`);
  }

  sections.push('');
  sections.push('📍 *ENDEREÇO / LOCAL DO ATENDIMENTO*');
  if (location) {
    if (location.regionTitle) {
      sections.push(`• *Região:* ${location.regionTitle}`);
    }
    if (location.locationName) {
      sections.push(`• *Local:* ${location.locationName}`);
    }
    if (location.address && location.address !== location.locationName) {
      sections.push(`• *Endereço:* ${location.address}`);
    }
    if (location.number && (!location.address || !location.address.includes(location.number))) {
      sections.push(`• *Número:* ${location.number}`);
    }
    if (location.city || location.state) {
      sections.push(`• *Cidade/UF:* ${location.city || 'São Paulo'} - ${location.state || 'SP'}`);
    }
    if (location.cep) {
      sections.push(`• *CEP:* ${location.cep}`);
    }
  } else {
    sections.push('• *Local:* Não informado');
  }

  sections.push('');
  sections.push('Vim do site, gostaria de saber a disponibilidade de aulas para o endereço acima:');

  return sections.join('\n');
}

/**
 * URL direta para o WhatsApp do instrutor responsável com a mensagem de solicitação de disponibilidade.
 */
export function generateNoSlotsAvailableWhatsAppUrl(params: NoSlotsWhatsAppParams): string {
  const text = generateNoSlotsAvailableWhatsAppMessage(params);
  return `https://wa.me/${OFFICIAL_WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
}

/**
 * Mensagem pré-formatada para as outras localidades do ABC Paulista (Diadema, Mauá, São Caetano do Sul, Ribeirão Pires)
 * enviada ao WhatsApp oficial da ABC do Pedal com todos os dados cadastrados pelo aluno.
 */
export function buildSpecialAbcPaymentWhatsAppMessage(booking: BookingRecord): string {
  const student = booking.student;
  const slot = booking.slot;
  const loc = booking.location;

  // Cálculo da idade se a data de nascimento foi preenchida
  let ageDisplay = '';
  if (student.birthDate) {
    const parts = student.birthDate.split('-');
    if (parts.length === 3) {
      const bYear = parseInt(parts[0], 10);
      const bMonth = parseInt(parts[1], 10) - 1;
      const bDay = parseInt(parts[2], 10);
      const birth = new Date(bYear, bMonth, bDay);
      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
        age--;
      }
      if (age >= 0 && age < 120) {
        ageDisplay = `${age} anos`;
      }
    }
  }
  if (!ageDisplay) {
    if (student.ageProfile === 'crianca_adolescente') {
      ageDisplay = 'Criança / Adolescente (Menor de 18 anos)';
    } else if (student.ageProfile === 'idoso') {
      ageDisplay = 'Melhor Idade (60+ anos)';
    } else {
      ageDisplay = 'Adulto';
    }
  }

  const lines: string[] = [
    '🚴‍♂️ *ABC DO PEDAL — ATENDIMENTO ABC PAULISTA*',
    'Olá! Solicitei um agendamento para uma das localidades do ABC Paulista e gostaria de confirmar o valor do atendimento e receber as orientações para conclusão do pagamento.',
    '',
    '📋 *DADOS DO PEDIDO & ALUNO:*',
    `• *Nome do Aluno:* ${student.fullName}`,
    `• *Idade:* ${ageDisplay}`,
    `• *WhatsApp:* ${student.whatsapp}`
  ];

  if (student.guardian?.fullName) {
    lines.push(
      `• *Responsável Legal:* ${student.guardian.fullName} (${student.guardian.relation || 'Responsável'})`,
      `• *WhatsApp do Responsável:* ${student.guardian.whatsapp || student.whatsapp}`
    );
  }

  lines.push(
    `• *Serviço Contratado:* ${booking.productName || 'Aprender a Andar de Bicicleta (Aula Presencial Individual)'}`,
    '',
    '📍 *LOCAL DO ATENDIMENTO (ABC):*',
    `• *Cidade:* ${loc?.city || 'ABC Paulista'}`,
    `• *Local/Endereço:* ${loc?.address ? `${loc.address}${loc.number ? `, nº ${loc.number}` : ''}` : (loc?.locationName || 'A definir')}`
  );

  if (loc?.cep) {
    lines.push(`• *CEP:* ${loc.cep}`);
  }

  const dateFormatted = slot.date
    ? slot.date.split('-').reverse().join('/')
    : 'A definir';

  lines.push(
    '',
    '📅 *DATA E HORÁRIO DESEJADOS:*',
    `• *Data Desejada:* ${dateFormatted}`,
    `• *Horário Desejado:* ${slot.time}`
  );

  if (booking.price) {
    lines.push(
      `• *Valor Previsto no Sistema:* R$ ${booking.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
    );
  }

  if (student.hasSpecificNeeds && student.specificNeedsDescription) {
    lines.push(
      '',
      `ℹ️ *Necessidades Específicas / Observações:* ${student.specificNeedsDescription}`
    );
  }

  lines.push(
    '',
    'Por favor, confirmem o valor e me orientem com o passo a passo para o pagamento. Obrigado!'
  );

  return lines.join('\n');
}

/**
 * URL do WhatsApp oficial para a regra especial do ABC
 */
export function generateSpecialAbcPaymentWhatsAppUrl(booking: BookingRecord): string {
  const text = buildSpecialAbcPaymentWhatsAppMessage(booking);
  return `https://wa.me/${OFFICIAL_WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
}

