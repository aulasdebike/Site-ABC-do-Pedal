'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Calendar,
  Clock,
  CheckCircle,
  CheckCircle2,
  Loader2,
  XCircle,
  Lock,
  Unlock,
  Key,
  Eye,
  EyeOff,
  Plus,
  Edit2,
  FileText,
  User,
  Phone,
  Mail,
  Shield,
  MessageCircle,
  ExternalLink,
  Award,
  AlertTriangle,
  Filter,
  Search,
  Check,
  ChevronRight,
  Copy,
  Trash2,
  Send,
  Sparkles,
  RotateCcw,
  Info,
  ArrowRight,
  Users,
  CheckCheck,
  Tag,
  Settings2,
  X,
  MapPin,
  DollarSign,
  Maximize2,
  RefreshCw,
  Bell,
  Radio,
  LayoutDashboard,
  CreditCard,
  TrendingUp,
  Package,
  FileCheck
} from 'lucide-react';
import { AdminDashboardView } from './admin/AdminDashboardView';
import { AdminStudentsView } from './admin/AdminStudentsView';
import { AdminFinancialView } from './admin/AdminFinancialView';
import { AdminPlansView } from './admin/AdminPlansView';
import { AdminSettingsView } from './admin/AdminSettingsView';
import { AdminVouchersView } from './admin/AdminVouchersView';
import { AdminLocationsView } from './admin/AdminLocationsView';
import { AdminScheduleView } from './admin/AdminScheduleView';
import { AdminGalleryView } from './admin/AdminGalleryView';
import {
  MunicipalClassLocation,
  getStoredMunicipalClassLocations,
  getAvailableClassLocationsForCity,
  getAllClassLocationsForCity
} from '@/lib/locations-config';
import {
  saveSingleSlotToFirestore,
  saveSlotsToFirestore,
  getSlotsFromFirestore,
  subscribeToSlots,
  subscribeToBookings,
  getBookingsFromFirestore
} from '@/lib/firebase';
import { CURRENT_PRODUCT } from '@/lib/products';
import {
  BookingRecord,
  BookingStatus,
  ABCDEStep,
  TimeSlot,
  RecipientInfo,
  getStudentRecipientWhatsApp,
  WhatsAppMessageTemplate,
  DEFAULT_WHATSAPP_TEMPLATES,
  getStoredWhatsAppTemplates,
  saveStoredWhatsAppTemplates,
  compileWhatsAppTemplate,
  SkillItem,
  DEFAULT_SKILLS,
  getStoredSkills,
  saveStoredSkills,
  resetStoredSkills,
  DEFAULT_SKILL_CATEGORIES,
  getStoredSkillCategories,
  saveStoredSkillCategories,
  resetStoredSkillCategories,
  getStoredBookings,
  saveStoredBookings,
  isBookingVoucherPending,
  confirmBookingPayment,
  assignInstructorLocationToBooking,
  approveBookingVoucher,
  reproveBookingVoucher,
  rejectBookingVoucher,
  buildRejectionWhatsAppMessage,
  getStoredSlots,
  saveStoredSlots,
  formatDateBrazilian,
  getWeekdayName,
  generateWhatsAppNotificationUrl,
  OFFICIAL_WHATSAPP_DISPLAY,
  OFFICIAL_WHATSAPP_URL,
  ABCDE_STAGES,
  ABCDESkillStatus,
  getStudentSkillStatus,
  getABCDECompletionStats,
  markAllABCDESkillsConquered,
  updateABCDESkillStatus,
  resetABCDESkills,
  checkAndProcessExpired24hRejections,
  isBookingAwaitingInstructorSchedule,
  assignInstructorScheduleToBooking
} from '@/lib/booking-store';
import { ConquestCertificateModal } from './ConquestCertificateModal';

interface AdminPanelProps {
  onExitAdmin?: () => void;
}

const ADMIN_ACCESS_KEY = '16090424';

function generateSkillId(): { id: string; key: string; createdAt: string } {
  const timestamp = Date.now();
  return {
    id: `skill_${timestamp}`,
    key: `custom_${timestamp}`,
    createdAt: new Date(timestamp).toISOString()
  };
}

/**
 * Retorna a URL da imagem do comprovante de pagamento vinculado à inscrição.
 * Se o aluno anexou uma imagem (base64 ou URL), retorna-a diretamente.
 * Caso o registro possua arquivo/status mas sem URL gravada, gera um comprovante PIX SVG nítido e legível.
 */
