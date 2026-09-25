'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { 
  Clock, 
  CheckCircle2, 
  ShieldCheck, 
  CreditCard, 
  QrCode, 
  ExternalLink, 
  AlertCircle, 
  Calendar, 
  MapPin, 
  User, 
  Bike, 
  Sparkles, 
  ArrowRight, 
  RotateCcw, 
  Lock, 
  BadgePercent,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  UploadCloud,
  FileCheck,
  Upload,
  Image as ImageIcon,
  CheckCircle,
  RefreshCw,
  X,
  AlertTriangle,
  FileText
} from 'lucide-react';
import { 
  BookingRecord, 
  PAGBANK_PAYMENT_URL, 
  PAGBANK_PAYMENT_URL_SAO_PAULO,
  PAGBANK_PAYMENT_URL_DESAFIO_ABC,
  isDesafioPedalAbcLocation,
  getPaymentUrlForBooking,
  formatDateBrazilian, 
  getWeekdayName,
  getStoredBookings,
  saveStoredBookings,
  confirmBookingPayment,
  submitBookingVoucher,
  saveStoredCurrentBookingId,
  saveStoredStudentWhatsApp,
  compressReceiptImage,
  cancelExpiredReservation,
  checkAndExpireReservations,
  getStoredSlots,
  saveStoredSlots,
  OFFICIAL_WHATSAPP_URL,
  checkAndProcessExpired24hRejections,
  isSpecialAbcPaymentCity,
  generateSpecialAbcPaymentWhatsAppUrl,
  generatePixCopyPasteCode
} from '@/lib/booking-store';
import { getProductForLocation } from '@/lib/products';

interface FinalizeBookingViewProps {
  booking: BookingRecord;
  onBookingUpdated?: (updated: BookingRecord) => void;
  onGoToStudentPortal?: (bookingId: string) => void;
  onChooseNewSlot?: () => void;
}

