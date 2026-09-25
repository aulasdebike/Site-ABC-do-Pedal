'use client';

import React, { useState, useEffect } from 'react';
import {
  User,
  Calendar,
  Clock,
  MapPin,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Shield,
  ExternalLink,
  ChevronRight,
  Info,
  Navigation,
  HelpCircle,
  Award,
  ArrowRight,
  MessageCircle,
  Phone,
  LogOut,
  Users,
  Search,
  Lock,
  FileCheck,
  Pencil,
  X,
  Save,
  CheckCircle2,
  Target,
  Upload,
  Eye,
  FileText,
  Maximize2,
  Plus,
  Camera,
  Image as ImageIcon,
  FileUp
} from 'lucide-react';
import { CURRENT_PRODUCT } from '@/lib/products';
import { getBookingsFromFirestore, subscribeToBookings } from '@/lib/firebase';
import {
  BookingRecord,
  StudentData,
  getStoredBookings,
  saveStoredBookings,
  getStoredCurrentBookingId,
  formatDateBrazilian,
  getWeekdayName,
  isSlotExpired,
  isSlotMatchingStudentLocation,
  generateWhatsAppNotificationUrl,
  TimeSlot,
  getStoredSlots,
  saveStoredSlots,
  normalizeWhatsApp,
  findBookingsByWhatsApp,
  getStoredStudentWhatsApp,
  saveStoredStudentWhatsApp,
  submitBookingVoucher,
  compressReceiptImage,
  canStudentAlterBooking,
  getBookingVoucherUrl,
  SkillItem,
  DEFAULT_SKILLS,
  getStoredSkills,
  OFFICIAL_WHATSAPP_NUMBER,
  OFFICIAL_WHATSAPP_DISPLAY,
  OFFICIAL_WHATSAPP_URL,
  ABCDE_STAGES,
  ABCDESkillStatus,
  getStudentSkillStatus,
  getStudentHighlights,
  getABCDECompletionStats,
  checkAndProcessExpired24hRejections,
  isBookingAwaitingInstructorSchedule
} from '@/lib/booking-store';
import { ConquestCertificateModal } from './ConquestCertificateModal';

interface StudentPortalProps {
  initialBookingId?: string | null;
  onBackToBooking?: () => void;
}