function getBookingVoucherUrl(booking: BookingRecord): string | null {
  // 1. Prioriza sempre a tentativa mais recente anexada pelo aluno
  if (booking.voucherAttempts && booking.voucherAttempts.length > 0) {
    const latestAttempt = booking.voucherAttempts[booking.voucherAttempts.length - 1];
    if (latestAttempt?.voucherUrl && latestAttempt.voucherUrl.trim()) {
      return latestAttempt.voucherUrl;
    }
  }

  // 2. Campo direto voucherUrl
  if (booking.voucherUrl && booking.voucherUrl.trim()) {
    return booking.voucherUrl;
  }
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
    const idStr = booking.id || 'REGISTRO';
    const fileName = booking.voucherFileName || 'comprovante_pix.png';

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800" viewBox="0 0 600 800" fill="none">
      <rect width="600" height="800" rx="16" fill="#0b1120"/>
      <rect x="20" y="20" width="560" height="760" rx="12" fill="#111827" stroke="#374151" stroke-width="2"/>
      
      <rect x="20" y="20" width="560" height="110" rx="12" fill="#1f2937"/>
      <circle cx="70" cy="75" r="28" fill="#10b981" fill-opacity="0.2" stroke="#10b981" stroke-width="2"/>
      <path d="M60 75L68 83L82 67" stroke="#10b981" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
      <text x="115" y="65" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-size="20" font-weight="bold">Comprovante de Transferência PIX</text>
      <text x="115" y="88" fill="#9ca3af" font-family="monospace" font-size="13">ABC DO PEDAL • ENSINO DE CICLISMO</text>
      
      <rect x="45" y="150" width="510" height="115" rx="8" fill="#0f172a" stroke="#1e293b"/>
      <text x="70" y="185" fill="#94a3b8" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="600">VALOR TRANSFERIDO</text>
      <text x="70" y="235" fill="#34d399" font-family="monospace" font-size="34" font-weight="bold">R$ ${amountStr}</text>
      
      <text x="45" y="300" fill="#f43f5e" font-family="system-ui, -apple-system, sans-serif" font-size="12" font-weight="bold" letter-spacing="1">DADOS DA INSCRIÇÃO E ALUNO</text>
      <line x1="45" y1="310" x2="555" y2="310" stroke="#374151" stroke-width="1"/>
      
      <text x="45" y="340" fill="#9ca3af" font-family="system-ui, -apple-system, sans-serif" font-size="13">Inscrição Vinculada:</text>
      <text x="555" y="340" text-anchor="end" fill="#ffffff" font-family="monospace" font-size="13" font-weight="bold">#${idStr}</text>
      
      <text x="45" y="380" fill="#9ca3af" font-family="system-ui, -apple-system, sans-serif" font-size="13">Nome do Aluno:</text>
      <text x="555" y="380" text-anchor="end" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="bold">${studentName}</text>
      
      <text x="45" y="420" fill="#9ca3af" font-family="system-ui, -apple-system, sans-serif" font-size="13">Data e Horário da Aula:</text>
      <text x="555" y="420" text-anchor="end" fill="#ffffff" font-family="monospace" font-size="13">${dateStr} às ${timeStr}</text>
      
      <text x="45" y="460" fill="#9ca3af" font-family="system-ui, -apple-system, sans-serif" font-size="13">Arquivo Anexado:</text>
      <text x="555" y="460" text-anchor="end" fill="#93c5fd" font-family="monospace" font-size="12">${fileName}</text>
      
      <line x1="45" y1="490" x2="555" y2="490" stroke="#374151" stroke-width="1"/>
      
      <text x="45" y="525" fill="#f43f5e" font-family="system-ui, -apple-system, sans-serif" font-size="12" font-weight="bold" letter-spacing="1">DADOS BANCÁRIOS DA TRANSAÇÃO</text>
      
      <text x="45" y="560" fill="#9ca3af" font-family="system-ui, -apple-system, sans-serif" font-size="13">Favorecido:</text>
      <text x="555" y="560" text-anchor="end" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-size="13">ABC do Pedal Ciclismo Ltda</text>
      
      <text x="45" y="600" fill="#9ca3af" font-family="system-ui, -apple-system, sans-serif" font-size="13">Chave PIX:</text>
      <text x="555" y="600" text-anchor="end" fill="#e2e8f0" font-family="monospace" font-size="12">11950438948 (Telefone)</text>
      
      <text x="45" y="640" fill="#9ca3af" font-family="system-ui, -apple-system, sans-serif" font-size="13">Instituição:</text>
      <text x="555" y="640" text-anchor="end" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-size="13">PagBank / Banco Central</text>
      
      <text x="45" y="680" fill="#9ca3af" font-family="system-ui, -apple-system, sans-serif" font-size="13">Autenticação Bancária:</text>
      <text x="555" y="680" text-anchor="end" fill="#38bdf8" font-family="monospace" font-size="11">E76598212026091108489ABC49900</text>
      
      <rect x="45" y="715" width="510" height="45" rx="8" fill="#1e293b"/>
      <text x="300" y="742" text-anchor="middle" fill="#94a3b8" font-family="system-ui, -apple-system, sans-serif" font-size="11">Documento registrado e enviado pelo aluno para conferência da ABC do Pedal</text>
    </svg>`;

    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }
  return null;
}

export function AdminPanel({ onExitAdmin }: AdminPanelProps) {
  // Authentication State - Strictly blocked for students by default; access only via password 16090424
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [inputPassword, setInputPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const handleLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (inputPassword.trim() === ADMIN_ACCESS_KEY) {
      setIsAuthenticated(true);
      setAuthError(null);
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('abc_admin_auth', 'true');
      }
    } else {
      setAuthError('Senha incorreta! O acesso ao Painel do Instrutor é exclusivo e bloqueado para alunos.');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setInputPassword('');
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('abc_admin_auth');
    }
  };

  const handleExitWithLock = () => {
    handleLogout();
    if (onExitAdmin) {
      onExitAdmin();
    }
  };

  type AdminTabType =
    | 'visao-geral'
    | 'comprovantes-pendentes'
    | 'alunos'
    | 'evolucao'
    | 'agenda'
    | 'locais'
    | 'automacao'
    | 'notificacoes'
    | 'reservas'
    | 'financeiro'
    | 'planos'
    | 'galeria'
    | 'configuracoes';

  const [activeTab, setActiveTab] = useState<AdminTabType>('visao-geral');
  const [bookings, setBookings] = useState<BookingRecord[]>(() => {
    if (typeof window !== 'undefined') {
      return getStoredBookings();
    }
    return [];
  });

  const uniqueStudentsCount = useMemo(() => {
    const set = new Set<string>();
    bookings.forEach((b) => {
      const key = (b.student?.whatsapp || '').replace(/\D/g, '') || b.student?.cpf || b.student?.fullName || b.id;
      set.add(key);
    });
    return set.size;
  }, [bookings]);

  const pendingVouchersCount = useMemo(() => {
    return bookings.filter((b) => isBookingVoucherPending(b)).length;
  }, [bookings]);
  const [slots, setSlots] = useState<TimeSlot[]>(() => {
    if (typeof window !== 'undefined') {
      return getStoredSlots();
    }
    return [];
  });
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Selected booking for drawer/details
  const [selectedBooking, setSelectedBooking] = useState<BookingRecord | null>(() => {
    if (typeof window !== 'undefined') {
      const loaded = getStoredBookings();
      return loaded[0] || null;
    }
    return null;
  });

  // Modal para visualização do Certificado de Conquista pelo Instrutor
  const [adminCertificateBooking, setAdminCertificateBooking] = useState<BookingRecord | null>(null);

  // Status de atualização em tempo real de informações de alunos
  const [lastSyncTime, setLastSyncTime] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return new Date().toLocaleTimeString('pt-BR');
    }
    return '';
  });
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [recentStudentNotification, setRecentStudentNotification] = useState<{
    id: string;
    studentName: string;
    action: string;
    timestamp: number;
  } | null>(null);

  const prevBookingsMapRef = useRef<Map<string, BookingRecord>>(new Map());
  const isInitialSyncRef = useRef<boolean>(true);

  // Som suave de notificação de nova informação de alunos (Web Audio API)
  const playStudentNotificationSound = () => {
    try {
      if (typeof window === 'undefined') return;
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      const now = ctx.currentTime;
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.12); // A5
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.start(now);
      osc.stop(now + 0.35);
    } catch {
      // Audio autoplay policy fallback
    }
  };

  // Atualização em tempo real de alunos e detecção de novidades
  const applyUpdatedBookings = useCallback((incoming: BookingRecord[], notify = true) => {
    if (!incoming) return;

    if (!isInitialSyncRef.current && notify) {
      for (const b of incoming) {
        const prev = prevBookingsMapRef.current.get(b.id);
        if (!prev) {
          setRecentStudentNotification({
            id: b.id,
            studentName: b.student?.fullName || 'Novo Aluno',
            action: `Novo agendamento realizado para ${b.slot?.date ? formatDateBrazilian(b.slot.date) : 'nova aula'}`,
            timestamp: Date.now()
          });
          playStudentNotificationSound();
          break;
        } else if (
          (!prev.voucherUrl && b.voucherUrl) ||
          (b.voucherUrl && prev.voucherUrl && b.voucherUrl !== prev.voucherUrl) ||
          ((b.voucherAttempts?.length || 0) > (prev.voucherAttempts?.length || 0)) ||
          (b.status === 'aguardando-confirmacao-instrutor' && prev.status === 'comprovante-reprovado')
        ) {
          setRecentStudentNotification({
            id: b.id,
            studentName: b.student?.fullName || 'Aluno',
            action: 'Novo comprovante de pagamento anexado para conferência imediata!',
            timestamp: Date.now()
          });
          playStudentNotificationSound();
          break;
        } else if (prev.status !== b.status) {
          const statusDesc =
            b.status === 'comprovante-enviado'
              ? 'Comprovante em análise'
              : b.status === 'pagamento-confirmado' || b.status === 'agendamento-confirmado' || b.status === 'confirmado'
              ? 'Pagamento e agendamento confirmados'
              : b.status === 'cancelado'
              ? 'Agendamento cancelado'
              : `Status atualizado para ${b.status}`;
          setRecentStudentNotification({
            id: b.id,
            studentName: b.student?.fullName || 'Aluno',
            action: statusDesc,
            timestamp: Date.now()
          });
          playStudentNotificationSound();
          break;
        }
      }
    }

    const newMap = new Map<string, BookingRecord>();
    incoming.forEach((b) => newMap.set(b.id, b));
    prevBookingsMapRef.current = newMap;
    isInitialSyncRef.current = false;

    setBookings(incoming);
    setSelectedBooking((prev) => {
      if (!prev) return incoming[0] || null;
      return incoming.find((b) => b.id === prev.id) || prev;
    });
    setLastSyncTime(new Date().toLocaleTimeString('pt-BR'));
  }, []);

  // Sincronização manual sob demanda
  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      const fsBookings = await getBookingsFromFirestore();
      const local = getStoredBookings();
      const map = new Map<string, BookingRecord>();
      local.forEach((b) => map.set(b.id, b));
      if (fsBookings && fsBookings.length > 0) {
        fsBookings.forEach((b) => {
          const existing = map.get(b.id);
          map.set(b.id, { ...existing, ...b });
        });
      }
      const merged = Array.from(map.values()).sort((a, b) => {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      // Atualiza o estado React prioritariamente
      applyUpdatedBookings(merged, false);
      saveStoredBookings(merged);
      setSlots(getStoredSlots());
    } catch (err) {
      console.warn('Erro ao sincronizar manualmente:', err);
    } finally {
      setTimeout(() => setIsSyncing(false), 500);
    }
  };

  // Agenda filters
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return new Date().toISOString().split('T')[0];
    }
    return '';
  });
  const [newSlotTime, setNewSlotTime] = useState('08:00');
  const [newSlotDate, setNewSlotDate] = useState(() => {
    if (typeof window !== 'undefined') {
      return new Date().toISOString().split('T')[0];
    }
    return '';
  });
  const [isSavingSlot, setIsSavingSlot] = useState<boolean>(false);
  const [agendaFeedback, setAgendaFeedback] = useState<{
    type: 'success' | 'warning' | 'error';
    message: string;
    date?: string;
    time?: string;
    lastAddedSlotId?: string;
  } | null>(null);

  // Inserção de alunos negociados via WhatsApp diretamente na Agenda pelo Instrutor
  const [studentToSchedule, setStudentToSchedule] = useState<BookingRecord | null>(null);
  const [scheduleTargetDate, setScheduleTargetDate] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return new Date().toISOString().split('T')[0];
    }
    return '';
  });
  const [scheduleTargetTime, setScheduleTargetTime] = useState<string>('09:00');
  const [scheduleTargetLocationName, setScheduleTargetLocationName] = useState<string>('');
  const [isAssigningSchedule, setIsAssigningSchedule] = useState<boolean>(false);

  // Gestão de Locais nos novos horários da Agenda
  const [newSlotCity, setNewSlotCity] = useState<string>('São Bernardo do Campo');
  const [newSlotLocationName, setNewSlotLocationName] = useState<string>('Poliesportivo da Kennedy');

  // Gestão de Local selecionado no Drawer da Reserva
  const [selectedLocationForBooking, setSelectedLocationForBooking] = useState<string>('');

  // Grade de horários ordenada e filtrada
  const filteredSlots = useMemo(() => {
    const sorted = [...slots].sort((a, b) => {
      const dateComp = a.date.localeCompare(b.date);
      if (dateComp !== 0) return dateComp;
      return a.time.localeCompare(b.time);
    });
    if (!selectedDateFilter) return sorted;
    return sorted.filter((s) => s.date === selectedDateFilter);
  }, [slots, selectedDateFilter]);

  // Carregar e sincronizar slots do Firestore como fonte da verdade oficial
  useEffect(() => {
    let isMounted = true;

    async function syncSlotsFromDatabase() {
      try {
        const firestoreSlots = await getSlotsFromFirestore();
        if (!isMounted) return;

        if (firestoreSlots && firestoreSlots.length > 0) {
          const localSlots = getStoredSlots();
          const map = new Map<string, TimeSlot>();
          localSlots.forEach((s) => map.set(s.id, s));
          firestoreSlots.forEach((s) => map.set(s.id, s));
          const merged = Array.from(map.values()).sort((a, b) => {
            const dateComp = a.date.localeCompare(b.date);
            if (dateComp !== 0) return dateComp;
            return a.time.localeCompare(b.time);
          });
          setSlots(merged);
          saveStoredSlots(merged);
        } else {
          // Se o Firestore ainda não possuir registros, salva os slots locais
          const localSlots = getStoredSlots();
          if (localSlots.length > 0) {
            saveSlotsToFirestore(localSlots).catch((err) => {
              console.warn('Erro ao inicializar slots no Firestore:', err);
            });
          }
        }
      } catch (err) {
        console.warn('Erro ao carregar slots do Firestore:', err);
      }
    }

    syncSlotsFromDatabase();

    // Sincronização em tempo real com Firestore
    const unsubscribe = subscribeToSlots((updatedSlots) => {
      if (!isMounted || !updatedSlots || updatedSlots.length === 0) return;
      setSlots((prev) => {
        const map = new Map<string, TimeSlot>();
        prev.forEach((s) => map.set(s.id, s));
        updatedSlots.forEach((s) => map.set(s.id, s));
        const merged = Array.from(map.values()).sort((a, b) => {
          const dateComp = a.date.localeCompare(b.date);
          if (dateComp !== 0) return dateComp;
          return a.time.localeCompare(b.time);
        });
        saveStoredSlots(merged);
        return merged;
      });
    });

    // Sincronização inicial de inscrições do Firestore
    getBookingsFromFirestore()
      .then((fsBookings) => {
        if (!isMounted || !fsBookings || fsBookings.length === 0) return;
        const local = getStoredBookings();
        const map = new Map<string, BookingRecord>();
        local.forEach((b) => map.set(b.id, b));
        fsBookings.forEach((b) => {
          map.set(b.id, { ...map.get(b.id), ...b });
        });
        const merged = Array.from(map.values()).sort((a, b) => {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
        // Atualiza o estado React prioritariamente
        applyUpdatedBookings(merged, false);
        saveStoredBookings(merged);
      })
      .catch((err) => console.warn('Erro ao carregar bookings do Firestore:', err));

    // Sincronização em tempo real de inscrições com Firestore (atualiza alunos e comprovantes instantaneamente)
    const unsubscribeBookings = subscribeToBookings((firestoreBookings) => {
      if (!isMounted || !firestoreBookings || firestoreBookings.length === 0) return;
      const latestLocal = getStoredBookings();
      const map = new Map<string, BookingRecord>();
      latestLocal.forEach((b) => map.set(b.id, b));
      firestoreBookings.forEach((b) => {
        const existing = map.get(b.id);
        map.set(b.id, { ...existing, ...b });
      });
      const merged = Array.from(map.values()).sort((a, b) => {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      // Atualiza o estado React prioritariamente
      applyUpdatedBookings(merged, true);
      saveStoredBookings(merged);
    });

    const handleSlotEvent = () => {
      if (!isMounted) return;
      setSlots(getStoredSlots());
    };
    window.addEventListener('abc_slots_updated', handleSlotEvent);

    // Atualização reativa a cada nova informação de alunos na mesma janela
    const handleBookingEvent = () => {
      if (!isMounted) return;
      const latest = getStoredBookings();
      applyUpdatedBookings(latest, true);
    };
    window.addEventListener('abc_booking_updated', handleBookingEvent);

    // Sincronização entre abas via BroadcastChannel
    let syncChannel: BroadcastChannel | null = null;
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        syncChannel = new BroadcastChannel('abc_booking_sync_channel');
        syncChannel.onmessage = (event) => {
          if (!isMounted) return;
          if (event.data?.type === 'abc_booking_updated') {
            const latest = getStoredBookings();
            applyUpdatedBookings(latest, true);
          }
        };
      }
    } catch {
      // Ignorar fallback
    }

    // Sincronização entre abas via evento de Storage
    const handleStorageEvent = (e: StorageEvent) => {
      if (!isMounted) return;
      if (e.key === 'abc_bookings') {
        const latest = getStoredBookings();
        applyUpdatedBookings(latest, true);
      } else if (e.key === 'abc_slots') {
        setSlots(getStoredSlots());
      }
    };
    window.addEventListener('storage', handleStorageEvent);

    // Polling contínuo a cada 4 segundos para garantir atualização com novas informações de alunos
    const pollInterval = setInterval(() => {
      if (!isMounted) return;
      const latest = getStoredBookings();
      if (latest && latest.length > 0) {
        let hasChanges = false;
        if (latest.length !== prevBookingsMapRef.current.size) {
          hasChanges = true;
        } else {
          for (const b of latest) {
            const prev = prevBookingsMapRef.current.get(b.id);
            if (!prev || prev.status !== b.status || prev.voucherUrl !== b.voucherUrl || prev.student?.fullName !== b.student?.fullName) {
              hasChanges = true;
              break;
            }
          }
        }
        if (hasChanges) {
          applyUpdatedBookings(latest, true);
        }
      }
    }, 4000);

    const timer24h = setInterval(() => {
      if (!isMounted) return;
      if (checkAndProcessExpired24hRejections()) {
        const latest = getStoredBookings();
        applyUpdatedBookings(latest, true);
        setSlots(getStoredSlots());
      }
    }, 30000);

    return () => {
      isMounted = false;
      if (unsubscribe) unsubscribe();
      if (unsubscribeBookings) unsubscribeBookings();
      if (syncChannel) syncChannel.close();
      clearInterval(pollInterval);
      clearInterval(timer24h);
      window.removeEventListener('abc_slots_updated', handleSlotEvent);
      window.removeEventListener('abc_booking_updated', handleBookingEvent);
      window.removeEventListener('storage', handleStorageEvent);
    };
  }, [applyUpdatedBookings]);

  // WhatsApp Templates State
  const [templates, setTemplates] = useState<WhatsAppMessageTemplate[]>(() => {
    if (typeof window !== 'undefined') {
      return getStoredWhatsAppTemplates();
    }
    return DEFAULT_WHATSAPP_TEMPLATES;
  });
  const [editingTemplate, setEditingTemplate] = useState<WhatsAppMessageTemplate | null>(null);
  const [isCreatingTemplate, setIsCreatingTemplate] = useState<boolean>(false);
  const [templateFormTitle, setTemplateFormTitle] = useState<string>('');
  const [templateFormCategory, setTemplateFormCategory] = useState<WhatsAppMessageTemplate['category']>('custom');
  const [templateFormContent, setTemplateFormContent] = useState<string>('');
  const [copiedTemplateId, setCopiedTemplateId] = useState<string | null>(null);
  const [templateCategoryFilter, setTemplateCategoryFilter] = useState<string>('all');
  const [templateNotificationMsg, setTemplateNotificationMsg] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setTemplateNotificationMsg(msg);
    setTimeout(() => setTemplateNotificationMsg(null), 3500);
  };

  const handleOpenCreateTemplate = () => {
    setTemplateFormTitle('');
    setTemplateFormCategory('custom');
    setTemplateFormContent('Olá, {aluno}! 🚲\n\n[Digite aqui sua mensagem personalizada]\n\nAtenciosamente,\nEquipe ABC do Pedal');
    setEditingTemplate(null);
    setIsCreatingTemplate(true);
  };

  const handleOpenEditTemplate = (tpl: WhatsAppMessageTemplate) => {
    setTemplateFormTitle(tpl.title);
    setTemplateFormCategory(tpl.category);
    setTemplateFormContent(tpl.content);
    setEditingTemplate(tpl);
    setIsCreatingTemplate(false);
  };

  const handleCloseTemplateModal = () => {
    setEditingTemplate(null);
    setIsCreatingTemplate(false);
  };

  const handleSaveTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateFormTitle.trim() || !templateFormContent.trim()) {
      alert('Por favor, preencha o título e o conteúdo da mensagem.');
      return;
    }

    if (isCreatingTemplate) {
      const newTpl: WhatsAppMessageTemplate = {
        id: `tpl-custom-${Date.now()}`,
        title: templateFormTitle.trim(),
        category: templateFormCategory,
        content: templateFormContent.trim(),
        isCustom: true
      };
      const updated = [newTpl, ...templates];
      setTemplates(updated);
      saveStoredWhatsAppTemplates(updated);
      showNotification('Nova mensagem criada e salva com sucesso!');
    } else if (editingTemplate) {
      const updated = templates.map((t) =>
        t.id === editingTemplate.id
          ? {
              ...t,
              title: templateFormTitle.trim(),
              category: templateFormCategory,
              content: templateFormContent.trim()
            }
          : t
      );
      setTemplates(updated);
      saveStoredWhatsAppTemplates(updated);
      showNotification('Modelo de mensagem atualizado com sucesso!');
    }

    handleCloseTemplateModal();
  };

  const handleDeleteTemplate = (id: string) => {
    if (confirm('Tem certeza de que deseja excluir este modelo de mensagem?')) {
      const updated = templates.filter((t) => t.id !== id);
      setTemplates(updated);
      saveStoredWhatsAppTemplates(updated);
      showNotification('Modelo excluído com sucesso.');
    }
  };

  const handleResetDefaultTemplates = () => {
    if (confirm('Deseja restaurar todos os modelos originais padrão da ABC do Pedal?')) {
      setTemplates(DEFAULT_WHATSAPP_TEMPLATES);
      saveStoredWhatsAppTemplates(DEFAULT_WHATSAPP_TEMPLATES);
      showNotification('Modelos originais restaurados com sucesso.');
    }
  };

  const handleCopyTemplate = (id: string, text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedTemplateId(id);
      setTimeout(() => setCopiedTemplateId(null), 2500);
    });
  };

  const handleInsertVariable = (variableTag: string) => {
    setTemplateFormContent((prev) => `${prev} ${variableTag} `);
  };

  // =========================================================================
  // SKILLS & CATEGORIES MANAGEMENT (Criar e Editar Habilidades e Categorias)
  // =========================================================================
  const [skills, setSkills] = useState<SkillItem[]>(() => {
    if (typeof window !== 'undefined') {
      return getStoredSkills();
    }
    return DEFAULT_SKILLS;
  });
  const [editingSkill, setEditingSkill] = useState<SkillItem | null>(null);
  const [isCreatingSkill, setIsCreatingSkill] = useState<boolean>(false);
  const [isPedagogicalModalOpen, setIsPedagogicalModalOpen] = useState<boolean>(false);
  const [pedagogicalModalTab, setPedagogicalModalTab] = useState<'habilidades' | 'categorias'>('habilidades');
  const [selectedSkillCategoryFilter, setSelectedSkillCategoryFilter] = useState<string>('all');

  const [skillFormLabel, setSkillFormLabel] = useState<string>('');
  const [skillFormCategory, setSkillFormCategory] = useState<string>('Autonomia');
  const [skillFormDesc, setSkillFormDesc] = useState<string>('');
  const [skillFeedbackMsg, setSkillFeedbackMsg] = useState<string | null>(null);

  const showSkillNotification = (msg: string) => {
    setSkillFeedbackMsg(msg);
    setTimeout(() => setSkillFeedbackMsg(null), 3500);
  };

  const handleOpenCategoriesModal = () => {
    setPedagogicalModalTab('categorias');
    setIsPedagogicalModalOpen(true);
    setEditingSkill(null);
    setIsCreatingSkill(false);
    setEditingCategoryOldName(null);
    setEditingCategoryNewName('');
  };

  const handleOpenCreateSkill = () => {
    setSkillFormLabel('');
    setSkillFormCategory(categories[0] || 'Autonomia');
    setSkillFormDesc('');
    setEditingSkill(null);
    setIsCreatingSkill(true);
    setPedagogicalModalTab('habilidades');
    setIsPedagogicalModalOpen(true);
    setEditingCategoryOldName(null);
  };

  const handleOpenEditSkill = (skill: SkillItem) => {
    setSkillFormLabel(skill.label);
    setSkillFormCategory(skill.category || categories[0] || 'Autonomia');
    setSkillFormDesc(skill.description || '');
    setEditingSkill(skill);
    setIsCreatingSkill(false);
    setPedagogicalModalTab('habilidades');
    setIsPedagogicalModalOpen(true);
    setEditingCategoryOldName(null);
  };

  const handleClosePedagogicalModal = () => {
    setIsPedagogicalModalOpen(false);
    setEditingSkill(null);
    setIsCreatingSkill(false);
    setEditingCategoryOldName(null);
  };

  const handleSaveSkill = (e: React.FormEvent) => {
    e.preventDefault();
    if (!skillFormLabel.trim()) {
      alert('Por favor, informe o nome da habilidade.');
      return;
    }

    if (isCreatingSkill) {
      const generated = generateSkillId();
      const newSkill: SkillItem = {
        id: generated.id,
        key: generated.key,
        label: skillFormLabel.trim(),
        category: skillFormCategory.trim() || 'Personalizado',
        description: skillFormDesc.trim(),
        isCustom: true,
        createdAt: generated.createdAt
      };
      const updated = [...skills, newSkill];
      setSkills(updated);
      saveStoredSkills(updated);
      showSkillNotification(`Nova habilidade "${newSkill.label}" criada com sucesso!`);
    } else if (editingSkill) {
      const updated = skills.map((s) => {
        if (s.id === editingSkill.id) {
          return {
            ...s,
            label: skillFormLabel.trim(),
            category: skillFormCategory.trim() || s.category,
            description: skillFormDesc.trim()
          };
        }
        return s;
      });
      setSkills(updated);
      saveStoredSkills(updated);
      showSkillNotification(`Campo de habilidade atualizado com sucesso!`);
    }

    handleClosePedagogicalModal();
  };

  const handleDeleteSkill = (skillId: string, skillLabel: string) => {
    if (!confirm(`Deseja realmente remover o campo de habilidade "${skillLabel}"?`)) {
      return;
    }
    const updated = skills.filter((s) => s.id !== skillId);
    setSkills(updated);
    saveStoredSkills(updated);
    showSkillNotification(`Habilidade "${skillLabel}" removida.`);
  };

  const handleResetDefaultSkills = () => {
    if (!confirm('Deseja restaurar as habilidades originais do Método ABC-DE?')) {
      return;
    }
    const restored = resetStoredSkills();
    setSkills(restored);
    showSkillNotification('Habilidades padrão restauradas com sucesso.');
  };

  // =========================================================================
  // CATEGORIES MANAGEMENT (Criar, Editar e Excluir Categorias Pedagógicas)
  // =========================================================================
  const [categories, setCategories] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      return getStoredSkillCategories();
    }
    return DEFAULT_SKILL_CATEGORIES;
  });
  const [isManagingCategories, setIsManagingCategories] = useState<boolean>(false);
  const [newCategoryName, setNewCategoryName] = useState<string>('');
  const [editingCategoryOldName, setEditingCategoryOldName] = useState<string | null>(null);
  const [editingCategoryNewName, setEditingCategoryNewName] = useState<string>('');

  const handleCreateCategory = (inputName?: string) => {
    const target = (inputName ?? newCategoryName).trim();
    if (!target) {
      alert('Informe o nome da nova categoria pedagógica.');
      return;
    }
    const exists = categories.some((c) => c.toLowerCase() === target.toLowerCase());
    if (exists) {
      alert(`A categoria "${target}" já existe.`);
      setSkillFormCategory(target);
      setNewCategoryName('');
      return;
    }

    const updated = [...categories, target];
    setCategories(updated);
    saveStoredSkillCategories(updated);
    setSkillFormCategory(target);
    setNewCategoryName('');
    showSkillNotification(`Categoria "${target}" criada com sucesso!`);
  };

  const handleStartEditCategory = (cat: string) => {
    setEditingCategoryOldName(cat);
    setEditingCategoryNewName(cat);
  };

  const handleCancelEditCategory = () => {
    setEditingCategoryOldName(null);
    setEditingCategoryNewName('');
  };

  const handleSaveRenamedCategory = (oldCat: string) => {
    const trimmed = editingCategoryNewName.trim();
    if (!trimmed) {
      alert('O nome da categoria não pode ficar em branco.');
      return;
    }

    if (trimmed.toLowerCase() !== oldCat.toLowerCase()) {
      const exists = categories.some(
        (c) => c.toLowerCase() === trimmed.toLowerCase() && c.toLowerCase() !== oldCat.toLowerCase()
      );
      if (exists) {
        alert(`Já existe outra categoria com o nome "${trimmed}".`);
        return;
      }
    }

    // Update category list
    const updatedCategories = categories.map((c) => (c === oldCat ? trimmed : c));
    setCategories(updatedCategories);
    saveStoredSkillCategories(updatedCategories);

    // Synchronize all skills with this category
    const affectedSkills = skills.filter((s) => s.category === oldCat);
    if (affectedSkills.length > 0) {
      const updatedSkills = skills.map((s) => (s.category === oldCat ? { ...s, category: trimmed } : s));
      setSkills(updatedSkills);
      saveStoredSkills(updatedSkills);
    }

    // Update active skill form if it was selected
    if (skillFormCategory === oldCat) {
      setSkillFormCategory(trimmed);
    }

    setEditingCategoryOldName(null);
    setEditingCategoryNewName('');
    showSkillNotification(`Categoria "${oldCat}" renomeada para "${trimmed}"!`);
  };

  const handleDeleteCategory = (catToDelete: string) => {
    const skillsUsingCount = skills.filter((s) => s.category === catToDelete).length;
    const confirmMessage =
      skillsUsingCount > 0
        ? `A categoria "${catToDelete}" possui ${skillsUsingCount} habilidade(s) associada(s). Ao remover, essas habilidades serão reatribuídas para "Personalizado". Confirmar remoção?`
        : `Deseja realmente remover a categoria pedagógica "${catToDelete}"?`;

    if (!confirm(confirmMessage)) {
      return;
    }

    const updatedCategories = categories.filter((c) => c !== catToDelete);
    const finalCategories = updatedCategories.length > 0 ? updatedCategories : ['Autonomia'];
    setCategories(finalCategories);
    saveStoredSkillCategories(finalCategories);

    // Reassign any skills that used the deleted category to Personalizado
    if (skillsUsingCount > 0) {
      const updatedSkills = skills.map((s) =>
        s.category === catToDelete ? { ...s, category: 'Personalizado' } : s
      );
      setSkills(updatedSkills);
      saveStoredSkills(updatedSkills);
    }

    // If current skill form had this category, point to first available
    if (skillFormCategory === catToDelete) {
      setSkillFormCategory(finalCategories[0] || 'Autonomia');
    }

    showSkillNotification(`Categoria "${catToDelete}" removida.`);
  };

  const handleResetCategories = () => {
    if (!confirm('Deseja restaurar as categorias pedagógicas padrão?')) {
      return;
    }
    const restored = resetStoredSkillCategories();
    setCategories(restored);
    showSkillNotification('Categorias pedagógicas padrão restauradas com sucesso.');
  };

  // States for Voucher Inspection and Rejection (Item 12 / Admin)
  const [voucherModalUrl, setVoucherModalUrl] = useState<string | null>(null);
  const [rejectingBookingId, setRejectingBookingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('');
  const [reprovingBooking, setReprovingBooking] = useState<BookingRecord | null>(null);
  const [reproveReasonChoice, setReproveReasonChoice] = useState<string>('Comprovante ilegível ou com corte nas informações essenciais. Favor enviar foto nítida e completa.');
  const [reproveCustomReason, setReproveCustomReason] = useState<string>('');
  const [rejectionNotificationBanner, setRejectionNotificationBanner] = useState<{
    studentName: string;
    phone: string;
    status: 'ENVIADO' | 'FALHA NO ENVIO';
    sentAt: string;
    message: string;
  } | null>(null);

  // Filter bookings
  const filteredBookings = bookings.filter((b) => {
    let matchesStatus = false;
    if (statusFilter === 'all') {
      matchesStatus = true;
    } else if (statusFilter === 'confirmado') {
      matchesStatus = b.status === 'confirmado' || b.status === 'agendamento-confirmado' || b.status === 'pagamento-confirmado';
    } else if (statusFilter === 'comprovante-enviado') {
      matchesStatus = b.status === 'comprovante-enviado' || b.status === 'aguardando-confirmacao-instrutor' || b.status === 'pagamento-enviado';
    } else if (statusFilter === 'comprovante-rejeitado' || statusFilter === 'comprovante-reprovado' || statusFilter === 'pagamento-nao-confirmado') {
      matchesStatus = b.status === 'comprovante-rejeitado' || b.status === 'comprovante-reprovado' || b.status === 'pedido-rejeitado' || b.status === 'pagamento-nao-confirmado';
    } else if (statusFilter === 'aguardando-novo-pagamento') {
      matchesStatus = b.status === 'aguardando-novo-pagamento';
    } else {
      matchesStatus = b.status === statusFilter;
    }

    const matchesSearch =
      b.student.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (b.student.cpf && b.student.cpf.includes(searchTerm)) ||
      b.student.whatsapp.includes(searchTerm);
    return matchesStatus && matchesSearch;
  });

  // Action: Confirm Payment / Aprovar Comprovante -> Agendamento Confirmado
  const handleConfirmPayment = (bookingId: string) => {
    const instructorName = 'Instrutor Responsável - ABC do Pedal';
    const confirmed = confirmBookingPayment(bookingId, undefined, instructorName);
    if (confirmed) {
      const all = getStoredBookings();
      setBookings(all);
      const slotsLatest = getStoredSlots();
      setSlots(slotsLatest);
      if (selectedBooking?.id === bookingId) {
        setSelectedBooking(confirmed);
      }
    } else {
      const now = new Date().toISOString();
      const updated = bookings.map((b) => {
        if (b.id === bookingId) {
          return {
            ...b,
            status: 'agendamento-confirmado' as BookingStatus,
            confirmedAt: now,
            approvedAt: now,
            approvedBy: instructorName,
            paymentConfirmedAt: now
          };
        }
        return b;
      });
      setBookings(updated);
      saveStoredBookings(updated);
      if (selectedBooking?.id === bookingId) {
        setSelectedBooking(updated.find((b) => b.id === bookingId) || null);
      }
    }
  };

  // Action: Reprovar Comprovante -> COMPROVANTE REPROVADO
  const handleReproveVoucher = (bookingId: string, customReason?: string) => {
    const instructorName = 'Instrutor Responsável - ABC do Pedal';
    const reasonToUse = (customReason && customReason.trim()) || 'Favor enviar o comprovante de pagamento válido, emitido pela operadora de pagamento. Dúvidas? Entre em contato pelo WhatsApp.';
    const reproved = reproveBookingVoucher(
      bookingId,
      reasonToUse,
      instructorName
    );
    if (reproved) {
      const all = getStoredBookings();
      setBookings(all);
      if (selectedBooking?.id === bookingId) {
        setSelectedBooking(reproved);
      }
    } else {
      const now = new Date().toISOString();
      const updated = bookings.map((b) => {
        if (b.id === bookingId) {
          return {
            ...b,
            status: 'comprovante-reprovado' as BookingStatus,
            rejectedAt: now,
            rejectedBy: instructorName,
            rejectionReason: reasonToUse,
            notes: `Comprovante reprovado: ${reasonToUse}`
          };
        }
        return b;
      });
      setBookings(updated);
      saveStoredBookings(updated);
      if (selectedBooking?.id === bookingId) {
        setSelectedBooking(updated.find((b) => b.id === bookingId) || null);
      }
    }
    setReprovingBooking(null);
    setReproveCustomReason('');
  };

  // Action: Reject Voucher -> Comprovante Rejeitado (Processo Encerrado)
  const handleRejectVoucher = (bookingId: string, reason?: string) => {
    const defaultReason = reason?.trim() || 'Comprovante não válido ou ilegível';
    const rejected = rejectBookingVoucher(bookingId, defaultReason, 'Instrutor Responsável - ABC do Pedal');
    if (rejected) {
      const all = getStoredBookings();
      setBookings(all);
      const slotsLatest = getStoredSlots();
      setSlots(slotsLatest);
      if (selectedBooking?.id === bookingId) {
        setSelectedBooking(rejected);
      }
      if (rejected.whatsappNotification) {
        setRejectionNotificationBanner({
          studentName: rejected.student.fullName,
          phone: rejected.whatsappNotification.targetPhone,
          status: rejected.whatsappNotification.status,
          sentAt: rejected.whatsappNotification.sentAt,
          message: rejected.whatsappNotification.messageContent
        });
      }
    } else {
      const updated = bookings.map((b) => {
        if (b.id === bookingId) {
          return {
            ...b,
            status: 'comprovante-rejeitado' as BookingStatus,
            rejectedAt: new Date().toISOString(),
            rejectionReason: defaultReason,
            notes: `Comprovante rejeitado: ${defaultReason}`
          };
        }
        return b;
      });
      setBookings(updated);
      saveStoredBookings(updated);
      if (selectedBooking?.id === bookingId) {
        setSelectedBooking(updated.find((b) => b.id === bookingId) || null);
      }
    }
    setRejectingBookingId(null);
    setRejectReason('');
  };

  // Action: Update Status
  const handleUpdateStatus = (bookingId: string, newStatus: BookingStatus) => {
    const updated = bookings.map((b) => {
      if (b.id === bookingId) {
        return { ...b, status: newStatus };
      }
      return b;
    });
    setBookings(updated);
    saveStoredBookings(updated);

    if (selectedBooking?.id === bookingId) {
      setSelectedBooking(updated.find((b) => b.id === bookingId) || null);
    }
  };

  // Action: Toggle Milestone for Evolution Tracking
  const handleToggleMilestone = (bookingId: string, milestoneKey: string) => {
    const updated = bookings.map((b) => {
      if (b.id === bookingId) {
        const currentVal = (b.milestones as any)?.[milestoneKey] || false;
        const newMilestones = {
          ...b.milestones,
          [milestoneKey]: !currentVal
        };

        // Check if all skills are reached
        const count = Object.values(newMilestones).filter(Boolean).length;
        const newStatus = count >= skills.length ? ('concluido' as BookingStatus) : b.status;

        return {
          ...b,
          milestones: newMilestones,
          status: newStatus
        };
      }
      return b;
    });

    setBookings(updated);
    saveStoredBookings(updated);

    if (selectedBooking?.id === bookingId) {
      setSelectedBooking(updated.find((b) => b.id === bookingId) || null);
    }
  };

  // Action: Update ABCDE step
  const handleUpdateABCDE = (bookingId: string, step: ABCDEStep) => {
    const updated = bookings.map((b) => {
      if (b.id === bookingId) {
        return { ...b, currentABCDE: step };
      }
      return b;
    });
    setBookings(updated);
    saveStoredBookings(updated);

    if (selectedBooking?.id === bookingId) {
      setSelectedBooking(updated.find((b) => b.id === bookingId) || null);
    }
  };

  // Agenda Action: Block / Unblock slot
  const handleToggleSlotBlock = async (slotId: string) => {
    const target = slots.find((s) => s.id === slotId);
    if (!target) return;
    const newStatus = target.status === 'blocked' ? ('available' as const) : ('blocked' as const);
    const updatedSlot: TimeSlot = { ...target, status: newStatus };
    const updated = slots.map((s) => (s.id === slotId ? updatedSlot : s));
    setSlots(updated);
    saveStoredSlots(updated);
    try {
      await saveSingleSlotToFirestore(updatedSlot);
    } catch (e) {
      console.warn('Erro ao atualizar bloqueio do horário no Firestore:', e);
    }
  };

  // Agenda Action: Add New Slot com persistência real no Banco de Dados
  const handleAddNewSlot = async () => {
    // 1. Validação de data selecionada
    if (!newSlotDate) {
      setAgendaFeedback({
        type: 'warning',
        message: 'Por favor, selecione uma data válida antes de abrir o horário.'
      });
      return;
    }

    // 2. Validação de horário selecionado
    if (!newSlotTime) {
      setAgendaFeedback({
        type: 'warning',
        message: 'Por favor, defina um horário (ex: 08:00) antes de abrir.'
      });
      return;
    }

    // 3. REGRA 9: Impedir a criação duplicada do mesmo horário
    const existingSlot = slots.find((s) => s.date === newSlotDate && s.time === newSlotTime);
    if (existingSlot) {
      if (existingSlot.status === 'available') {
        setAgendaFeedback({
          type: 'warning',
          message: `O horário ${newSlotTime} em ${formatDateBrazilian(newSlotDate)} já está aberto e DISPONÍVEL para agendamento na grade.`
        });
        setSelectedDateFilter(newSlotDate);
        return;
      }
      if (existingSlot.status === 'occupied') {
        setAgendaFeedback({
          type: 'warning',
          message: `O horário ${newSlotTime} em ${formatDateBrazilian(newSlotDate)} já existe e está OCUPADO (${existingSlot.bookedByStudentName || 'por um aluno'}).`
        });
        setSelectedDateFilter(newSlotDate);
        return;
      }
      if (existingSlot.status === 'blocked') {
        setAgendaFeedback({
          type: 'warning',
          message: `O horário ${newSlotTime} em ${formatDateBrazilian(newSlotDate)} já existe com status BLOQUEADO. Clique em "Desbloquear" na grade para torná-lo disponível.`
        });
        setSelectedDateFilter(newSlotDate);
        return;
      }
    }

    // REGRA 7: Utilizar exatamente a data e o horário selecionados sem alterações de fuso
    const newId = `${newSlotDate}_${newSlotTime}`;
    const newSlot: TimeSlot = {
      id: newId,
      date: newSlotDate,
      time: newSlotTime,
      durationMinutes: 50,
      status: 'available',
      locationName: newSlotLocationName?.trim() || undefined,
      createdAt: new Date().toISOString()
    };

    setIsSavingSlot(true);
    setAgendaFeedback(null);

    try {
      // REGRA 5 e 13: Persistência oficial no Banco de Dados (Firestore como fonte da verdade)
      await saveSingleSlotToFirestore(newSlot);

      // REGRA 4 e 8: Atualização automática e imediata da grade de horários
      const updated = [...slots, newSlot].sort((a, b) => {
        const dateComp = a.date.localeCompare(b.date);
        if (dateComp !== 0) return dateComp;
        return a.time.localeCompare(b.time);
      });
      setSlots(updated);
      saveStoredSlots(updated);

      // Sincronizar o filtro da grade para a data selecionada para exibição imediata
      setSelectedDateFilter(newSlotDate);

      // REGRA 10: Apresentar confirmação visual clara informando que o horário foi aberto
      setAgendaFeedback({
        type: 'success',
        message: `Horário ${newSlotTime} aberto com sucesso para ${formatDateBrazilian(newSlotDate)}${newSlotLocationName ? ` [${newSlotLocationName}]` : ''}! Status: DISPONÍVEL.`,
        date: newSlotDate,
        time: newSlotTime,
        lastAddedSlotId: newSlot.id
      });
    } catch (error: any) {
      console.error('Falha ao salvar horário no Firestore:', error);
      // REGRA 11: Se houver erro no salvamento, não atualizar visualmente a grade como se o horário tivesse sido criado.
      setAgendaFeedback({
        type: 'error',
        message: `Erro ao salvar o horário no banco de dados: ${error?.message || 'Falha de comunicação'}. O horário não foi criado.`
      });
    } finally {
      setIsSavingSlot(false);
    }
  };

  // Inserir aluno negociado via WhatsApp em data e horário específicos na Agenda
  const handleAssignSchedule = async (bookingId: string, date: string, time: string, locationName?: string) => {
    if (!date || !time) {
      alert('Por favor, selecione uma data e horário válidos.');
      return;
    }
    setIsAssigningSchedule(true);
    try {
      const locToUse = locationName || scheduleTargetLocationName || studentToSchedule?.assignedLocationName || studentToSchedule?.location?.locationName;
      const targetCity = studentToSchedule?.location?.city || studentToSchedule?.location?.regionTitle;
      const result = await assignInstructorScheduleToBooking(bookingId, date, time, undefined, locToUse, targetCity);
      if (result) {
        const { updatedBooking } = result;
        // Atualizar listagem local de inscrições e slots
        const freshBookings = getStoredBookings();
        setBookings(freshBookings);
        const freshSlots = getStoredSlots();
        setSlots(freshSlots);
        setSelectedBooking(freshBookings.find((b) => b.id === bookingId) || updatedBooking);
        setStudentToSchedule(null);
        setSelectedDateFilter(date);
        setAgendaFeedback({
          type: 'success',
          message: `Aluno(a) ${updatedBooking.student.fullName} inserido(a) na agenda com sucesso para ${formatDateBrazilian(date)} às ${time}${locToUse ? ` no local "${locToUse}"` : ''}! Área do Aluno atualizada automaticamente.`,
          date,
          time
        });
      }
    } catch (err: any) {
      console.error('Erro ao agendar aluno na agenda:', err);
      alert(`Falha ao salvar agendamento: ${err?.message || 'Erro de conexão'}`);
    } finally {
      setIsAssigningSchedule(false);
    }
  };

  // Atribuir ou alterar o local da aula diretamente para uma reserva
  const handleSaveBookingLocation = (bookingId: string, locationName: string) => {
    if (!locationName) return;
    const allLocations = getStoredMunicipalClassLocations();
    const locItem = allLocations.find((l) => l.name.toLowerCase() === locationName.toLowerCase());
    const city = locItem?.city || selectedBooking?.location?.city;
    const restriction = locItem?.restrictionNote;

    const updated = assignInstructorLocationToBooking(bookingId, locationName, city, restriction);
    if (updated) {
      const all = getStoredBookings();
      setBookings(all);
      setSelectedBooking(updated);
      setSelectedLocationForBooking(locationName);
      alert(`Local "${locationName}" confirmado com sucesso para a aula de ${updated.student.fullName}! A Área do Aluno e o comprovante foram atualizados.`);
    }
  };

  // If not authenticated, require password: 16090424
  if (!isAuthenticated) {
    return (
      <div className="w-full max-w-md mx-auto px-4 py-16 text-slate-100" id="admin-login-screen">
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-8 shadow-2xl backdrop-blur-md relative overflow-hidden">
          {/* Ambient Glow Accent */}
          <div className="absolute top-0 right-0 w-44 h-44 bg-pink-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-44 h-44 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-slate-950 border border-amber-500/40 text-amber-400 flex items-center justify-center mb-3 shadow-lg shadow-amber-500/10 relative">
              <Lock className="w-8 h-8 text-amber-400" />
              <div className="absolute -bottom-1 -right-1 p-1 bg-slate-900 rounded-full border border-pink-500/40">
                <Shield className="w-3.5 h-3.5 text-pink-400" />
              </div>
            </div>
            
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[11px] font-mono font-bold uppercase tracking-wider mb-2">
              <Lock className="w-3 h-3" />
              <span>Painel Bloqueado para Alunos</span>
            </div>

            <h2 className="text-2xl font-black text-white">
              Acesso do Instrutor
            </h2>
            <p className="text-xs text-slate-400 mt-2 max-w-xs leading-relaxed">
              O Painel do Instrutor é exclusivo e bloqueado para alunos. Apenas instrutores autorizados possuem acesso.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="admin-password-input" className="block text-xs font-mono text-slate-300 font-bold uppercase tracking-wider">
                  Senha do Instrutor
                </label>
              </div>

              <div className="relative">
                <input
                  id="admin-password-input"
                  type={showPassword ? 'text' : 'password'}
                  value={inputPassword}
                  onChange={(e) => {
                    setInputPassword(e.target.value);
                    if (authError) setAuthError(null);
                  }}
                  placeholder="Digite a senha de acesso"
                  autoFocus
                  className="w-full px-4 py-3 pr-12 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-sm tracking-wider focus:outline-none focus:border-pink-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 cursor-pointer"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Ocultar senha' : 'Exibir senha'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {authError && (
              <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-xs text-rose-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{authError}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-pink-600 to-[#ff007f] hover:from-pink-500 hover:to-pink-600 text-white font-bold text-sm font-mono flex items-center justify-center gap-2 transition-all shadow-lg shadow-pink-600/30 cursor-pointer"
              id="btn-admin-entrar"
            >
              <Key className="w-4 h-4" />
              <span>Desbloquear Painel do Instrutor</span>
            </button>

            {onExitAdmin && (
              <button
                type="button"
                onClick={handleExitWithLock}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-950 hover:bg-slate-900 border border-slate-800 text-xs text-slate-400 hover:text-white font-mono transition-colors cursor-pointer"
              >
                Voltar à Área do Aluno
              </button>
            )}
          </form>

          <div className="mt-6 pt-4 border-t border-slate-800/80 text-center">
            <span className="text-[10px] text-slate-500 font-mono">
              Ambiente protegido por senha • ABC do Pedal Operacional
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 text-slate-100" id="admin-panel">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-pink-600 text-white font-mono text-xs font-bold uppercase px-2.5 py-0.5 rounded-full">
              Painel do Instrutor
            </span>
            <span className="text-xs text-slate-400 font-mono">Gestão do Aprender a Pedalar</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white mt-1">
            Controle Operacional & Evolução
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Indicador de Sincronização em Tempo Real de Alunos */}
          <div 
            id="admin-realtime-badge"
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-emerald-500/40 shadow-sm"
          >
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-mono font-bold text-emerald-400">
                  Ao Vivo
                </span>
                <span className="text-[9px] font-mono text-slate-400 hidden sm:inline">
                  • Atualiza com dados de alunos
                </span>
              </div>
              {lastSyncTime && (
                <span className="text-[9px] font-mono text-slate-400 leading-none">
                  Sinc: {lastSyncTime}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={handleManualSync}
              disabled={isSyncing}
              title="Sincronizar agora"
              className="ml-1 p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-emerald-400 transition-colors disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-emerald-400' : ''}`} />
            </button>
          </div>

          <button
            onClick={handleLogout}
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-rose-950/40 text-xs font-mono font-bold text-slate-400 hover:text-rose-400 border border-slate-800 hover:border-rose-500/40 flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Bloquear painel"
            id="btn-admin-logout"
          >
            <Lock className="w-3.5 h-3.5 text-amber-400" />
            <span>Bloquear Painel</span>
          </button>

          {onExitAdmin && (
            <button
              onClick={handleExitWithLock}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-mono font-bold text-slate-300 border border-slate-800 cursor-pointer"
            >
              Voltar ao Site
            </button>
          )}
        </div>
      </div>

      {/* Banner de Notificação de Nova Informação de Alunos */}
      {recentStudentNotification && (
        <div
          id="admin-student-update-banner"
          className="mb-6 p-4 rounded-xl bg-gradient-to-r from-emerald-950/90 via-slate-900 to-slate-900 border border-emerald-500/60 shadow-lg shadow-emerald-950/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-300"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0">
              <Bell className="w-4 h-4 text-emerald-400 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                  Nova informação de aluno
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  {new Date(recentStudentNotification.timestamp).toLocaleTimeString('pt-BR')}
                </span>
              </div>
              <p className="text-sm font-bold text-white mt-0.5">
                {recentStudentNotification.studentName} — <span className="text-emerald-400 font-normal">{recentStudentNotification.action}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={() => {
                const target = bookings.find((b) => b.id === recentStudentNotification.id);
                if (target) {
                  setSelectedBooking(target);
                  setActiveTab('reservas');
                }
                setRecentStudentNotification(null);
              }}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-bold flex items-center gap-1.5 transition-all shadow cursor-pointer"
            >
              <span>Ver Aluno</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setRecentStudentNotification(null)}
              className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Dispensar aviso"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Menu Principal do Instrutor */}
      <div className="flex gap-1.5 overflow-x-auto pb-2.5 mb-6 border-b border-slate-800/80 no-scrollbar">
        {[
          {
            id: 'visao-geral',
            label: 'Visão Geral',
            icon: LayoutDashboard
          },
          {
            id: 'comprovantes-pendentes',
            label: 'Comprovantes Pendentes',
            icon: FileCheck,
            badge: pendingVouchersCount > 0 ? `${pendingVouchersCount}` : undefined,
            badgeColor: 'bg-amber-500 text-slate-950 font-black animate-pulse'
          },
          {
            id: 'alunos',
            label: 'Alunos',
            icon: Users,
            badge: `${uniqueStudentsCount}`
          },
          {
            id: 'evolucao',
            label: 'Evolução dos Alunos',
            icon: Award
          },
          {
            id: 'agenda',
            label: 'Gestão de Horários',
            icon: Calendar
          },
          {
            id: 'locais',
            label: 'Locais de Aula',
            icon: MapPin,
            badge: 'SBC • Santo André • SP',
            badgeColor: 'bg-pink-950/80 text-pink-300 border border-pink-500/40'
          },
          {
            id: 'automacao',
            label: 'WhatsApp / Automação',
            icon: MessageCircle
          },
          {
            id: 'reservas',
            label: 'Reservas e Pagamentos',
            icon: CreditCard,
            badge: pendingVouchersCount > 0 ? 'Pendente' : undefined,
            badgeColor: 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
          },
          {
            id: 'financeiro',
            label: 'Financeiro',
            icon: DollarSign
          },
          {
            id: 'planos',
            label: 'Planos e Produtos',
            icon: Package
          },
          {
            id: 'galeria',
            label: 'Galeria Viva',
            icon: Sparkles
          },
          {
            id: 'configuracoes',
            label: 'Configurações',
            icon: Settings2
          }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as AdminTabType)}
              className={`px-3.5 py-2.5 rounded-xl text-xs font-mono font-bold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
                isActive
                  ? 'bg-pink-600 text-white shadow-lg shadow-pink-950/40'
                  : 'bg-slate-950 text-slate-400 hover:text-white hover:bg-slate-900 border border-slate-800/80'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
              {tab.badge && (
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold leading-none ${
                    tab.badgeColor || (isActive ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-300')
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ========================================================= */}
      {/* ABA: VISÃO GERAL (DASHBOARD INICIAL) */}
      {/* ========================================================= */}
      {activeTab === 'visao-geral' && (
        <AdminDashboardView
          bookings={bookings}
          onNavigate={(tab) => setActiveTab(tab)}
          onSelectBooking={(b) => setSelectedBooking(b)}
          onApproveVoucher={(b) => handleConfirmPayment(b.id)}
          onRequestReproveVoucher={(b) => setReprovingBooking(b)}
          onOpenVoucherModal={(url) => setVoucherModalUrl(url)}
        />
      )}

      {/* ========================================================= */}
      {/* ABA: COMPROVANTES PENDENTES */}
      {/* ========================================================= */}
      {activeTab === 'comprovantes-pendentes' && (
        <AdminVouchersView
          bookings={bookings}
          onNavigate={(tab) => setActiveTab(tab)}
          onSelectBooking={(b) => setSelectedBooking(b)}
          onApproveVoucher={(b) => handleConfirmPayment(b.id)}
          onRequestReproveVoucher={(b) => setReprovingBooking(b)}
          onOpenVoucherModal={(url) => setVoucherModalUrl(url)}
        />
      )}

      {/* ========================================================= */}
      {/* ABA: ALUNOS */}
      {/* ========================================================= */}
      {activeTab === 'alunos' && (
        <AdminStudentsView
          bookings={bookings}
          onSelectBooking={(b) => setSelectedBooking(b)}
          onNavigate={(tab) => setActiveTab(tab)}
          onOpenCertificateModal={(b) => setAdminCertificateBooking(b)}
          onOpenVoucherModal={(url) => setVoucherModalUrl(url)}
          onUpdateBookings={(updated) => applyUpdatedBookings(updated, true)}
          onApproveVoucher={(b) => handleConfirmPayment(b.id)}
          onRequestReproveVoucher={(b) => setReprovingBooking(b)}
        />
      )}

      {/* ========================================================= */}
      {/* TAB 1: RESERVAS & PAGAMENTOS */}
      {/* ========================================================= */}
      {activeTab === 'reservas' && (
        <div className="space-y-6">
          
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-slate-950 p-4 rounded-xl border border-slate-800">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por nome, CPF ou WhatsApp..."
                className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-pink-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
              <span className="text-xs font-mono text-slate-500">Status:</span>
              {[
                { id: 'all', label: 'Todos' },
                { id: 'comprovante-enviado', label: 'Comprovante Enviado' },
                { id: 'confirmado', label: 'Confirmados' },
                { id: 'comprovante-rejeitado', label: 'Comprovante Reprovado' },
                { id: 'aguardando-novo-pagamento', label: 'Aguardando Novo Pgto' },
                { id: 'pre-agendado', label: 'Pré-agendados' },
                { id: 'cancelado', label: 'Cancelados' }
              ].map((st) => (
                <button
                  key={st.id}
                  onClick={() => setStatusFilter(st.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors whitespace-nowrap ${
                    statusFilter === st.id
                      ? 'bg-pink-950 text-pink-400 border border-pink-500 font-bold'
                      : 'bg-slate-900 text-slate-400 border border-slate-800'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>

          {/* Banner de Notificação de Rejeição de Comprovante */}
          {rejectionNotificationBanner && (
            <div className="p-4 rounded-xl bg-rose-950/80 border border-rose-500/60 text-xs space-y-2 text-white shadow-lg animate-fade-in" id="banner-rejeicao-admin-alerta">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold font-mono text-rose-300">
                  <X className="w-4 h-4 text-rose-400" />
                  <span>COMPROVANTE REJEITADO — PROCESSO ENCERRADO</span>
                </div>
                <button
                  type="button"
                  onClick={() => setRejectionNotificationBanner(null)}
                  className="text-slate-400 hover:text-white text-xs font-mono cursor-pointer"
                >
                  ✕ Fechar
                </button>
              </div>
              <p className="text-slate-200">
                A solicitação do cliente <strong>{rejectionNotificationBanner.studentName}</strong> foi encerrada e o horário foi liberado para a grade.
                O cadastro do cliente permanece preservado no sistema para fins de histórico e controle.
              </p>
              <div className="p-2.5 rounded-lg bg-black/40 border border-rose-500/30 text-[11px] font-mono text-rose-200 space-y-1">
                <p>
                  <strong>WhatsApp de rejeição: {rejectionNotificationBanner.status}</strong> para {rejectionNotificationBanner.phone}
                </p>
                <p className="text-slate-400 text-[10px]">
                  Enviado em: {new Date(rejectionNotificationBanner.sentAt).toLocaleString('pt-BR')} | Sessão do aluno invalidada.
                </p>
              </div>
            </div>
          )}

          {/* Bookings List and Details Split View */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Bookings List */}
            <div className="lg:col-span-2 space-y-3">
              {filteredBookings.length === 0 ? (
                <div className="p-8 text-center bg-slate-950 border border-slate-800 rounded-xl text-slate-400 text-xs">
                  Nenhum agendamento encontrado para este filtro.
                </div>
              ) : (
                filteredBookings.map((b) => {
                  const isSelected = selectedBooking?.id === b.id;
                  return (
                    <div
                      key={b.id}
                      onClick={() => setSelectedBooking(b)}
                      className={`p-4 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-slate-900 border-pink-500 shadow-lg shadow-pink-950/20'
                          : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div>
                          <span className="text-sm font-bold text-white block">
                            {b.student.fullName}
                          </span>
                          <span className="text-xs text-slate-400 font-mono">
                            {b.student.whatsapp} | {b.student.ageProfile}
                          </span>
                        </div>

                        <span className={`text-[10px] font-mono uppercase font-bold px-2.5 py-0.5 rounded-full ${
                          b.status === 'confirmado' || b.status === 'agendamento-confirmado' || b.status === 'pagamento-confirmado' ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/40' :
                          b.status === 'comprovante-enviado' || b.status === 'aguardando-confirmacao-instrutor' || b.status === 'pagamento-enviado' || b.status === 'aguardando-pagamento' ? 'bg-amber-950 text-amber-300 border border-amber-500/40' :
                          b.status === 'aguardando-novo-pagamento' ? 'bg-amber-950 text-amber-300 border border-amber-500/50' :
                          b.status === 'comprovante-rejeitado' || b.status === 'comprovante-reprovado' || b.status === 'pedido-rejeitado' || b.status === 'pagamento-nao-confirmado' ? 'bg-rose-950 text-rose-300 border border-rose-500/50' :
                          b.status === 'cancelado' || b.status === 'reserva-expirada' ? 'bg-zinc-900 text-zinc-400 border border-zinc-700' :
                          b.status === 'concluido' ? 'bg-pink-950 text-pink-300 border border-pink-500/40' :
                          'bg-slate-900 text-slate-400 border border-slate-800'
                        }`}>
                          {b.status === 'confirmado' || b.status === 'agendamento-confirmado' || b.status === 'pagamento-confirmado' ? 'Confirmado' :
                           b.status === 'comprovante-enviado' || b.status === 'aguardando-confirmacao-instrutor' ? 'Aguardando Instrutor' :
                           b.status === 'aguardando-novo-pagamento' ? 'Aguardando Novo Pgto' :
                           b.status === 'comprovante-reprovado' ? 'Comprovante Reprovado' :
                           b.status === 'comprovante-rejeitado' || b.status === 'pedido-rejeitado' ? 'Comprovante Rejeitado' :
                           b.status === 'pagamento-nao-confirmado' ? 'Comprovante Rejeitado' :
                           b.status === 'aguardando-pagamento' ? 'Aguardando Pgto' :
                           b.status === 'pagamento-enviado' ? 'Validação' :
                           b.status === 'reserva-expirada' ? 'Expirada' :
                           b.status === 'cancelado' ? 'Cancelado' :
                           b.status === 'concluido' ? 'Concluído' : b.status}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center justify-between text-xs text-slate-300 gap-2 pt-2 border-t border-slate-900">
                        <span className="flex items-center gap-1 font-mono">
                          <Calendar className="w-3.5 h-3.5 text-pink-400" />
                          {isBookingAwaitingInstructorSchedule(b) ? (
                            <span className="text-amber-300 font-bold">Aguardando na Agenda</span>
                          ) : (
                            b.slot?.date ? `${formatDateBrazilian(b.slot.date)} às ${b.slot.time}` : 'Sem data'
                          )}
                        </span>

                        <span className="text-pink-400 font-mono font-bold">
                          R$ {(b.price || b.location?.price || 499).toFixed(2).replace('.', ',')}
                        </span>

                        {b.voucherFileName && (
                          <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-mono">
                            <FileText className="w-3 h-3" />
                            Comprovante anexado
                          </span>
                        )}
                      </div>

                      {/* Miniatura do Comprovante Imediatamente Visível no Card */}
                      {Boolean(getBookingVoucherUrl(b)) && (
                        <div className="mt-2.5 pt-2 border-t border-slate-900 flex items-center justify-between gap-2.5 bg-slate-950/70 p-2 rounded-lg border border-slate-800/80">
                          <div className="flex items-center gap-2.5 overflow-hidden">
                            <div 
                              className="w-10 h-10 rounded-md bg-black border border-slate-700 overflow-hidden shrink-0 relative group/thumb cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                setVoucherModalUrl(getBookingVoucherUrl(b));
                              }}
                              title="Clique para conferir o comprovante em tamanho maior"
                            >
                              <img
                                src={getBookingVoucherUrl(b)!}
                                alt={`Comprovante ${b.student?.fullName}`}
                                className="w-full h-full object-cover group-hover/thumb:scale-110 transition-transform"
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center transition-opacity">
                                <Eye className="w-3 h-3 text-white" />
                              </div>
                            </div>
                            <div className="text-[11px] font-mono leading-tight truncate">
                              <span className="text-emerald-400 font-bold flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                                Comprovante Anexado
                              </span>
                              <span className="text-slate-400 block text-[10px] truncate max-w-[160px]">
                                {b.voucherFileName || 'comprovante.jpg'}
                              </span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setVoucherModalUrl(getBookingVoucherUrl(b));
                            }}
                            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-mono flex items-center gap-1 border border-slate-700 shrink-0 cursor-pointer"
                            title="Conferir comprovante agora"
                          >
                            <Eye className="w-3 h-3 text-pink-400" />
                            <span>Conferir</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Selected Booking Drawer Details */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-5">
              {selectedBooking ? (() => {
                const voucherDisplayUrl = getBookingVoucherUrl(selectedBooking);
                return (
                  <>
                    {/* Cabeçalho da Inscrição Selecionada */}
                    <div className="pb-4 border-b border-slate-800">
                      <div className="flex items-center gap-2 flex-wrap mb-1.5">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-pink-500/10 text-pink-400 font-bold uppercase border border-pink-500/20">
                          Inscrição #{selectedBooking.id}
                        </span>
                        <span className={`text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded-full ${
                          selectedBooking.status === 'confirmado' || selectedBooking.status === 'agendamento-confirmado' || selectedBooking.status === 'pagamento-confirmado'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                            : selectedBooking.status === 'comprovante-enviado' || selectedBooking.status === 'aguardando-confirmacao-instrutor' || selectedBooking.status === 'pagamento-enviado'
                            ? 'bg-amber-950 text-amber-300 border border-amber-500/40'
                            : selectedBooking.status === 'aguardando-novo-pagamento'
                            ? 'bg-amber-950 text-amber-300 border border-amber-500/50'
                            : selectedBooking.status === 'comprovante-rejeitado' || selectedBooking.status === 'comprovante-reprovado' || selectedBooking.status === 'pedido-rejeitado' || selectedBooking.status === 'pagamento-nao-confirmado'
                            ? 'bg-rose-950 text-rose-300 border border-rose-500/50'
                            : 'bg-slate-900 text-slate-300 border border-slate-800'
                        }`}>
                          {selectedBooking.status === 'confirmado' || selectedBooking.status === 'agendamento-confirmado' || selectedBooking.status === 'pagamento-confirmado'
                            ? 'Agendamento Confirmado'
                            : selectedBooking.status === 'comprovante-enviado' || selectedBooking.status === 'aguardando-confirmacao-instrutor'
                            ? 'Aguardando Confirmação do Instrutor'
                            : selectedBooking.status === 'aguardando-novo-pagamento'
                            ? 'Aguardando Novo Pagamento/Comprovante'
                            : selectedBooking.status === 'comprovante-reprovado'
                            ? 'Comprovante Reprovado'
                            : selectedBooking.status === 'comprovante-rejeitado' || selectedBooking.status === 'pedido-rejeitado' || selectedBooking.status === 'pagamento-nao-confirmado'
                            ? 'Comprovante Rejeitado'
                            : selectedBooking.status}
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-white leading-snug">
                        {selectedBooking.student.fullName}
                      </h3>
                    </div>

                    {/* DADOS DO ALUNO */}
                    <div className="space-y-3 p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                      <div className="flex items-center gap-2 text-xs font-mono font-bold text-pink-400 uppercase tracking-wide">
                        <User className="w-3.5 h-3.5 text-pink-400" />
                        <span>DADOS DO ALUNO</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                        <div>
                          <span className="text-slate-400 font-mono block text-[11px]">Nome Completo:</span>
                          <p className="font-semibold text-white">{selectedBooking.student.fullName}</p>
                        </div>
                        <div>
                          <span className="text-slate-400 font-mono block text-[11px]">CPF:</span>
                          <p className="font-mono text-slate-200">{selectedBooking.student.cpf || 'Não informado'}</p>
                        </div>
                        <div>
                          <span className="text-slate-400 font-mono block text-[11px]">WhatsApp:</span>
                          <p className="font-mono text-emerald-400 font-semibold">{selectedBooking.student.whatsapp}</p>
                        </div>
                        <div>
                          <span className="text-slate-400 font-mono block text-[11px]">E-mail:</span>
                          <p className="font-mono text-slate-300 truncate">{selectedBooking.student.email}</p>
                        </div>
                        <div>
                          <span className="text-slate-400 font-mono block text-[11px]">Perfil / Altura / Peso:</span>
                          <p className="text-slate-200">
                            {selectedBooking.student.ageProfile === 'crianca_adolescente' ? 'Criança / Adolescente' : 'Adulto'} • {selectedBooking.student.heightCm} cm • {selectedBooking.student.weightKg} kg
                          </p>
                        </div>
                        <div>
                          <span className="text-slate-400 font-mono block text-[11px]">Necessidades específicas:</span>
                          <p className="text-slate-200">
                            {selectedBooking.student.hasSpecificNeeds
                              ? selectedBooking.student.specificNeedsDescription
                              : 'Nenhuma necessidade informada.'}
                          </p>
                        </div>
                      </div>

                      {/* Responsável Legal (se houver) */}
                      {selectedBooking.student.guardian && (
                        <div className="mt-2 pt-2 border-t border-slate-800 text-xs bg-pink-950/20 p-2.5 rounded-lg border border-pink-500/20 space-y-1">
                          <span className="font-bold text-pink-300 font-mono text-[11px] block">Responsável Legal:</span>
                          <p className="text-white font-medium">{selectedBooking.student.guardian.fullName} ({selectedBooking.student.guardian.relation})</p>
                          {selectedBooking.student.guardian.cpf && (
                            <p className="text-slate-400 font-mono text-[11px]">CPF: {selectedBooking.student.guardian.cpf}</p>
                          )}
                          <p className="text-slate-400 font-mono text-[11px]">WhatsApp: {selectedBooking.student.guardian.whatsapp}</p>
                        </div>
                      )}
                    </div>

                    {/* DADOS DA AULA */}
                    <div className="space-y-2 p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                      <div className="flex items-center gap-2 text-xs font-mono font-bold text-pink-400 uppercase tracking-wide">
                        <FileText className="w-3.5 h-3.5 text-pink-400" />
                        <span>DADOS DA AULA</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                        <div>
                          <span className="text-slate-400 font-mono block text-[11px]">Programa / Modalidade:</span>
                          <p className="font-semibold text-white">{selectedBooking.productName || 'Programa Aprender a Pedalar'}</p>
                        </div>
                        <div>
                          <span className="text-slate-400 font-mono block text-[11px]">Duração da Aula:</span>
                          <p className="text-slate-200">{selectedBooking.slot.durationMinutes || 50} minutos (100% individual)</p>
                        </div>
                      </div>
                    </div>

                    {/* LOCAL */}
                    <div className="space-y-3 p-4 rounded-xl bg-slate-900/60 border border-slate-800" id="admin-booking-location-selector">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs font-mono font-bold text-pink-400 uppercase tracking-wide">
                          <MapPin className="w-3.5 h-3.5 text-pink-400" />
                          <span>LOCAL DA AULA (CONTROLE DO INSTRUTOR)</span>
                        </div>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-pink-300 border border-slate-700 font-bold">
                          {selectedBooking.location?.city || selectedBooking.location?.regionTitle || 'São Paulo'}
                        </span>
                      </div>

                      <div className="text-xs space-y-1.5 bg-slate-950/80 p-3 rounded-xl border border-slate-800/80">
                        <span className="text-[10px] font-mono text-slate-400 block uppercase tracking-wider">Local Atribuído no Momento:</span>
                        <p className="font-bold text-white text-sm flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                          <span>
                            {selectedBooking.assignedLocationName || selectedBooking.location?.locationName || selectedBooking.slot?.locationName || 'A definir pelo instrutor'}
                          </span>
                        </p>
                        {selectedBooking.assignedLocationRestriction && (
                          <div className="p-1.5 rounded-lg bg-amber-950/50 border border-amber-500/40 text-[11px] text-amber-300 font-mono flex items-center gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            <span>Restrição: {selectedBooking.assignedLocationRestriction}</span>
                          </div>
                        )}
                        {selectedBooking.location?.address && (
                          <p className="text-slate-400 font-mono text-[11px] pt-0.5">
                            {selectedBooking.location.address}
                          </p>
                        )}
                        <p className="text-slate-500 text-[10px] font-mono">
                          Município: <strong className="text-slate-300">{selectedBooking.location?.city || selectedBooking.location?.regionTitle || 'São Paulo'}</strong>
                          {selectedBooking.location?.cep && ` • CEP: ${selectedBooking.location.cep}`}
                        </p>
                      </div>

                      {/* Dropdown de Seleção de Locais Disponíveis para o Município */}
                      {(() => {
                        const bookingCity = selectedBooking.location?.city || selectedBooking.location?.regionTitle || 'São Bernardo do Campo';
                        const availableLocations = getAvailableClassLocationsForCity(bookingCity);
                        const isStudentAdult = selectedBooking.student?.ageProfile !== 'crianca_adolescente';
                        const currentLocName = selectedLocationForBooking || selectedBooking.assignedLocationName || selectedBooking.location?.locationName || '';

                        return (
                          <div className="pt-2 border-t border-slate-800/70 space-y-2">
                            <label className="block text-[11px] font-mono text-slate-300 font-bold">
                              Definir / Alterar Local ({bookingCity}):
                            </label>
                            <div className="flex flex-col sm:flex-row gap-2">
                              <select
                                value={currentLocName}
                                onChange={(e) => setSelectedLocationForBooking(e.target.value)}
                                className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-pink-500"
                              >
                                <option value="">-- Selecione entre os locais disponíveis --</option>
                                {availableLocations.map((al) => (
                                  <option key={al.id} value={al.name}>
                                    {al.name} {al.restrictionNote ? `(${al.restrictionNote})` : ''}
                                  </option>
                                ))}
                              </select>
                              <button
                                type="button"
                                onClick={() => handleSaveBookingLocation(selectedBooking.id, currentLocName || availableLocations[0]?.name)}
                                className="px-4 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-mono text-xs font-bold transition-all cursor-pointer shadow-sm shrink-0 flex items-center justify-center gap-1"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Salvar Local</span>
                              </button>
                            </div>

                            {/* Alerta de restrição se Parque Celso Daniel for escolhido para adulto */}
                            {currentLocName?.toLowerCase().includes('celso daniel') && isStudentAdult && (
                              <div className="p-2.5 rounded-lg bg-amber-950/60 border border-amber-500/40 text-[11px] font-mono text-amber-200 flex items-start gap-1.5">
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                                <span>Atenção: O Parque Celso Daniel possui restrição <strong>exclusiva para crianças</strong>. Este aluno possui perfil <strong>Adulto</strong>.</span>
                              </div>
                            )}

                            <p className="text-[10px] font-mono text-slate-500">
                              * Somente locais com status Disponível são exibidos para novos agendamentos. A escolha fica sob controle do instrutor considerando características da aula.
                            </p>
                          </div>
                        );
                      })()}
                    </div>

                    {/* DATA E HORÁRIO */}
                    <div className="space-y-2 p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                      <div className="flex items-center gap-2 text-xs font-mono font-bold text-pink-400 uppercase tracking-wide">
                        <Calendar className="w-3.5 h-3.5 text-pink-400" />
                        <span>DATA E HORÁRIO</span>
                      </div>
                      {isBookingAwaitingInstructorSchedule(selectedBooking) ? (
                        <div className="space-y-3 pt-1">
                          <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/40 space-y-1.5">
                            <span className="text-amber-300 font-mono text-xs font-bold flex items-center gap-1.5">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                              AGUARDANDO CONFIRMAÇÃO DO INSTRUTOR NA AGENDA
                            </span>
                            <p className="text-[11px] text-slate-300 leading-relaxed">
                              Este aluno não encontrou horário disponível e negociou diretamente pelo WhatsApp. Defina a data e o horário na agenda para confirmar a aula.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setStudentToSchedule(selectedBooking);
                              setScheduleTargetDate(new Date().toISOString().split('T')[0]);
                              setScheduleTargetTime('09:00');
                            }}
                            className="w-full py-2.5 px-3 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-mono text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
                            id="btn-inserir-aluno-agenda-reservas"
                          >
                            <Calendar className="w-4 h-4" />
                            <span>Inserir Aluno na Agenda / Definir Data e Horário</span>
                          </button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-2.5 text-xs">
                          <div>
                            <span className="text-slate-400 font-mono block text-[11px]">Data agendada:</span>
                            <p className="font-bold text-white">
                              {selectedBooking.slot?.date ? `${formatDateBrazilian(selectedBooking.slot.date)} (${getWeekdayName(selectedBooking.slot.date)})` : 'Não definida'}
                            </p>
                          </div>
                          <div>
                            <span className="text-slate-400 font-mono block text-[11px]">Horário de Início:</span>
                            <p className="font-bold text-pink-400 font-mono text-sm">
                              {selectedBooking.slot?.time || 'Não definido'}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* VALOR */}
                    <div className="space-y-2 p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                      <div className="flex items-center gap-2 text-xs font-mono font-bold text-pink-400 uppercase tracking-wide">
                        <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                        <span>VALOR</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-slate-400 font-mono block text-[11px]">Valor da Contratação:</span>
                          <span className="text-xl font-bold font-mono text-emerald-400">
                            R$ {(selectedBooking.price || selectedBooking.location?.price || 499).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        <span className="px-2.5 py-1 rounded bg-slate-800 border border-slate-700 font-mono text-[11px] text-slate-300">
                          {selectedBooking.paymentGateway === 'pagbank' ? 'PagBank' : 'PIX Oficial'}
                        </span>
                      </div>
                    </div>

                    {/* Histórico se já estiver rejeitado */}
                    {selectedBooking.status === 'comprovante-rejeitado' || selectedBooking.status === 'pedido-rejeitado' || selectedBooking.status === 'pagamento-nao-confirmado' ? (
                      <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/50 text-xs space-y-4 shadow-lg shadow-rose-950/30" id="admin-rejected-audit-box">
                        <div className="flex items-center justify-between pb-3 border-b border-rose-900/60">
                          <div className="flex items-center gap-2 font-bold font-mono text-rose-300 text-sm">
                            <X className="w-4 h-4 text-rose-400" />
                            <span>COMPROVANTE REJEITADO — PROCESSO ENCERRADO</span>
                          </div>
                          <span className="px-2.5 py-1 rounded text-[10px] font-mono font-bold uppercase bg-rose-950 text-rose-300 border border-rose-500/60">
                            Rejeitado
                          </span>
                        </div>

                        {/* Informações detalhadas da rejeição */}
                        <div className="space-y-2 font-mono text-[11px] text-slate-200 bg-slate-950/70 p-3 rounded-xl border border-rose-500/30">
                          <p>
                            <span className="text-slate-400">Status da Solicitação:</span>{' '}
                            <strong className="text-rose-300">Comprovante Rejeitado (Processo Encerrado)</strong>
                          </p>
                          <p>
                            <span className="text-slate-400">Data e Hora da Rejeição:</span>{' '}
                            <strong className="text-white">
                              {selectedBooking.rejectedAt ? new Date(selectedBooking.rejectedAt).toLocaleString('pt-BR') : 'Registrado'}
                            </strong>
                          </p>
                          <p>
                            <span className="text-slate-400">Instrutor Responsável:</span>{' '}
                            <strong className="text-white">
                              {selectedBooking.rejectedBy || 'Instrutor Responsável - ABC do Pedal'}
                            </strong>
                          </p>
                          <p>
                            <span className="text-slate-400">Motivo da Rejeição:</span>{' '}
                            <span className="text-rose-300 font-semibold">
                              {selectedBooking.rejectionReason || selectedBooking.notes || 'Comprovante não válido ou ilegível'}
                            </span>
                          </p>
                          {selectedBooking.voucherFileName && (
                            <p className="truncate">
                              <span className="text-slate-400">Comprovante Analisado:</span> {selectedBooking.voucherFileName}
                            </p>
                          )}
                          {selectedBooking.voucherSentAt && (
                            <p>
                              <span className="text-slate-400">Data/Hora Envio do Comprovante:</span>{' '}
                              {new Date(selectedBooking.voucherSentAt).toLocaleString('pt-BR')}
                            </p>
                          )}
                        </div>

                        {/* Registro de Notificação Automática do WhatsApp */}
                        <div className="p-3.5 rounded-xl bg-black/60 border border-rose-500/40 space-y-2 text-[11px] font-mono">
                          <div className="flex items-center justify-between">
                            <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                              <Check className="w-4 h-4 text-emerald-400" />
                              WhatsApp de rejeição: {selectedBooking.whatsappNotification?.status || 'ENVIADO'}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {selectedBooking.whatsappNotification?.sentAt
                                ? new Date(selectedBooking.whatsappNotification.sentAt).toLocaleString('pt-BR')
                                : (selectedBooking.rejectedAt ? new Date(selectedBooking.rejectedAt).toLocaleString('pt-BR') : '')}
                            </span>
                          </div>
                          <p className="text-slate-300">
                            <span className="text-slate-500">Destinatário:</span>{' '}
                            <strong className="text-white">
                              {selectedBooking.whatsappNotification?.targetPhone || selectedBooking.student.whatsapp}
                            </strong>
                          </p>
                          <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 text-[11px] text-slate-300 whitespace-pre-line leading-relaxed">
                            {selectedBooking.whatsappNotification?.messageContent ||
                              buildRejectionWhatsAppMessage(selectedBooking.student.fullName)}
                          </div>
                        </div>

                        {/* Visualização do comprovante rejeitado se houver */}
                        {voucherDisplayUrl && (
                          <div className="space-y-2">
                            <span className="text-[11px] font-mono text-slate-400 block font-bold uppercase">
                              Comprovante Anexado Analisado:
                            </span>
                            <div
                              className="relative group cursor-pointer overflow-hidden rounded-xl border border-rose-900/60 bg-black/60 p-2 flex items-center justify-center"
                              onClick={() => setVoucherModalUrl(voucherDisplayUrl)}
                            >
                              <img
                                src={voucherDisplayUrl}
                                alt={`Comprovante Rejeitado de ${selectedBooking.student.fullName}`}
                                className="w-full max-h-48 object-contain rounded-lg"
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-xs font-mono font-bold gap-1.5">
                                <Eye className="w-4 h-4" />
                                <span>Ver Comprovante em Tamanho Maior</span>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => setVoucherModalUrl(voucherDisplayUrl)}
                              className="w-full py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 text-[11px] font-mono flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-slate-800"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Visualizar Imagem do Comprovante Rejeitado</span>
                            </button>
                          </div>
                        )}

                        {/* Regras e Auditoria */}
                        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] text-slate-300 space-y-1.5 leading-relaxed">
                          <p className="flex items-start gap-1.5">
                            <Shield className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                            <span><strong>Cadastro Preservado:</strong> Os dados do cliente permanecem salvos no sistema para fins de histórico e controle administrativo.</span>
                          </p>
                          <p className="flex items-start gap-1.5">
                            <Lock className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                            <span><strong>Acesso Invalidado:</strong> A sessão do aluno foi encerrada e o acesso a este processo foi invalidado.</span>
                          </p>
                          <p className="flex items-start gap-1.5">
                            <RotateCcw className="w-3.5 h-3.5 text-pink-400 shrink-0 mt-0.5" />
                            <span><strong>Horário Liberado:</strong> O horário ({formatDateBrazilian(selectedBooking.slot.date)} às {selectedBooking.slot.time}) voltou a ficar disponível para novos alunos.</span>
                          </p>
                        </div>

                        {/* Link WhatsApp direto de contingência */}
                        <a
                          href={`https://wa.me/55${(selectedBooking.student.whatsapp || '').replace(/\D/g, '')}?text=${encodeURIComponent(
                            selectedBooking.whatsappNotification?.messageContent ||
                              buildRejectionWhatsAppMessage(selectedBooking.student.fullName)
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full py-2.5 rounded-xl bg-emerald-950/70 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/40 text-xs font-mono flex items-center justify-center gap-2 transition-colors cursor-pointer"
                        >
                          <MessageCircle className="w-4 h-4" />
                          <span>Abrir WhatsApp do Cliente ({selectedBooking.student.whatsapp})</span>
                        </a>
                      </div>
                    ) : (
                      /* COMPROVANTE DE PAGAMENTO & VISUALIZAÇÃO & CONTROLES DO INSTRUTOR */
                      <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 text-xs space-y-4 shadow-xl" id="admin-voucher-box">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                          <div className="flex items-center gap-2 font-bold font-mono text-white text-sm">
                            <FileText className="w-4 h-4 text-emerald-400" />
                            <span>COMPROVANTE DE PAGAMENTO</span>
                          </div>
                          <span className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                            selectedBooking.status === 'confirmado' || selectedBooking.status === 'agendamento-confirmado' || selectedBooking.status === 'pagamento-confirmado'
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                              : selectedBooking.status === 'comprovante-reprovado'
                              ? 'bg-rose-950 text-rose-300 border border-rose-500/50'
                              : selectedBooking.status === 'aguardando-novo-pagamento'
                              ? 'bg-amber-950 text-amber-300 border border-amber-500/50'
                              : 'bg-amber-950 text-amber-300 border border-amber-500/40'
                          }`}>
                            {selectedBooking.status === 'confirmado' || selectedBooking.status === 'agendamento-confirmado' || selectedBooking.status === 'pagamento-confirmado'
                              ? 'Pagamento Confirmado'
                              : selectedBooking.status === 'comprovante-reprovado'
                              ? 'Comprovante Reprovado'
                              : selectedBooking.status === 'aguardando-novo-pagamento'
                              ? 'Aguardando Novo Pagamento'
                              : 'Comprovante em Análise'}
                          </span>
                        </div>

                        {/* Metadados e identificação explícita da inscrição e aluno */}
                        <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-1.5 font-mono text-[11px] text-slate-300">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">Inscrição Vinculada:</span>
                            <strong className="text-pink-400 font-bold">#{selectedBooking.id}</strong>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">Aluno:</span>
                            <strong className="text-white">{selectedBooking.student.fullName}</strong>
                          </div>
                          {(() => {
                            const latestVoucherFileName = (selectedBooking.voucherAttempts && selectedBooking.voucherAttempts.length > 0
                              ? selectedBooking.voucherAttempts[selectedBooking.voucherAttempts.length - 1]?.voucherFileName
                              : null) || selectedBooking.voucherFileName;
                            const totalAttempts = selectedBooking.voucherAttempts?.length || (selectedBooking.voucherFileName ? 1 : 0);

                            return (
                              <>
                                {latestVoucherFileName && (
                                  <div className="flex items-center justify-between truncate">
                                    <span className="text-slate-400">
                                      {totalAttempts > 1 ? 'Novo Arquivo Anexado:' : 'Arquivo Anexado:'}
                                    </span>
                                    <span className="text-blue-300 truncate max-w-[210px] font-bold" title={latestVoucherFileName}>
                                      {latestVoucherFileName}
                                    </span>
                                  </div>
                                )}
                                {totalAttempts > 1 && (
                                  <div className="flex items-center justify-between text-[10px]">
                                    <span className="text-amber-400 font-semibold">Status do Envio:</span>
                                    <span className="px-2 py-0.5 rounded bg-amber-950/80 border border-amber-500/50 text-amber-300 font-mono font-bold">
                                      Novo comprovante atualizado ({totalAttempts}ª versão)
                                    </span>
                                  </div>
                                )}
                              </>
                            );
                          })()}
                          {selectedBooking.voucherSentAt && (
                            <div className="flex items-center justify-between">
                              <span className="text-slate-400">Data/Hora Envio:</span>
                              <span className="text-slate-200">
                                {new Date(selectedBooking.voucherSentAt).toLocaleDateString('pt-BR')} às {new Date(selectedBooking.voucherSentAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          )}
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">Valor Esperado:</span>
                            <strong className="text-emerald-400">
                              R$ {(selectedBooking.price || selectedBooking.location?.price || 499).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </strong>
                          </div>
                        </div>

                        {/* VISUALIZAÇÃO DIRETA DO COMPROVANTE */}
                        {voucherDisplayUrl ? (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-mono text-slate-300 font-bold uppercase tracking-wider block">
                                Visualização do Comprovante:
                              </span>
                              <span className="text-[10px] font-mono text-slate-400">
                                Clique para ampliar
                              </span>
                            </div>

                            <div 
                              className="relative group cursor-pointer overflow-hidden rounded-xl border border-slate-700 bg-black/80 flex flex-col items-center justify-center p-2.5 transition-all hover:border-pink-500/50 shadow-inner"
                              onClick={() => setVoucherModalUrl(voucherDisplayUrl)}
                              title="Clique para abrir e conferir o comprovante em tela cheia"
                            >
                              <img
                                src={voucherDisplayUrl}
                                alt={`Comprovante de pagamento de ${selectedBooking.student.fullName} - Inscrição #${selectedBooking.id}`}
                                className="w-full max-h-64 object-contain rounded-lg transition-transform duration-200 group-hover:scale-[1.02]"
                              />
                              
                              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-xs font-mono font-bold gap-2 backdrop-blur-[2px]">
                                <Maximize2 className="w-5 h-5 text-pink-400" />
                                <span>Abrir e Ampliar Comprovante</span>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2 pt-1">
                              <button
                                type="button"
                                onClick={() => setVoucherModalUrl(voucherDisplayUrl)}
                                className="py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 text-[11px] font-mono font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-slate-700"
                              >
                                <Maximize2 className="w-3.5 h-3.5 text-pink-400" />
                                <span>Abrir em Tamanho Maior</span>
                              </button>

                              <a
                                href={voucherDisplayUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="py-2 px-3 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-mono font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-slate-700/80"
                              >
                                <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                                <span>Abrir em Nova Aba</span>
                              </a>
                            </div>

                            <p className="text-[10px] font-mono text-slate-400 text-center">
                              Comprovante da Inscrição #{selectedBooking.id} • {selectedBooking.student.fullName}
                            </p>
                          </div>
                        ) : (
                          <div className="p-3 rounded-xl bg-slate-950 border border-dashed border-slate-800 text-center font-mono text-[11px] text-slate-400">
                            Nenhum arquivo de comprovante anexado pelo aluno até o momento.
                          </div>
                        )}

                        {/* Histórico de Tentativas de Envio do Aluno (Preservação de Tentativas Anteriores) */}
                        {selectedBooking.voucherAttempts && selectedBooking.voucherAttempts.length > 1 && (
                          <div className="p-3.5 rounded-xl bg-slate-950/90 border border-slate-800 space-y-2 font-mono text-[11px]">
                            <span className="font-bold text-slate-300 block uppercase text-[10px] tracking-wider">
                              Histórico de Tentativas de Comprovante ({selectedBooking.voucherAttempts.length}):
                            </span>
                            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                              {selectedBooking.voucherAttempts.map((att) => (
                                <div
                                  key={att.attemptNumber}
                                  className="flex items-center justify-between p-2 rounded-lg bg-slate-900/80 border border-slate-800 text-[10px]"
                                >
                                  <div className="space-y-0.5">
                                    <span className="font-bold text-white">Tentativa #{att.attemptNumber}</span>
                                    <span className="text-slate-400 block truncate max-w-[170px]">{att.voucherFileName || 'comprovante.jpg'}</span>
                                    <span className="text-slate-500 block">
                                      {new Date(att.voucherSentAt).toLocaleDateString('pt-BR')} às {new Date(att.voucherSentAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <span
                                      className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                                        att.status === 'agendamento-confirmado' || att.status === 'confirmado' || att.status === 'pagamento-confirmado'
                                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/40'
                                          : att.status === 'comprovante-rejeitado' || att.status === 'comprovante-reprovado' || att.status === 'pedido-rejeitado'
                                          ? 'bg-rose-950 text-rose-400 border border-rose-500/40'
                                          : 'bg-amber-950 text-amber-300 border border-amber-500/40'
                                      }`}
                                    >
                                      {att.status === 'agendamento-confirmado' || att.status === 'confirmado' || att.status === 'pagamento-confirmado'
                                        ? 'Aprovado'
                                        : att.status === 'comprovante-rejeitado' || att.status === 'comprovante-reprovado' || att.status === 'pedido-rejeitado'
                                        ? 'Reprovado'
                                        : 'Em Análise'}
                                    </span>
                                    {att.voucherUrl && (
                                      <button
                                        type="button"
                                        onClick={() => setVoucherModalUrl(att.voucherUrl || null)}
                                        className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
                                        title="Ver este comprovante"
                                      >
                                        <Eye className="w-3 h-3" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* CONTROLES DO INSTRUTOR: APROVAR COMPROVANTE e REPROVAR COMPROVANTE */}
                        <div className="pt-3 border-t border-slate-800 space-y-2.5">
                          {selectedBooking.status === 'aguardando-novo-pagamento' ? (
                            <div className="p-3.5 rounded-xl bg-amber-950/60 border border-amber-500/40 text-xs font-mono text-amber-200 space-y-2" id="box-aguardando-novo-pagamento-admin">
                              <div className="flex items-center gap-2 text-amber-400 font-bold">
                                <AlertTriangle className="w-4 h-4 shrink-0" />
                                <span className="uppercase tracking-wide">STATUS: AGUARDANDO NOVO PAGAMENTO/COMPROVANTE</span>
                              </div>
                              <p className="text-[11px] text-amber-300 leading-relaxed">
                                O prazo de 24 horas após a reprovação encerrou sem envio de novo comprovante. O horário foi liberado na agenda e voltou a ficar disponível para novos agendamentos. Todo o histórico da contratação, dados do aluno e o comprovante reprovado permanecem integralmente preservados no banco de dados.
                              </p>
                              <div className="pt-2 border-t border-amber-500/20 text-[11px] space-y-1 text-amber-300/90">
                                <p>
                                  <span className="text-amber-400/80">Horário liberado na agenda:</span>{' '}
                                  <strong>{formatDateBrazilian(selectedBooking.slot.date)} às {selectedBooking.slot.time}</strong>
                                </p>
                                {selectedBooking.rejectedBy && (
                                  <p>
                                    <span className="text-amber-400/80">Reprovado por:</span>{' '}
                                    <strong>{selectedBooking.rejectedBy}</strong>
                                  </p>
                                )}
                                {selectedBooking.rejectedAt && (
                                  <p>
                                    <span className="text-amber-400/80">Data e hora da reprovação:</span>{' '}
                                    {new Date(selectedBooking.rejectedAt).toLocaleString('pt-BR')}
                                  </p>
                                )}
                                {selectedBooking.rejection24hExpiredAt && (
                                  <p>
                                    <span className="text-amber-400/80">Encerramento do prazo de 24h:</span>{' '}
                                    {new Date(selectedBooking.rejection24hExpiredAt).toLocaleString('pt-BR')}
                                  </p>
                                )}
                                {selectedBooking.voucherFileName && (
                                  <p className="truncate">
                                    <span className="text-amber-400/80">Comprovante preservado:</span>{' '}
                                    {selectedBooking.voucherFileName}
                                  </p>
                                )}
                              </div>
                            </div>
                          ) : selectedBooking.status === 'comprovante-reprovado' ? (
                            <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-500/40 text-xs font-mono text-rose-200 space-y-2" id="box-comprovante-reprovado-admin">
                              <div className="flex items-center gap-2 text-rose-400 font-bold">
                                <XCircle className="w-4 h-4 shrink-0" />
                                <span className="uppercase tracking-wide">STATUS: COMPROVANTE REPROVADO</span>
                              </div>
                              <p className="text-[11px] text-rose-300 leading-relaxed">
                                Comprovante analisado e reprovado pelo instrutor. O aluno foi notificado na Área do Aluno com instruções para envio de comprovante válido e contato via WhatsApp.
                              </p>
                              <div className="pt-2 border-t border-rose-500/20 text-[11px] space-y-1 text-rose-300/90">
                                <p>
                                  <span className="text-rose-400/80">Instrutor responsável:</span>{' '}
                                  <strong>{selectedBooking.rejectedBy || 'Instrutor Responsável - ABC do Pedal'}</strong>
                                </p>
                                {selectedBooking.rejectedAt && (
                                  <p>
                                    <span className="text-rose-400/80">Data e hora da reprovação:</span>{' '}
                                    {new Date(selectedBooking.rejectedAt).toLocaleString('pt-BR')}
                                  </p>
                                )}
                                {selectedBooking.voucherFileName && (
                                  <p className="truncate">
                                    <span className="text-rose-400/80">Comprovante vinculado:</span>{' '}
                                    {selectedBooking.voucherFileName}
                                  </p>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => handleConfirmPayment(selectedBooking.id)}
                                className="w-full mt-2 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-emerald-400 border border-emerald-500/30 font-mono text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Aprovar Comprovante (Revisão)</span>
                              </button>
                            </div>
                          ) : selectedBooking.status === 'confirmado' || selectedBooking.status === 'agendamento-confirmado' || selectedBooking.status === 'pagamento-confirmado' ? (
                            <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-xs font-mono text-emerald-200 space-y-2" id="box-comprovante-aprovado-admin">
                              <div className="flex items-center gap-2 text-emerald-400 font-bold">
                                <CheckCircle2 className="w-4 h-4 shrink-0" />
                                <span className="uppercase tracking-wide">STATUS: AGENDAMENTO CONFIRMADO</span>
                              </div>
                              <p className="text-[11px] text-emerald-300">
                                Comprovante analisado e aprovado com sucesso. Vaga garantida na agenda.
                              </p>
                              <div className="pt-2 border-t border-emerald-500/20 text-[11px] space-y-1 text-emerald-300/90">
                                <p>
                                  <span className="text-emerald-400/80">Instrutor responsável:</span>{' '}
                                  <strong>{selectedBooking.approvedBy || 'Instrutor Responsável - ABC do Pedal'}</strong>
                                </p>
                                {(selectedBooking.approvedAt || selectedBooking.confirmedAt) && (
                                  <p>
                                    <span className="text-emerald-400/80">Data e hora da aprovação:</span>{' '}
                                    {new Date(selectedBooking.approvedAt || selectedBooking.confirmedAt!).toLocaleString('pt-BR')}
                                  </p>
                                )}
                              </div>
                            </div>
                          ) : (
                            <>
                              {/* APROVAR COMPROVANTE */}
                              <button
                                type="button"
                                onClick={() => handleConfirmPayment(selectedBooking.id)}
                                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40 transition-all cursor-pointer hover:shadow-emerald-600/25"
                                id="btn-admin-confirmar-pagamento"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                                <span>APROVAR COMPROVANTE</span>
                              </button>

                              {/* REPROVAR COMPROVANTE */}
                              <button
                                type="button"
                                onClick={() => handleReproveVoucher(selectedBooking.id)}
                                className="w-full py-2.5 rounded-xl bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-500/50 text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-sm hover:shadow-rose-950/40"
                                id="btn-admin-reprovar-comprovante"
                              >
                                <XCircle className="w-4 h-4 text-rose-400" />
                                <span>REPROVAR COMPROVANTE</span>
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Status Actions */}
                    <div className="space-y-2 pt-2 border-t border-slate-900">
                      <span className="text-xs font-mono text-slate-400 uppercase block mb-2">
                        Outras Ações de Agendamento:
                      </span>

                      {selectedBooking.status !== 'confirmado' && selectedBooking.status !== 'agendamento-confirmado' && !selectedBooking.voucherFileName && !selectedBooking.voucherUrl && (
                        <button
                          onClick={() => handleConfirmPayment(selectedBooking.id)}
                          className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20"
                        >
                          <Check className="w-4 h-4" />
                          <span>Confirmar Pagamento & Vaga Manualmente</span>
                        </button>
                      )}

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => handleUpdateStatus(selectedBooking.id, 'cancelado')}
                          className="py-2 rounded-lg bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-500/40 text-xs font-mono"
                        >
                          Cancelar
                        </button>

                        <button
                          onClick={() => handleUpdateStatus(selectedBooking.id, 'concluido')}
                          className="py-2 rounded-lg bg-pink-950/60 hover:bg-pink-900 text-pink-300 border border-pink-500/40 text-xs font-mono font-bold"
                        >
                          Concluir
                        </button>
                      </div>
                    </div>
                  </>
                );
              })() : (
                <div className="text-center text-slate-500 text-xs py-8">
                  Selecione um aluno para ver os detalhes
                </div>
              )}
            </div>

          </div>

        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: GESTÃO DE HORÁRIOS & AGENDA */}
      {/* ========================================================= */}
      {activeTab === 'agenda' && (
        <AdminScheduleView />
      )}

      {/* ========================================================= */}
      {/* TAB 3: CONTROLE DE EVOLUÇÃO MÉTODO ABC-DE & HABILIDADES */}
      {/* ========================================================= */}
      {activeTab === 'evolucao' && (() => {
        const currentBooking = selectedBooking || bookings[0] || null;
        const studentMilestones = (currentBooking?.milestones as any) || {};
        const developedCount = currentBooking ? skills.filter((s) => Boolean(studentMilestones[s.key])).length : 0;
        const totalSkills = skills.length;
        const progressPct = totalSkills > 0 ? Math.round((developedCount / totalSkills) * 100) : 0;

        return (
          <div className="space-y-6">
            
            {/* Feedback Notification */}
            {skillFeedbackMsg && (
              <div className="p-3.5 bg-pink-950/80 border border-pink-500/60 rounded-xl text-xs font-mono text-pink-200 flex items-center justify-between shadow-lg">
                <span className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-pink-400 shrink-0" />
                  {skillFeedbackMsg}
                </span>
                <button
                  type="button"
                  onClick={() => setSkillFeedbackMsg(null)}
                  className="text-pink-400 hover:text-white text-xs px-2 py-0.5 rounded cursor-pointer"
                >
                  ✕
                </button>
              </div>
            )}

            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6">
              
              {/* Student Header & Selector */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-900">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-pink-400 font-bold uppercase tracking-wider">
                      Acompanhamento Pedagógico & Habilidades
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-900 text-slate-400 border border-slate-800">
                      Instrutor Autorizado
                    </span>
                  </div>
                  
                  {currentBooking ? (
                    <div className="mt-1 flex flex-wrap items-center gap-3">
                      <h3 className="text-xl sm:text-2xl font-black text-white">
                        Aluno: {currentBooking.student.fullName}
                      </h3>
                      {bookings.length > 1 && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-400">
                          <span>(Mudar aluno:</span>
                          <select
                            value={currentBooking.id}
                            onChange={(e) => {
                              const found = bookings.find((b) => b.id === e.target.value);
                              if (found) setSelectedBooking(found);
                            }}
                            className="bg-slate-900 border border-slate-800 text-pink-300 text-xs rounded px-2 py-1 focus:outline-none focus:border-pink-500 cursor-pointer"
                          >
                            {bookings.map((b) => (
                              <option key={b.id} value={b.id}>
                                {b.student.fullName}
                              </option>
                            ))}
                          </select>
                          <span>)</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <h3 className="text-xl font-black text-slate-400 mt-1">
                      Nenhum aluno selecionado (Gestão Geral de Habilidades)
                    </h3>
                  )}
                </div>

                {/* Change ABC-DE Step */}
                {currentBooking && (
                  <div className="flex items-center gap-2 bg-slate-900/60 p-2 rounded-xl border border-slate-800/80">
                    <span className="text-xs font-mono text-slate-400 pl-1">Etapa Atual:</span>
                    {(['A', 'B', 'C', 'D', 'E'] as ABCDEStep[]).map((st) => (
                      <button
                        key={st}
                        onClick={() => handleUpdateABCDE(currentBooking.id, st)}
                        className={`w-8 h-8 rounded-lg font-mono font-bold text-xs flex items-center justify-center transition-all cursor-pointer ${
                          currentBooking.currentABCDE === st
                            ? 'bg-pink-600 text-white shadow-md shadow-pink-600/30'
                            : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white'
                        }`}
                        title={`Definir etapa como ${st}`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Highlight that C is the CORE goal */}
              <div className="p-4 rounded-xl bg-pink-950/40 border border-pink-500/50 flex items-start gap-3">
                <Award className="w-5 h-5 text-pink-400 shrink-0 mt-0.5" />
                <div className="text-xs text-slate-300 leading-relaxed">
                  <strong className="text-pink-300 font-bold block">
                    C é o objetivo principal do Aprender a Pedalar (Autonomia Real):
                  </strong>
                  Ao alcançar o controle autônomo (iniciar, pedalar, conduzir, frear e parar com independência), o aluno aprendeu a pedalar e o programa é concluído. As etapas D e E são avanços posteriores opcionais.
                </div>
              </div>

              {/* ========================================================= */}
              {/* GESTÃO DO MÉTODO ABCDE (20 Habilidades & Certificado 100%) */}
              {/* ========================================================= */}
              {currentBooking && (() => {
                const abcdeStats = getABCDECompletionStats(currentBooking);

                const handleMarkAllConquered = () => {
                  const updated = markAllABCDESkillsConquered(currentBooking.id);
                  if (updated) {
                    setBookings(getStoredBookings());
                    setSelectedBooking(updated);
                    setSkillFeedbackMsg(`🏆 100% Concluído! Todas as 20 habilidades foram conquistadas por ${updated.student.fullName}. Certificado Oficial liberado!`);
                  }
                };

                const handleSetSkill = (skillId: string, status: ABCDESkillStatus) => {
                  const updated = updateABCDESkillStatus(currentBooking.id, skillId, status);
                  if (updated) {
                    setBookings(getStoredBookings());
                    setSelectedBooking(updated);
                    const newStats = getABCDECompletionStats(updated);
                    if (newStats.isFullyCompleted) {
                      setSkillFeedbackMsg(`🏆 100% Atingido! Desafio ABC do Pedal concluído para ${updated.student.fullName}. Certificado Oficial liberado!`);
                    } else {
                      setSkillFeedbackMsg(`Habilidade ${skillId} definida como "${status}". (${newStats.conqueredCount}/20 conquistadas)`);
                    }
                  }
                };

                const handleReset = () => {
                  const updated = resetABCDESkills(currentBooking.id);
                  if (updated) {
                    setBookings(getStoredBookings());
                    setSelectedBooking(updated);
                    setSkillFeedbackMsg('Habilidades do Método ABCDE redefinidas para os padrões iniciais.');
                  }
                };

                return (
                  <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-pink-400 uppercase tracking-wider">
                            Estrutura Pedagógica Oficial
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-slate-950 text-slate-400 text-[10px] font-mono border border-slate-800">
                            20 Habilidades Observáveis
                          </span>
                        </div>
                        <h4 className="text-lg sm:text-xl font-black text-white mt-1">
                          Método ABCDE & Certificado de Conquista
                        </h4>
                        <p className="text-xs text-slate-400 mt-1">
                          Progresso do Aluno: <strong className="text-white font-bold">{abcdeStats.conqueredCount} de 20 habilidades conquistadas</strong> ({abcdeStats.percent}%)
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {abcdeStats.isFullyCompleted && (
                          <button
                            type="button"
                            onClick={() => setAdminCertificateBooking(currentBooking)}
                            className="px-4 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-bold text-xs font-mono flex items-center gap-2 shadow-lg shadow-pink-600/30 transition-all cursor-pointer"
                            id="btn-admin-ver-certificado"
                            title="Visualizar ou imprimir o certificado oficial do aluno"
                          >
                            <Award className="w-4 h-4 text-amber-300" />
                            <span>Ver Certificado Oficial</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={handleMarkAllConquered}
                          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs font-mono flex items-center gap-2 shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
                          id="btn-admin-marcar-20-20"
                          title="Marcar todas as 20 habilidades como conquistadas para emitir o certificado imediatamente"
                        >
                          <Check className="w-4 h-4" />
                          <span>Marcar 20/20 (Liberar Certificado)</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleReset}
                          className="px-3 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 text-xs font-mono transition-colors cursor-pointer"
                          title="Redefinir habilidades do aluno"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Progress Bar of ABCDE */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-slate-400">Requisito para o Certificado: 20 de 20 (100%)</span>
                        <span className={abcdeStats.isFullyCompleted ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
                          {abcdeStats.conqueredCount}/20 ({abcdeStats.percent}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden border border-slate-800">
                        <div
                          className={`h-full transition-all duration-500 rounded-full ${
                            abcdeStats.isFullyCompleted
                              ? 'bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-300'
                              : 'bg-gradient-to-r from-pink-500 via-rose-500 to-amber-400'
                          }`}
                          style={{ width: `${abcdeStats.percent}%` }}
                        />
                      </div>
                      {abcdeStats.isFullyCompleted ? (
                        <p className="text-xs font-mono text-emerald-400 flex items-center gap-1.5 pt-1">
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Desafio ABC do Pedal concluído! O aluno tem acesso ao Certificado Visual de Conquista no portal.</span>
                        </p>
                      ) : (
                        <p className="text-xs font-mono text-slate-400">
                          O certificado só é disponibilizado quando todas as 20 habilidades forem conquistadas (Consolidado ou Autônomo).
                        </p>
                      )}
                    </div>

                    {/* 5 Stages Grid with Observable Skills */}
                    <div className="space-y-4">
                      {ABCDE_STAGES.map((stage) => {
                        const stageStat = abcdeStats.stageStats[stage.letter];
                        return (
                          <div
                            key={stage.letter}
                            className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/90 space-y-3"
                          >
                            <div className="flex items-center justify-between pb-2 border-b border-slate-900">
                              <div className="flex items-center gap-2.5">
                                <span className="w-7 h-7 rounded-lg bg-pink-950 border border-pink-500/40 text-pink-300 flex items-center justify-center font-mono font-bold text-xs">
                                  {stage.letter}
                                </span>
                                <span className="text-sm font-bold text-white font-mono uppercase">
                                  {stage.letter} — {stage.title}
                                </span>
                              </div>
                              <span className={`text-xs font-mono px-2 py-0.5 rounded ${
                                stageStat.isCompleted
                                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                                  : 'bg-slate-900 text-slate-400 border border-slate-800'
                              }`}>
                                {stageStat.conquered} de {stageStat.total} Concluídas
                              </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                              {stage.skills.map((sk) => {
                                const currentStatus = getStudentSkillStatus(currentBooking, sk.id);
                                const isConq = currentStatus === 'Consolidado' || currentStatus === 'Autônomo';

                                return (
                                  <div
                                    key={sk.id}
                                    className={`p-3 rounded-lg border text-xs space-y-2 transition-all ${
                                      isConq
                                        ? 'bg-emerald-950/20 border-emerald-500/40'
                                        : 'bg-slate-900/50 border-slate-800'
                                    }`}
                                  >
                                    <div className="flex items-start justify-between gap-2">
                                      <span className="font-bold text-slate-200">
                                        {sk.code}. {sk.title}
                                      </span>
                                      <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded shrink-0 ${
                                        isConq
                                          ? 'bg-emerald-900/60 text-emerald-300'
                                          : 'bg-slate-800 text-slate-400'
                                      }`}>
                                        {currentStatus}
                                      </span>
                                    </div>

                                    {/* Status Selector Buttons */}
                                    <div className="grid grid-cols-4 gap-1 pt-1 font-mono text-[10px]">
                                      {(['Não iniciado', 'Em desenvolvimento', 'Consolidado', 'Autônomo'] as ABCDESkillStatus[]).map((st) => (
                                        <button
                                          key={st}
                                          type="button"
                                          onClick={() => handleSetSkill(sk.id, st)}
                                          className={`py-1 px-1 rounded transition-colors text-center cursor-pointer truncate ${
                                            currentStatus === st
                                              ? st === 'Consolidado' || st === 'Autônomo'
                                                ? 'bg-emerald-600 text-white font-bold'
                                                : 'bg-amber-600 text-white font-bold'
                                              : 'bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800/80'
                                          }`}
                                          title={`Definir como ${st}`}
                                        >
                                          {st === 'Não iniciado' ? 'Início' : st === 'Em desenvolvimento' ? 'Desenv.' : st === 'Consolidado' ? 'Consol.' : 'Autôn.'}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Action Bar: Title, Count, Progress, and Management Buttons */}
              <div className="space-y-4 pt-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm sm:text-base font-bold text-white font-mono uppercase">
                        Habilidades Práticas de Autonomia
                      </h4>
                      <span className="px-2 py-0.5 rounded-full bg-pink-950 text-pink-300 border border-pink-500/40 text-[11px] font-mono font-bold">
                        {totalSkills} {totalSkills === 1 ? 'campo' : 'campos'}
                      </span>
                    </div>
                    {currentBooking && (
                      <p className="text-xs text-slate-400 mt-1">
                        {developedCount} de {totalSkills} desenvolvidas ({progressPct}%) • Clique no cartão para marcar/desmarcar
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleOpenCategoriesModal}
                      className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-pink-300 hover:text-white border border-slate-800 hover:border-pink-500/40 text-xs font-mono flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="Criar e editar categorias pedagógicas"
                      id="btn-gerenciar-categorias-pedagogicas"
                    >
                      <Tag className="w-3.5 h-3.5" />
                      <span>Categorias ({categories.length})</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleOpenCreateSkill}
                      className="px-3.5 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-bold text-xs font-mono flex items-center gap-1.5 transition-all shadow-md shadow-pink-600/20 cursor-pointer"
                      id="btn-criar-nova-habilidade"
                    >
                      <Plus className="w-3.5 h-3.5 stroke-[3]" />
                      <span>Nova Habilidade</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleResetDefaultSkills}
                      className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 text-xs font-mono flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="Restaurar as 9 habilidades originais padrão"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Restaurar Padrões</span>
                    </button>
                  </div>
                </div>

                {/* Progress Bar for the active student */}
                {currentBooking && totalSkills > 0 && (
                  <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className="h-full bg-gradient-to-r from-pink-500 via-purple-500 to-emerald-400 transition-all duration-500 rounded-full"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                )}

                {/* Category Filter Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1">
                  <span className="text-[11px] font-mono text-slate-500 uppercase shrink-0 flex items-center gap-1">
                    <Filter className="w-3 h-3" />
                    Filtrar Categoria:
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedSkillCategoryFilter('all')}
                    className={`px-3 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer whitespace-nowrap ${
                      selectedSkillCategoryFilter === 'all'
                        ? 'bg-pink-600 text-white font-bold shadow-sm shadow-pink-600/30'
                        : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    Todas ({skills.length})
                  </button>
                  {categories.map((cat) => {
                    const count = skills.filter((s) => s.category === cat).length;
                    const isSelected = selectedSkillCategoryFilter === cat;
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setSelectedSkillCategoryFilter(cat)}
                        className={`px-3 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer whitespace-nowrap ${
                          isSelected
                            ? 'bg-pink-600 text-white font-bold shadow-sm shadow-pink-600/30'
                            : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                        }`}
                      >
                        {cat} ({count})
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={handleOpenCategoriesModal}
                    className="px-2.5 py-1 rounded-lg text-xs font-mono text-pink-400 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-pink-500/40 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1"
                    title="Adicionar ou editar categorias pedagógicas"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Nova Categoria</span>
                  </button>
                </div>
              </div>

              {/* Skills Grid */}
              {(() => {
                const displayedSkills = selectedSkillCategoryFilter === 'all'
                  ? skills
                  : skills.filter((s) => s.category === selectedSkillCategoryFilter);

                if (displayedSkills.length === 0) {
                  return (
                    <div className="p-8 text-center rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
                      <p className="text-xs font-mono text-slate-400">
                        Nenhuma habilidade cadastrada na categoria &quot;{selectedSkillCategoryFilter}&quot;.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          handleOpenCreateSkill();
                          if (selectedSkillCategoryFilter !== 'all') {
                            setSkillFormCategory(selectedSkillCategoryFilter);
                          }
                        }}
                        className="px-4 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-bold text-xs font-mono inline-flex items-center gap-1.5 shadow-md shadow-pink-600/20 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5 stroke-[3]" />
                        <span>Criar Habilidade nesta Categoria</span>
                      </button>
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {displayedSkills.map((s) => {
                      const checked = currentBooking ? Boolean(studentMilestones[s.key]) : false;
                      return (
                        <div
                          key={s.id || s.key}
                          className={`group relative rounded-xl border p-3.5 transition-all flex flex-col justify-between ${
                            checked
                              ? 'bg-emerald-950/40 border-emerald-500/70 text-emerald-100 shadow-sm shadow-emerald-900/20'
                              : 'bg-slate-900/70 border-slate-800 hover:border-slate-700 text-slate-300'
                          }`}
                        >
                          {/* Top Row: Category Pill & Edit/Delete Action Icons */}
                          <div className="flex items-center justify-between mb-2 gap-2">
                            <span className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-md ${
                              checked
                                ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-700/50'
                                : 'bg-slate-950 text-slate-400 border border-slate-800'
                            }`}>
                              {s.category || 'Autonomia'}
                              {s.isCustom && <span className="ml-1 text-pink-400">• Novo</span>}
                            </span>

                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenEditSkill(s);
                                }}
                                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                                title="Editar campo de habilidade"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteSkill(s.id, s.label);
                                }}
                                className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 transition-colors cursor-pointer"
                                title="Excluir campo de habilidade"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Middle: Checkbox trigger button */}
                          <button
                            type="button"
                            onClick={() => {
                              if (currentBooking) {
                                handleToggleMilestone(currentBooking.id, s.key);
                              } else {
                                alert('Selecione um aluno para marcar esta habilidade.');
                              }
                            }}
                            className="text-left flex items-start gap-2.5 w-full cursor-pointer"
                            title={currentBooking ? (checked ? 'Clique para desmarcar' : 'Clique para marcar como concluída') : 'Selecione um aluno'}
                          >
                            <div className={`w-4 h-4 rounded mt-0.5 shrink-0 flex items-center justify-center border transition-colors ${
                              checked
                                ? 'bg-emerald-500 border-emerald-400 text-black'
                                : 'border-slate-600 bg-slate-950 group-hover:border-slate-500'
                            }`}>
                              {checked && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>

                            <div className="space-y-1">
                              <span className={`text-xs font-semibold leading-snug block ${checked ? 'text-white' : 'text-slate-200'}`}>
                                {s.label}
                              </span>
                              {s.description && (
                                <p className="text-[11px] text-slate-400 font-light leading-relaxed">
                                  {s.description}
                                </p>
                              )}
                            </div>
                          </button>

                        </div>
                      );
                    })}
                  </div>
                );
              })()}

            </div>

            {/* Modal Unificado: Criar e Editar Habilidades & Categorias Pedagógicas */}
            {isPedagogicalModalOpen && (
              <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
                  
                  {/* Modal Header */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-pink-600/20 border border-pink-500/40 flex items-center justify-center text-pink-400">
                        {pedagogicalModalTab === 'categorias' ? (
                          <Tag className="w-4 h-4" />
                        ) : isCreatingSkill ? (
                          <Plus className="w-4 h-4 stroke-[3]" />
                        ) : (
                          <Edit2 className="w-4 h-4" />
                        )}
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-white">
                          {pedagogicalModalTab === 'categorias'
                            ? 'Categorias Pedagógicas'
                            : isCreatingSkill
                            ? 'Criar Novo Campo de Habilidade'
                            : 'Editar Campo de Habilidade'}
                        </h3>
                        <p className="text-[11px] text-slate-400">
                          {pedagogicalModalTab === 'categorias'
                            ? 'Crie, renomeie ou exclua as categorias do Método ABC-DE.'
                            : 'Personalize as competências e critérios avaliativos dos alunos.'}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleClosePedagogicalModal}
                      className="text-slate-400 hover:text-white text-sm p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Modal Sub-Tabs: Habilidades vs Categorias */}
                  <div className="flex items-center gap-2 p-1 bg-slate-950 rounded-xl border border-slate-800">
                    <button
                      type="button"
                      onClick={() => setPedagogicalModalTab('habilidades')}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        pedagogicalModalTab === 'habilidades'
                          ? 'bg-pink-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-white hover:bg-slate-900'
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Campos de Habilidade</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPedagogicalModalTab('categorias')}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        pedagogicalModalTab === 'categorias'
                          ? 'bg-pink-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-white hover:bg-slate-900'
                      }`}
                    >
                      <Tag className="w-3.5 h-3.5" />
                      <span>Categorias Pedagógicas ({categories.length})</span>
                    </button>
                  </div>

                  {/* TAB 1: FORMULÁRIO DE HABILIDADES */}
                  {pedagogicalModalTab === 'habilidades' && (
                    <form onSubmit={handleSaveSkill} className="space-y-4">
                      <div>
                        <label className="block text-xs font-mono text-slate-300 font-bold uppercase mb-1">
                          Nome / Título da Habilidade *
                        </label>
                        <input
                          type="text"
                          value={skillFormLabel}
                          onChange={(e) => setSkillFormLabel(e.target.value)}
                          placeholder="Ex: Olhar para trás mantendo a trajetória em linha reta"
                          required
                          autoFocus
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-pink-500"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="block text-xs font-mono text-slate-300 font-bold uppercase">
                            Categoria Pedagógica *
                          </label>
                          <button
                            type="button"
                            onClick={() => setPedagogicalModalTab('categorias')}
                            className="text-[11px] font-mono text-pink-400 hover:text-pink-300 flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <Settings2 className="w-3 h-3" />
                            <span>Gerenciar Categorias</span>
                          </button>
                        </div>

                        {/* Chips of available categories */}
                        <div className="flex flex-wrap gap-1.5 mb-2.5">
                          {categories.map((cat) => {
                            const isSelected = skillFormCategory === cat;
                            return (
                              <button
                                key={cat}
                                type="button"
                                onClick={() => setSkillFormCategory(cat)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                                  isSelected
                                    ? 'bg-pink-600 border border-pink-500 text-white font-bold shadow-sm shadow-pink-600/30'
                                    : 'bg-slate-950 border border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white'
                                }`}
                              >
                                {cat}
                              </button>
                            );
                          })}
                        </div>

                        {/* Quick create inline category */}
                        <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-950 border border-slate-800">
                          <Tag className="w-3.5 h-3.5 text-slate-500 shrink-0 ml-1" />
                          <input
                            type="text"
                            value={newCategoryName}
                            onChange={(e) => setNewCategoryName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleCreateCategory();
                              }
                            }}
                            placeholder="Criar nova categoria rápida..."
                            className="bg-transparent text-xs text-white placeholder:text-slate-600 flex-1 focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => handleCreateCategory()}
                            className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-pink-400 hover:text-white border border-slate-800 text-[11px] font-mono font-bold flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Criar</span>
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-mono text-slate-300 font-bold uppercase mb-1">
                          Critério de Observação Pedagógica (Opcional)
                        </label>
                        <textarea
                          rows={2}
                          value={skillFormDesc}
                          onChange={(e) => setSkillFormDesc(e.target.value)}
                          placeholder="Ex: O aluno deve girar a cabeça por 2 segundos sem ziguezaguear no guidão."
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-pink-500 resize-none"
                        />
                      </div>

                      <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
                        <button
                          type="button"
                          onClick={handleClosePedagogicalModal}
                          className="px-4 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-mono text-slate-300 cursor-pointer"
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          className="px-5 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-bold text-xs font-mono shadow-md shadow-pink-600/30 flex items-center gap-1.5 cursor-pointer"
                          id="btn-salvar-habilidade"
                        >
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                          <span>{isCreatingSkill ? 'Criar Habilidade' : 'Salvar Alterações'}</span>
                        </button>
                      </div>
                    </form>
                  )}

                  {/* TAB 2: GERENCIAMENTO DE CATEGORIAS */}
                  {pedagogicalModalTab === 'categorias' && (
                    <div className="space-y-4">
                      {/* Box: Criar Nova Categoria */}
                      <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                        <label className="block text-xs font-mono text-slate-300 font-bold uppercase">
                          + Criar Nova Categoria Pedagógica
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={newCategoryName}
                            onChange={(e) => setNewCategoryName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleCreateCategory();
                              }
                            }}
                            placeholder="Ex: Curvas Fechadas, Equilíbrio Estático..."
                            className="bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-slate-600 flex-1 focus:outline-none focus:border-pink-500"
                          />
                          <button
                            type="button"
                            onClick={() => handleCreateCategory()}
                            className="px-4 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-bold text-xs font-mono flex items-center gap-1.5 shadow-md shadow-pink-600/20 cursor-pointer shrink-0"
                          >
                            <Plus className="w-3.5 h-3.5 stroke-[3]" />
                            <span>Criar</span>
                          </button>
                        </div>
                      </div>

                      {/* Lista de Categorias Atuais */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono text-slate-400 font-bold uppercase">
                            Categorias Cadastradas ({categories.length})
                          </span>
                          <span className="text-[11px] text-slate-500 font-mono">
                            Clique em Renomear ou Excluir
                          </span>
                        </div>

                        <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                          {categories.map((cat) => {
                            const isEditing = editingCategoryOldName === cat;
                            const countSkills = skills.filter((s) => s.category === cat).length;
                            return (
                              <div
                                key={cat}
                                className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-2"
                              >
                                {isEditing ? (
                                  <div className="flex items-center gap-2 w-full">
                                    <input
                                      type="text"
                                      value={editingCategoryNewName}
                                      onChange={(e) => setEditingCategoryNewName(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          e.preventDefault();
                                          handleSaveRenamedCategory(cat);
                                        } else if (e.key === 'Escape') {
                                          handleCancelEditCategory();
                                        }
                                      }}
                                      autoFocus
                                      className="bg-slate-900 border border-pink-500 rounded-lg px-2.5 py-1 text-xs text-white flex-1 focus:outline-none"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => handleSaveRenamedCategory(cat)}
                                      className="p-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 cursor-pointer"
                                      title="Salvar novo nome"
                                    >
                                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={handleCancelEditCategory}
                                      className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
                                      title="Cancelar"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                ) : (
                                  <>
                                    <div className="flex items-center gap-2">
                                      <Tag className="w-3.5 h-3.5 text-pink-400 shrink-0" />
                                      <span className="text-xs font-mono font-bold text-white">
                                        {cat}
                                      </span>
                                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-900 text-slate-400 border border-slate-800">
                                        {countSkills} {countSkills === 1 ? 'habilidade' : 'habilidades'}
                                      </span>
                                    </div>

                                    <div className="flex items-center gap-1">
                                      <button
                                        type="button"
                                        onClick={() => handleStartEditCategory(cat)}
                                        className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs font-mono flex items-center gap-1 cursor-pointer transition-colors"
                                        title="Renomear categoria"
                                      >
                                        <Edit2 className="w-3 h-3" />
                                        <span>Renomear</span>
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => handleDeleteCategory(cat)}
                                        className="p-1.5 rounded-lg bg-slate-900 hover:bg-rose-950/50 text-slate-400 hover:text-rose-400 border border-slate-800 hover:border-rose-800/40 cursor-pointer transition-colors"
                                        title="Excluir categoria"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Footer actions for categories */}
                      <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                        <button
                          type="button"
                          onClick={handleResetCategories}
                          className="px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 text-xs font-mono flex items-center gap-1.5 transition-colors cursor-pointer"
                          title="Restaurar categorias originais"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Restaurar Originais</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setPedagogicalModalTab('habilidades');
                            handleOpenCreateSkill();
                          }}
                          className="px-4 py-1.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-bold text-xs font-mono flex items-center gap-1.5 shadow-md shadow-pink-600/20 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5 stroke-[3]" />
                          <span>Nova Habilidade</span>
                        </button>
                      </div>
                    </div>
                  )}

                </div>
              </div>
            )}

          </div>
        );
      })()}

      {/* ========================================================= */}
      {/* TAB 4: DISPARADOR DE NOTIFICAÇÕES WHATSAPP */}
      {/* ========================================================= */}
      {(activeTab === 'automacao' || activeTab === 'notificacoes') && (() => {
        const currentNotificationBooking = selectedBooking || bookings[0] || null;

        if (!currentNotificationBooking) {
          return (
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-12 text-center space-y-4">
              <MessageCircle className="w-12 h-12 text-slate-600 mx-auto" />
              <h3 className="text-lg font-bold text-white">Nenhum aluno ou agendamento cadastrado</h3>
              <p className="text-sm text-slate-400 max-w-md mx-auto">
                Para disparar mensagens no WhatsApp, é necessário ter pelo menos um aluno com agendamento no sistema.
              </p>
            </div>
          );
        }

        const recipient = getStudentRecipientWhatsApp(currentNotificationBooking);
        const filteredTemplates = templates.filter((tpl) => {
          if (templateCategoryFilter === 'all') return true;
          if (templateCategoryFilter === 'custom') return Boolean(tpl.isCustom);
          return tpl.category === templateCategoryFilter;
        });

        return (
          <div className="space-y-6">
            {/* Header & Action Bar */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 sm:p-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-emerald-400 font-bold uppercase tracking-wider">
                      Comunicação Oficial WhatsApp
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                      Regra do Aluno Ativa
                    </span>
                  </div>
                  <h3 className="text-2xl font-black text-white mt-1">
                    Disparador WhatsApp
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-2xl">
                    Todas as comunicações geradas por esta central são enviadas exclusivamente para o <strong>aluno</strong> vinculado ao agendamento (ou ao responsável legal cadastrado para menores de idade).
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleResetDefaultTemplates}
                    title="Restaurar modelos padrões de fábrica"
                    className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Restaurar Padrões</span>
                  </button>
                  <button
                    onClick={handleOpenCreateTemplate}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-950 transition-all hover:scale-[1.02]"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Criar Nova Mensagem</span>
                  </button>
                </div>
              </div>

              {/* RECIPIENT IDENTIFICATION CARD (REGRA FUNDAMENTAL) */}
              <div className="mt-6 p-5 rounded-xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border-2 border-emerald-500/40 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                      <Shield className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                        Destinatário Identificado Automaticamente
                      </span>
                      <p className="text-xs text-slate-300 font-medium">
                        {recipient.routingExplanation}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wide border ${
                      recipient.isMinor
                        ? 'bg-amber-950/70 border-amber-500/50 text-amber-300'
                        : 'bg-cyan-950/70 border-cyan-500/50 text-cyan-300'
                    }`}>
                      {recipient.categoryLabel}
                    </span>
                  </div>
                </div>

                {/* Flow Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  {/* Remetente */}
                  <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 space-y-1">
                    <span className="text-[10px] uppercase font-mono text-slate-500">
                      Remetente Oficial
                    </span>
                    <p className="font-bold text-slate-200">
                      ABC do Pedal
                    </p>
                    <p className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      {OFFICIAL_WHATSAPP_DISPLAY}
                    </p>
                  </div>

                  {/* Aluno Vinculado */}
                  <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 space-y-1">
                    <span className="text-[10px] uppercase font-mono text-slate-500">
                      Aluno Vinculado ao Agendamento
                    </span>
                    <p className="font-bold text-white truncate">
                      {currentNotificationBooking.student.fullName}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Aula: {formatDateBrazilian(currentNotificationBooking.slot.date)} às {currentNotificationBooking.slot.time}
                    </p>
                  </div>

                  {/* Destinatário Efetivo do Disparo */}
                  <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-500/40 space-y-1">
                    <span className="text-[10px] uppercase font-mono text-emerald-400 font-bold">
                      Destinatário da Comunicação
                    </span>
                    <p className="font-bold text-emerald-200 truncate">
                      {recipient.targetName}
                    </p>
                    <p className="text-[11px] font-mono font-bold text-emerald-300 flex items-center gap-1">
                      <MessageCircle className="w-3 h-3" />
                      {recipient.formattedDisplay} (wa.me/{recipient.phoneWithCountryCode})
                    </p>
                  </div>
                </div>

                {/* Safety declaration banner */}
                <div className="pt-2 text-[11px] text-slate-400 flex items-center gap-1.5 border-t border-slate-800/60">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>
                    <strong>Conformidade Obrigatória:</strong> Este disparo não é encaminhado para administradores, instrutores ou funcionários. O destino exclusivo é o canal oficial de contato do aluno.
                  </span>
                </div>
              </div>

              {/* Student Selector Switcher */}
              <div className="mt-6 pt-6 border-t border-slate-800/80">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-slate-400" />
                    <span className="text-xs font-bold text-slate-300">
                      Trocar Aluno / Agendamento:
                    </span>
                  </div>

                  <div className="flex-1 max-w-md">
                    <select
                      value={currentNotificationBooking.id}
                      onChange={(e) => {
                        const found = bookings.find((b) => b.id === e.target.value);
                        if (found) setSelectedBooking(found);
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-white focus:outline-none focus:border-emerald-500"
                    >
                      {bookings.map((b) => {
                        const r = getStudentRecipientWhatsApp(b);
                        return (
                          <option key={b.id} value={b.id}>
                            {b.student.fullName} — {formatDateBrazilian(b.slot.date)} {b.slot.time} ({r.categoryLabel} → {r.formattedDisplay})
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Template Categories Filter */}
            <div className="flex flex-wrap items-center gap-1.5 bg-slate-950 p-2 rounded-xl border border-slate-800">
              {[
                { id: 'all', label: 'Todas as Mensagens' },
                { id: 'confirmacao', label: 'Confirmação' },
                { id: 'lembrete', label: 'Lembrete' },
                { id: 'pre_agendamento', label: 'Pré-Agendamento' },
                { id: 'comprovante', label: 'Comprovante' },
                { id: 'evolucao', label: 'Evolução ABC-DE' },
                { id: 'cancelamento', label: 'Cancelamento' },
                { id: 'custom', label: 'Personalizadas' }
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setTemplateCategoryFilter(cat.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                    templateCategoryFilter === cat.id
                      ? 'bg-emerald-600 text-white'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Notification Toast Feedback */}
            {templateNotificationMsg && (
              <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 text-xs font-medium flex items-center gap-2 animate-fade-in">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{templateNotificationMsg}</span>
              </div>
            )}

            {/* Templates Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredTemplates.map((tpl) => {
                const compiledMessage = compileWhatsAppTemplate(tpl.content, currentNotificationBooking);
                const dispatchUrl = `https://wa.me/${recipient.phoneWithCountryCode}?text=${encodeURIComponent(compiledMessage)}`;
                const isCopied = copiedTemplateId === tpl.id;

                return (
                  <div
                    key={tpl.id}
                    className="p-5 rounded-2xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between space-y-4"
                  >
                    {/* Header */}
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
                              {tpl.category}
                            </span>
                            {tpl.isCustom && (
                              <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-pink-950/80 text-pink-300 border border-pink-800">
                                Personalizada
                              </span>
                            )}
                          </div>
                          <h4 className="font-bold text-sm text-white">
                            {tpl.title}
                          </h4>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleOpenEditTemplate(tpl)}
                            title="Editar este modelo"
                            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          {tpl.isCustom && (
                            <button
                              onClick={() => handleDeleteTemplate(tpl.id)}
                              title="Excluir mensagem personalizada"
                              className="p-1.5 rounded-lg bg-slate-900 hover:bg-rose-950 text-slate-400 hover:text-rose-400 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Recipient info pill */}
                      <div className="px-2.5 py-1 rounded-md bg-slate-900/80 border border-slate-800 text-[11px] text-slate-300 flex items-center justify-between">
                        <span>
                          Para: <strong className="text-white">{recipient.targetName}</strong>
                        </span>
                        <span className="font-mono text-emerald-400 font-medium">
                          {recipient.formattedDisplay}
                        </span>
                      </div>
                    </div>

                    {/* Rendered Preview Box */}
                    <div className="relative">
                      <pre className="text-[11px] font-sans leading-relaxed text-slate-300 whitespace-pre-wrap bg-slate-900/60 p-3.5 rounded-xl border border-slate-800/80 max-h-52 overflow-y-auto">
                        {compiledMessage}
                      </pre>
                    </div>

                    {/* Actions */}
                    <div className="pt-2 flex items-center gap-2">
                      <a
                        href={dispatchUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40 transition-all hover:scale-[1.01]"
                      >
                        <MessageCircle className="w-4 h-4" />
                        <span>Abrir no WhatsApp do Aluno</span>
                      </a>

                      <button
                        onClick={() => handleCopyTemplate(tpl.id, compiledMessage)}
                        title="Copiar texto da mensagem formatada"
                        className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-colors"
                      >
                        {isCopied ? (
                          <CheckCheck className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Empty filter message */}
            {filteredTemplates.length === 0 && (
              <div className="p-8 text-center bg-slate-950 border border-slate-800 rounded-2xl space-y-2">
                <p className="text-xs text-slate-400">Nenhum modelo encontrado nesta categoria.</p>
                <button
                  onClick={handleOpenCreateTemplate}
                  className="text-xs text-emerald-400 font-bold hover:underline"
                >
                  Criar modelo nesta categoria
                </button>
              </div>
            )}

            {/* MODAL: Criar / Editar Modelo */}
            {(isCreatingTemplate || editingTemplate) && (
              <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl space-y-5 p-6 animate-scale-up">
                  {/* Modal Header */}
                  <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                    <div>
                      <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase">
                        {isCreatingTemplate ? 'Nova Mensagem' : 'Edição de Mensagem'}
                      </span>
                      <h3 className="text-lg font-black text-white mt-0.5">
                        {isCreatingTemplate ? 'Criar Novo Modelo de Mensagem' : `Editar: ${templateFormTitle}`}
                      </h3>
                    </div>
                    <button
                      onClick={handleCloseTemplateModal}
                      className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white"
                    >
                      <XCircle className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Modal Body Form */}
                  <form onSubmit={handleSaveTemplate} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-2 space-y-1">
                        <label className="text-[11px] font-bold text-slate-300">
                          Título do Modelo
                        </label>
                        <input
                          type="text"
                          required
                          value={templateFormTitle}
                          onChange={(e) => setTemplateFormTitle(e.target.value)}
                          placeholder="Ex: Lembrete de Aula (Véspera)"
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-300">
                          Categoria
                        </label>
                        <select
                          value={templateFormCategory}
                          onChange={(e) => setTemplateFormCategory(e.target.value as WhatsAppMessageTemplate['category'])}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                        >
                          <option value="confirmacao">Confirmação</option>
                          <option value="lembrete">Lembrete</option>
                          <option value="pre_agendamento">Pré-Agendamento</option>
                          <option value="comprovante">Comprovante</option>
                          <option value="evolucao">Evolução ABC-DE</option>
                          <option value="cancelamento">Cancelamento</option>
                          <option value="custom">Personalizada</option>
                        </select>
                      </div>
                    </div>

                    {/* Variable insertion buttons */}
                    <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
                      <div className="flex items-center gap-1 text-[11px] font-bold text-slate-300">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        <span>Clique para inserir variáveis automáticas no texto:</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          { tag: '{aluno}', label: 'Nome do Aluno' },
                          { tag: '{responsavel}', label: 'Nome do Responsável' },
                          { tag: '{data}', label: 'Data da Aula' },
                          { tag: '{horario}', label: 'Horário' },
                          { tag: '{local}', label: 'Local (Ibirapuera)' },
                          { tag: '{etapa}', label: 'Etapa ABC-DE' },
                          { tag: '{status}', label: 'Status' }
                        ].map((v) => (
                          <button
                            key={v.tag}
                            type="button"
                            onClick={() => handleInsertVariable(v.tag)}
                            className="px-2.5 py-1 rounded-md bg-slate-950 hover:bg-slate-800 border border-slate-700 text-emerald-400 hover:text-emerald-300 text-[11px] font-mono transition-colors"
                          >
                            + {v.tag} <span className="text-slate-500 text-[10px]">({v.label})</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Textarea */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-slate-300">
                          Mensagem do WhatsApp (suporta formatação: *negrito*, _itálico_)
                        </label>
                        <span className="text-[10px] text-slate-500">
                          Destinatário: {recipient.targetName} ({recipient.formattedDisplay})
                        </span>
                      </div>
                      <textarea
                        required
                        rows={7}
                        value={templateFormContent}
                        onChange={(e) => setTemplateFormContent(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-slate-100 font-mono focus:outline-none focus:border-emerald-500 leading-relaxed"
                      />
                    </div>

                    {/* Real-time preview */}
                    <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span className="font-bold">Pré-visualização para {currentNotificationBooking.student.fullName}:</span>
                        <span className="text-emerald-400 font-mono text-[10px]">Destino: {recipient.formattedDisplay}</span>
                      </div>
                      <pre className="text-[11px] font-sans whitespace-pre-wrap text-slate-300 bg-slate-950 p-3 rounded-lg max-h-36 overflow-y-auto">
                        {compileWhatsAppTemplate(templateFormContent, currentNotificationBooking)}
                      </pre>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                      <button
                        type="button"
                        onClick={handleCloseTemplateModal}
                        className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-950"
                      >
                        <Check className="w-4 h-4" />
                        <span>Salvar Modelo</span>
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* ========================================================= */}
      {/* ABA: FINANCEIRO */}
      {/* ========================================================= */}
      {activeTab === 'financeiro' && (
        <AdminFinancialView bookings={bookings} />
      )}

      {/* ========================================================= */}
      {/* ABA: PLANOS E PRODUTOS */}
      {/* ========================================================= */}
      {activeTab === 'planos' && (
        <AdminPlansView
          bookings={bookings}
          onNavigate={(tab) => setActiveTab(tab)}
        />
      )}

      {/* ========================================================= */}
      {/* ABA: LOCAIS DE AULA POR MUNICÍPIO */}
      {/* ========================================================= */}
      {activeTab === 'locais' && (
        <AdminLocationsView />
      )}

      {/* ========================================================= */}
      {/* ABA: GALERIA VIVA */}
      {/* ========================================================= */}
      {activeTab === 'galeria' && (
        <AdminGalleryView />
      )}

      {/* ========================================================= */}
      {/* ABA: CONFIGURAÇÕES */}
      {/* ========================================================= */}
      {activeTab === 'configuracoes' && (
        <AdminSettingsView
          bookings={bookings}
          slots={slots}
          onManualSync={handleManualSync}
          isSyncing={isSyncing}
        />
      )}

      {/* Modal de Pré-visualização do Comprovante em Tela Cheia */}
      {voucherModalUrl && (
        <div 
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setVoucherModalUrl(null)}
        >
          <div 
            className="bg-slate-950 border border-slate-800 rounded-2xl max-w-4xl max-h-[90vh] w-full flex flex-col overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-pink-400" />
                <span className="text-sm font-bold text-white font-mono uppercase">
                  Conferência do Comprovante de Pagamento
                </span>
              </div>
              <button
                type="button"
                onClick={() => setVoucherModalUrl(null)}
                className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 flex-1 overflow-auto flex items-center justify-center bg-black/40">
              <img
                src={voucherModalUrl}
                alt="Comprovante de Pagamento do Aluno"
                className="max-h-[75vh] w-auto max-w-full object-contain rounded-lg shadow-xl"
              />
            </div>

            <div className="p-3 border-t border-slate-800 flex items-center justify-between text-xs font-mono text-slate-400 bg-slate-900/50">
              <span>ABC do Pedal • Validação Oficial</span>
              <button
                type="button"
                onClick={() => setVoucherModalUrl(null)}
                className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white transition-colors cursor-pointer"
              >
                Fechar Visualização
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Reprovação de Comprovante de Pagamento com Seleção de Motivo */}
      {reprovingBooking && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-rose-400 font-bold font-mono text-sm">
                <XCircle className="w-5 h-5" />
                <span>REPROVAR COMPROVANTE DE PAGAMENTO</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setReprovingBooking(null);
                  setReproveCustomReason('');
                }}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-mono">Aluno(a):</span>
                <span className="text-white font-bold">{reprovingBooking.student.fullName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-mono">Contratação / ID:</span>
                <span className="text-pink-400 font-mono">#{reprovingBooking.id.slice(-6)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-mono">Valor:</span>
                <span className="text-emerald-400 font-mono font-bold">
                  R$ {(reprovingBooking.price || reprovingBooking.location?.price || 499).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <label className="block text-slate-300 font-mono font-bold">
                Selecione o motivo da reprovação:
              </label>

              <div className="space-y-2">
                {[
                  'Comprovante ilegível ou com corte nas informações essenciais. Favor enviar foto nítida e completa.',
                  'Valor transferido divergente do valor do plano contratado.',
                  'Comprovante de agendamento bancário futuro (transação ainda não compensada).',
                  'Favorecido incorreto. Favor conferir a chave PIX e dados bancários.',
                  'Outro motivo personalizado'
                ].map((reasonOption) => (
                  <label
                    key={reasonOption}
                    className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer text-xs transition-colors ${
                      reproveReasonChoice === reasonOption
                        ? 'bg-rose-950/40 border-rose-500/50 text-white'
                        : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-900'
                    }`}
                  >
                    <input
                      type="radio"
                      name="reproveReasonGroup"
                      checked={reproveReasonChoice === reasonOption}
                      onChange={() => setReproveReasonChoice(reasonOption)}
                      className="mt-0.5 accent-rose-500 cursor-pointer"
                    />
                    <span>{reasonOption}</span>
                  </label>
                ))}
              </div>

              {reproveReasonChoice === 'Outro motivo personalizado' && (
                <div className="pt-2">
                  <label className="block text-slate-300 font-mono mb-1 text-[11px]">
                    Descreva o motivo detalhado para o aluno:
                  </label>
                  <textarea
                    rows={3}
                    value={reproveCustomReason}
                    onChange={(e) => setReproveCustomReason(e.target.value)}
                    placeholder="Ex: Não foi possível identificar o código de autenticação do PIX..."
                    className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-rose-500 resize-none font-mono"
                  />
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setReprovingBooking(null);
                  setReproveCustomReason('');
                }}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-mono transition-colors cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={() => {
                  const finalReason =
                    reproveReasonChoice === 'Outro motivo personalizado'
                      ? reproveCustomReason.trim() || 'Comprovante não válido ou ilegível. Favor anexar novo comprovante.'
                      : reproveReasonChoice;
                  handleReproveVoucher(reprovingBooking.id, finalReason);
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-mono font-bold flex items-center gap-1.5 transition-all shadow-md shadow-rose-950/50 cursor-pointer"
              >
                <X className="w-4 h-4" />
                <span>Confirmar Reprovação</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para Inserir Aluno na Agenda (Definir Data e Horário) */}
      {studentToSchedule && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-pink-400 font-bold font-mono text-sm">
                <Calendar className="w-4 h-4" />
                <span>INSERIR ALUNO NA AGENDA</span>
              </div>
              <button
                type="button"
                onClick={() => setStudentToSchedule(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-xs space-y-1">
              <p className="text-slate-400 font-mono">Aluno:</p>
              <p className="text-white font-bold text-sm">{studentToSchedule.student.fullName}</p>
              <p className="text-slate-400 font-mono text-[11px]">
                WhatsApp: {studentToSchedule.student.whatsapp} • Local: {studentToSchedule.location?.locationName || 'Parque do Ibirapuera'}
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-mono mb-1 font-bold">
                  DATA DA AULA (definida pelo instrutor):
                </label>
                <input
                  type="date"
                  value={scheduleTargetDate}
                  onChange={(e) => setScheduleTargetDate(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-pink-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-mono mb-1 font-bold">
                  HORÁRIO DA AULA (definido pelo instrutor):
                </label>
                <input
                  type="time"
                  value={scheduleTargetTime}
                  onChange={(e) => setScheduleTargetTime(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-pink-500 font-mono"
                />
              </div>

              {/* Seleção do Local da Aula entre os locais disponíveis */}
              {(() => {
                const studentCity = studentToSchedule.location?.city || studentToSchedule.location?.regionTitle || 'São Bernardo do Campo';
                const avails = getAvailableClassLocationsForCity(studentCity);
                const currentLoc = scheduleTargetLocationName || studentToSchedule.assignedLocationName || studentToSchedule.location?.locationName || avails[0]?.name || '';
                const isAdult = studentToSchedule.student?.ageProfile !== 'crianca_adolescente';

                return (
                  <div className="space-y-1.5">
                    <label className="block text-slate-300 font-mono font-bold">
                      LOCAL DA AULA ({studentCity}):
                    </label>
                    <select
                      value={currentLoc}
                      onChange={(e) => setScheduleTargetLocationName(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-pink-500 font-mono"
                    >
                      {avails.map((al) => (
                        <option key={al.id} value={al.name}>
                          {al.name} {al.restrictionNote ? `(${al.restrictionNote})` : ''}
                        </option>
                      ))}
                    </select>

                    {currentLoc.toLowerCase().includes('celso daniel') && isAdult && (
                      <div className="p-2 rounded-lg bg-amber-950/50 border border-amber-500/40 text-[11px] text-amber-300 font-mono flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>Atenção: Parque Celso Daniel possui restrição de uso <strong>exclusivo para crianças</strong>. Este aluno possui perfil <strong>Adulto</strong>.</span>
                      </div>
                    )}
                  </div>
                );
              })()}

              <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/30 text-[11px] text-amber-300 font-mono space-y-1">
                <p><strong>Ao confirmar o agendamento:</strong></p>
                <p>• A Área do Aluno será atualizada automaticamente para:</p>
                <p className="text-white font-bold">
                  DATA DA AULA: {scheduleTargetDate ? formatDateBrazilian(scheduleTargetDate) : '[data definida]'}
                </p>
                <p className="text-white font-bold">
                  HORÁRIO DA AULA: {scheduleTargetTime || '[horário definido]'}
                </p>
                <p className="text-white font-bold">
                  LOCAL DA AULA: {scheduleTargetLocationName || studentToSchedule.assignedLocationName || studentToSchedule.location?.locationName || '[local credenciado selecionado]'}
                </p>
                <p>• O status do agendamento será atualizado para confirmado.</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setStudentToSchedule(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-mono text-xs transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isAssigningSchedule || !scheduleTargetDate || !scheduleTargetTime}
                onClick={() => handleAssignSchedule(studentToSchedule.id, scheduleTargetDate, scheduleTargetTime, scheduleTargetLocationName)}
                className="px-5 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-500 disabled:opacity-50 text-white font-mono text-xs font-bold flex items-center gap-2 shadow-lg shadow-pink-600/30 transition-all cursor-pointer"
                id="btn-confirmar-inserir-agenda"
              >
                {isAssigningSchedule ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Salvando na Agenda...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Confirmar Agendamento na Agenda</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Oficial de Certificação Visual para o Instrutor */}
      {adminCertificateBooking && (
        <ConquestCertificateModal
          booking={adminCertificateBooking}
          isOpen={Boolean(adminCertificateBooking)}
          onClose={() => setAdminCertificateBooking(null)}
        />
      )}

    </div>
  );
}