export function FinalizeBookingView({
  booking: initialBooking,
  onBookingUpdated,
  onGoToStudentPortal,
  onChooseNewSlot
}: FinalizeBookingViewProps) {
  const [bookingOverride, setBookingOverride] = useState<BookingRecord | null>(null);
  const booking = bookingOverride ?? initialBooking;

  const setBooking = React.useCallback(
    (update: BookingRecord | ((curr: BookingRecord) => BookingRecord)) => {
      setBookingOverride((prev) => {
        const curr = prev ?? initialBooking;
        return typeof update === 'function' ? update(curr) : update;
      });
    },
    [initialBooking]
  );

  // Keep a stable ref for onBookingUpdated to prevent timer resets on parent re-renders
  const onBookingUpdatedRef = React.useRef(onBookingUpdated);
  useEffect(() => {
    onBookingUpdatedRef.current = onBookingUpdated;
  }, [onBookingUpdated]);

  useEffect(() => {
    checkAndProcessExpired24hRejections();
  }, []);

  // Garante timestamp absoluto para cálculo sem oscilações ou congelamentos
  const getExpirationMs = (record: BookingRecord): number => {
    if (record.preReservationExpiresAt) {
      const parsed = new Date(record.preReservationExpiresAt).getTime();
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
    const created = record.createdAt ? new Date(record.createdAt).getTime() : Date.now();
    return created + 60 * 60 * 1000;
  };

  const [remainingSeconds, setRemainingSeconds] = useState<number>(() => {
    const expiresMs = getExpirationMs(initialBooking);
    return Math.max(0, Math.floor((expiresMs - Date.now()) / 1000));
  });

  const [paymentClicked, setPaymentClicked] = useState<boolean>(false);
  const [showPixManual, setShowPixManual] = useState<boolean>(false);
  const [pixCopied, setPixCopied] = useState<boolean>(false);
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [simulatingWebhook, setSimulatingWebhook] = useState<boolean>(false);

  // States for Receipt / Voucher Upload (Item 12)
  const [customReceiptPreview, setCustomReceiptPreview] = useState<string>('');
  const [customReceiptName, setCustomReceiptName] = useState<string>('');
  const selectedReceiptPreview = customReceiptPreview || booking.voucherUrl || '';
  const selectedReceiptName = customReceiptName || booking.voucherFileName || '';
  const setSelectedReceiptPreview = setCustomReceiptPreview;
  const setSelectedReceiptName = setCustomReceiptName;

  const [isSubmittingVoucher, setIsSubmittingVoucher] = useState<boolean>(false);
  const [voucherSubmitSuccess, setVoucherSubmitSuccess] = useState<boolean>(false);
  const [voucherErrorMessage, setVoucherErrorMessage] = useState<string>('');
  const [isDraggingFile, setIsDraggingFile] = useState<boolean>(false);
  const [showReplaceUpload, setShowReplaceUpload] = useState<boolean>(false);

  const isConfirmed =
    booking.status === 'confirmado' ||
    booking.status === 'agendamento-confirmado' ||
    booking.status === 'pagamento-confirmado' ||
    Boolean(booking.paymentConfirmedAt);

  // REGRA DE OURO: O contador SÓ PODE FICAR PARADO quando o comprovante for enviado (ou confirmado)
  const isVoucherSent = Boolean(
    booking.voucherSentAt ||
    booking.voucherUrl ||
    booking.status === 'aguardando-confirmacao-instrutor' ||
    booking.status === 'comprovante-enviado' ||
    booking.status === 'pagamento-enviado'
  );

  const isAwaitingInstructor = isVoucherSent;
  const isExpired = booking.status === 'reserva-expirada' || (!isConfirmed && !isVoucherSent && remainingSeconds <= 0);

  const bookingId = booking.id;
  const expiresMs = getExpirationMs(booking);

  // 60-Minute Countdown Timer (REGRA ABSOLUTA: O contador SÓ PODE FICAR PARADO quando o comprovante for enviado)
  useEffect(() => {
    // Se o comprovante já foi enviado ou agendamento confirmado, o contador fica parado (congelado)
    if (isConfirmed || isVoucherSent || isExpired) return;

    // Roda ativamente a cada 1 segundo garantindo que o cronômetro NUNCA fique parado antes do envio do comprovante
    const timer = setInterval(() => {
      const now = Date.now();
      const diff = Math.max(0, Math.floor((expiresMs - now) / 1000));
      setRemainingSeconds(diff);

      if (diff <= 0) {
        cancelExpiredReservation(bookingId);
        setBooking((curr) => {
          const updated: BookingRecord = { ...curr, status: 'reserva-expirada' };
          onBookingUpdatedRef.current?.(updated);
          return updated;
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [isConfirmed, isVoucherSent, isExpired, bookingId, expiresMs, setBooking]);

  // Periodic check to synchronize storage status (in case of background webhook or external confirmation)
  useEffect(() => {
    if (isConfirmed || isExpired) return;

    const checkInterval = setInterval(() => {
      checkAndExpireReservations();
      const all = getStoredBookings();
      const current = all.find((b) => b.id === booking.id);
      if (current && current.status !== booking.status) {
        setBooking(current);
        onBookingUpdatedRef.current?.(current);
      }
    }, 4000);

    return () => clearInterval(checkInterval);
  }, [booking.id, booking.status, isConfirmed, isExpired, setBooking]);

  // Encaminhar DIRETAMENTE o aluno para a área do aluno se o comprovante já estiver vinculado
  useEffect(() => {
    if (isVoucherSent && !showReplaceUpload) {
      onGoToStudentPortal?.(booking.id);
    }
  }, [isVoucherSent, showReplaceUpload, booking.id, onGoToStudentPortal]);

  const minutesRemaining = Math.floor(remainingSeconds / 60);
  const secondsRemaining = remainingSeconds % 60;
  const formattedCountdown = `${String(minutesRemaining).padStart(2, '0')}:${String(secondsRemaining).padStart(2, '0')}`;
  const countdownPercent = Math.min(100, Math.max(0, (remainingSeconds / 3600) * 100));

  // Identifica se a contratação pertence exclusivamente a uma das outras localidades do ABC Paulista:
  // Diadema, Mauá, São Caetano do Sul, Ribeirão Pires.
  // NÃO APLICAR A: Ibirapuera, Outras Localidades SP, Santo André, São Bernardo do Campo, Outras Regiões.
  const isSpecialAbcPayment = useMemo(() => isSpecialAbcPaymentCity(booking.location), [booking.location]);

  // Identifica se a aula é Desafio do Pedal em Santo André ou São Bernardo do Campo
  const isDesafioAbc = useMemo(
    () => isDesafioPedalAbcLocation(booking.location, booking.slot),
    [booking.location, booking.slot]
  );

  // Determina o produto correspondente (Desafio do Pedal, Aprenda a Pedalar, Imersão do Pedal)
  const activeProduct = useMemo(
    () => getProductForLocation(booking.location),
    [booking.location]
  );

  // Link oficial de pagamento PagSeguro:
  // - Santo André e São Bernardo do Campo: https://pag.ae/82bm3JV69
  // - São Paulo / Ibirapuera: https://pag.ae/828yL-9S6 (REGRA OBRIGATÓRIA: RIGOROSAMENTE INALTERADO)
  const paymentUrl = useMemo(
    () => getPaymentUrlForBooking(booking),
    [booking]
  );

  // Handler for PagBank / PagSeguro Payment Button / WhatsApp (Outras Localidades do ABC)
  const handleProceedToPayment = () => {
    // REGRA ESPECIAL EXCLUSIVA PARA OUTRAS LOCALIDADES DO ABC PAULISTA:
    // (Diadema, Mauá, São Caetano do Sul, Ribeirão Pires)
    // -> O botão não deverá abrir a página/checkout de pagamento diretamente.
    // -> Abre o WhatsApp oficial da ABC do Pedal com mensagem pré-formatada contendo os dados cadastrados.
    if (isSpecialAbcPayment) {
      const whatsAppUrl = generateSpecialAbcPaymentWhatsAppUrl(booking);
      if (typeof window !== 'undefined') {
        window.open(whatsAppUrl, '_blank', 'noopener,noreferrer');
      }
      setPaymentClicked(true);
      return;
    }

    // REGRA DE PAGAMENTO PAGSEGURO:
    // - Santo André e São Bernardo do Campo: abre https://pag.ae/82bm3JV69
    // - São Paulo / Ibirapuera: abre https://pag.ae/828yL-9S6 (INALTERADO)
    if (typeof window !== 'undefined') {
      window.open(paymentUrl, '_blank', 'noopener,noreferrer');
    }

    setPaymentClicked(true);

    // Update status to 'aguardando-pagamento' (strictly acknowledging accessed link != confirmed payment)
    if (booking.status !== 'agendamento-confirmado' && booking.status !== 'confirmado') {
      const all = getStoredBookings();
      const updatedList = all.map((b) => {
        if (b.id === booking.id) {
          return {
            ...b,
            status: 'aguardando-pagamento' as const,
            paymentGateway: 'pagbank' as const
          };
        }
        return b;
      });
      saveStoredBookings(updatedList);

      setBooking((curr) => {
        const updated: BookingRecord = {
          ...curr,
          status: 'aguardando-pagamento',
          paymentGateway: 'pagbank'
        };
        onBookingUpdated?.(updated);
        return updated;
      });
    }
  };

  // Simulate PagBank Webhook / Instant Payment Confirmation for testing & demonstration
  const handleSimulatePagBankConfirmation = () => {
    setSimulatingWebhook(true);
    setTimeout(() => {
      const confirmed = confirmBookingPayment(booking.id, `PAGBANK_TX_${Date.now()}`);
      if (confirmed) {
        setBooking(confirmed);
        onBookingUpdated?.(confirmed);
      }
      setSimulatingWebhook(false);
    }, 900);
  };

  // Dynamic lesson price: booking.price -> booking.location.price -> sessionStorage -> default 499
  const lessonPrice = useMemo(() => {
    if (booking.price && Number(booking.price) > 0) return Number(booking.price);
    if (booking.location?.price && Number(booking.location.price) > 0) return Number(booking.location.price);
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('abc_calculated_price');
      if (saved && !isNaN(Number(saved)) && Number(saved) > 0) return Number(saved);
    }
    return 499;
  }, [booking.price, booking.location]);

  const formattedPrice = useMemo(() => {
    return lessonPrice.toFixed(2).replace('.', ',');
  }, [lessonPrice]);

  // Pix Copia e Cola Code
  const pixKeyCopyCode = useMemo(() => {
    return generatePixCopyPasteCode(lessonPrice);
  }, [lessonPrice]);

  const handleCopyPix = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(pixKeyCopyCode);
      setPixCopied(true);
      setTimeout(() => setPixCopied(false), 3000);
    }
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

  // Upload Handlers (Item 12)
  const handleReceiptFileSelected = (file: File) => {
    setVoucherErrorMessage('');
    const validMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    const nameLower = file.name.toLowerCase();
    const validExts = ['.jpg', '.jpeg', '.png', '.webp'];
    const hasValidExt = validExts.some((ext) => nameLower.endsWith(ext));

    if (!validMimes.includes(file.type) && !hasValidExt) {
      setVoucherErrorMessage('Permitido apenas arquivos de imagem nos formatos JPG, JPEG, PNG ou WEBP.');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setVoucherErrorMessage('A imagem não pode ultrapassar 15MB. Envie um arquivo menor.');
      return;
    }

    setIsSubmittingVoucher(true);

    const processAndSubmit = (dataUrl: string) => {
      setSelectedReceiptPreview(dataUrl);
      setSelectedReceiptName(file.name);

      // Salva e vincula o comprovante à contratação para análise do instrutor
      // Mantém o status estritamente como 'aguardando-confirmacao-instrutor'
      // NÃO confirma o agendamento, NÃO cria ou exibe data de aula
      const updated = submitBookingVoucher(booking.id, {
        voucherUrl: dataUrl,
        voucherFileName: file.name
      });

      if (updated) {
        setBooking(updated);
        onBookingUpdated?.(updated);
        saveStoredCurrentBookingId(updated.id);
        const studentPhone = updated.student.guardian?.whatsapp || updated.student.whatsapp;
        if (studentPhone) {
          saveStoredStudentWhatsApp(studentPhone);
        }
      }

      setVoucherSubmitSuccess(true);
      setIsSubmittingVoucher(false);
      setShowReplaceUpload(false);

      // Encaminhar DIRETAMENTE o aluno para a área do aluno, sem passar por nenhuma outra página
      onGoToStudentPortal?.(booking.id);
    };

    compressReceiptImage(file)
      .then((dataUrl) => {
        processAndSubmit(dataUrl);
      })
      .catch(() => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const dataUrl = e.target?.result as string;
          processAndSubmit(dataUrl);
        };
        reader.readAsDataURL(file);
      });
  };

  const handleConfirmAndSendVoucher = () => {
    if (!selectedReceiptPreview) {
      setVoucherErrorMessage('Selecione uma imagem do comprovante antes de finalizar.');
      return;
    }

    setIsSubmittingVoucher(true);
    setVoucherErrorMessage('');

    const updated = submitBookingVoucher(booking.id, {
      voucherUrl: selectedReceiptPreview,
      voucherFileName: selectedReceiptName || 'comprovante_pagamento.jpg'
    });

    if (updated) {
      setBooking(updated);
      onBookingUpdated?.(updated);
      saveStoredCurrentBookingId(updated.id);
      const studentPhone = updated.student.guardian?.whatsapp || updated.student.whatsapp;
      if (studentPhone) {
        saveStoredStudentWhatsApp(studentPhone);
      }
    }

    setVoucherSubmitSuccess(true);
    setIsSubmittingVoucher(false);
    setShowReplaceUpload(false);

    // Encaminhar DIRETAMENTE o aluno para a área do aluno, sem passar por nenhuma outra página
    onGoToStudentPortal?.(booking.id);
  };

  // ==========================================
  // CASE 1: RESERVA EXPIROU
  // ==========================================
  if (isExpired) {
    return (
      <div 
        className="w-full max-w-2xl mx-auto bg-slate-900/60 border border-rose-900/40 rounded-3xl p-6 sm:p-10 text-center animate-in fade-in"
        id="reserva-expirada-view"
      >
        <div className="w-16 h-16 rounded-2xl bg-rose-950/60 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-rose-900/20">
          <Clock className="w-8 h-8 animate-pulse" />
        </div>

        <h3 className="text-2xl sm:text-3xl font-black text-white uppercase font-display tracking-tight mb-2">
          SUA RESERVA EXPIROU
        </h3>

        <p className="text-sm text-slate-300 max-w-md mx-auto mb-6 leading-relaxed">
          O período de reserva deste horário terminou e ele foi liberado para novos agendamentos.
        </p>

        <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 text-left max-w-md mx-auto mb-8 text-xs font-mono space-y-1.5 text-slate-400">
          <p><strong className="text-slate-200">Aluno:</strong> {booking.student.fullName}</p>
          <p><strong className="text-slate-200">Data/Horário:</strong> {formatDateBrazilian(booking.slot.date)} às {booking.slot.time}</p>
          <p><strong className="text-rose-400">Status:</strong> Reserva expirada (tempo limite de 60 min excedido)</p>
        </div>

        <button
          type="button"
          onClick={onChooseNewSlot}
          className="w-full sm:w-auto px-8 py-4 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-bold text-sm tracking-wide transition-all shadow-lg shadow-pink-600/30 inline-flex items-center justify-center gap-2"
          id="btn-escolher-novo-horario"
        >
          <RotateCcw className="w-4 h-4" />
          <span>ESCOLHER NOVO HORÁRIO</span>
        </button>
      </div>
    );
  }

  // ==========================================
  // CASE 2: AGENDAMENTO CONFIRMADO
  // ==========================================
  if (isConfirmed) {
    return (
      <div 
        className="w-full max-w-2xl mx-auto bg-slate-900/60 border border-emerald-900/40 rounded-3xl p-6 sm:p-10 text-center animate-in fade-in"
        id="agendamento-confirmado-view"
      >
        <div className="w-20 h-20 rounded-2xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-emerald-950/50">
          <CheckCircle2 className="w-10 h-10" />
        </div>

        <span className="inline-block px-3 py-1 rounded-full bg-emerald-950/90 text-emerald-300 border border-emerald-500/30 text-xs font-mono font-bold uppercase mb-3">
          ✓ Pagamento Validado com Sucesso
        </span>

        <h3 className="text-2xl sm:text-3xl font-black text-white uppercase font-display tracking-tight mb-2">
          AGENDAMENTO CONFIRMADO!
        </h3>

        <p className="text-sm text-slate-300 max-w-md mx-auto mb-4 leading-relaxed">
          Seu pagamento foi confirmado e sua aula está agendada.
        </p>

        <div className="my-6 p-5 rounded-2xl bg-slate-950/80 border border-slate-800 text-center max-w-md mx-auto">
          <span className="text-xs font-mono text-slate-400 block uppercase">Primeiro Encontro</span>
          <p className="text-xl sm:text-2xl font-black text-pink-400 my-1">
            {formatDateBrazilian(booking.slot.date)} • {booking.slot.time}
          </p>
          <p className="text-xs text-slate-400 font-mono">
            {getWeekdayName(booking.slot.date)} • Duração: 50 minutos
          </p>
        </div>

        <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto mb-8 leading-relaxed">
          Você receberá as informações do seu agendamento pelo sistema e pelo WhatsApp cadastrado: <strong className="text-white">{booking.student.whatsapp}</strong>.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          {onGoToStudentPortal && (
            <button
              type="button"
              onClick={() => onGoToStudentPortal(booking.id)}
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-bold text-xs sm:text-sm tracking-wide transition-all shadow-lg shadow-pink-600/30 flex items-center justify-center gap-2"
              id="btn-ver-area-aluno"
            >
              <User className="w-4 h-4" />
              <span>Acessar Área do Aluno</span>
            </button>
          )}

          <a
            href={`https://wa.me/5511950438948?text=${encodeURIComponent(`Olá ABC do Pedal! Confirmei o pagamento da minha aula de bicicleta para ${formatDateBrazilian(booking.slot.date)} às ${booking.slot.time}. Aluno: ${booking.student.fullName}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 font-mono text-xs transition-all flex items-center justify-center gap-2"
          >
            <span>Falar com o Instrutor no WhatsApp</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    );
  }

  // ==========================================
  // CASE 3: PÁGINA "FINALIZAR AGENDAMENTO" ATIVA
  // ==========================================
  return (
    <div 
      className="w-full max-w-3xl mx-auto space-y-6 animate-in fade-in"
      id="step-04-pagamento"
    >
      {/* 1. Header & 60-Minute Countdown Banner */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 sm:p-8 relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-pink-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800/80">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className={`w-2.5 h-2.5 rounded-full ${isAwaitingInstructor ? 'bg-amber-400 animate-ping' : 'bg-pink-500 animate-pulse'}`} />
              <span className={`text-[11px] font-mono font-bold uppercase tracking-wider ${isAwaitingInstructor ? 'text-amber-400' : 'text-pink-400'}`}>
                {isAwaitingInstructor ? 'Aguardando Confirmação do Instrutor' : 'Reserva Temporária Ativa'}
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white uppercase font-display tracking-tight">
              {isAwaitingInstructor ? 'COMPROVANTE ENVIADO COM SUCESSO' : 'FINALIZE SEU AGENDAMENTO'}
            </h2>
            <p className={`text-sm font-semibold mt-1 ${isAwaitingInstructor ? 'text-amber-200' : 'text-pink-300'}`}>
              {isAwaitingInstructor 
                ? 'Seu horário está reservado e aguarda a confirmação do instrutor.' 
                : 'Seu horário está reservado por 60 minutos.'}
            </p>
          </div>

          {/* Conditional Display: Frozen Protected Notice vs Countdown Clock */}
          {isAwaitingInstructor ? (
            <div className="shrink-0 bg-slate-950/90 border border-amber-500/40 p-4 rounded-2xl flex items-center gap-3.5 shadow-xl" id="box-contador-parado-comprovante-enviado">
              <div className="p-3 rounded-xl bg-amber-950/80 text-amber-400 border border-amber-500/30">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  <span className="text-[10px] font-mono uppercase text-amber-400 font-bold">
                    Reserva Congelada
                  </span>
                </div>
                <span className="text-sm sm:text-base font-mono font-bold text-white block">
                  Horário Protegido
                </span>
                <span className="text-[10px] font-mono text-amber-300/80 block mt-0.5">
                  Contador parado • Comprovante enviado
                </span>
              </div>
            </div>
          ) : (
            <div className="shrink-0 bg-slate-950/90 border border-slate-800 p-4 rounded-2xl flex items-center gap-3.5 shadow-xl" id="box-contador-tempo-restante">
              <div className={`p-3 rounded-xl ${remainingSeconds < 600 ? 'bg-rose-950 text-rose-400 border border-rose-500/30' : 'bg-pink-950/80 text-pink-400 border border-pink-500/30'}`}>
                <Clock className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-pink-500"></span>
                  </span>
                  <span className="text-[10px] font-mono uppercase text-slate-400 block font-semibold">
                    Tempo restante da reserva
                  </span>
                </div>
                <span className={`text-2xl sm:text-3xl font-mono font-black tracking-wider ${remainingSeconds < 600 ? 'text-rose-400' : 'text-white'}`}>
                  {formattedCountdown}
                </span>
                <span className="text-[10px] font-mono text-pink-400/80 block mt-0.5">
                  Contagem regressiva ativa (1s)
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Dynamic Progress Bar (Only shown while active reservation countdown is running) */}
        {!isAwaitingInstructor && (
          <div className="mt-4">
            <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800/60">
              <div 
                className={`h-full transition-all duration-1000 ${remainingSeconds < 600 ? 'bg-rose-500' : 'bg-gradient-to-r from-pink-600 to-rose-400'}`}
                style={{ width: `${countdownPercent}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 mt-1.5">
              <span>Início da Reserva</span>
              <span>Expira em 60 minutos</span>
            </div>
          </div>
        )}

        {/* 2. Resumo da Aula e do Aluno */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 pt-6 border-t border-slate-800/80">
          
          {/* Card: Resumo do Produto */}
          <div className="p-5 rounded-2xl bg-slate-950/70 border border-slate-800/80">
            <div className="flex items-center justify-between gap-2 mb-3 pb-2 border-b border-slate-800/60">
              <div className="flex items-center gap-2">
                <Bike className="w-4 h-4 text-pink-400" />
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-pink-400">
                  Resumo do Produto
                </h3>
              </div>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-pink-950 text-pink-300 border border-pink-500/40">
                {activeProduct.name}
              </span>
            </div>

            <p className="text-base font-black text-white mb-1">
              {activeProduct.name}
            </p>
            <p className="text-xs text-slate-300 mb-3 leading-relaxed">
              {activeProduct.explanation}
            </p>

            <div className="space-y-1.5 text-xs text-slate-300 font-mono">
              <div className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-pink-400 shrink-0" />
                <span><strong className="text-slate-400">Formato:</strong> {activeProduct.format}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span><strong className="text-slate-400">Data:</strong> {formatDateBrazilian(booking.slot.date)} ({getWeekdayName(booking.slot.date)})</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span><strong className="text-slate-400">Horário:</strong> {booking.slot.time}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span><strong className="text-slate-400">Duração:</strong> {booking.slot.durationMinutes || activeProduct.sessionDurationMinutes || 50} minutos</span>
              </div>
              <div className="flex items-start gap-2 pt-0.5">
                <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-slate-400">Local:</strong>{' '}
                  {booking.location?.locationName || booking.slot.locationName || 'Parque Ibirapuera'}
                  {booking.location?.address ? ` (${booking.location.address})` : (booking.location?.isFixed && (booking.location?.locationId === 'ibirapuera' || !booking.location?.locationId) ? ' (Acesso sugerido: Portão 10)' : '')}
                </span>
              </div>
            </div>
          </div>

          {/* Card: Dados do Aluno & Investimento */}
          <div className="p-5 rounded-2xl bg-slate-950/70 border border-slate-800/80 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-800/60">
                <User className="w-4 h-4 text-pink-400" />
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-pink-400">
                  Aluno(a) Cadastrado(a)
                </h3>
              </div>

              <p className="text-sm font-bold text-white mb-1">{booking.student.fullName}</p>
              <p className="text-xs text-slate-400 font-mono">WhatsApp: {booking.student.whatsapp}</p>
              <p className="text-xs text-slate-400 font-mono truncate">E-mail: {booking.student.email}</p>
              {booking.student.guardian && (
                <p className="text-[11px] text-slate-400 font-mono mt-1">
                  Resp.: {booking.student.guardian.fullName} ({booking.student.guardian.relation})
                </p>
              )}
            </div>

            {/* Investimento */}
            <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase text-slate-400 block font-semibold">
                  INVESTIMENTO
                </span>
                <p className="text-2xl font-black font-mono text-white">
                  R$ {formattedPrice}
                </p>
              </div>
              <span className="text-[10px] font-mono px-2 py-1 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-500/30">
                Garantia de Vaga
              </span>
            </div>
          </div>

        </div>
      </div>

      {/* 3. Formas de Pagamento no Ambiente Seguro do PagBank */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 sm:p-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-xl bg-emerald-950/80 text-emerald-400 border border-emerald-500/30">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white">
              Escolha a forma de pagamento no ambiente seguro do PagBank.
            </h3>
            <p className="text-xs text-slate-400">
              Transação criptografada de ponta a ponta pelo PagBank (UOL).
            </p>
          </div>
        </div>

        {/* Payment Methods Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-5">
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-center flex flex-col items-center justify-center gap-1.5">
            <QrCode className="w-5 h-5 text-emerald-400" />
            <span className="text-xs font-bold text-white">Pix</span>
            <span className="text-[10px] font-mono text-emerald-400">Aprovação Imediata</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-center flex flex-col items-center justify-center gap-1.5">
            <CreditCard className="w-5 h-5 text-sky-400" />
            <span className="text-xs font-bold text-white">Cartão de Débito</span>
            <span className="text-[10px] font-mono text-slate-400">Principais bandeiras</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-center flex flex-col items-center justify-center gap-1.5">
            <CreditCard className="w-5 h-5 text-pink-400" />
            <span className="text-xs font-bold text-white">Cartão de Crédito</span>
            <span className="text-[10px] font-mono text-slate-400">À vista</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-center flex flex-col items-center justify-center gap-1.5">
            <BadgePercent className="w-5 h-5 text-amber-400" />
            <span className="text-xs font-bold text-white">Até 12x no Cartão</span>
            <span className="text-[10px] font-mono text-slate-400">Parcelamento flexível</span>
          </div>
        </div>

        {/* Disclaimer about Installment Interest */}
        <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 text-xs text-slate-400 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            Parcelamento no cartão em até 12 vezes, conforme as condições apresentadas no momento do pagamento.{' '}
            <strong className="text-slate-200">
              Os juros decorrentes do parcelamento no cartão são de responsabilidade do comprador.
            </strong>
          </p>
        </div>

        {/* 4. Botão de Pagamento Principal */}
        <div className="mt-8 text-center space-y-3">
          <button
            type="button"
            onClick={handleProceedToPayment}
            className="w-full sm:w-auto min-w-[320px] px-8 py-4 rounded-2xl bg-gradient-to-r from-pink-600 via-rose-500 to-pink-500 hover:from-pink-500 hover:to-rose-400 text-white font-black text-sm uppercase tracking-wider transition-all shadow-xl shadow-pink-600/30 hover:shadow-pink-500/50 hover:scale-[1.01] active:scale-[0.99] inline-flex items-center justify-center gap-3 cursor-pointer"
            id="btn-continuar-para-pagamento"
          >
            <span>PAGAMENTO</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <p className="text-[11px] text-slate-500 font-mono">
            {isSpecialAbcPayment
              ? `Atendimento para ${booking.location?.city || 'ABC Paulista'}: ao clicar, você será encaminhado para o WhatsApp oficial da ABC do Pedal com todas as informações do seu pedido para confirmar o valor e receber orientações de pagamento.`
              : isDesafioAbc
              ? 'Desafio do Pedal — Santo André e São Bernardo do Campo: ao clicar em PAGAMENTO, você será redirecionado com segurança para o PagSeguro para concluir o pagamento.'
              : 'Ao clicar em PAGAMENTO, você será redirecionado com segurança para o ambiente do PagBank/PagSeguro para concluir o pagamento.'}
          </p>
        </div>

        {/* 5. Acompanhamento após clicar no botão */}
        {paymentClicked && (
          <div className="mt-6 p-4 rounded-2xl bg-slate-950/90 border border-pink-500/30 text-left animate-in fade-in">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                <span className="text-xs font-mono font-bold text-amber-300">
                  {isSpecialAbcPayment ? 'Status: Orientação de Pagamento via WhatsApp' : 'Status: Aguardando pagamento'}
                </span>
              </div>
              <span className="text-[11px] font-mono text-slate-400">
                Reserva temporária ativa
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {isSpecialAbcPayment ? (
                <>
                  A conversa no <strong>WhatsApp oficial da ABC do Pedal</strong> foi aberta com as informações do seu agendamento para <strong>{booking.location?.city || 'o ABC Paulista'}</strong> para confirmação do valor e envio do passo a passo para pagamento.
                </>
              ) : isDesafioAbc ? (
                <>
                  O ambiente de pagamento do <strong>PagSeguro</strong> para o <strong>Desafio do Pedal ({booking.location?.city || 'Santo André / São Bernardo'})</strong> foi aberto em uma nova aba. Após efetuar o pagamento, anexe seu comprovante logo abaixo para análise do instrutor e confirmação definitiva do agendamento.
                </>
              ) : (
                <>
                  O ambiente de pagamento do PagBank foi aberto em uma nova aba. Assim que o pagamento for concluído, anexe seu comprovante logo abaixo para análise do instrutor e confirmação do agendamento.
                </>
              )}
            </p>

            <div className="mt-4 pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleProceedToPayment}
                className="text-xs font-mono text-pink-400 hover:text-pink-300 underline inline-flex items-center gap-1"
              >
                <span>
                  {isSpecialAbcPayment 
                    ? 'Reabrir WhatsApp oficial da ABC do Pedal' 
                    : isDesafioAbc
                    ? 'Reabrir página de pagamento do PagSeguro'
                    : 'Reabrir página de pagamento do PagBank'}
                </span>
                <ExternalLink className="w-3 h-3" />
              </button>

              {/* Simulation button for tests and instructor demo without real charges */}
              <button
                type="button"
                onClick={handleSimulatePagBankConfirmation}
                disabled={simulatingWebhook}
                className="px-3 py-1.5 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-500/30 text-emerald-300 text-[11px] font-mono transition-colors inline-flex items-center gap-1.5"
                id="btn-simular-webhook-pagbank"
                title="Simula o retorno automático do Webhook do PagBank para homologação e validação"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{simulatingWebhook ? 'Processando Webhook...' : 'Simular Confirmação PagBank'}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 12. ÁREA DESTINADA AO UPLOAD DO RECIBO DE PAGAMENTO */}
      <div 
        className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6"
        id="area-upload-comprovante-pagamento"
      >
        {/* Header do Comprovante de Pagamento */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-pink-950/80 text-pink-400 border border-pink-500/30">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white uppercase tracking-tight font-display">
                COMPROVANTE DE PAGAMENTO
              </h3>
              <p className="text-xs text-slate-400">
                Após realizar o pagamento pelo PagBank, o aluno deverá retornar ao sistema e enviar uma imagem do comprovante.
              </p>
            </div>
          </div>

          {/* Badge de Status Atual */}
          {(booking.status === 'comprovante-enviado' || booking.status === 'pagamento-enviado') && (
            <span className="self-start sm:self-auto px-3 py-1 rounded-full text-xs font-mono font-bold bg-amber-950/80 text-amber-300 border border-amber-500/40 inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span>Comprovante enviado — aguardando confirmação</span>
            </span>
          )}

          {(booking.status === 'pagamento-nao-confirmado' || booking.status === 'comprovante-rejeitado' || booking.status === 'comprovante-reprovado') && (
            <span className="self-start sm:self-auto px-3 py-1 rounded-full text-xs font-mono font-bold bg-rose-950/80 text-rose-300 border border-rose-500/40 inline-flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Comprovante Reprovado</span>
            </span>
          )}

          {booking.status === 'aguardando-novo-pagamento' && (
            <span className="self-start sm:self-auto px-3 py-1 rounded-full text-xs font-mono font-bold bg-amber-950/80 text-amber-300 border border-amber-500/40 inline-flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Aguardando Novo Pagamento/Comprovante</span>
            </span>
          )}
        </div>

        {/* Feedback de Envio Recente */}
        {voucherSubmitSuccess && (
          <div className="p-4 rounded-2xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-200 animate-in fade-in space-y-2">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
              <p className="text-sm font-bold">Comprovante enviado com sucesso!</p>
            </div>
            <p className="text-xs text-emerald-300/90 leading-relaxed font-mono">
              Status alterado para: <strong>AGUARDANDO CONFIRMAÇÃO DO INSTRUTOR</strong>. Redirecionando para a Área do Aluno...
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => onGoToStudentPortal?.(booking.id)}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-bold inline-flex items-center gap-2 transition-all shadow-md"
              >
                <span>Acessar Área do Aluno Agora</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Alerta de Pagamento Não Confirmado (se rejeitado pelo admin) */}
        {(booking.status === 'pagamento-nao-confirmado' || booking.status === 'comprovante-rejeitado' || booking.status === 'comprovante-reprovado') && (
          <div className="p-4 rounded-2xl bg-rose-950/70 border border-rose-500/40 text-rose-200 space-y-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
              <p className="text-sm font-bold">Comprovante Inválido / Reprovado</p>
            </div>
            <p className="text-xs text-rose-300/90 leading-relaxed font-semibold">
              Favor enviar um comprovante de pagamento válido ou entrar em contato com o instrutor para regularizar a inscrição.
            </p>
            {booking.rejectionReason && (
              <p className="text-xs font-mono text-rose-200/90">
                Motivo: {booking.rejectionReason}
              </p>
            )}
            <div className="pt-1">
              <a
                href={`https://wa.me/5511987654321?text=${encodeURIComponent(
                  `Olá, sou ${booking.student.fullName}. Gostaria de orientações sobre o envio do comprovante para a inscrição #${booking.id.slice(0, 8)}.`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-bold transition-colors"
              >
                <span>FALAR PELO WHATSAPP</span>
              </a>
            </div>
          </div>
        )}

        {/* Alerta de Prazo de 24 Horas Encerrado */}
        {booking.status === 'aguardando-novo-pagamento' && (
          <div className="p-4 rounded-2xl bg-amber-950/70 border border-amber-500/40 text-amber-200 space-y-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
              <p className="text-sm font-bold">Prazo de 24 Horas Encerrado</p>
            </div>
            <p className="text-xs text-amber-300/90 leading-relaxed font-semibold">
              O prazo de 24 horas para o envio de novo comprovante encerrou. O horário reservado foi liberado na agenda e voltou a ficar disponível para novos agendamentos. Todo o seu cadastro e histórico anterior permanecem preservados no sistema.
            </p>
            <div className="pt-2 flex flex-wrap items-center gap-2">
              {onChooseNewSlot && (
                <button
                  type="button"
                  onClick={onChooseNewSlot}
                  className="px-4 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-white text-xs font-mono font-bold transition-colors shadow"
                >
                  Realizar Nova Contratação / Escolher Novo Horário
                </button>
              )}
              <a
                href={`https://wa.me/5511987654321?text=${encodeURIComponent(
                  `Olá, sou ${booking.student.fullName}. Gostaria de informações sobre novo agendamento para a inscrição #${booking.id.slice(0, 8)}.`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-bold transition-colors"
              >
                <span>FALAR PELO WHATSAPP</span>
              </a>
            </div>
          </div>
        )}

        {/* CENÁRIO 1: Comprovante já registrado e aguardando confirmação */}
        {booking.status !== 'comprovante-reprovado' &&
        booking.status !== 'comprovante-rejeitado' &&
        booking.status !== 'pagamento-nao-confirmado' &&
        booking.status !== 'aguardando-novo-pagamento' &&
        (booking.voucherUrl || booking.status === 'aguardando-confirmacao-instrutor' || booking.status === 'comprovante-enviado' || booking.status === 'pagamento-enviado') && !showReplaceUpload ? (
          <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-5">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold block mb-1">
                  STATUS DO COMPROVANTE
                </span>
                <p className="text-base font-bold text-white">
                  AGUARDANDO CONFIRMAÇÃO DO INSTRUTOR
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowReplaceUpload(true)}
                  className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 text-xs font-mono flex items-center gap-1.5 transition-colors"
                  id="btn-substituir-comprovante"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Substituir Arquivo</span>
                </button>

                <button
                  type="button"
                  onClick={() => onGoToStudentPortal?.(booking.id)}
                  className="px-4 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-white text-xs font-mono font-bold flex items-center gap-1.5 transition-colors shadow-md shadow-pink-600/20"
                  id="btn-ir-portal-aluno"
                >
                  <span>Portal do Aluno</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Dados vinculados ao comprovante */}
            <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 text-xs font-mono space-y-2 text-slate-300">
              <p className="font-bold text-slate-200 border-b border-slate-800 pb-1.5 mb-2">
                Dados vinculados ao comprovante:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <span className="text-slate-500">Aluno vinculado:</span>{' '}
                  <strong className="text-white">{booking.student.fullName}</strong>
                </div>
                <div>
                  <span className="text-slate-500">Agendamento:</span>{' '}
                  <strong className="text-white">#{booking.id.slice(0, 8)}</strong>
                </div>
                <div>
                  <span className="text-slate-500">Data e Horário:</span>{' '}
                  <strong className="text-white">{formatDateBrazilian(booking.slot.date)} às {booking.slot.time}</strong>
                </div>
                <div>
                  <span className="text-slate-500">Contratação:</span>{' '}
                  <strong className="text-white">Programa Aprender a Pedalar (R$ {formattedPrice})</strong>
                </div>
                {booking.voucherSentAt && (
                  <div className="sm:col-span-2">
                    <span className="text-slate-500">Data e hora do envio:</span>{' '}
                    <strong className="text-emerald-400">{formatDateTimeDisplay(booking.voucherSentAt)}</strong>
                  </div>
                )}
                {booking.voucherFileName && (
                  <div className="sm:col-span-2">
                    <span className="text-slate-500">Arquivo enviado:</span>{' '}
                    <strong className="text-slate-300">{booking.voucherFileName}</strong>
                  </div>
                )}
              </div>
            </div>

            {/* Pré-visualização da imagem enviada */}
            {booking.voucherUrl && (
              <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800">
                <span className="text-xs font-mono text-slate-400 block mb-2 font-semibold">
                  Pré-visualização do Comprovante:
                </span>
                <div className="relative inline-block max-w-full">
                  <img
                    src={booking.voucherUrl}
                    alt="Pré-visualização do Comprovante"
                    className="max-h-64 sm:max-h-80 rounded-xl border border-slate-700 object-contain bg-black/60 shadow-lg"
                  />
                </div>
              </div>
            )}

            {/* Regra de Segurança */}
            <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-500/30 text-xs text-amber-200/90 space-y-1">
              <div className="flex items-center gap-2 text-amber-400 font-bold uppercase font-mono tracking-wider">
                <Lock className="w-4 h-4" />
                <span>REGRA DE SEGURANÇA • AGUARDANDO CONFIRMAÇÃO DE PAGAMENTO</span>
              </div>
              <p className="leading-relaxed">
                O simples envio do comprovante NÃO confirma automaticamente o agendamento. O status permanecerá como <strong>AGUARDANDO CONFIRMAÇÃO DE PAGAMENTO</strong> até que o pagamento seja validado e confirmado pelo administrador/instrutor.
              </p>
            </div>
          </div>
        ) : (
          /* CENÁRIO 2: Área de Envio e Upload do Comprovante */
          <div className="space-y-4">
            {/* Input nativo oculto estritamente para imagens */}
            <input
              type="file"
              id="input-comprovante-pagamento"
              accept="image/jpeg,image/png,image/webp,image/jpg"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleReceiptFileSelected(file);
              }}
            />

            {/* Mensagem de Erro se formato inválido */}
            {voucherErrorMessage && (
              <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{voucherErrorMessage}</span>
              </div>
            )}

            {/* Se o aluno ainda não selecionou ou está substituindo */}
            {!selectedReceiptPreview ? (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDraggingFile(true);
                }}
                onDragLeave={() => setIsDraggingFile(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDraggingFile(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file) handleReceiptFileSelected(file);
                }}
                className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer ${
                  isDraggingFile
                    ? 'border-pink-500 bg-pink-950/20'
                    : 'border-slate-700 hover:border-pink-500/60 bg-slate-950/60 hover:bg-slate-950'
                }`}
                onClick={() => document.getElementById('input-comprovante-pagamento')?.click()}
                id="dropzone-comprovante"
              >
                <div className="w-14 h-14 rounded-2xl bg-pink-950/60 border border-pink-500/30 text-pink-400 flex items-center justify-center mx-auto mb-4">
                  <UploadCloud className="w-7 h-7" />
                </div>

                {/* Botão + ENVIAR COMPROVANTE */}
                <button
                  type="button"
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-mono font-bold text-sm shadow-lg shadow-pink-600/30 transition-all cursor-pointer inline-flex items-center gap-2 mb-3"
                  id="btn-enviar-comprovante"
                >
                  <Upload className="w-4 h-4" />
                  <span>+ ENVIAR COMPROVANTE</span>
                </button>

                {/* Texto auxiliar obrigatório */}
                <p className="text-sm font-semibold text-slate-200 mb-1">
                  Envie uma imagem legível do comprovante de pagamento.
                </p>

                {/* Formatos Aceitos (Permitir apenas arquivos de imagem) */}
                <p className="text-xs text-slate-400 font-mono">
                  Aceitar arquivos nos formatos: <span className="text-slate-300 font-bold">JPG, JPEG, PNG, WEBP</span>
                </p>
                <p className="text-[11px] text-slate-500 font-mono mt-1">
                  Arraste a imagem até aqui ou clique para selecionar do seu dispositivo
                </p>
              </div>
            ) : (
              /* Pré-visualização da imagem enviada */
              <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 space-y-4 animate-in fade-in">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <FileCheck className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-mono font-bold text-white uppercase">
                      Pré-visualização do Comprovante Selecionado
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400 truncate max-w-xs">
                    {selectedReceiptName}
                  </span>
                </div>

                {/* Imagem em pré-visualização */}
                <div className="flex flex-col sm:flex-row items-center gap-6">
                  <div className="relative group shrink-0">
                    <img
                      src={selectedReceiptPreview}
                      alt="Pré-visualização do Comprovante"
                      className="w-48 sm:w-56 max-h-64 rounded-xl border border-slate-700 object-contain bg-black/80 shadow-md"
                    />
                  </div>

                  <div className="space-y-3 w-full">
                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono space-y-1 text-slate-300">
                      <p><strong className="text-slate-400">Aluno:</strong> {booking.student.fullName}</p>
                      <p><strong className="text-slate-400">Aula:</strong> {formatDateBrazilian(booking.slot.date)} às {booking.slot.time}</p>
                      <p><strong className="text-slate-400">Valor:</strong> R$ {formattedPrice}</p>
                    </div>

                    <p className="text-xs text-slate-400 leading-relaxed">
                      Verifique se todos os dados de valor (R$ {formattedPrice}), data e autenticação bancária estão legíveis antes de confirmar o envio.
                    </p>

                    <div className="flex flex-wrap items-center gap-3 pt-2">
                      {/* Botão de Finalizar Envio */}
                      <button
                        type="button"
                        onClick={handleConfirmAndSendVoucher}
                        disabled={isSubmittingVoucher}
                        className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-mono font-bold text-xs flex items-center gap-2 shadow-lg shadow-pink-600/30 transition-all cursor-pointer"
                        id="btn-confirmar-envio-comprovante"
                      >
                        {isSubmittingVoucher ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>Registrando Comprovante...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Confirmar Envio e Acessar Portal</span>
                          </>
                        )}
                      </button>

                      {/* Botão para Substituir o arquivo antes de finalizar */}
                      <button
                        type="button"
                        onClick={() => document.getElementById('input-comprovante-pagamento')?.click()}
                        disabled={isSubmittingVoucher}
                        className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 text-xs font-mono flex items-center gap-1.5 transition-colors cursor-pointer"
                        id="btn-trocar-arquivo"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Substituir Arquivo</span>
                      </button>

                      {showReplaceUpload && (
                        <button
                          type="button"
                          onClick={() => setShowReplaceUpload(false)}
                          className="text-xs font-mono text-slate-500 hover:text-slate-300"
                        >
                          Cancelar alteração
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Regra de Segurança Informativa */}
            <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 text-xs text-slate-400 space-y-1">
              <div className="flex items-center gap-2 text-amber-400 font-bold uppercase font-mono tracking-wider">
                <Lock className="w-3.5 h-3.5" />
                <span>REGRA DE SEGURANÇA</span>
              </div>
              <p className="leading-relaxed">
                O simples envio do comprovante <strong>NÃO</strong> confirma automaticamente o agendamento. O status permanecerá como <strong>AGUARDANDO CONFIRMAÇÃO DE PAGAMENTO</strong> até que o pagamento seja validado pelo administrador/instrutor.
              </p>
            </div>
          </div>
        )}

        {/* PIX Manual (Preservado e integrado) */}
        <div className="pt-2 border-t border-slate-800/80">
          <button
            type="button"
            onClick={() => setShowPixManual(!showPixManual)}
            className="w-full flex items-center justify-between text-xs font-mono text-slate-400 hover:text-slate-200 transition-colors py-1"
          >
            <span className="flex items-center gap-2">
              <QrCode className="w-4 h-4 text-slate-500" />
              <span>Precisa da chave PIX manual antes de enviar o comprovante?</span>
            </span>
            {showPixManual ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showPixManual && (
            <div className="mt-4 pt-3 border-t border-slate-800 space-y-3 animate-in fade-in">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <span className="block text-[11px] font-mono text-slate-400 uppercase font-semibold mb-1">
                  PIX Copia e Cola • Favorecido: Anderson Rosa dos Reis
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={pixKeyCopyCode}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-300 focus:outline-none truncate"
                  />
                  <button
                    type="button"
                    onClick={handleCopyPix}
                    className="shrink-0 px-3 py-2 bg-pink-600 hover:bg-pink-500 text-white rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-colors"
                  >
                    {pixCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{pixCopied ? 'Copiado!' : 'Copiar'}</span>
                  </button>
                </div>
              </div>

              <p className="text-[11px] text-slate-400">
                Após transferir os R$ {formattedPrice} pelo aplicativo do seu banco para o favorecido <strong>Anderson Rosa dos Reis</strong>, salve o comprovante na sua galeria e faça o upload no campo acima.
              </p>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