export function StudentPortal({ initialBookingId, onBackToBooking }: StudentPortalProps) {
  const [allBookings, setAllBookings] = useState<BookingRecord[]>(() => {
    if (typeof window !== 'undefined') {
      return getStoredBookings();
    }
    return [];
  });

  // WhatsApp Authentication state - The registered WhatsApp is the sole access credential
  const [loggedWhatsApp, setLoggedWhatsApp] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const stored = getStoredStudentWhatsApp();
      if (stored) {
        const bookings = getStoredBookings();
        const matches = findBookingsByWhatsApp(stored, bookings);
        if (matches.length > 0) {
          return stored;
        } else {
          saveStoredStudentWhatsApp(null);
        }
      }

      // If arrived with initialBookingId from an immediate booking completion
      if (initialBookingId) {
        const bookings = getStoredBookings();
        const found = bookings.find((b) => b.id === initialBookingId);
        if (found) {
          const wa = found.student.guardian?.whatsapp || found.student.whatsapp;
          if (wa) {
            saveStoredStudentWhatsApp(wa);
            return wa;
          }
        }
      }
    }
    return '';
  });

  const [inputWhatsApp, setInputWhatsApp] = useState<string>('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);

  // Sync with Firestore database on mount to make sure all registered students are available
  useEffect(() => {
    let isMounted = true;
    async function syncDatabase() {
      try {
        const firestoreBookings = await getBookingsFromFirestore();
        if (isMounted && firestoreBookings && firestoreBookings.length > 0) {
          const local = getStoredBookings();
          const map = new Map<string, BookingRecord>();
          local.forEach((b) => map.set(b.id, b));
          firestoreBookings.forEach((b) => {
            const current = map.get(b.id);
            if (!current) {
              map.set(b.id, b);
            } else {
              const isBConfirmed = b.status === 'agendamento-confirmado' || b.status === 'confirmado' || b.status === 'pagamento-confirmado' || Boolean(b.paymentConfirmedAt);
              const isCurConfirmed = current.status === 'agendamento-confirmado' || current.status === 'confirmado' || current.status === 'pagamento-confirmado' || Boolean(current.paymentConfirmedAt);

              if (isBConfirmed && !isCurConfirmed) {
                map.set(b.id, b);
              } else if (!isBConfirmed && isCurConfirmed) {
                map.set(b.id, current);
              } else {
                const bTime = new Date(b.approvedAt || b.paymentConfirmedAt || b.confirmedAt || b.voucherSentAt || (b as any).updatedAt || b.createdAt || 0).getTime();
                const curTime = new Date(current.approvedAt || current.paymentConfirmedAt || current.confirmedAt || current.voucherSentAt || (current as any).updatedAt || current.createdAt || 0).getTime();
                map.set(b.id, bTime >= curTime ? b : current);
              }
            }
          });
          const merged = Array.from(map.values());
          setAllBookings(merged);
          saveStoredBookings(merged);

          // Verify if currently logged WhatsApp still exists in the database
          if (loggedWhatsApp) {
            const valid = findBookingsByWhatsApp(loggedWhatsApp, merged);
            if (valid.length === 0) {
              setLoggedWhatsApp('');
              saveStoredStudentWhatsApp(null);
            }
          }
        }
      } catch (e) {
        console.warn('Could not sync Firestore in StudentPortal:', e);
      }
    }
    syncDatabase();
    return () => {
      isMounted = false;
    };
  }, [loggedWhatsApp]);

  // Real-time synchronization with Firestore (reage imediatamente se o instrutor aprovar o comprovante)
  useEffect(() => {
    let isMounted = true;
    const unsubscribe = subscribeToBookings((firestoreBookings) => {
      if (!isMounted || !firestoreBookings || firestoreBookings.length === 0) return;
      setAllBookings(() => {
        const local = getStoredBookings();
        const map = new Map<string, BookingRecord>();
        local.forEach((b) => map.set(b.id, b));
        firestoreBookings.forEach((b) => {
          const current = map.get(b.id);
          if (!current) {
            map.set(b.id, b);
          } else {
            const isBConfirmed = b.status === 'agendamento-confirmado' || b.status === 'confirmado' || b.status === 'pagamento-confirmado' || Boolean(b.paymentConfirmedAt);
            const isCurConfirmed = current.status === 'agendamento-confirmado' || current.status === 'confirmado' || current.status === 'pagamento-confirmado' || Boolean(current.paymentConfirmedAt);

            if (isBConfirmed && !isCurConfirmed) {
              map.set(b.id, b);
            } else if (!isBConfirmed && isCurConfirmed) {
              map.set(b.id, current);
            } else {
              const bTime = new Date(b.approvedAt || b.paymentConfirmedAt || b.confirmedAt || b.voucherSentAt || (b as any).updatedAt || b.createdAt || 0).getTime();
              const curTime = new Date(current.approvedAt || current.paymentConfirmedAt || current.confirmedAt || current.voucherSentAt || (current as any).updatedAt || current.createdAt || 0).getTime();
              map.set(b.id, bTime >= curTime ? b : current);
            }
          }
        });
        const merged = Array.from(map.values());
        saveStoredBookings(merged);
        return merged;
      });
    });

    // Escuta eventos de atualização de agendamento disparados na mesma sessão
    const handleLocalUpdate = (e: any) => {
      const detail = e?.detail;
      const latest = getStoredBookings();
      if (Array.isArray(detail)) {
        setAllBookings(detail);
      } else if (detail && typeof detail === 'object' && 'id' in detail) {
        const map = new Map<string, BookingRecord>();
        latest.forEach((b) => map.set(b.id, b));
        map.set(detail.id, detail as BookingRecord);
        setAllBookings(Array.from(map.values()));
      } else {
        setAllBookings(latest);
      }
    };
    window.addEventListener('abc_booking_updated', handleLocalUpdate);
    window.addEventListener('storage', handleLocalUpdate);

    let syncChannel: BroadcastChannel | null = null;
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        syncChannel = new BroadcastChannel('abc_booking_sync_channel');
        syncChannel.onmessage = (event) => {
          if (event?.data?.type === 'abc_booking_updated') {
            if (Array.isArray(event.data.bookings)) {
              setAllBookings(event.data.bookings);
            } else if (event.data.booking && event.data.booking.id) {
              const latest = getStoredBookings();
              const map = new Map<string, BookingRecord>();
              latest.forEach((b) => map.set(b.id, b));
              map.set(event.data.booking.id, event.data.booking);
              setAllBookings(Array.from(map.values()));
            } else {
              setAllBookings(getStoredBookings());
            }
          }
        };
      }
    } catch {}

    // Verifica encerramento do prazo de 24 horas imediatamente e a cada 30 segundos
    checkAndProcessExpired24hRejections();
    const timer24h = setInterval(() => {
      if (checkAndProcessExpired24hRejections()) {
        setAllBookings(getStoredBookings());
      }
    }, 30000);

    return () => {
      isMounted = false;
      if (unsubscribe) unsubscribe();
      if (syncChannel) syncChannel.close();
      clearInterval(timer24h);
      window.removeEventListener('abc_booking_updated', handleLocalUpdate);
      window.removeEventListener('storage', handleLocalUpdate);
    };
  }, []);

  // Selected Booking ID within this student's authorized list
  const [selectedBookingId, setSelectedBookingId] = useState<string>(() => {
    if (initialBookingId) return initialBookingId;
    return '';
  });

  // Rejection notice state for immediate logout / session termination
  const [rejectionNotice, setRejectionNotice] = useState<{
    bookingId: string;
    studentName: string;
    phone: string;
  } | null>(null);

  // Filter bookings belonging strictly to this authenticated WhatsApp
  const matchingBookings = loggedWhatsApp ? findBookingsByWhatsApp(loggedWhatsApp, allBookings) : [];

  // Current active booking strictly belonging to this student
  const booking = matchingBookings.find((b) => b.id === selectedBookingId) || matchingBookings[0] || null;

  // Escuta em tempo real eventos de atualização ou rejeição de comprovante para sincronizar a tela do aluno
  useEffect(() => {
    const handleSyncEvent = () => {
      const fresh = getStoredBookings();
      setAllBookings(fresh);
    };
    window.addEventListener('abc_booking_rejected', handleSyncEvent);
    window.addEventListener('abc_booking_updated', handleSyncEvent);
    return () => {
      window.removeEventListener('abc_booking_rejected', handleSyncEvent);
      window.removeEventListener('abc_booking_updated', handleSyncEvent);
    };
  }, []);

  // Modal para conferência em tamanho maior do comprovante enviado pelo aluno
  const [selectedVoucherForView, setSelectedVoucherForView] = useState<{
    url: string;
    fileName: string;
    title: string;
  } | null>(null);

  // Estados para envio/reenvio do comprovante de pagamento
  const [reuploadPreview, setReuploadPreview] = useState<string | null>(null);
  const [reuploadFileName, setReuploadFileName] = useState<string>('');
  const [isSubmittingReupload, setIsSubmittingReupload] = useState(false);
  const [reuploadError, setReuploadError] = useState<string | null>(null);
  const [reuploadSuccessMsg, setReuploadSuccessMsg] = useState<string | null>(null);

  const handleCancelReupload = () => {
    setReuploadPreview(null);
    setReuploadFileName('');
    setReuploadError(null);
  };

  const formatDateTimeDisplay = (isoString?: string): string => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      return `${d.toLocaleDateString('pt-BR')} às ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    } catch {
      return isoString;
    }
  };

  const handleReuploadFileChange = (file: File) => {
    setReuploadError(null);
    const validMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    const nameLower = file.name.toLowerCase();
    const validExts = ['.jpg', '.jpeg', '.png', '.webp'];
    const hasValidExt = validExts.some((ext) => nameLower.endsWith(ext));

    if (!validMimes.includes(file.type) && !hasValidExt) {
      setReuploadError('Permitido apenas arquivos de imagem nos formatos JPG, JPEG, PNG ou WEBP.');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setReuploadError('A imagem não pode ultrapassar 15MB. Envie um arquivo menor.');
      return;
    }

    compressReceiptImage(file)
      .then((dataUrl) => {
        setReuploadPreview(dataUrl);
        setReuploadFileName(file.name);
      })
      .catch(() => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const dataUrl = e.target?.result as string;
          setReuploadPreview(dataUrl);
          setReuploadFileName(file.name);
        };
        reader.readAsDataURL(file);
      });
  };

  const handleConfirmReupload = () => {
    if (!booking || !reuploadPreview) {
      setReuploadError('Selecione uma imagem do comprovante antes de enviar.');
      return;
    }

    setIsSubmittingReupload(true);
    setReuploadError(null);

    const updated = submitBookingVoucher(booking.id, {
      voucherUrl: reuploadPreview,
      voucherFileName: reuploadFileName || 'comprovante_pagamento.jpg'
    });

    if (updated) {
      const fresh = getStoredBookings();
      setAllBookings(fresh);
      setSelectedBookingId(updated.id);
      setReuploadPreview(null);
      setReuploadFileName('');
      setReuploadSuccessMsg('Novo comprovante enviado com sucesso e atualizado no sistema para análise do instrutor!');
      setTimeout(() => setReuploadSuccessMsg(null), 6000);
    }
    setIsSubmittingReupload(false);
  };

  const [prevInitialBookingId, setPrevInitialBookingId] = useState(initialBookingId);
  if (initialBookingId !== prevInitialBookingId) {
    setPrevInitialBookingId(initialBookingId);
    if (initialBookingId) {
      const found = allBookings.find((b) => b.id === initialBookingId);
      if (found) {
        const wa = found.student.guardian?.whatsapp || found.student.whatsapp;
        if (wa) {
          saveStoredStudentWhatsApp(wa);
          setLoggedWhatsApp(wa);
          setSelectedBookingId(found.id);
        }
      }
    }
  }

  const [showScheduleNewModal, setShowScheduleNewModal] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>(() => {
    if (typeof window !== 'undefined') {
      return getStoredSlots().filter((s) => s.status === 'available' && !isSlotExpired(s.date, s.time));
    }
    return [];
  });
  const [selectedSlotForNew, setSelectedSlotForNew] = useState<TimeSlot | null>(null);
  const [cancellationAlert, setCancellationAlert] = useState<{
    canCancelFree: boolean;
    hoursLeft: number;
  } | null>(null);
  const [showCancelConfirmation, setShowCancelConfirmation] = useState(false);
  const [isCertificateModalOpen, setIsCertificateModalOpen] = useState(false);

  // Cálculo das 20 habilidades do Método ABCDE e checagem de 100% de conclusão para o certificado
  const completionStats = booking ? getABCDECompletionStats(booking) : null;

  // Format phone number as (11) 99999-9999
  const formatPhoneInput = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };

  const handleLoginWithWhatsApp = async (e?: React.FormEvent, directNumber?: string) => {
    if (e) e.preventDefault();
    setAuthError(null);

    const numberToTest = directNumber || inputWhatsApp;
    const cleanInput = normalizeWhatsApp(numberToTest);

    if (!cleanInput || cleanInput.length < 10) {
      setAuthError('Por favor, informe o WhatsApp completo com DDD (ex: (11) 95043-8948).');
      return;
    }

    setIsVerifying(true);
    try {
      let currentBookings = getStoredBookings();
      try {
        const firestoreBookings = await getBookingsFromFirestore();
        if (firestoreBookings && firestoreBookings.length > 0) {
          const map = new Map<string, BookingRecord>();
          currentBookings.forEach((b) => map.set(b.id, b));
          firestoreBookings.forEach((b) => map.set(b.id, b));
          currentBookings = Array.from(map.values());
          saveStoredBookings(currentBookings);
        }
      } catch (err) {
        console.warn('Fallback to local database store:', err);
      }

      setAllBookings(currentBookings);
      const matches = findBookingsByWhatsApp(cleanInput, currentBookings);

      // Regra estrita: Se o WhatsApp não estiver cadastrado no banco de dados, o acesso deve ser negado
      if (matches.length === 0) {
        setAuthError(
          `Acesso negado: O WhatsApp informado (${numberToTest}) não consta no cadastro de alunos do sistema. O acesso à Área do Aluno é liberado exclusivamente para o WhatsApp vinculado a uma matrícula ou reserva ativa.`
        );
        setIsVerifying(false);
        return;
      }

      // Se o WhatsApp estiver cadastrado no banco de dados, liberar acesso
      saveStoredStudentWhatsApp(numberToTest);
      setLoggedWhatsApp(numberToTest);

      // Preferencialmente seleciona agendamento em andamento, confirmado ou rejeitado
      const preferred =
        matches.find(
          (b) =>
            b.status === 'aguardando-confirmacao-instrutor' ||
            b.status === 'comprovante-enviado' ||
            b.status === 'agendamento-confirmado' ||
            b.status === 'confirmado' ||
            b.status === 'comprovante-rejeitado' ||
            b.status === 'comprovante-reprovado' ||
            b.status === 'aguardando-novo-pagamento'
        ) || matches[0];

      setSelectedBookingId(preferred.id);
      setAuthError(null);
    } catch (err) {
      console.error('Erro na consulta do banco de dados:', err);
      setAuthError('Falha temporária ao consultar o banco de dados. Tente novamente.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleLogout = () => {
    saveStoredStudentWhatsApp(null);
    setLoggedWhatsApp('');
    setSelectedBookingId('');
    setInputWhatsApp('');
    setAuthError(null);
  };

  // Check 24-hour cancellation rule (Only allowed if payment was confirmed by instructor)
  const handleInitiateCancel = () => {
    if (!booking) return;

    const perm = canStudentAlterBooking(booking);
    if (!perm.allowed) {
      alert(perm.reason || 'Operação de cancelamento bloqueada.');
      return;
    }

    if (isBookingAwaitingInstructorSchedule(booking) || !booking.slot?.date || !booking.slot?.time) {
      alert('A aula ainda está aguardando a definição de data e horário pelo instrutor.');
      return;
    }

    // Slot date and time
    const [year, month, day] = booking.slot.date.split('-').map(Number);
    const [hour, min] = booking.slot.time.split(':').map(Number);
    const slotDateTime = new Date(year, month - 1, day, hour, min);
    const now = new Date();

    const diffMs = slotDateTime.getTime() - now.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    setCancellationAlert({
      canCancelFree: diffHours >= 24,
      hoursLeft: Math.round(diffHours)
    });
    setShowCancelConfirmation(true);
  };

  const handleConfirmCancel = () => {
    if (!booking) return;

    const updated: BookingRecord = {
      ...booking,
      status: 'cancelado',
      cancellationReason: cancellationAlert?.canCancelFree
        ? 'Cancelado com mais de 24h de antecedência'
        : 'Cancelado com menos de 24h (sujeito a taxa de R$ 50 para remarcação)',
      cancellationFee: cancellationAlert?.canCancelFree ? 0 : 50.0
    };

    const all = getStoredBookings().map((b) => (b.id === updated.id ? updated : b));
    saveStoredBookings(all);
    setAllBookings(all);
    setShowCancelConfirmation(false);

    // Free the slot
    const slots = getStoredSlots().map((s) => {
      if (s.id === booking.slot.id) {
        const freed = { ...s, status: 'available' as const };
        delete freed.bookedByStudentName;
        delete freed.bookingId;
        return freed;
      }
      return s;
    });
    saveStoredSlots(slots);
  };

  // Schedule Next Session (Without re-typing personal registration data)
  const handleScheduleNextSession = () => {
    if (!selectedSlotForNew || !booking) return;

    const perm = canStudentAlterBooking(booking);
    if (!perm.allowed) {
      alert(perm.reason || 'Operação de remarcação bloqueada.');
      return;
    }

    const updated: BookingRecord = {
      ...booking,
      slot: {
        id: selectedSlotForNew.id,
        date: selectedSlotForNew.date,
        time: selectedSlotForNew.time,
        durationMinutes: 50
      },
      status: 'confirmado' // subsequent sessions are scheduled directly in the program
    };

    const all = getStoredBookings().map((b) => (b.id === updated.id ? updated : b));
    saveStoredBookings(all);
    setAllBookings(all);

    // Update slots
    const slots = getStoredSlots().map((s) => {
      if (s.id === selectedSlotForNew.id) {
        return { ...s, status: 'occupied' as const, bookedByStudentName: booking.student.fullName, bookingId: booking.id };
      }
      return s;
    });
    saveStoredSlots(slots);

    setShowScheduleNewModal(false);
    setSelectedSlotForNew(null);
  };

  // 1. TELA DE LOGIN COM WHATSAPP DO RESPONSÁVEL / ALUNO
  if (!loggedWhatsApp || matchingBookings.length === 0 || !booking) {
    return (
      <div className="w-full max-w-xl mx-auto px-4 py-12 text-slate-100" id="student-login-container">
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden backdrop-blur-md">
          <div className="absolute top-0 right-0 w-64 h-64 bg-pink-600/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-500/20 to-emerald-500/20 border border-pink-500/30 flex items-center justify-center text-pink-400 mx-auto mb-4 shadow-lg shadow-pink-500/10">
              <MessageCircle className="w-8 h-8 text-[#ff007f]" />
            </div>
            
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-950 border border-slate-800 text-[11px] font-mono text-pink-400 mb-2">
              <Lock className="w-3 h-3 text-emerald-400" />
              <span>Credencial de Acesso • WhatsApp Cadastrado</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Área do Aluno
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-2 max-w-md mx-auto leading-relaxed">
              O próprio <strong>WhatsApp cadastrado é a credencial de acesso</strong>. O sistema consulta o banco de dados e libera exclusivamente a Área do Aluno vinculada àquele número.
            </p>
          </div>

          <form onSubmit={handleLoginWithWhatsApp} className="space-y-4">
            <div>
              <label htmlFor="input-student-whatsapp" className="block text-xs font-mono text-slate-300 uppercase font-bold mb-2">
                WhatsApp do Aluno ou Responsável *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Phone className="w-4 h-4 text-pink-400" />
                </div>
                <input
                  id="input-student-whatsapp"
                  type="tel"
                  value={inputWhatsApp}
                  onChange={(e) => {
                    setInputWhatsApp(formatPhoneInput(e.target.value));
                    if (authError) setAuthError(null);
                  }}
                  placeholder="(11) 95043-8948"
                  className="w-full pl-10 pr-4 py-3.5 bg-slate-950 border border-slate-800 rounded-xl text-sm font-mono text-white placeholder-slate-600 focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500 transition-all"
                  autoFocus
                  required
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5">
                Digite o DDD e o número cadastrado no momento da reserva.
              </p>
            </div>

            {authError && (
              <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-500/50 text-rose-300 text-xs flex items-start gap-3 animate-in fade-in" id="student-login-error">
                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-rose-400" />
                <div className="space-y-1">
                  <p className="font-bold text-rose-200">Acesso Não Autorizado</p>
                  <p className="leading-relaxed">{authError}</p>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isVerifying}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-pink-600 to-[#ff007f] hover:from-pink-500 hover:to-[#ff2a85] disabled:opacity-60 text-white font-black text-sm py-3.5 px-6 rounded-xl transition-all shadow-lg shadow-pink-600/30 transform hover:-translate-y-0.5 cursor-pointer"
              id="btn-entrar-painel-aluno"
            >
              {isVerifying ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Consultando banco de dados...</span>
                </>
              ) : (
                <>
                  <span>ACESSAR ÁREA DO ALUNO</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Fill Helper */}
          <div className="mt-6 pt-6 border-t border-slate-800/80 text-center space-y-3">
            <p className="text-[11px] text-slate-400">
              💡 Aluno de teste cadastrado no banco de dados (Lucas Fernandes):
            </p>
            <button
              type="button"
              onClick={() => {
                setInputWhatsApp('(11) 95043-8948');
                handleLoginWithWhatsApp(undefined, '(11) 95043-8948');
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-mono text-pink-400 transition-colors cursor-pointer"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Usar WhatsApp cadastrado: (11) 95043-8948</span>
            </button>

            {onBackToBooking && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={onBackToBooking}
                  className="text-xs text-slate-400 hover:text-white underline underline-offset-4 transition-colors cursor-pointer"
                >
                  Ainda não tem cadastro? Iniciar agendamento
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Count milestones completed
  const completedMilestones = Object.values(booking.milestones || {}).filter(Boolean).length;
  const isProgramCompleted = completedMilestones >= 9;

  // Check if payment has been confirmed by instructor or PagBank (item requested: edit allowed ONLY after payment confirmation)
  const isPaymentConfirmed = Boolean(
    booking &&
    (booking.status === 'agendamento-confirmado' ||
      booking.status === 'confirmado' ||
      booking.status === 'pagamento-confirmado' ||
      booking.status === 'concluido' ||
      Boolean(booking.paymentConfirmedAt))
  );

  const isAwaitingNewPayment = Boolean(
    booking &&
    !isPaymentConfirmed &&
    booking.status === 'aguardando-novo-pagamento'
  );

  const isRejected = Boolean(
    booking &&
    !isPaymentConfirmed &&
    !isAwaitingNewPayment &&
    (booking.status === 'pedido-rejeitado' ||
      booking.status === 'comprovante-rejeitado' ||
      booking.status === 'comprovante-reprovado' ||
      booking.status === 'pagamento-nao-confirmado')
  );

  // REGRA DE COMPORTAMENTO ABSOLUTA (Mutuamente exclusivos):
  // 1. Quando pendente de análise: exibir apenas "Aguardando confirmação do Instrutor".
  // 2. Assim que o Instrutor aprovar: status vai para confirmado e "Aguardando confirmação do Instrutor" é AUTOMATICAMENTE REMOVIDA.
  // 3. Nunca exibir simultaneamente os dois estados.
  const isAwaitingInstructor = Boolean(
    booking &&
    !isPaymentConfirmed &&
    !isRejected &&
    !isAwaitingNewPayment &&
    booking.status !== 'cancelado' &&
    booking.status !== 'reserva-expirada' &&
    (booking.status === 'aguardando-confirmacao-instrutor' ||
      booking.status === 'comprovante-enviado' ||
      booking.status === 'pagamento-enviado' ||
      Boolean(booking.voucherSentAt || booking.voucherUrl))
  );

  const isAwaitingSchedule = isBookingAwaitingInstructorSchedule(booking);

  const isTemporary = Boolean(
    booking &&
    !isPaymentConfirmed &&
    !isAwaitingInstructor &&
    !isRejected &&
    !isAwaitingNewPayment &&
    booking.status !== 'cancelado' &&
    booking.status !== 'reserva-expirada' &&
    (booking.status === 'reserva-temporaria' ||
      booking.status === 'aguardando-pagamento' ||
      booking.status === 'pre-agendado')
  );

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-8 text-slate-100" id="student-portal-container">
      
      {/* Portal Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-800">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className="bg-pink-500/10 border border-pink-500/30 text-pink-400 text-xs font-mono font-bold uppercase px-2.5 py-0.5 rounded-full">
              Área do Aluno
            </span>
            <span className="inline-flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold px-2.5 py-0.5 rounded-full">
              <MessageCircle className="w-3 h-3" />
              <span>WhatsApp: {loggedWhatsApp}</span>
            </span>
            <span className="text-xs text-slate-400 font-mono">
              ID: {booking.id.slice(0, 14)}
            </span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-white mt-1">
            Olá, {booking.student.fullName}
          </h2>
          <p className="text-xs text-slate-400 font-light mt-0.5">
            Responsável: <strong>{booking.student.guardian?.fullName || booking.student.fullName}</strong> • Acompanhe seus encontros, sua evolução no Método ABC-DE e gerencie suas datas.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleLogout}
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-mono font-bold text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors"
            title="Sair ou trocar de WhatsApp"
            id="btn-logout-aluno"
          >
            <LogOut className="w-3.5 h-3.5 text-rose-400" />
            <span>Trocar WhatsApp / Sair</span>
          </button>

          {onBackToBooking && (
            <button
              type="button"
              onClick={() => {
                if (isAwaitingInstructor) {
                  alert('Existe uma solicitação de agendamento em análise pelo instrutor. Aguarde a confirmação para realizar novos agendamentos.');
                  return;
                }
                onBackToBooking();
              }}
              className="px-3.5 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-xs font-mono font-bold text-white transition-colors cursor-pointer"
              id="btn-portal-novo-agendamento"
            >
              Novo Agendamento
            </button>
          )}
        </div>
      </div>

      {/* Multiple Students Selector if more than 1 booking exists for this WhatsApp */}
      {matchingBookings.length > 1 && (
        <div className="mb-6 p-4 rounded-xl bg-slate-950 border border-slate-800">
          <span className="text-xs font-mono text-slate-400 uppercase font-bold block mb-2">
            Alunos vinculados a este WhatsApp ({matchingBookings.length}):
          </span>
          <div className="flex flex-wrap gap-2">
            {matchingBookings.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => setSelectedBookingId(b.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                  b.id === booking.id
                    ? 'bg-pink-600 text-white shadow-md'
                    : 'bg-slate-900 text-slate-300 hover:text-white border border-slate-800'
                }`}
              >
                {b.student.fullName} ({isBookingAwaitingInstructorSchedule(b) ? 'Aguardando Instrutor' : (b.slot?.date ? formatDateBrazilian(b.slot.date) : 'Sem data')})
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 15. PROGRAM COMPLETED HERO BADGE (When objective achieved) */}
      {isProgramCompleted && (
        <div className="mb-8 p-6 rounded-2xl bg-gradient-to-r from-pink-950/80 via-rose-900/60 to-pink-950/80 border-2 border-pink-500 shadow-2xl animate-in zoom-in">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-pink-500 text-white flex items-center justify-center shrink-0 shadow-lg">
              <Award className="w-7 h-7" />
            </div>
            <div>
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-pink-300">
                Parabéns pela conquista!
              </span>
              <h3 className="text-2xl font-black text-white mt-0.5">
                Programa Concluído
              </h3>
              <p className="text-base font-bold text-pink-200 mt-1">
                Objetivo alcançado: você aprendeu a pedalar!
              </p>
              <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                Você conquistou total autonomia sobre a bicicleta. As etapas seguintes (Domínio Total e Expert) continuam à sua disposição como módulos opcionais de evolução técnica quando desejar.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 🟨 DESTAQUE VISUAL: COMPROVANTE EM ANÁLISE (Fundo Amarelo • Destaque Visual • Efeito Pulsante Discreto) */}
      {isAwaitingInstructor && (
        <div 
          className="mb-8 p-6 sm:p-7 rounded-2xl bg-amber-400 text-slate-950 border-2 border-yellow-300 shadow-xl shadow-yellow-500/20 animate-in fade-in transition-all relative overflow-hidden ring-4 ring-yellow-400/25"
          id="destaque-comprovante-em-analise"
        >
          {/* Efeito pulsante discreto de fundo */}
          <div className="absolute inset-0 bg-yellow-300/35 animate-pulse pointer-events-none" />

          <div className="relative z-10 space-y-3.5">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-amber-950/20">
              <div className="flex items-center gap-3">
                <span className="relative flex h-3.5 w-3.5 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-900 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-amber-950"></span>
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-slate-950 uppercase tracking-tight flex items-center gap-2 font-sans">
                  <span>🟨</span> COMPROVANTE EM ANÁLISE
                </h2>
              </div>
              <span className="px-3.5 py-1.5 rounded-xl bg-slate-950 text-amber-300 text-xs font-mono font-black uppercase tracking-wider shadow-sm">
                Status: AGUARDANDO CONFIRMAÇÃO DO INSTRUTOR
              </span>
            </div>

            <p className="text-slate-950 font-bold text-sm sm:text-base leading-relaxed">
              {isAwaitingSchedule
                ? 'Seu comprovante foi enviado com sucesso e está em análise pelo instrutor. A data e o horário da sua aula serão confirmados diretamente pelo instrutor na agenda.'
                : 'Seu comprovante foi enviado com sucesso e está em análise pelo instrutor. Seu horário está temporariamente reservado enquanto aguarda a validação.'}
            </p>

            {/* CAMPO DE VISUALIZAÇÃO DA IMAGEM DO COMPROVANTE ANEXADO */}
            <div 
              className="p-4 sm:p-5 rounded-2xl bg-slate-950/95 text-slate-100 border-2 border-amber-950/30 shadow-2xl space-y-4"
              id="campo-visualizacao-comprovante-analise"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-amber-400" />
                  <span className="font-mono text-xs uppercase font-bold text-amber-300">
                    Visualização da Imagem do Comprovante Anexado
                  </span>
                </div>
                <span className="text-[10px] font-mono px-2.5 py-1 rounded bg-amber-950 text-amber-300 border border-amber-500/40 font-bold uppercase">
                  Comprovante em Análise
                </span>
              </div>

              {/* Informações detalhadas do arquivo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono text-slate-300 bg-slate-900/90 p-3 rounded-xl border border-slate-800">
                <div className="truncate">
                  <span className="text-slate-400 block text-[11px]">Arquivo enviado:</span>
                  <strong className="text-white truncate block">{booking.voucherFileName || 'comprovante_pagamento.jpg'}</strong>
                </div>
                {booking.voucherSentAt && (
                  <div>
                    <span className="text-slate-400 block text-[11px]">Data e hora do envio:</span>
                    <strong className="text-slate-200 block">{formatDateTimeDisplay(booking.voucherSentAt)}</strong>
                  </div>
                )}
              </div>

              {/* Campo de Visualização da Imagem */}
              {Boolean(getBookingVoucherUrl(booking)) ? (
                <div className="space-y-3">
                  <div 
                    className="relative group cursor-pointer overflow-hidden rounded-xl border border-slate-700 bg-black/90 flex flex-col items-center justify-center p-3 transition-all hover:border-amber-400/60 shadow-inner"
                    onClick={() =>
                      setSelectedVoucherForView({
                        url: getBookingVoucherUrl(booking)!,
                        fileName: booking.voucherFileName || 'comprovante.jpg',
                        title: `Comprovante em Análise de ${booking.student.fullName}`
                      })
                    }
                    title="Clique para ampliar o comprovante"
                    id="img-container-comprovante-analise"
                  >
                    <img
                      src={getBookingVoucherUrl(booking)!}
                      alt={`Comprovante de pagamento de ${booking.student.fullName}`}
                      className="w-full max-h-72 sm:max-h-80 object-contain rounded-lg transition-transform duration-200 group-hover:scale-[1.01]"
                      id="img-comprovante-anexado-analise"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-xs font-mono font-bold gap-2 backdrop-blur-[2px]">
                      <Maximize2 className="w-5 h-5 text-amber-400" />
                      <span>Clique para ampliar comprovante em tela cheia</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5 pt-1">
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedVoucherForView({
                          url: getBookingVoucherUrl(booking)!,
                          fileName: booking.voucherFileName || 'comprovante.jpg',
                          title: `Comprovante de ${booking.student.fullName}`
                        })
                      }
                      className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-300 hover:text-white text-xs font-mono font-bold flex items-center gap-2 transition-colors cursor-pointer border border-slate-700 shadow"
                      id="btn-visualizar-comprovante-topo"
                    >
                      <Eye className="w-4 h-4" />
                      <span>Visualizar / Ampliar Imagem</span>
                    </button>

                    <a
                      href={getBookingVoucherUrl(booking)!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-mono flex items-center gap-2 transition-colors cursor-pointer border border-slate-800"
                      id="btn-abrir-nova-aba-comprovante-analise"
                    >
                      <ExternalLink className="w-4 h-4 text-slate-400" />
                      <span>Abrir em Nova Aba</span>
                    </a>
                  </div>
                </div>
              ) : (
                <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 text-center text-xs font-mono text-slate-400">
                  <ImageIcon className="w-8 h-8 text-slate-600 mx-auto mb-1.5" />
                  <span>Nenhuma imagem de comprovante anexada ainda.</span>
                </div>
              )}

              {/* BOTÕES PARA ANEXAR NOVA IMAGEM DE COMPROVANTE */}
              <div className="pt-3 border-t border-slate-800 space-y-3" id="bloco-anexar-novo-comprovante-analise">
                <div className="flex flex-wrap items-center justify-between gap-1">
                  <span className="text-xs font-mono font-bold uppercase text-slate-200 flex items-center gap-1.5">
                    <Upload className="w-4 h-4 text-amber-400" />
                    <span>Anexar Nova Imagem de Comprovante:</span>
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">Formatos aceitos: JPG, PNG, WEBP (até 15MB)</span>
                </div>

                {/* Input file padrão */}
                <input
                  type="file"
                  id="input-anexar-novo-comprovante-analise"
                  accept="image/png,image/jpeg,image/webp,image/jpg"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleReuploadFileChange(file);
                  }}
                  className="hidden"
                />

                {/* Input file de câmera para celulares e tablets */}
                <input
                  type="file"
                  id="input-camera-novo-comprovante-analise"
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleReuploadFileChange(file);
                  }}
                  className="hidden"
                />

                {/* Se houver arquivo selecionado pelo usuário */}
                {reuploadPreview ? (
                  <div className="p-4 rounded-xl bg-slate-900 border-2 border-amber-500/50 space-y-3 animate-in fade-in" id="preview-novo-comprovante-analise">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-amber-300 uppercase flex items-center gap-1.5">
                        <FileUp className="w-4 h-4 text-amber-400" />
                        <span>Nova Imagem Selecionada para Anexo:</span>
                      </span>
                      <button
                        type="button"
                        onClick={handleCancelReupload}
                        className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
                        title="Cancelar seleção"
                        id="btn-cancelar-preview-analise"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="relative inline-block max-w-full">
                      <img
                        src={reuploadPreview}
                        alt="Pré-visualização do novo comprovante"
                        className="max-h-52 rounded-lg border border-slate-700 object-contain mx-auto bg-black/90 shadow-md"
                      />
                    </div>

                    <p className="text-xs font-mono text-emerald-400 truncate">
                      Arquivo selecionado: <strong>{reuploadFileName}</strong>
                    </p>

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleConfirmReupload}
                        disabled={isSubmittingReupload}
                        className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-bold text-xs flex items-center gap-2 transition-colors cursor-pointer shadow-md disabled:opacity-50"
                        id="btn-confirmar-novo-comprovante-analise"
                      >
                        {isSubmittingReupload ? (
                          <span>Enviando nova imagem...</span>
                        ) : (
                          <>
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Confirmar e Substituir Imagem</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={handleCancelReupload}
                        className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono font-bold transition-colors cursor-pointer border border-slate-700"
                        id="btn-cancelar-novo-comprovante-analise"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-3">
                    <label
                      htmlFor="input-anexar-novo-comprovante-analise"
                      className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-mono font-bold text-xs flex items-center gap-2 transition-colors cursor-pointer shadow-md hover:scale-[1.02] active:scale-[0.98]"
                      id="btn-anexar-nova-imagem-analise"
                    >
                      <Upload className="w-4 h-4 text-slate-950" />
                      <span>Anexar Nova Imagem</span>
                    </label>

                    <label
                      htmlFor="input-camera-novo-comprovante-analise"
                      className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-300 hover:text-white font-mono font-bold text-xs flex items-center gap-2 transition-colors cursor-pointer border border-amber-500/40 shadow hover:scale-[1.02] active:scale-[0.98]"
                      id="btn-tirar-foto-comprovante-analise"
                    >
                      <Camera className="w-4 h-4 text-amber-400" />
                      <span>Tirar Foto da Câmera</span>
                    </label>
                  </div>
                )}

                {reuploadError && (
                  <p className="text-xs font-mono text-rose-400 font-bold bg-rose-950/60 border border-rose-500/40 p-2.5 rounded-lg">
                    {reuploadError}
                  </p>
                )}

                {reuploadSuccessMsg && (
                  <div className="p-3 rounded-xl bg-emerald-950/90 border border-emerald-500/50 text-emerald-200 text-xs font-mono flex items-center gap-2 shadow-lg">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{reuploadSuccessMsg}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono text-slate-900/90 font-semibold">
              <span>ℹ️</span>
              <span>Esta mensagem permanecerá visível enquanto o instrutor ainda não tiver aprovado ou reprovado o comprovante.</span>
            </div>
          </div>
        </div>
      )}

      {/* 🟩 DESTAQUE VISUAL: AGENDAMENTO CONFIRMADO PELO INSTRUTOR (Verde Neon • Substitui a Mensagem Amarela • Destaque Visual) */}
      {isPaymentConfirmed && (
        <div 
          className="mb-8 p-6 sm:p-7 rounded-2xl bg-[#00e65b] text-slate-950 border-2 border-[#39ff14] shadow-2xl shadow-[#39ff14]/30 animate-in fade-in transition-all relative overflow-hidden ring-4 ring-[#39ff14]/35"
          id="destaque-agendamento-confirmado-instrutor"
        >
          {/* Efeito luminoso e reflexo neon */}
          <div className="absolute -top-12 -right-12 w-80 h-80 bg-[#39ff14]/35 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 space-y-3.5">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-950/20">
              <div className="flex items-center gap-3">
                <span className="relative flex h-3.5 w-3.5 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-slate-950 opacity-60"></span>
                  <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-slate-950"></span>
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-slate-950 uppercase tracking-tight flex items-center gap-2 font-sans">
                  <span>🟩</span> AGENDAMENTO CONFIRMADO PELO INSTRUTOR
                </h2>
              </div>
              <span className="px-3.5 py-1.5 rounded-xl bg-slate-950 text-[#39ff14] text-xs font-mono font-black uppercase tracking-wider shadow-sm border border-[#39ff14]/40">
                Status: AGENDAMENTO CONFIRMADO
              </span>
            </div>

            <p className="text-slate-950 font-bold text-sm sm:text-base leading-relaxed">
              Vaga garantida e pagamento validado com sucesso pelo instrutor! O seu agendamento está oficialmente confirmado.
            </p>

            {/* Informações da aprovação e vínculo persistente do comprovante */}
            <div className="p-3.5 rounded-xl bg-emerald-300/80 border border-emerald-600/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono text-slate-950">
              <div className="space-y-1 min-w-0">
                <p>
                  <span className="font-bold text-slate-800">Instrutor responsável pela aprovação:</span>{' '}
                  <strong>{booking.approvedBy || 'Instrutor Responsável - ABC do Pedal'}</strong>
                </p>
                {(booking.approvedAt || booking.confirmedAt) && (
                  <p className="text-slate-800 text-[11px]">
                    <span className="font-bold">Data e hora da aprovação:</span>{' '}
                    {formatDateTimeDisplay(booking.approvedAt || booking.confirmedAt)}
                  </p>
                )}
                {booking.voucherFileName && (
                  <p className="text-slate-800 text-[11px] truncate">
                    <span className="font-bold">Comprovante vinculado:</span> {booking.voucherFileName}
                  </p>
                )}
              </div>

              {Boolean(getBookingVoucherUrl(booking)) && (
                <button
                  type="button"
                  onClick={() =>
                    setSelectedVoucherForView({
                      url: getBookingVoucherUrl(booking)!,
                      fileName: booking.voucherFileName || 'comprovante.jpg',
                      title: `Comprovante Aprovado de ${booking.student.fullName}`
                    })
                  }
                  className="px-3.5 py-2 rounded-xl bg-slate-950 hover:bg-slate-900 text-[#39ff14] hover:text-white text-xs font-mono font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 shadow-md border border-[#39ff14]/40"
                  id="btn-visualizar-comprovante-aprovado-topo"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Visualizar Comprovante Aprovado</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs font-mono text-slate-900/90 font-semibold">
              <CheckCircle2 className="w-4 h-4 text-slate-950 shrink-0" />
              <span>O comprovante enviado permanece arquivado no banco de dados e disponível para visualização no histórico.</span>
            </div>
          </div>
        </div>
      )}

      {/* 🟥 DESTAQUE VISUAL: COMPROVANTE INVÁLIDO/REPROVADO (Aviso Vermelho • Substitui o Aviso Amarelo • Destaque Visual) */}
      {isRejected && (
        <div 
          className="mb-8 p-6 sm:p-7 rounded-2xl bg-rose-950/90 text-rose-100 border-2 border-rose-500 shadow-2xl shadow-rose-950/50 animate-in fade-in transition-all relative overflow-hidden ring-4 ring-rose-500/25"
          id="destaque-comprovante-reprovado"
        >
          {/* Efeito luminoso vermelho */}
          <div className="absolute -top-12 -right-12 w-80 h-80 bg-rose-500/15 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 space-y-3.5">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-rose-500/30">
              <div className="flex items-center gap-3">
                <span className="relative flex h-3.5 w-3.5 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-rose-500"></span>
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight flex items-center gap-2 font-sans">
                  <span>🟥</span> COMPROVANTE INVÁLIDO/REPROVADO
                </h2>
              </div>
              <span className="px-3.5 py-1.5 rounded-xl bg-slate-950 text-rose-300 text-xs font-mono font-black uppercase tracking-wider shadow-sm border border-rose-500/40">
                Status: COMPROVANTE REPROVADO
              </span>
            </div>

            <p className="text-white font-bold text-sm sm:text-base leading-relaxed">
              Favor enviar o comprovante de pagamento válido, emitido pela operadora de pagamento. Dúvidas? Entre em contato pelo WhatsApp.
            </p>

            {/* CAMPO DE VISUALIZAÇÃO DA IMAGEM DO COMPROVANTE REPROVADO E BOTÕES PARA NOVO ANEXO */}
            <div 
              className="p-4 sm:p-5 rounded-2xl bg-black/85 text-rose-100 border-2 border-rose-500/40 shadow-2xl space-y-4"
              id="campo-visualizacao-comprovante-reprovado"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-rose-500/30">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                  <span className="font-mono text-xs uppercase font-bold text-rose-300">
                    Comprovante Reprovado & Reenvio de Novo Arquivo
                  </span>
                </div>
                <span className="text-[10px] font-mono px-2.5 py-1 rounded bg-rose-950 text-rose-300 border border-rose-500/50 font-bold uppercase">
                  Ação Necessária
                </span>
              </div>

              {/* Informações da reprovação */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono text-rose-200 bg-rose-950/40 p-3 rounded-xl border border-rose-500/30">
                <div>
                  <span className="text-rose-400 block text-[11px]">Instrutor responsável:</span>
                  <strong className="text-white block">{booking.rejectedBy || 'Instrutor Responsável - ABC do Pedal'}</strong>
                </div>
                {booking.rejectedAt && (
                  <div>
                    <span className="text-rose-400 block text-[11px]">Data e hora da reprovação:</span>
                    <strong className="text-rose-200 block">{formatDateTimeDisplay(booking.rejectedAt)}</strong>
                  </div>
                )}
                {booking.voucherFileName && (
                  <div className="sm:col-span-2 truncate">
                    <span className="text-rose-400 block text-[11px]">Arquivo reprovado em histórico:</span>
                    <strong className="text-rose-300 truncate block">{booking.voucherFileName}</strong>
                  </div>
                )}
              </div>

              {/* Campo de Visualização da Imagem Reprovada */}
              {Boolean(getBookingVoucherUrl(booking)) && (
                <div className="space-y-3">
                  <div 
                    className="relative group cursor-pointer overflow-hidden rounded-xl border border-rose-500/40 bg-black/90 flex flex-col items-center justify-center p-3 transition-all hover:border-rose-400 shadow-inner"
                    onClick={() =>
                      setSelectedVoucherForView({
                        url: getBookingVoucherUrl(booking)!,
                        fileName: booking.voucherFileName || 'comprovante.jpg',
                        title: `Comprovante Reprovado de ${booking.student.fullName}`
                      })
                    }
                    title="Clique para ampliar o comprovante reprovado"
                    id="img-container-comprovante-reprovado"
                  >
                    <img
                      src={getBookingVoucherUrl(booking)!}
                      alt={`Comprovante reprovado de ${booking.student.fullName}`}
                      className="w-full max-h-72 sm:max-h-80 object-contain rounded-lg transition-transform duration-200 group-hover:scale-[1.01]"
                      id="img-comprovante-anexado-reprovado"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-xs font-mono font-bold gap-2 backdrop-blur-[2px]">
                      <Maximize2 className="w-5 h-5 text-rose-400" />
                      <span>Clique para ampliar comprovante reprovado</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5 pt-1">
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedVoucherForView({
                          url: getBookingVoucherUrl(booking)!,
                          fileName: booking.voucherFileName || 'comprovante.jpg',
                          title: `Comprovante Reprovado de ${booking.student.fullName}`
                        })
                      }
                      className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-rose-300 hover:text-white text-xs font-mono font-bold flex items-center gap-2 transition-colors cursor-pointer border border-rose-500/40 shadow"
                      id="btn-visualizar-comprovante-reprovado-topo"
                    >
                      <Eye className="w-4 h-4" />
                      <span>Visualizar / Ampliar Imagem Reprovada</span>
                    </button>

                    <a
                      href={getBookingVoucherUrl(booking)!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-rose-300 hover:text-white text-xs font-mono flex items-center gap-2 transition-colors cursor-pointer border border-rose-500/30"
                      id="btn-abrir-nova-aba-comprovante-reprovado"
                    >
                      <ExternalLink className="w-4 h-4 text-rose-400" />
                      <span>Abrir em Nova Aba</span>
                    </a>
                  </div>
                </div>
              )}

              {/* BOTÕES PARA ANEXAR NOVA IMAGEM DE COMPROVANTE */}
              <div className="pt-3 border-t border-rose-500/30 space-y-3" id="bloco-anexar-novo-comprovante-reprovado">
                <div className="flex flex-wrap items-center justify-between gap-1">
                  <span className="text-xs font-mono font-bold uppercase text-white flex items-center gap-1.5">
                    <Upload className="w-4 h-4 text-rose-400" />
                    <span>Anexar Nova Imagem Válida de Comprovante:</span>
                  </span>
                  <span className="text-[10px] font-mono text-rose-300/80">Formatos aceitos: JPG, PNG, WEBP (até 15MB)</span>
                </div>

                {/* Input file padrão */}
                <input
                  type="file"
                  id="input-anexar-novo-comprovante-reprovado"
                  accept="image/png,image/jpeg,image/webp,image/jpg"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleReuploadFileChange(file);
                  }}
                  className="hidden"
                />

                {/* Input file de câmera */}
                <input
                  type="file"
                  id="input-camera-novo-comprovante-reprovado"
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleReuploadFileChange(file);
                  }}
                  className="hidden"
                />

                {/* Pré-visualização caso selecionado */}
                {reuploadPreview ? (
                  <div className="p-4 rounded-xl bg-slate-900 border-2 border-rose-500/60 space-y-3 animate-in fade-in" id="preview-novo-comprovante-reprovado">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-rose-300 uppercase flex items-center gap-1.5">
                        <FileUp className="w-4 h-4 text-rose-400" />
                        <span>Nova Imagem Pronta para Envio:</span>
                      </span>
                      <button
                        type="button"
                        onClick={handleCancelReupload}
                        className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
                        title="Cancelar seleção"
                        id="btn-cancelar-preview-reprovado"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="relative inline-block max-w-full">
                      <img
                        src={reuploadPreview}
                        alt="Pré-visualização da nova imagem do comprovante"
                        className="max-h-52 rounded-lg border border-slate-700 object-contain mx-auto bg-black/90 shadow-md"
                      />
                    </div>

                    <p className="text-xs font-mono text-emerald-400 truncate">
                      Arquivo selecionado: <strong>{reuploadFileName}</strong>
                    </p>

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleConfirmReupload}
                        disabled={isSubmittingReupload}
                        className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-bold text-xs flex items-center gap-2 transition-colors cursor-pointer shadow-md disabled:opacity-50"
                        id="btn-confirmar-novo-comprovante-reprovado"
                      >
                        {isSubmittingReupload ? (
                          <span>Enviando nova imagem...</span>
                        ) : (
                          <>
                            <CheckCircle2 className="w-4 h-4" />
                            <span>ENVIAR NOVO COMPROVANTE PARA ANÁLISE</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={handleCancelReupload}
                        className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono font-bold transition-colors cursor-pointer border border-slate-700"
                        id="btn-cancelar-novo-comprovante-reprovado"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-3">
                    <label
                      htmlFor="input-anexar-novo-comprovante-reprovado"
                      className="px-5 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-mono font-bold text-xs flex items-center gap-2 transition-colors cursor-pointer shadow-md hover:scale-[1.02] active:scale-[0.98]"
                      id="btn-anexar-nova-imagem-reprovado"
                    >
                      <Upload className="w-4 h-4 text-white" />
                      <span>Anexar Nova Imagem</span>
                    </label>

                    <label
                      htmlFor="input-camera-novo-comprovante-reprovado"
                      className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-rose-300 hover:text-white font-mono font-bold text-xs flex items-center gap-2 transition-colors cursor-pointer border border-rose-500/40 shadow hover:scale-[1.02] active:scale-[0.98]"
                      id="btn-tirar-foto-comprovante-reprovado"
                    >
                      <Camera className="w-4 h-4 text-rose-400" />
                      <span>Tirar Foto da Câmera</span>
                    </label>
                  </div>
                )}

                {reuploadError && (
                  <p className="text-xs font-mono text-rose-400 font-bold bg-rose-950/60 border border-rose-500/40 p-2.5 rounded-lg">
                    {reuploadError}
                  </p>
                )}

                {reuploadSuccessMsg && (
                  <div className="p-3 rounded-xl bg-emerald-950/90 border border-emerald-500/50 text-emerald-200 text-xs font-mono flex items-center gap-2 shadow-lg">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{reuploadSuccessMsg}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Botão: FALAR PELO WHATSAPP com WhatsApp comercial já configurado */}
            <div className="pt-1">
              <a
                href={`https://wa.me/${OFFICIAL_WHATSAPP_NUMBER}?text=${encodeURIComponent(
                  `Olá, sou ${booking.student.fullName} (Inscrição #${booking.id.slice(0, 8)}). Meu comprovante de pagamento foi reprovado. Gostaria de tirar dúvidas sobre o envio do comprovante válido para confirmar minha aula.`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-950/50 transition-all cursor-pointer hover:shadow-emerald-600/30"
                id="btn-aluno-falar-whatsapp-reprovado-topo"
              >
                <MessageCircle className="w-4 h-4 text-white" />
                <span>FALAR PELO WHATSAPP</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* 🟧 DESTAQUE VISUAL: PRAZO DE 24 HORAS ENCERRADO • AGUARDANDO NOVO PAGAMENTO/COMPROVANTE */}
      {isAwaitingNewPayment && (
        <div 
          className="mb-8 p-6 sm:p-7 rounded-2xl bg-amber-950/90 text-amber-100 border-2 border-amber-500 shadow-2xl shadow-amber-950/50 animate-in fade-in transition-all relative overflow-hidden ring-4 ring-amber-500/25"
          id="destaque-aguardando-novo-pagamento"
        >
          <div className="absolute -top-12 -right-12 w-80 h-80 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 space-y-3.5">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-amber-500/30">
              <div className="flex items-center gap-3">
                <span className="relative flex h-3.5 w-3.5 shrink-0">
                  <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-amber-400"></span>
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight flex items-center gap-2 font-sans">
                  <span>🟧</span> AGUARDANDO NOVO PAGAMENTO/COMPROVANTE
                </h2>
              </div>
              <span className="px-3.5 py-1.5 rounded-xl bg-slate-950 text-amber-300 text-xs font-mono font-black uppercase tracking-wider shadow-sm border border-amber-500/40">
                Status: AGUARDANDO NOVO PAGAMENTO/COMPROVANTE
              </span>
            </div>

            <p className="text-white font-bold text-sm sm:text-base leading-relaxed">
              O prazo de 24 horas para envio de novo comprovante encerrou. O horário reservado foi liberado imediatamente na agenda e voltou a ficar disponível. Todo o histórico da sua inscrição, dados do cadastro e o comprovante reprovado permanecem integralmente preservados.
            </p>

            {/* Informações da contratação anterior e horário liberado */}
            <div className="p-3.5 rounded-xl bg-black/60 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono text-amber-200">
              <div className="space-y-1 min-w-0">
                <p>
                  <span className="font-bold text-amber-300">Horário liberado na agenda:</span>{' '}
                  <strong>{booking.slot?.date ? `${formatDateBrazilian(booking.slot.date)} às ${booking.slot.time}` : 'Horário sob consulta (WhatsApp)'}</strong>
                </p>
                {booking.rejectedBy && (
                  <p className="text-amber-300/80 text-[11px]">
                    <span className="font-bold">Reprovado por:</span> {booking.rejectedBy}
                  </p>
                )}
                {booking.rejectionReason && (
                  <p className="text-amber-300/80 text-[11px]">
                    <span className="font-bold">Motivo:</span> {booking.rejectionReason}
                  </p>
                )}
                {booking.voucherFileName && (
                  <p className="text-amber-300/80 text-[11px] truncate">
                    <span className="font-bold">Comprovante em histórico:</span> {booking.voucherFileName}
                  </p>
                )}
              </div>

              {Boolean(getBookingVoucherUrl(booking)) && (
                <button
                  type="button"
                  onClick={() =>
                    setSelectedVoucherForView({
                      url: getBookingVoucherUrl(booking)!,
                      fileName: booking.voucherFileName || 'comprovante.jpg',
                      title: `Comprovante Reprovado de ${booking.student.fullName}`
                    })
                  }
                  className="px-3.5 py-2 rounded-xl bg-slate-950 hover:bg-slate-900 text-amber-300 hover:text-white text-xs font-mono font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 shadow-md border border-amber-500/40"
                  id="btn-visualizar-comprovante-reprovado-historico"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Ver Comprovante Reprovado</span>
                </button>
              )}
            </div>

            {/* Botões de Ação */}
            <div className="pt-2 flex flex-wrap items-center gap-3">
              {onBackToBooking && (
                <button
                  type="button"
                  onClick={onBackToBooking}
                  className="px-6 py-3 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-mono font-black text-xs uppercase tracking-wider shadow-lg shadow-pink-950/50 transition-all cursor-pointer flex items-center gap-2"
                  id="btn-realizar-nova-contratacao-apos-24h"
                >
                  <Plus className="w-4 h-4" />
                  <span>REALIZAR NOVA CONTRATAÇÃO</span>
                </button>
              )}

              <a
                href={`https://wa.me/${OFFICIAL_WHATSAPP_NUMBER}?text=${encodeURIComponent(
                  `Olá, sou ${booking.student.fullName} (Inscrição #${booking.id.slice(0, 8)}). Gostaria de tirar dúvidas sobre a contratação e novo agendamento de aula.`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-950/50 transition-all cursor-pointer hover:shadow-emerald-600/30"
                id="btn-aluno-falar-whatsapp-aguardando-novo-pgto"
              >
                <MessageCircle className="w-4 h-4 text-white" />
                <span>FALAR PELO WHATSAPP</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Main Grid: Next Meeting + Status Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        
        {/* Next Meeting Details Card */}
        <div className="lg:col-span-2 bg-slate-900/60 border border-slate-800 rounded-2xl p-6 relative">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-mono font-bold text-pink-400 uppercase tracking-wider">
              {booking.status === 'cancelado' ? 'Encontro Cancelado' : 'Próximo Encontro'}
            </span>
            <span className={`text-[11px] font-mono font-bold px-3 py-1 rounded-full uppercase ${
              isPaymentConfirmed ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/40' :
              isAwaitingInstructor ? 'bg-amber-400 text-slate-950 border border-yellow-300 font-black' :
              isAwaitingNewPayment ? 'bg-amber-950 text-amber-300 border border-amber-500/50 font-bold' :
              isRejected ? 'bg-rose-950 text-rose-300 border border-rose-500/50 font-bold' :
              booking.status === 'cancelado' || booking.status === 'reserva-expirada' ? 'bg-rose-950 text-rose-400 border border-rose-500/40' :
              'bg-pink-950 text-pink-300 border border-pink-500/40'
            }`}>
              {isPaymentConfirmed ? 'Agendamento oficial confirmado' :
               isAwaitingInstructor ? 'Aguardando confirmação do Instrutor' :
               isAwaitingNewPayment ? 'AGUARDANDO NOVO PAGAMENTO/COMPROVANTE' :
               isRejected ? 'Comprovante Reprovado' :
               isTemporary ? 'Aguardando Pagamento' :
               booking.status === 'reserva-expirada' ? 'Reserva Expirada' :
               booking.status === 'cancelado' ? 'Cancelado' : 'Reserva Temporária'}
            </span>
          </div>

          {/* 3. ESTADO: COMPROVANTE INVÁLIDO/REPROVADO (Aviso Vermelho) */}
          {isRejected && (
            <div className="mb-5 p-5 sm:p-6 rounded-2xl bg-rose-950/70 border-2 border-rose-500/80 text-rose-100 text-xs space-y-4 animate-in fade-in shadow-xl shadow-rose-950/40" id="banner-comprovante-reprovado">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-rose-500/30">
                <div className="flex items-center gap-2 font-bold font-mono text-rose-300">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span className="px-2.5 py-0.5 rounded-md bg-rose-500/20 border border-rose-500/40 text-[11px] font-bold uppercase tracking-wider text-rose-200">
                    COMPROVANTE INVÁLIDO/REPROVADO
                  </span>
                </div>
                <span className="text-[11px] font-mono text-rose-300 font-bold">
                  Status: COMPROVANTE REPROVADO
                </span>
              </div>

              {/* Mensagem oficial requerida */}
              <div className="p-3.5 rounded-xl bg-black/60 border border-rose-500/40 text-sm font-bold text-white leading-relaxed">
                Favor enviar o comprovante de pagamento válido, emitido pela operadora de pagamento. Dúvidas? Entre em contato pelo WhatsApp.
              </div>

              {/* Informações registradas pelo instrutor */}
              <div className="p-3 rounded-xl bg-rose-900/30 border border-rose-500/30 text-xs font-mono space-y-1">
                <p className="font-bold text-rose-300">
                  Instrutor responsável: <span className="text-white">{booking.rejectedBy || 'Instrutor Responsável - ABC do Pedal'}</span>
                </p>
                {booking.rejectedAt && (
                  <p className="text-[11px] text-rose-300/80">
                    Data e hora da reprovação: {formatDateTimeDisplay(booking.rejectedAt)}
                  </p>
                )}
                {booking.voucherFileName && (
                  <p className="text-[11px] text-rose-300/80 truncate">
                    Comprovante mantido no histórico: {booking.voucherFileName}
                  </p>
                )}
              </div>

              {/* Botão solicitado: FALAR PELO WHATSAPP com WhatsApp comercial já configurado */}
              <div className="pt-1">
                <a
                  href={`https://wa.me/${OFFICIAL_WHATSAPP_NUMBER}?text=${encodeURIComponent(
                    `Olá, sou ${booking.student.fullName} (Inscrição #${booking.id.slice(0, 8)}). Meu comprovante de pagamento foi reprovado. Gostaria de tirar dúvidas sobre o envio do comprovante válido para confirmar minha aula.`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-bold text-xs shadow-lg shadow-emerald-950/40 transition-colors cursor-pointer"
                  id="btn-aluno-falar-whatsapp-rejeicao"
                >
                  <MessageCircle className="w-4 h-4 text-white" />
                  <span>FALAR PELO WHATSAPP</span>
                </a>
              </div>

              {/* Área de Reenvio do Comprovante na Mesma Inscrição */}
              <div className="mt-4 pt-4 border-t border-rose-500/30 space-y-3" id="area-reenvio-comprovante-aluno">
                <div className="flex flex-wrap items-center justify-between gap-1">
                  <span className="text-xs font-mono font-bold uppercase text-white flex items-center gap-1.5">
                    <Upload className="w-3.5 h-3.5 text-pink-400" />
                    <span>Enviar Novo Comprovante de Pagamento</span>
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">JPG, PNG ou WEBP até 15MB</span>
                </div>

                <div className="p-4 rounded-xl bg-black/60 border border-dashed border-slate-700 hover:border-pink-500/60 transition-colors text-center space-y-3">
                  <input
                    type="file"
                    id="input-novo-comprovante-aluno"
                    accept="image/png,image/jpeg,image/webp,image/jpg"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleReuploadFileChange(file);
                    }}
                    className="hidden"
                  />

                  {reuploadPreview ? (
                    <div className="space-y-3">
                      <div className="relative inline-block max-w-full">
                        <img
                          src={reuploadPreview}
                          alt="Pré-visualização do novo comprovante"
                          className="max-h-48 rounded-lg border border-slate-700 object-contain mx-auto bg-black/80"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setReuploadPreview(null);
                            setReuploadFileName('');
                          }}
                          className="absolute -top-2 -right-2 p-1 bg-rose-600 hover:bg-rose-500 text-white rounded-full shadow cursor-pointer"
                          title="Remover e escolher outro arquivo"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <p className="text-xs font-mono text-emerald-400">
                        Arquivo selecionado: <strong>{reuploadFileName}</strong>
                      </p>
                      <button
                        type="button"
                        onClick={handleConfirmReupload}
                        disabled={isSubmittingReupload}
                        className="px-6 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-mono font-bold text-xs flex items-center justify-center gap-2 mx-auto transition-colors shadow-md shadow-pink-600/30 cursor-pointer disabled:opacity-50"
                        id="btn-confirmar-novo-comprovante"
                      >
                        {isSubmittingReupload ? (
                          <span>Enviando novo comprovante...</span>
                        ) : (
                          <>
                            <CheckCircle2 className="w-4 h-4" />
                            <span>ENVIAR NOVO COMPROVANTE PARA ANÁLISE</span>
                          </>
                        )}
                      </button>
                    </div>
                  ) : (
                    <label
                      htmlFor="input-novo-comprovante-aluno"
                      className="cursor-pointer block py-3 space-y-1.5"
                    >
                      <Upload className="w-6 h-6 text-pink-400 mx-auto" />
                      <p className="text-xs font-mono font-bold text-pink-300 hover:text-pink-200 underline underline-offset-4">
                        Clique aqui para selecionar a foto ou imagem do novo comprovante
                      </p>
                      <p className="text-[11px] text-slate-400 font-mono">
                        Após o envio, a inscrição voltará imediatamente para análise do instrutor.
                      </p>
                    </label>
                  )}

                  {reuploadError && (
                    <p className="text-xs font-mono text-rose-400 font-bold">
                      {reuploadError}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 4. Banner: Aguardando Pagamento (Reserva Temporária) */}
          {isTemporary && (
            <div className="mb-4 p-4 rounded-xl bg-pink-950/40 border border-pink-500/40 text-pink-200 text-xs space-y-1.5 animate-in fade-in" id="banner-aguardando-pagamento">
              <div className="flex items-center gap-2 font-bold font-mono text-pink-300">
                <Clock className="w-4 h-4 text-pink-400 animate-pulse" />
                <span>RESERVA TEMPORÁRIA • AGUARDANDO PAGAMENTO</span>
              </div>
              <p className="text-pink-100 leading-relaxed">
                O horário fica reservado temporariamente por 60 minutos. Conclua o pagamento e envie o comprovante para que o instrutor valide a sua aula.
              </p>
            </div>
          )}

          {/* 5. Banner: Reserva Expirada */}
          {booking.status === 'reserva-expirada' && (
            <div className="mb-4 p-4 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs space-y-1 animate-in fade-in">
              <div className="flex items-center gap-2 font-bold font-mono text-rose-300">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <span>RESERVA TEMPORÁRIA EXPIRADA</span>
              </div>
              <p className="text-rose-200/90 text-xs leading-relaxed">
                O período de 60 minutos expirou sem o envio do comprovante de pagamento. O horário foi liberado para outros alunos.
              </p>
            </div>
          )}

          {/* Banner: AGUARDANDO NOVO PAGAMENTO/COMPROVANTE (Prazo de 24h encerrado) */}
          {isAwaitingNewPayment && (
            <div className="mb-4 p-4 rounded-xl bg-amber-950/40 border border-amber-500/40 text-amber-200 text-xs space-y-2 animate-in fade-in" id="banner-aguardando-novo-pagamento-card">
              <div className="flex items-center gap-2 font-bold font-mono text-amber-300">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>AGUARDANDO NOVO PAGAMENTO/COMPROVANTE</span>
              </div>
              <p className="text-amber-100 leading-relaxed">
                O prazo de 24 horas encerrou sem envio de novo comprovante. O horário do encontro foi liberado na agenda e voltou a ficar disponível para novos agendamentos. Todo o seu cadastro e histórico anterior permanecem preservados no sistema.
              </p>
              {onBackToBooking && (
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={onBackToBooking}
                    className="px-4 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-mono text-xs font-bold transition-all shadow cursor-pointer"
                  >
                    Realizar Nova Contratação
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-950 border border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-pink-600/10 border border-pink-500/30 flex items-center justify-center text-pink-400">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-mono text-slate-400 uppercase">Data da Aula</span>
                  {isAwaitingSchedule ? (
                    <p className="text-sm sm:text-base font-black text-amber-300 font-mono tracking-wide">
                      AGUARDANDO CONFIRMAÇÃO DO INSTRUTOR
                    </p>
                  ) : (
                    <>
                      <p className="text-base font-bold text-white">
                        {booking.slot?.date ? formatDateBrazilian(booking.slot.date) : 'AGUARDANDO CONFIRMAÇÃO DO INSTRUTOR'}
                      </p>
                      {booking.slot?.date && (
                        <span className="text-xs text-pink-400">
                          {getWeekdayName(booking.slot.date)}
                        </span>
                      )}
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-pink-600/10 border border-pink-500/30 flex items-center justify-center text-pink-400">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-mono text-slate-400 uppercase">Horário</span>
                  {isAwaitingSchedule ? (
                    <p className="text-sm sm:text-base font-black text-amber-300 font-mono tracking-wide">
                      AGUARDANDO CONFIRMAÇÃO DO INSTRUTOR
                    </p>
                  ) : (
                    <>
                      <p className="text-base font-bold text-white">
                        {booking.slot?.time || 'AGUARDANDO CONFIRMAÇÃO DO INSTRUTOR'}
                      </p>
                      {booking.slot?.time && (
                        <span className="text-xs text-slate-400">
                          50 minutos de duração
                        </span>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Location Section (Local de Encontro vinculado ao CEP e endereço pesquisado pelo aluno) */}
            {(() => {
              const loc = booking.location;
              const formatCepDisplay = (val?: string) => {
                if (!val) return '';
                const clean = val.replace(/\D/g, '');
                if (clean.length === 8) {
                  return `${clean.slice(0, 5)}-${clean.slice(5)}`;
                }
                return val;
              };

              const rawCep = loc?.cep;
              const formattedCep = formatCepDisplay(rawCep);
              const isCustomCepLocation = loc?.isFixed === false || Boolean(rawCep && !loc?.isFixed);

              // Título do Local de Encontro
              const assignedLoc = booking.assignedLocationName || loc?.locationName || booking.slot?.locationName;
              const meetingLocationTitle = isCustomCepLocation
                ? (assignedLoc || (formattedCep ? `Local no CEP ${formattedCep}` : 'Local sob demanda'))
                : (assignedLoc || CURRENT_PRODUCT.location.name);

              // Endereço completo formatado
              const addressLine = loc?.address
                ? `${loc.address}${loc.number ? `, nº ${loc.number}` : ''}${loc.city ? ` — ${loc.city}` : ''}${loc.state ? ` - ${loc.state}` : ''}`
                : (assignedLoc || CURRENT_PRODUCT.location.address);

              // Link dinâmico para o Google Maps baseado no endereço e CEP pesquisado
              const mapsSearchQuery = [
                assignedLoc,
                loc?.address,
                loc?.number ? `nº ${loc.number}` : '',
                formattedCep ? `CEP ${formattedCep}` : '',
                loc?.city || booking.assignedLocationCity || 'São Paulo',
                loc?.state || 'SP'
              ].filter(Boolean).join(', ');

              const mapsUrl = loc?.mapsUrl || (
                mapsSearchQuery
                  ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapsSearchQuery)}`
                  : CURRENT_PRODUCT.location.mapsUrl
              );

              // Orientação / Ponto de encontro sugerido
              const meetingSuggestion = isCustomCepLocation
                ? `Ponto de encontro definido no mesmo endereço do CEP pesquisado (${formattedCep || 'informado pelo aluno'}). O instrutor e o aluno encontram-se pontualmente no local informado.`
                : (loc?.fixedNote || (assignedLoc?.toLowerCase().includes('kennedy')
                    ? 'Ponto de encontro: Em frente à entrada principal do Ginásio Poliesportivo de SBC (Rua Kennedy).'
                    : (assignedLoc?.toLowerCase().includes('paço municipal')
                        ? 'Ponto de encontro: Esplanada do Paço Municipal (área ampla e segura para treinamento prático).'
                        : (assignedLoc?.toLowerCase().includes('celso daniel')
                            ? 'Ponto de encontro: Parque Celso Daniel (Área interna infantil para treino seguro).'
                            : (assignedLoc?.toLowerCase().includes('ibirapuera')
                                ? 'Ponto de encontro sugerido: Acesso pelo Portão 10 (Área arborizada e plana para treino seguro).'
                                : 'Ponto de encontro estabelecido conforme o local cadastrado para a aula.')))));

              return (
                <div
                  className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-xs space-y-2.5 transition-all"
                  id="student-portal-local-encontro"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-pink-400 font-bold">
                      <MapPin className="w-4 h-4 shrink-0 text-pink-400" />
                      <span>Local Confirmado: {meetingLocationTitle}</span>
                    </div>
                    <a
                      href={mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-pink-400 hover:text-pink-300 underline text-[11px] flex items-center gap-1 font-medium transition-colors cursor-pointer"
                    >
                      <span>Google Maps</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  {booking.assignedLocationRestriction && (
                    <div className="p-2 rounded-lg bg-amber-950/40 border border-amber-500/40 text-[11px] text-amber-300 font-mono flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>Restrição do Local: {booking.assignedLocationRestriction}</span>
                    </div>
                  )}

                  <p className="text-slate-300 font-light leading-relaxed">
                    {addressLine}
                  </p>

                  {/* Detalhes do CEP pesquisado pelo aluno */}
                  {formattedCep && (
                    <div className="flex flex-wrap items-center gap-2 pt-0.5">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-pink-500/10 border border-pink-500/30 text-[11px] font-mono font-bold text-pink-300">
                        <MapPin className="w-3 h-3 text-pink-400" />
                        <span>CEP Pesquisado: {formattedCep}</span>
                      </span>
                      {isCustomCepLocation ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-emerald-950/60 border border-emerald-500/30 text-[11px] font-medium text-emerald-300">
                          ✓ Atendimento sob demanda no CEP do aluno
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-800/80 text-[11px] text-slate-300 font-mono">
                          {loc?.city || 'São Paulo - SP'}
                        </span>
                      )}
                    </div>
                  )}

                  <p className="text-[11px] text-slate-400 pt-0.5 leading-relaxed">
                    {meetingSuggestion}
                  </p>
                </div>
              );
            })()}

            {/* Action Buttons: Reschedule & Cancel (REGRA ABSOLUTA: Liberados SOMENTE após confirmação do instrutor) */}
            <div className="pt-2">
              {isPaymentConfirmed ? (
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      const fresh = getStoredSlots().filter((s) => s.status === 'available' && !isSlotExpired(s.date, s.time));
                      setAvailableSlots(fresh);
                      setShowScheduleNewModal(true);
                    }}
                    className="px-4 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-pink-600/20 cursor-pointer"
                    id="btn-remarcar-proximo"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Remarcar / Próxima Aula</span>
                  </button>

                  {booking.status !== 'cancelado' && (
                    <button
                      type="button"
                      onClick={handleInitiateCancel}
                      className="px-4 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-900 border border-slate-800 text-rose-400 hover:text-rose-300 text-xs font-mono transition-colors cursor-pointer"
                      id="btn-cancelar-agendamento"
                    >
                      <span>Cancelar Agendamento</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      disabled
                      className="px-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-500 font-bold text-xs flex items-center gap-2 cursor-not-allowed opacity-60"
                      title={
                        isAwaitingInstructor
                          ? 'Remarcação desabilitada: seu comprovante está em análise pelo instrutor.'
                          : isTemporary
                          ? 'Remarcação desabilitada: finalize o pagamento primeiro.'
                          : 'Remarcação indisponível.'
                      }
                      id="btn-remarcar-desabilitado"
                    >
                      <Lock className="w-3.5 h-3.5 text-amber-400/80" />
                      <span>Remarcar Aula</span>
                    </button>

                    <button
                      type="button"
                      disabled
                      className="px-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-500 font-mono text-xs flex items-center gap-2 cursor-not-allowed opacity-60"
                      title={
                        isAwaitingInstructor
                          ? 'Cancelamento desabilitado: seu comprovante está em análise pelo instrutor.'
                          : isTemporary
                          ? 'Cancelamento desabilitado: finalize o pagamento primeiro.'
                          : 'Cancelamento indisponível.'
                      }
                      id="btn-cancelar-desabilitado"
                    >
                      <Lock className="w-3.5 h-3.5 text-amber-400/80" />
                      <span>Cancelar Aula</span>
                    </button>
                  </div>

                  <p className="text-[11px] font-mono text-slate-400 italic">
                    {isAwaitingInstructor
                      ? '⚠️ As opções de remarcar ou cancelar ficam disponíveis exclusivamente após a aprovação do pagamento pelo instrutor.'
                      : isAwaitingNewPayment
                      ? '⚠️ Prazo de 24h encerrado. Horário liberado na agenda. Realize uma nova contratação para escolher um novo horário.'
                      : isTemporary
                      ? '⚠️ Conclua o pagamento e envie o comprovante para liberar as ações da aula.'
                      : isRejected
                      ? '⚠️ Comprovante reprovado. Favor enviar o comprovante de pagamento válido emitido pela operadora ou falar pelo WhatsApp.'
                      : '⚠️ Agendamento em processamento. Aguarde a confirmação.'}
                  </p>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Status & Contract Card: Campo Não Editável / Registro Fixo Contratual */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between" id="card-dados-contratacao-aluno">
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800/80">
              <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider block">
                Dados da Contratação
              </span>

              <div 
                className="px-2.5 py-1 rounded-lg bg-slate-950 text-slate-400 border border-slate-800 text-[11px] font-mono flex items-center gap-1.5"
                id="badge-campo-nao-editavel"
                title="Este espaço não pode ser editado ou alterado em hipótese alguma."
              >
                <Lock className="w-3 h-3 text-slate-500" />
                <span>Campo Não Editável</span>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-500">Programa:</span>
                <p className="font-bold text-white">Aprender a Pedalar</p>
              </div>

              <div>
                <span className="text-slate-500">Aluno(a):</span>
                <p className="font-bold text-white">{booking.student.fullName}</p>
                {booking.student.cpf && <p className="text-[11px] text-slate-400 font-mono">CPF: {booking.student.cpf}</p>}
                {booking.student.birthDate && (
                  <p className="text-[11px] text-slate-400">Data Nasc.: {formatDateBrazilian(booking.student.birthDate)}</p>
                )}
                <p className="text-[11px] text-slate-400 font-mono">WhatsApp: {booking.student.whatsapp}</p>
                {booking.student.email && <p className="text-[11px] text-slate-400">E-mail: {booking.student.email}</p>}
              </div>

              {booking.student.guardian && (
                <div>
                  <span className="text-slate-500">Responsável Legal:</span>
                  <p className="font-bold text-white">{booking.student.guardian.fullName}</p>
                  <p className="text-[11px] text-slate-400">
                    WhatsApp: {booking.student.guardian.whatsapp} ({booking.student.guardian.relation})
                  </p>
                  {booking.student.guardian.cpf && (
                    <p className="text-[11px] text-slate-400 font-mono">CPF: {booking.student.guardian.cpf}</p>
                  )}
                </div>
              )}

              <div>
                <span className="text-slate-500">Calibragem Física:</span>
                <p className="text-slate-300">
                  Altura: <strong className="text-white">{booking.student.heightCm} cm</strong> | Peso: <strong className="text-white">{booking.student.weightKg} kg</strong>
                </p>
              </div>

              {booking.student.hasSpecificNeeds && (
                <div>
                  <span className="text-slate-500">Necessidades / Observações:</span>
                  <p className="text-slate-300 text-[11px] leading-snug">
                    {booking.student.specificNeedsDescription || 'Informado na inscrição'}
                  </p>
                </div>
              )}

              {booking.location && (
                <div>
                  <span className="text-slate-500">Local da Aula:</span>
                  <p className="font-bold text-white text-xs">{booking.location.locationName || booking.location.address}</p>
                  {booking.location.address && booking.location.address !== booking.location.locationName && (
                    <p className="text-[11px] text-slate-400 font-mono">{booking.location.address}</p>
                  )}
                  {booking.location.cep && (
                    <p className="text-[11px] text-pink-400 font-mono">
                      CEP: {booking.location.cep.replace(/\D/g, '').replace(/^(\d{5})(\d{3})$/, '$1-$2')}
                    </p>
                  )}
                </div>
              )}

              <div>
                <span className="text-slate-500">Valor Investido:</span>
                <p className="text-sm font-bold font-mono text-emerald-400" id="student-portal-valor-investido">
                  R$ {(booking.price || booking.location?.price || 499).toFixed(2).replace('.', ',')} (PIX)
                </p>
              </div>

              {booking.voucherFileName && (
                <div>
                  <span className="text-slate-500">Comprovante:</span>
                  <p className="text-[11px] font-mono text-slate-300 truncate">
                    {booking.voucherFileName}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Registro Fixo e Permanente: Não editável em hipótese alguma */}
          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center gap-2 text-[11px] text-slate-400 font-mono" id="aviso-campo-nao-editavel">
            <Lock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span>Registro contratual permanente • Este espaço não pode ser alterado.</span>
          </div>

          <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-400 font-light flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Política de 24h & Metodologia Exclusiva</span>
          </div>
        </div>

      </div>

      {/* SEÇÃO OBRIGATÓRIA: COMPROVANTE DE PAGAMENTO (Visualização e Ampliação) */}
      {Boolean(getBookingVoucherUrl(booking) || booking.voucherFileName || booking.voucherAttempts?.length) && (() => {
        const activeVoucherUrl = getBookingVoucherUrl(booking);
        const latestAttempt = booking.voucherAttempts && booking.voucherAttempts.length > 0
          ? booking.voucherAttempts[booking.voucherAttempts.length - 1]
          : null;
        const activeFileName = latestAttempt?.voucherFileName || booking.voucherFileName || 'comprovante_pagamento.jpg';
        const activeSentAt = latestAttempt?.voucherSentAt || booking.voucherSentAt;
        const totalAttempts = booking.voucherAttempts?.length || (booking.voucherFileName ? 1 : 0);

        return (
          <div 
            className="mb-8 p-6 sm:p-7 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4 animate-in fade-in shadow-xl" 
            id="secao-comprovante-pagamento-aluno"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <FileText className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base sm:text-lg font-bold text-white font-mono uppercase tracking-wider">
                  COMPROVANTE DE PAGAMENTO
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-mono uppercase font-bold px-2.5 py-1 rounded-lg border ${
                  isPaymentConfirmed
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-500/40'
                    : isRejected
                    ? 'bg-rose-950 text-rose-300 border-rose-500/50'
                    : isAwaitingNewPayment
                    ? 'bg-amber-950 text-amber-300 border-amber-500/50'
                    : 'bg-amber-950 text-amber-300 border-amber-500/40'
                }`}>
                  {isPaymentConfirmed
                    ? 'Aprovado pelo Instrutor'
                    : isRejected
                    ? 'Comprovante Reprovado'
                    : isAwaitingNewPayment
                    ? 'Prazo de 24h Encerrado'
                    : 'Comprovante em Análise'}
                </span>
                <span className="text-xs font-mono text-slate-400 bg-slate-950 px-3 py-1 rounded-lg border border-slate-800 hidden sm:inline-block">
                  Contratação #{booking.id.slice(0, 8)} • Aluno: {booking.student.fullName}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl bg-slate-950/80 border border-slate-800 text-xs font-mono">
              <div>
                <span className="text-slate-500 block mb-0.5">
                  {totalAttempts > 1 ? `Comprovante Ativo (${totalAttempts}ª versão):` : 'Arquivo enviado:'}
                </span>
                <strong className="text-white truncate block">
                  {activeFileName}
                </strong>
              </div>
              {activeSentAt && (
                <div>
                  <span className="text-slate-500 block mb-0.5">Data e hora do envio:</span>
                  <strong className="text-slate-200 block">
                    {formatDateTimeDisplay(activeSentAt)}
                  </strong>
                </div>
              )}
            </div>

            {activeVoucherUrl && (
              <div className="space-y-3">
                <div 
                  className="relative group cursor-pointer overflow-hidden rounded-xl border border-slate-700 bg-black/70 flex flex-col items-center justify-center p-3 transition-all hover:border-pink-500/50"
                  onClick={() => setSelectedVoucherForView({
                    url: activeVoucherUrl,
                    fileName: activeFileName,
                    title: `Comprovante Ativo — ${booking.student.fullName}`
                  })}
                  title="Clique para visualizar e ampliar o comprovante"
                >
                  <img
                    src={activeVoucherUrl}
                    alt={`Comprovante de pagamento de ${booking.student.fullName}`}
                    className="w-full max-h-80 object-contain rounded-lg transition-transform duration-200 group-hover:scale-[1.01]"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-xs font-mono font-bold gap-2 backdrop-blur-[2px]">
                    <Maximize2 className="w-5 h-5 text-pink-400" />
                    <span>Clique para ampliar comprovante ativo</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setSelectedVoucherForView({
                      url: activeVoucherUrl,
                      fileName: activeFileName,
                      title: `Comprovante Ativo — ${booking.student.fullName}`
                    })}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-mono font-bold flex items-center gap-2 transition-colors cursor-pointer border border-slate-700 shadow"
                    id="btn-ampliar-comprovante-aluno"
                  >
                    <Maximize2 className="w-4 h-4 text-pink-400" />
                    <span>Visualizar / Ampliar Comprovante</span>
                  </button>

                  <a
                    href={activeVoucherUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-mono flex items-center gap-2 transition-colors cursor-pointer border border-slate-800"
                    id="btn-abrir-nova-aba-comprovante-secao"
                  >
                    <ExternalLink className="w-4 h-4 text-slate-400" />
                    <span>Abrir Imagem em Nova Aba</span>
                  </a>
                </div>

                {/* BOTÕES PARA ANEXAR NOVA IMAGEM DE COMPROVANTE */}
                <div className="mt-4 pt-4 border-t border-slate-800/80 space-y-3" id="bloco-anexar-novo-comprovante-secao">
                  <div className="flex flex-wrap items-center justify-between gap-1">
                    <span className="text-xs font-mono font-bold uppercase text-slate-200 flex items-center gap-1.5">
                      <Upload className="w-4 h-4 text-pink-400" />
                      <span>Anexar Nova Imagem / Substituir Comprovante:</span>
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">JPG, PNG, WEBP até 15MB</span>
                  </div>

                  {/* Input file padrão */}
                  <input
                    type="file"
                    id="input-anexar-novo-comprovante-secao"
                    accept="image/png,image/jpeg,image/webp,image/jpg"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleReuploadFileChange(file);
                    }}
                    className="hidden"
                  />

                  {/* Input file de câmera */}
                  <input
                    type="file"
                    id="input-camera-novo-comprovante-secao"
                    accept="image/*"
                    capture="environment"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleReuploadFileChange(file);
                    }}
                    className="hidden"
                  />

                  {/* Pré-visualização de nova imagem selecionada */}
                  {reuploadPreview ? (
                    <div className="p-4 rounded-xl bg-slate-950 border-2 border-pink-500/50 space-y-3 animate-in fade-in" id="preview-novo-comprovante-secao">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-bold text-pink-300 uppercase flex items-center gap-1.5">
                          <FileUp className="w-4 h-4 text-pink-400" />
                          <span>Nova Imagem Pronta para Envio:</span>
                        </span>
                        <button
                          type="button"
                          onClick={handleCancelReupload}
                          className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
                          title="Cancelar seleção"
                          id="btn-cancelar-preview-secao"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="relative inline-block max-w-full">
                        <img
                          src={reuploadPreview}
                          alt="Pré-visualização do novo comprovante selecionado"
                          className="max-h-52 rounded-lg border border-slate-700 object-contain mx-auto bg-black/90 shadow-md"
                        />
                      </div>

                      <p className="text-xs font-mono text-emerald-400 truncate">
                        Arquivo selecionado: <strong>{reuploadFileName}</strong>
                      </p>

                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={handleConfirmReupload}
                          disabled={isSubmittingReupload}
                          className="px-5 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-mono font-bold text-xs flex items-center gap-2 transition-colors cursor-pointer shadow-md disabled:opacity-50"
                          id="btn-confirmar-novo-comprovante-secao"
                        >
                          {isSubmittingReupload ? (
                            <span>Enviando nova imagem...</span>
                          ) : (
                            <>
                              <CheckCircle2 className="w-4 h-4" />
                              <span>CONFIRMAR E ATUALIZAR COMPROVANTE</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={handleCancelReupload}
                          className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono font-bold transition-colors cursor-pointer border border-slate-700"
                          id="btn-cancelar-novo-comprovante-secao"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-3">
                      <label
                        htmlFor="input-anexar-novo-comprovante-secao"
                        className="px-5 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-mono font-bold text-xs flex items-center gap-2 transition-colors cursor-pointer shadow-md hover:scale-[1.02] active:scale-[0.98]"
                        id="btn-anexar-nova-imagem-secao"
                      >
                        <Upload className="w-4 h-4 text-white" />
                        <span>Anexar Nova Imagem</span>
                      </label>

                      <label
                        htmlFor="input-camera-novo-comprovante-secao"
                        className="px-5 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-pink-300 hover:text-white font-mono font-bold text-xs flex items-center gap-2 transition-colors cursor-pointer border border-pink-500/40 shadow hover:scale-[1.02] active:scale-[0.98]"
                        id="btn-tirar-foto-comprovante-secao"
                      >
                        <Camera className="w-4 h-4 text-pink-400" />
                        <span>Tirar Foto da Câmera</span>
                      </label>
                    </div>
                  )}

                  {reuploadError && (
                    <p className="text-xs font-mono text-rose-400 font-bold bg-rose-950/60 border border-rose-500/40 p-2.5 rounded-lg">
                      {reuploadError}
                    </p>
                  )}

                  {reuploadSuccessMsg && (
                    <div className="p-3 rounded-xl bg-emerald-950/90 border border-emerald-500/50 text-emerald-200 text-xs font-mono flex items-center gap-2 shadow-lg">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{reuploadSuccessMsg}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Histórico completo de tentativas anteriores */}
            {booking.voucherAttempts && booking.voucherAttempts.length > 1 && (
              <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 space-y-2.5 font-mono text-xs">
                <span className="font-bold text-slate-300 block uppercase text-[11px] tracking-wider">
                  Histórico de Tentativas de Envio ({booking.voucherAttempts.length}):
                </span>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {booking.voucherAttempts.map((att) => {
                    const isLatest = att.attemptNumber === booking.voucherAttempts!.length;
                    return (
                      <div
                        key={att.attemptNumber}
                        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-lg border text-xs ${
                          isLatest 
                            ? 'bg-slate-900 border-pink-500/30' 
                            : 'bg-slate-900/50 border-slate-800'
                        }`}
                      >
                        <div className="space-y-0.5 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white">Tentativa #{att.attemptNumber}</span>
                            {isLatest && (
                              <span className="px-1.5 py-0.5 rounded bg-pink-950 text-pink-300 border border-pink-500/40 text-[9px] font-bold">
                                ATUAL / ATIVO
                              </span>
                            )}
                          </div>
                          <span className="text-slate-400 block truncate max-w-sm">
                            {att.voucherFileName || 'comprovante.jpg'}
                          </span>
                          <span className="text-slate-500 text-[11px] block">
                            Enviado em {formatDateTimeDisplay(att.voucherSentAt)}
                          </span>
                          {att.rejectionReason && (
                            <span className="text-rose-400 text-[11px] block font-sans">
                              Motivo da reprovação: {att.rejectionReason}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
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
                              onClick={() => setSelectedVoucherForView({
                                url: att.voucherUrl!,
                                fileName: att.voucherFileName || `comprovante_tentativa_${att.attemptNumber}.jpg`,
                                title: `Tentativa #${att.attemptNumber} — ${booking.student.fullName}`
                              })}
                              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-mono flex items-center gap-1 cursor-pointer transition-colors"
                              title="Visualizar este arquivo"
                            >
                              <Eye className="w-3.5 h-3.5 text-pink-400" />
                              <span>Ver</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* 🏆 CELEBRAÇÃO VISUAL DE CONQUISTA (Item 10) */}
      {completionStats?.isFullyCompleted && (
        <div
          className="mb-8 p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-amber-950/50 via-slate-900 to-pink-950/40 border-2 border-amber-500/50 shadow-2xl shadow-pink-950/40 relative overflow-hidden"
          id="card-celebracao-conquista"
        >
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-pink-500/15 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-mono font-black uppercase tracking-wider">
                <span>🏆 DESAFIO CONQUISTADO!</span>
              </div>

              <h3 className="text-2xl sm:text-3xl font-black text-white leading-tight">
                Parabéns! Você completou todas as etapas do ABC do Pedal.
              </h3>

              {/* AUTOCONHECIMENTO → BASE → CONTROLE → DOMÍNIO → EXCELÊNCIA */}
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs font-mono font-bold text-slate-200 uppercase py-1">
                <span className="px-2.5 py-1 rounded-lg bg-emerald-950/90 border border-emerald-500/50 text-emerald-300 flex items-center gap-1.5 shadow-sm">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  AUTOCONHECIMENTO
                </span>
                <span className="text-slate-500 font-bold">→</span>
                <span className="px-2.5 py-1 rounded-lg bg-emerald-950/90 border border-emerald-500/50 text-emerald-300 flex items-center gap-1.5 shadow-sm">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  BASE
                </span>
                <span className="text-slate-500 font-bold">→</span>
                <span className="px-2.5 py-1 rounded-lg bg-emerald-950/90 border border-emerald-500/50 text-emerald-300 flex items-center gap-1.5 shadow-sm">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  CONTROLE
                </span>
                <span className="text-slate-500 font-bold">→</span>
                <span className="px-2.5 py-1 rounded-lg bg-emerald-950/90 border border-emerald-500/50 text-emerald-300 flex items-center gap-1.5 shadow-sm">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  DOMÍNIO
                </span>
                <span className="text-slate-500 font-bold">→</span>
                <span className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-pink-950 to-rose-950 border border-pink-500/60 text-pink-200 flex items-center gap-1.5 shadow-sm">
                  <Sparkles className="w-3.5 h-3.5 text-pink-400" />
                  EXCELÊNCIA
                </span>
              </div>

              <p className="text-base font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-300 via-rose-300 to-amber-200">
                Você conquistou sua CONQUISTA SOBRE DUAS RODAS!
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
              <button
                onClick={() => setIsCertificateModalOpen(true)}
                type="button"
                className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-pink-600 via-rose-600 to-pink-500 hover:from-pink-500 hover:to-rose-500 text-white font-black text-sm uppercase tracking-wider transition-all shadow-xl shadow-pink-600/40 hover:scale-[1.02] flex items-center justify-center gap-2.5 cursor-pointer border border-pink-400/40"
                id="btn-ver-meu-certificado-celebracao"
              >
                <Award className="w-5 h-5 text-amber-300" />
                <span>VER MEU CERTIFICADO</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. EVOLUÇÃO NO MÉTODO ABCDE (Quadro Pedagógico de Desenvolvimento) */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 sm:p-8 mb-8" id="quadro-evolucao-abcde">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-800">
          <div>
            <span className="text-xs font-mono font-bold text-pink-400 uppercase tracking-wider">
              Evolução Pedagógica Individual
            </span>
            <h3 className="text-xl sm:text-2xl font-black text-white mt-0.5">
              Método ABCDE
            </h3>
          </div>
          
          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            <span className="text-xs font-mono text-slate-300 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
              Etapa Atual: <strong className="text-pink-400 font-bold">{booking.currentABCDE}</strong>
            </span>
            {completionStats && (
              <span className={`text-xs font-mono px-3 py-1.5 rounded-lg border flex items-center gap-1.5 ${
                completionStats.isFullyCompleted
                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50 font-bold'
                  : 'bg-slate-950 text-slate-400 border-slate-800'
              }`}>
                {completionStats.isFullyCompleted ? (
                  <>
                    <Award className="w-3.5 h-3.5 text-amber-400" />
                    <span>20 de 20 Conquistadas • 100%</span>
                  </>
                ) : (
                  <span>Progresso: <strong className="text-white">{completionStats.conqueredCount}</strong>/20 ({completionStats.percent}%)</span>
                )}
              </span>
            )}
            {completionStats?.isFullyCompleted && (
              <button
                type="button"
                onClick={() => setIsCertificateModalOpen(true)}
                className="px-3.5 py-1.5 rounded-lg bg-pink-600 hover:bg-pink-500 text-white font-bold text-xs transition-all shadow-md shadow-pink-600/30 flex items-center gap-1.5 cursor-pointer"
                id="btn-ver-certificado-header"
              >
                <Award className="w-3.5 h-3.5 text-amber-300" />
                <span>Ver Certificado</span>
              </button>
            )}
          </div>
        </div>

        {/* Steps Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 mb-6">
          {[
            {
              step: 'A',
              title: 'Autoconhecimento',
              desc: 'Conexão consigo, com o corpo, com a bicicleta e com o professor.',
              reached: true
            },
            {
              step: 'B',
              title: 'Base',
              desc: 'Desenvolver as capacidades motoras fundamentais para a aprendizagem.',
              reached: ['B', 'C', 'D', 'E'].includes(booking.currentABCDE)
            },
            {
              step: 'C',
              title: 'Controle',
              desc: 'Controle corporal sobre a bike e realização das primeiras pedaladas.',
              reached: ['C', 'D', 'E'].includes(booking.currentABCDE)
            },
            {
              step: 'D',
              title: 'Domínio',
              desc: 'Consolidação da pedalada, arrancada autônoma, curvas e frenagem.',
              reached: ['D', 'E'].includes(booking.currentABCDE)
            },
            {
              step: 'E',
              title: 'Excelência',
              desc: 'Precisão, segurança, eficiência, velocidade e condução autônoma.',
              reached: booking.currentABCDE === 'E'
            }
          ].map((item) => (
            <div
              key={item.step}
              className={`p-4 rounded-xl border transition-all ${
                item.step === booking.currentABCDE
                  ? 'bg-pink-950/40 border-pink-500 shadow-lg shadow-pink-500/15 ring-1 ring-pink-500/60'
                  : item.reached
                  ? 'bg-slate-950 border-emerald-500/30'
                  : 'bg-slate-950/40 border-slate-900 opacity-60'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono font-bold text-xs ${
                  item.step === booking.currentABCDE
                    ? 'bg-pink-500 text-white'
                    : item.reached
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-800 text-slate-400'
                }`}>
                  {item.step}
                </span>
                {item.step === booking.currentABCDE ? (
                  <span className="text-[10px] font-mono text-pink-300 font-bold uppercase tracking-wider">Atual</span>
                ) : item.reached ? (
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                ) : null}
              </div>
              <h4 id={`titulo-etapa-${item.step.toLowerCase()}`} className="font-bold text-white text-sm">{item.title}</h4>
              <p className="text-[11px] text-slate-400 font-light mt-1 leading-snug">
                {item.desc}
              </p>
            </div>
          ))}
        </div>

        {/* Resumo Visual: Última Conquista & Próximo Desafio */}
        {(() => {
          const highlights = getStudentHighlights(booking);
          return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <div className="p-4 sm:p-5 rounded-xl bg-slate-950/90 border border-emerald-500/30 flex items-start gap-3.5 shadow-sm">
                <div className="w-9 h-9 rounded-lg bg-emerald-950/80 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400 block">
                    Última conquista
                  </span>
                  <p className="text-sm font-semibold text-white leading-snug">
                    {highlights.latestAchievement}
                  </p>
                </div>
              </div>

              <div className="p-4 sm:p-5 rounded-xl bg-slate-950/90 border border-pink-500/30 flex items-start gap-3.5 shadow-sm">
                <div className="w-9 h-9 rounded-lg bg-pink-950/80 border border-pink-500/40 flex items-center justify-center text-pink-400 shrink-0 mt-0.5">
                  <Target className="w-4 h-4" />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-pink-400 block">
                    Próximo desafio
                  </span>
                  <p className="text-sm font-semibold text-white leading-snug">
                    {highlights.nextChallenge}
                  </p>
                </div>
              </div>
            </div>
          );
        })()}

        {/* 5 Grupos Visuais do Método ABCDE (com 4 habilidades observáveis cada) */}
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Habilidades Observáveis do Método ABCDE</span>
              </h4>
              <p className="text-xs text-slate-400 font-light mt-0.5">
                Resumo claro do desenvolvimento individual do aluno ao longo das 5 etapas pedagógicas
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono text-slate-400">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-slate-600 inline-block" /> Não iniciado</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> Em desenvolvimento</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" /> Consolidado</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-cyan-400 inline-block" /> Autônomo</span>
            </div>
          </div>

          {ABCDE_STAGES.map((stage) => {
            const isCurrent = stage.letter === booking.currentABCDE;

            const getBadgeStyles = (status: ABCDESkillStatus) => {
              switch (status) {
                case 'Autônomo':
                  return {
                    bg: 'bg-cyan-950/70 text-cyan-300 border-cyan-500/50',
                    dot: 'bg-cyan-400',
                    label: 'Autônomo'
                  };
                case 'Consolidado':
                  return {
                    bg: 'bg-emerald-950/70 text-emerald-300 border-emerald-500/50',
                    dot: 'bg-emerald-400',
                    label: 'Consolidado'
                  };
                case 'Em desenvolvimento':
                  return {
                    bg: 'bg-amber-950/70 text-amber-300 border-amber-500/50',
                    dot: 'bg-amber-400 animate-pulse',
                    label: 'Em desenvolvimento'
                  };
                case 'Não iniciado':
                default:
                  return {
                    bg: 'bg-slate-950 text-slate-400 border-slate-800',
                    dot: 'bg-slate-600',
                    label: 'Não iniciado'
                  };
              }
            };

            return (
              <div
                key={stage.letter}
                className={`p-5 sm:p-6 rounded-2xl border transition-all ${
                  isCurrent
                    ? 'bg-slate-950/90 border-pink-500/60 shadow-lg shadow-pink-950/20 ring-1 ring-pink-500/30'
                    : 'bg-slate-950/40 border-slate-800/80'
                }`}
              >
                {/* Cabeçalho do Grupo da Etapa */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-4 border-b border-slate-800/60">
                  <div className="flex items-start gap-3">
                    <span className={`w-9 h-9 rounded-xl flex items-center justify-center font-mono font-bold text-sm shrink-0 ${
                      isCurrent
                        ? 'bg-pink-600 text-white shadow-md shadow-pink-600/30'
                        : 'bg-slate-900 text-slate-300 border border-slate-800'
                    }`}>
                      {stage.letter}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-base font-bold text-white">
                          {stage.letter} — {stage.title.toUpperCase()}
                        </h4>
                        {isCurrent && (
                          <span className="px-2.5 py-0.5 rounded-full bg-pink-950 text-pink-300 border border-pink-500/40 text-[10px] font-mono font-bold uppercase">
                            Etapa Atual
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-300 font-light mt-1.5 leading-relaxed">
                        <span className="font-mono text-slate-400 font-bold uppercase text-[10px] mr-1.5">Objetivo:</span>
                        {stage.objective}
                      </p>
                    </div>
                  </div>
                </div>

                {/* As 4 Habilidades Observáveis da Etapa */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                  {stage.skills.map((sk) => {
                    const status = getStudentSkillStatus(booking, sk.id);
                    const badge = getBadgeStyles(status);

                    return (
                      <div
                        key={sk.id}
                        className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 flex flex-col justify-between hover:border-slate-700/80 transition-colors"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-1.5">
                            <span className="text-xs font-semibold text-white leading-snug">
                              {sk.code}. {sk.title}
                            </span>
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold border flex items-center gap-1.5 shrink-0 ${badge.bg}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                              <span>{badge.label}</span>
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 font-light leading-relaxed">
                            {sk.description}
                          </p>
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

      {/* 3. REGRAS E ORIENTAÇÕES PARA O DIA DA AULA */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 mb-8 text-xs space-y-3">
        <h4 className="text-sm font-bold text-white flex items-center gap-2">
          <Info className="w-4 h-4 text-pink-400" />
          <span>Orientações Importantes para o seu Encontro</span>
        </h4>
        <ul className="space-y-2 text-slate-300 font-light list-disc pl-5 leading-relaxed">
          <li>
            Chegue com 10 minutos de antecedência ao local de encontro combinado
            {booking.location?.cep ? ` (CEP: ${(booking.location.cep || '').replace(/\D/g, '').replace(/^(\d{5})(\d{3})$/, '$1-$2')}${booking.location.city ? ` — ${booking.location.city}` : ''})` : (booking.location?.locationName ? ` (${booking.location.locationName})` : ' (Portão 10 do Parque do Ibirapuera)')}.
          </li>
          <li>Utilize roupas confortáveis (calça justa ou bermuda esportiva) e tênis fechado com solado aderente.</li>
          <li>Bicicleta calibrada para sua estatura e capacete higienizado são fornecidos pela ABC do Pedal.</li>
          <li>Traga uma garrafinha de água e protetor solar.</li>
          <li>Cancelamentos ou remarcações sem taxa devem ser solicitados com no mínimo 24 horas de antecedência.</li>
        </ul>
      </div>

      {/* Schedule Next Session Modal */}
      {showScheduleNewModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-base">Agendar Próxima Sessão / Remarcar</h3>
              <button
                type="button"
                onClick={() => setShowScheduleNewModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Selecione uma nova data e horário disponível. Seus dados cadastrais serão mantidos sem necessidade de novo preenchimento.
            </p>

            <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
              {(() => {
                const filtered = availableSlots.filter((s) => isSlotMatchingStudentLocation(s, booking?.location));
                if (filtered.length === 0) {
                  return <p className="text-xs text-slate-500 py-4 text-center">Nenhum horário livre para sua região no momento.</p>;
                }
                return filtered.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSelectedSlotForNew(s)}
                    className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                      selectedSlotForNew?.id === s.id
                        ? 'bg-pink-950/40 border-pink-500 text-white'
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <p className="font-bold text-xs">{formatDateBrazilian(s.date)} ({getWeekdayName(s.date)})</p>
                      <p className="text-[11px] text-pink-400 font-mono">
                        {s.time} • 50 minutos {s.locationName ? `• ${s.locationName}` : ''}
                      </p>
                    </div>
                    {selectedSlotForNew?.id === s.id && (
                      <CheckCircle className="w-4 h-4 text-pink-400" />
                    )}
                  </button>
                ));
              })()}
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowScheduleNewModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-mono text-slate-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!selectedSlotForNew}
                onClick={handleScheduleNextSession}
                className="px-5 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-500 disabled:opacity-40 text-white text-xs font-bold transition-all shadow-md shadow-pink-600/20"
              >
                Confirmar Novo Horário
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancellation Confirmation Modal */}
      {showCancelConfirmation && cancellationAlert && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="font-bold text-white text-base">Confirmar Cancelamento?</h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Você está cancelando a aula de{' '}
              <strong>{booking.slot?.date ? `${formatDateBrazilian(booking.slot.date)} às ${booking.slot.time}` : 'AGUARDANDO CONFIRMAÇÃO DO INSTRUTOR'}</strong>.
            </p>

            {cancellationAlert.canCancelFree ? (
              <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-xs text-emerald-300">
                ✓ Cancelamento com mais de 24h de antecedência. Isento de taxa de remarcação.
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-500/40 text-xs text-rose-300">
                ⚠️ Cancelamento com menos de 24h (faltam {cancellationAlert.hoursLeft}h). Sujeito à taxa de R$ 50,00 para remarcação, conforme política aceita.
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowCancelConfirmation(false)}
                className="px-4 py-2 rounded-xl text-xs font-mono text-slate-400 hover:text-white"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all shadow-md shadow-rose-600/20"
              >
                Sim, Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Oficial de Certificação do Método ABCDE */}
      {booking && (
        <ConquestCertificateModal
          booking={booking}
          isOpen={isCertificateModalOpen}
          onClose={() => setIsCertificateModalOpen(false)}
        />
      )}

      {/* Modal para Visualização do Comprovante do Aluno */}
      {selectedVoucherForView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-in fade-in" id="modal-visualizar-comprovante-aluno">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
              <div>
                <h4 className="text-sm font-bold text-white font-mono">
                  {selectedVoucherForView.title}
                </h4>
                <p className="text-[11px] text-slate-400 font-mono">
                  {selectedVoucherForView.fileName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedVoucherForView(null)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 sm:p-6 flex-1 overflow-auto flex items-center justify-center bg-black/80">
              <img
                src={selectedVoucherForView.url}
                alt={selectedVoucherForView.fileName}
                className="max-h-[65vh] max-w-full object-contain rounded-xl border border-slate-800 shadow-2xl"
              />
            </div>
            <div className="p-4 border-t border-slate-800 flex items-center justify-between text-xs font-mono bg-slate-950/80">
              <a
                href={selectedVoucherForView.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-pink-400 hover:text-pink-300 flex items-center gap-1 font-semibold"
              >
                <span>Abrir imagem original</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <button
                type="button"
                onClick={() => setSelectedVoucherForView(null)}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition-colors cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
