'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Image from 'next/image';
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  CheckCircle,
  Copy,
  Upload,
  ArrowRight,
  ArrowLeft,
  Shield,
  AlertCircle,
  Car,
  Navigation,
  FileCheck,
  Camera,
  ExternalLink,
  Lock,
  ChevronRight,
  Sparkles,
  Info,
  MessageCircle,
  Share2,
  Download,
  Image as ImageIcon,
  UploadCloud,
  X,
  QrCode,
  Check,
  CreditCard
} from 'lucide-react';
import { CURRENT_PRODUCT, getProductForLocation } from '@/lib/products';
import { subscribeToSlots, saveBookingToFirestore, saveSlotsToFirestore } from '@/lib/firebase';
import {
  AgeProfile,
  GuardianRelation,
  StudentData,
  TimeSlot,
  BookingRecord,
  getStoredSlots,
  saveStoredSlots,
  getStoredBookings,
  saveStoredBookings,
  getStoredCurrentBookingId,
  saveStoredCurrentBookingId,
  saveStoredStudentWhatsApp,
  findBookingsByWhatsApp,
  formatDateBrazilian,
  getWeekdayName,
  isSlotExpired,
  isSlotMatchingStudentLocation,
  generateWhatsAppNotificationUrl,
  generateCustomerToAbcWhatsAppUrl,
  generateContractDetailsText,
  generateNoSlotsAvailableWhatsAppUrl,
  isSpecialAbcPaymentCity,
  generateSpecialAbcPaymentWhatsAppUrl,
  OFFICIAL_WHATSAPP_NUMBER,
  OFFICIAL_WHATSAPP_DISPLAY,
  OFFICIAL_WHATSAPP_URL,
  submitBookingVoucher,
  compressReceiptImage,
  generatePixCopyPasteCode,
  PAGBANK_PAYMENT_URL_SAO_PAULO,
  PAGBANK_PAYMENT_URL_DESAFIO_ABC,
  isDesafioPedalAbcLocation
} from '@/lib/booking-store';
import { PolicyModal } from './PolicyModal';
import { FinalizeBookingView } from './FinalizeBookingView';
import { LocationSelectionCards } from './LocationSelectionCards';
import { BookingSelectedLocation } from '@/lib/locations-config';

interface BookingFlowProps {
  onGoToStudentPortal?: (bookingId: string) => void;
  onGoToAdmin?: () => void;
}

export function BookingFlow({ onGoToStudentPortal, onGoToAdmin }: BookingFlowProps) {
  // Step state: 1 (Local) -> 2 (Dados) -> 3 (Horário) -> 4 (Revisão) -> 5 (Pagamento) -> 6 (Confirmação)
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4 | 5 | 6>(1);
  const [selectedLocation, setSelectedLocation] = useState<BookingSelectedLocation | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = sessionStorage.getItem('abc_selected_location');
        if (stored) {
          return JSON.parse(stored);
        }
      } catch {}
    }
    return null;
  });
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);

  // Form State - Step 1
  const [fullName, setFullName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [cpf, setCpf] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [ageProfile, setAgeProfile] = useState<AgeProfile>('adulto');
  const [heightCm, setHeightCm] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [hasSpecificNeeds, setHasSpecificNeeds] = useState(false);
  const [specificNeedsDesc, setSpecificNeedsDesc] = useState('');

  // Guardian Fields (if minor)
  const [guardianName, setGuardianName] = useState('');
  const [guardianCpf, setGuardianCpf] = useState('');
  const [guardianBirthDate, setGuardianBirthDate] = useState('');
  const [guardianWhatsapp, setGuardianWhatsapp] = useState('');
  const [guardianEmail, setGuardianEmail] = useState('');
  const [guardianRelation, setGuardianRelation] = useState<GuardianRelation>('mae');

  // Step 2 - Schedule State (filtering out any expired date or time)
  const [slots, setSlots] = useState<TimeSlot[]>(() => {
    if (typeof window !== 'undefined') {
      return getStoredSlots().filter(s => !isSlotExpired(s.date, s.time));
    }
    return [];
  });

  // Valid non-expired slots filtered strictly by the selected location and region distribution
  const validSlots = useMemo(() => {
    return slots.filter((s) => {
      // 1. Never show expired slots
      if (isSlotExpired(s.date, s.time)) return false;

      // 2. Strict region & municipality filtering:
      // Exemplo: ABC Paulista -> Santo André -> 09:00 não deve aparecer para São Bernardo, SP ou outras.
      return isSlotMatchingStudentLocation(s, selectedLocation);
    });
  }, [slots, selectedLocation]);

  // Unique dates strictly from valid, non-expired slots
  const availableDates = useMemo(() => {
    return Array.from(new Set(validSlots.map(s => s.date))).sort();
  }, [validSlots]);

  const [selectedDate, setSelectedDate] = useState<string>('');

  // Active selected date derived cleanly without cascading effects
  const activeSelectedDate = useMemo(() => {
    if (selectedDate && availableDates.includes(selectedDate)) {
      return selectedDate;
    }
    return availableDates[0] || '';
  }, [selectedDate, availableDates]);

  // Filter slots for selected date (only non-expired slots)
  const dateSlots = useMemo(() => {
    return validSlots.filter(s => s.date === activeSelectedDate);
  }, [validSlots, activeSelectedDate]);

  // Slots that are non-expired and available for the current selection
  const availableSlotsCount = useMemo(() => {
    return validSlots.filter(s => s.status === 'available').length;
  }, [validSlots]);

  const hasNoSlotsOverall = availableSlotsCount === 0;

  // Available slots on active selected date
  const dateAvailableSlotsCount = useMemo(() => {
    return dateSlots.filter(s => s.status === 'available').length;
  }, [dateSlots]);

  // WhatsApp redirection URL when no slots are available or on demand
  const noSlotsWhatsAppUrl = useMemo(() => {
    return generateNoSlotsAvailableWhatsAppUrl({
      student: {
        fullName,
        birthDate,
        cpf,
        whatsapp,
        email,
        ageProfile,
        heightCm,
        weightKg,
        hasSpecificNeeds,
        specificNeedsDescription: hasSpecificNeeds ? specificNeedsDesc : undefined,
        guardian: ageProfile === 'crianca_adolescente' ? {
          fullName: guardianName,
          cpf: guardianCpf,
          birthDate: guardianBirthDate,
          whatsapp: guardianWhatsapp,
          email: guardianEmail,
          relation: guardianRelation
        } : undefined
      },
      location: selectedLocation
    });
  }, [
    fullName,
    birthDate,
    cpf,
    whatsapp,
    email,
    ageProfile,
    heightCm,
    weightKg,
    hasSpecificNeeds,
    specificNeedsDesc,
    guardianName,
    guardianCpf,
    guardianBirthDate,
    guardianWhatsapp,
    guardianEmail,
    guardianRelation,
    selectedLocation
  ]);

  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [reservationTimer, setReservationTimer] = useState<number>(3600); // 60 min countdown
  const [timerActive, setTimerActive] = useState(false);
  const [slotConflictError, setSlotConflictError] = useState<string | null>(null);

  // Step 3 - Policy and Image Checkboxes
  const [acceptPolicy, setAcceptPolicy] = useState(false);
  const [acknowledgedNotTherapy, setAcknowledgedNotTherapy] = useState(false);
  const [declareAccurateInfo, setDeclareAccurateInfo] = useState(false);
  const [guardianAuthorized, setGuardianAuthorized] = useState(false);
  const [imageAuthorized, setImageAuthorized] = useState<'sim' | 'nao'>('sim');

  // Step 4 - Payment State
  const [pixCopied, setPixCopied] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [uploadedFilePreview, setUploadedFilePreview] = useState<string>('');
  const [imageCopiedToast, setImageCopiedToast] = useState<boolean>(false);
  const [paymentSent, setPaymentSent] = useState(false);

  // Completed Booking Record
  const [activeBooking, setActiveBooking] = useState<BookingRecord | null>(null);

  // Step 3 Direct Voucher Upload Flow
  const [showStep3UploadModal, setShowStep3UploadModal] = useState(false);
  const [isUploadingStep3Voucher, setIsUploadingStep3Voucher] = useState(false);
  const [step3IsDragging, setStep3IsDragging] = useState(false);
  const [step3PixCopied, setStep3PixCopied] = useState(false);
  const step3FileInputRef = useRef<HTMLInputElement>(null);

  // Computed price: prioritize user's location selection / calculator, then active booking, then stored session, then default
  const currentCalculatedPrice = useMemo(() => {
    if (selectedLocation?.price && Number(selectedLocation.price) > 0) {
      return Number(selectedLocation.price);
    }
    if (activeBooking?.price && Number(activeBooking.price) > 0) {
      return Number(activeBooking.price);
    }
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('abc_calculated_price');
      if (saved && !isNaN(Number(saved)) && Number(saved) > 0) {
        return Number(saved);
      }
    }
    return CURRENT_PRODUCT.price;
  }, [selectedLocation, activeBooking]);

  // Countdown timer effect for pre-reservation
  useEffect(() => {
    if (!timerActive) return;
    const interval = setInterval(() => {
      setReservationTimer((prev) => {
        if (prev <= 1) {
          setTimerActive(false);
          setSelectedSlot(null);
          setSlotConflictError('Sua pré-reserva expirou após 60 minutos. Por favor, escolha um novo horário.');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timerActive]);

  // Real-time synchronization of slots from Firestore and local updates
  useEffect(() => {
    let isMounted = true;
    const unsubscribe = subscribeToSlots((firestoreSlots) => {
      if (!isMounted || !firestoreSlots || firestoreSlots.length === 0) return;
      const valid = firestoreSlots.filter((s) => !isSlotExpired(s.date, s.time));
      if (valid.length > 0) {
        setSlots(valid);
        saveStoredSlots(firestoreSlots);
      }
    });

    const handleSlotsEvent = () => {
      if (!isMounted) return;
      setSlots(getStoredSlots().filter((s) => !isSlotExpired(s.date, s.time)));
    };
    window.addEventListener('abc_slots_updated', handleSlotsEvent);

    return () => {
      isMounted = false;
      if (unsubscribe) unsubscribe();
      window.removeEventListener('abc_slots_updated', handleSlotsEvent);
    };
  }, []);

  // Slot Selection handler
  const handleSelectSlot = (slot: TimeSlot) => {
    setSlotConflictError(null);
    if (slot.status === 'occupied' || slot.status === 'blocked') {
      return;
    }

    if (isSlotExpired(slot.date, slot.time)) {
      setSlotConflictError('Este horário já expirou. Por favor, escolha outro horário disponível.');
      return;
    }

    // Check collision simulation
    const currentSlots = getStoredSlots();
    const live = currentSlots.find(s => s.id === slot.id);
    if (live && (live.status === 'occupied' || live.status === 'blocked')) {
      setSlotConflictError('Este horário acabou de ser reservado. Escolha outro horário disponível.');
      setSlots(currentSlots.filter(s => !isSlotExpired(s.date, s.time)));
      return;
    }

    setSelectedSlot(slot);
    if (slot.locationName && selectedLocation) {
      const updatedLoc: BookingSelectedLocation = {
        ...selectedLocation,
        locationName: slot.locationName
      };
      setSelectedLocation(updatedLoc);
      if (typeof window !== 'undefined') {
        try {
          sessionStorage.setItem('abc_selected_location', JSON.stringify(updatedLoc));
        } catch {}
      }
    }
    setReservationTimer(3600); // 60 min
    setTimerActive(true);
  };

  // Handler for Step 1 -> Step 2 (Location selected)
  const handleLocationSelected = (loc: BookingSelectedLocation) => {
    setSelectedLocation(loc);
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem('abc_calculated_price', String(loc.price));
        sessionStorage.setItem('abc_selected_location', JSON.stringify(loc));
      } catch {}
    }
    // If an active booking already exists, sync the new location and calculated price immediately
    if (activeBooking) {
      const updated: BookingRecord = {
        ...activeBooking,
        price: loc.price,
        location: loc
      };
      setActiveBooking(updated);
      const stored = getStoredBookings();
      const updatedStored = stored.map((b) => (b.id === updated.id ? updated : b));
      saveStoredBookings(updatedStored);
      saveBookingToFirestore(updated);
    }
    // If the currently selected slot doesn't match the newly chosen location, clear it
    if (selectedSlot && selectedSlot.locationId && selectedSlot.locationId !== loc.locationId) {
      setSelectedSlot(null);
      setTimerActive(false);
    }
    setCurrentStep(2); // Advance to Step 2: Dados do Aluno
    window.scrollTo({ top: 150, behavior: 'smooth' });
  };

  // Validation before proceeding from Step 2 to Step 3 (Dados -> Horário)
  const handleValidateStep1 = () => {
    if (!fullName.trim() || !birthDate || !whatsapp.trim() || !email.trim()) {
      alert('Por favor, preencha todos os campos obrigatórios do aluno.');
      return;
    }
    if (!heightCm || !weightKg) {
      alert('Por favor, informe altura e peso para calibração da bicicleta adequada.');
      return;
    }
    if (ageProfile === 'crianca_adolescente') {
      if (!guardianName.trim() || !guardianWhatsapp.trim()) {
        alert('Para menores de 18 anos, é obrigatório preencher os dados do responsável legal.');
        return;
      }
    }
    // Refresh slots to ensure strictly upcoming non-expired slots
    const fresh = getStoredSlots().filter(s => !isSlotExpired(s.date, s.time));
    setSlots(fresh);
    setCurrentStep(3); // Advance to Step 3: Horário
    window.scrollTo({ top: 150, behavior: 'smooth' });
  };

  // Helper para preparar o registro de agendamento na Etapa 3 antes do upload
  const prepareStep3Booking = (): BookingRecord => {
    const studentObj: StudentData = {
      fullName: fullName || activeBooking?.student?.fullName || 'Aluno(a)',
      birthDate: birthDate || activeBooking?.student?.birthDate || '2000-01-01',
      cpf: cpf || activeBooking?.student?.cpf || '',
      whatsapp: whatsapp || activeBooking?.student?.whatsapp || '',
      email: email || activeBooking?.student?.email || '',
      ageProfile: ageProfile || activeBooking?.student?.ageProfile || 'adulto',
      heightCm: heightCm || activeBooking?.student?.heightCm || '170',
      weightKg: weightKg || activeBooking?.student?.weightKg || '70',
      hasSpecificNeeds: hasSpecificNeeds ?? activeBooking?.student?.hasSpecificNeeds ?? false,
      specificNeedsDescription: (hasSpecificNeeds ? specificNeedsDesc : undefined) || activeBooking?.student?.specificNeedsDescription,
      guardian: ageProfile === 'crianca_adolescente' ? {
        fullName: guardianName || activeBooking?.student?.guardian?.fullName || '',
        cpf: guardianCpf || activeBooking?.student?.guardian?.cpf || '',
        birthDate: guardianBirthDate || activeBooking?.student?.guardian?.birthDate || '',
        whatsapp: guardianWhatsapp || activeBooking?.student?.guardian?.whatsapp || '',
        email: guardianEmail || activeBooking?.student?.guardian?.email || '',
        relation: guardianRelation || activeBooking?.student?.guardian?.relation || ''
      } : undefined
    };

    const finalPrice = currentCalculatedPrice;
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const isNegotiatedNoSlot = !selectedSlot;
    const fallbackSlot = selectedSlot || {
      id: `slot_whatsapp_${Date.now()}`,
      date: '',
      time: '',
      durationMinutes: 50,
      locationId: selectedLocation?.locationId,
      locationName: selectedLocation?.locationName
    };

    const targetBooking: BookingRecord = {
      id: activeBooking?.id || `booking_${Date.now()}`,
      productId: CURRENT_PRODUCT.id,
      productName: CURRENT_PRODUCT.name,
      price: finalPrice,
      location: selectedLocation || activeBooking?.location || undefined,
      student: studentObj,
      slot: {
        id: fallbackSlot.id,
        date: selectedSlot ? selectedSlot.date : '',
        time: selectedSlot ? selectedSlot.time : '',
        durationMinutes: fallbackSlot.durationMinutes || 50,
        locationId: selectedLocation?.locationId,
        locationName: selectedLocation?.locationName
      },
      isNegotiatedViaWhatsApp: isNegotiatedNoSlot,
      waitingInstructorSchedule: isNegotiatedNoSlot,
      schedulePending: isNegotiatedNoSlot,
      policies: {
        acceptedLessonPolicy: true,
        acknowledgedNotTherapy: true,
        declaredAccurateInfo: true,
        guardianAuthorized: ageProfile === 'crianca_adolescente'
      },
      imageAuthorization: {
        authorized: imageAuthorized === 'sim'
      },
      status: 'reserva-temporaria',
      createdAt: activeBooking?.createdAt || new Date().toISOString(),
      preReservationExpiresAt: expiresAt,
      currentABCDE: activeBooking?.currentABCDE || 'A',
      milestones: activeBooking?.milestones || {
        startWithoutAssistance: false,
        pedalContinuously: false,
        maintainBalanceMoving: false,
        performTurns: false,
        changeDirection: false,
        controlTrajectory: false,
        reduceSpeed: false,
        stopSafely: false,
        resumeMovementIndependently: false
      }
    };

    if (selectedSlot) {
      const updatedSlots = slots.map((s) => {
        if (s.id === selectedSlot.id) {
          return {
            ...s,
            status: 'occupied' as const,
            bookedByStudentName: studentObj.fullName,
            bookingId: targetBooking.id
          };
        }
        return s;
      });
      setSlots(updatedSlots);
      saveStoredSlots(updatedSlots);
      saveSlotsToFirestore(updatedSlots).catch(() => {});
    }

    const stored = getStoredBookings();
    const filtered = stored.filter((b) => b.id !== targetBooking.id);
    saveStoredBookings([targetBooking, ...filtered]);
    saveStoredCurrentBookingId(targetBooking.id);
    const studentPhone = studentObj.guardian?.whatsapp || studentObj.whatsapp;
    if (studentPhone) {
      saveStoredStudentWhatsApp(studentPhone);
    }
    saveBookingToFirestore(targetBooking).catch(() => {});
    setActiveBooking(targetBooking);

    return targetBooking;
  };

  // Ordem 1: Abrir a função de upload da imagem do comprovante
  const handleStep3UploadButtonClick = () => {
    if (!selectedSlot && !hasNoSlotsOverall) {
      alert('Por favor, selecione um horário disponível para o seu primeiro encontro.');
      return;
    }

    if (selectedSlot && isSlotExpired(selectedSlot.date, selectedSlot.time)) {
      setSelectedSlot(null);
      setTimerActive(false);
      setSlotConflictError('O horário selecionado expirou. Por favor, escolha outro horário disponível.');
      return;
    }

    // Prepara e registra o agendamento
    prepareStep3Booking();

    // 1. Abre a interface/modal de upload do comprovante
    setShowStep3UploadModal(true);

    // Aciona imediatamente o seletor nativo de arquivos do sistema operacional
    setTimeout(() => {
      step3FileInputRef.current?.click();
    }, 50);
  };

  // Ordem 2, 3 e 4: Processar upload, atualizar status para amarelo e encaminhar para a Área do Aluno
  const handleStep3VoucherUpload = async (file: File) => {
    const validMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    const nameLower = file.name.toLowerCase();
    const validExts = ['.jpg', '.jpeg', '.png', '.webp'];
    const hasValidExt = validExts.some((ext) => nameLower.endsWith(ext));

    if (!validMimes.includes(file.type) && !hasValidExt) {
      alert('Permitido apenas arquivos de imagem nos formatos JPG, JPEG, PNG ou WEBP.');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      alert('A imagem não pode ultrapassar 15MB. Envie um arquivo menor.');
      return;
    }

    setIsUploadingStep3Voucher(true);

    const bookingTarget = activeBooking || prepareStep3Booking();

    let dataUrl = '';
    try {
      dataUrl = await compressReceiptImage(file);
    } catch {
      dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    }

    // 3. Atualiza o status para amarelo de aguardando a confirmação do instrutor
    // e salva o comprovante para conferência na Área do Aluno e no Portal do Instrutor
    const updated = submitBookingVoucher(bookingTarget.id, {
      voucherUrl: dataUrl,
      voucherFileName: file.name
    });

    const finalRecord: BookingRecord = updated || {
      ...bookingTarget,
      status: 'aguardando-confirmacao-instrutor',
      voucherUrl: dataUrl,
      voucherFileName: file.name,
      voucherSentAt: new Date().toISOString()
    };

    setActiveBooking(finalRecord);
    saveStoredCurrentBookingId(finalRecord.id);
    const studentPhone = finalRecord.student.guardian?.whatsapp || finalRecord.student.whatsapp;
    if (studentPhone) {
      saveStoredStudentWhatsApp(studentPhone);
    }
    saveBookingToFirestore(finalRecord).catch(() => {});

    setTimerActive(false);
    setIsUploadingStep3Voucher(false);
    setShowStep3UploadModal(false);

    // 2. Quando finalizar o upload o aluno é encaminhado DIRETAMENTE para a área de aluno
    onGoToStudentPortal?.(finalRecord.id);
  };

  const handleCopyStep3Pix = () => {
    const pixCode = generatePixCopyPasteCode(currentCalculatedPrice);
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(pixCode);
      setStep3PixCopied(true);
      setTimeout(() => setStep3PixCopied(false), 3000);
    }
  };

  // Validation Step 3 -> 4 (Horário -> Revisão)
  const handleValidateStep2 = () => {
    if (!selectedSlot) {
      if (hasNoSlotsOverall) {
        window.open(noSlotsWhatsAppUrl, '_blank', 'noopener,noreferrer');
        return;
      }
      alert('Por favor, selecione um horário disponível para o seu primeiro encontro ou consulte o instrutor pelo WhatsApp.');
      return;
    }
    if (isSlotExpired(selectedSlot.date, selectedSlot.time)) {
      setSelectedSlot(null);
      setTimerActive(false);
      setSlotConflictError('O horário selecionado expirou. Por favor, escolha outro horário disponível.');
      return;
    }
    setCurrentStep(4); // Advance to Step 4: Revisão
    window.scrollTo({ top: 150, behavior: 'smooth' });
  };

  // Encaminha diretamente para a página/etapa existente de Envio/Anexo do Comprovante (Step 5 - FinalizeBookingView)
  const handleGoToVoucherUpload = () => {
    const finalPrice = currentCalculatedPrice;
    let targetBooking = activeBooking;

    if (targetBooking) {
      targetBooking = {
        ...targetBooking,
        price: finalPrice,
        location: selectedLocation || targetBooking.location,
        student: {
          ...targetBooking.student,
          fullName: fullName || targetBooking.student.fullName,
          whatsapp: whatsapp || targetBooking.student.whatsapp,
          email: email || targetBooking.student.email,
        }
      };
    } else {
      const stored = getStoredBookings();
      const currentId = getStoredCurrentBookingId();
      let found: BookingRecord | null = null;
      if (currentId) {
        found = stored.find(b => b.id === currentId) || null;
      }
      if (!found && whatsapp) {
        const byPhone = findBookingsByWhatsApp(whatsapp, stored);
        if (byPhone.length > 0) {
          found = byPhone[0];
        }
      }

      if (found) {
        targetBooking = {
          ...found,
          price: finalPrice,
          location: selectedLocation || found.location,
          student: {
            ...found.student,
            fullName: fullName || found.student.fullName,
            whatsapp: whatsapp || found.student.whatsapp,
            email: email || found.student.email,
          }
        };
      } else {
        const studentObj: StudentData = {
          fullName: fullName || 'Aluno(a)',
          birthDate: birthDate || '2000-01-01',
          cpf: cpf || '',
          whatsapp: whatsapp || '',
          email: email || '',
          ageProfile: ageProfile || 'adulto',
          heightCm: heightCm || '170',
          weightKg: weightKg || '70',
          hasSpecificNeeds,
          specificNeedsDescription: hasSpecificNeeds ? specificNeedsDesc : undefined,
          guardian: ageProfile === 'crianca_adolescente' && guardianName ? {
            fullName: guardianName,
            cpf: guardianCpf,
            birthDate: guardianBirthDate,
            whatsapp: guardianWhatsapp,
            email: guardianEmail,
            relation: guardianRelation
          } : undefined
        };

        const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
        const isNegotiatedNoSlot = !selectedSlot;
        const fallbackSlot = selectedSlot || {
          id: `slot_whatsapp_${Date.now()}`,
          date: '',
          time: '',
          durationMinutes: 50,
          locationId: selectedLocation?.locationId,
          locationName: selectedLocation?.locationName
        };

        targetBooking = {
          id: `booking_${Date.now()}`,
          productId: CURRENT_PRODUCT.id,
          productName: CURRENT_PRODUCT.name,
          price: finalPrice,
          location: selectedLocation || undefined,
          student: studentObj,
          slot: {
            id: fallbackSlot.id,
            date: selectedSlot ? selectedSlot.date : '',
            time: selectedSlot ? selectedSlot.time : '',
            durationMinutes: 50,
            locationId: selectedLocation?.locationId,
            locationName: selectedLocation?.locationName
          },
          policies: {
            acceptedLessonPolicy: true,
            acknowledgedNotTherapy: true,
            declaredAccurateInfo: true,
            guardianAuthorized: ageProfile === 'crianca_adolescente'
          },
          imageAuthorization: {
            authorized: imageAuthorized === 'sim'
          },
          status: 'reserva-temporaria',
          createdAt: new Date().toISOString(),
          preReservationExpiresAt: expiresAt,
          currentABCDE: 'A',
          isNegotiatedViaWhatsApp: isNegotiatedNoSlot,
          waitingInstructorSchedule: isNegotiatedNoSlot,
          schedulePending: isNegotiatedNoSlot,
          milestones: {
            startWithoutAssistance: false,
            pedalContinuously: false,
            maintainBalanceMoving: false,
            performTurns: false,
            changeDirection: false,
            controlTrajectory: false,
            reduceSpeed: false,
            stopSafely: false,
            resumeMovementIndependently: false
          }
        };
      }
    }

    const stored = getStoredBookings();
    const filtered = stored.filter(b => b.id !== targetBooking!.id);
    saveStoredBookings([targetBooking, ...filtered]);
    saveStoredCurrentBookingId(targetBooking.id);
    saveBookingToFirestore(targetBooking);

    setActiveBooking(targetBooking);
    setCurrentStep(5);
    setTimeout(() => {
      const uploadArea = document.getElementById('area-upload-comprovante-pagamento') || document.getElementById('step-05-pagamento');
      if (uploadArea) {
        uploadArea.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        window.scrollTo({ top: 150, behavior: 'smooth' });
      }
    }, 150);
  };

  // Validation Step 4 -> 5 (Revisão e Aceites -> Pagamento)
  const handleValidateStep3 = () => {
    if (!acceptPolicy) {
      alert('É necessário ler e aceitar a Política da Aula para prosseguir.');
      return;
    }
    if (!acknowledgedNotTherapy) {
      alert('Por favor, confirme a ciência sobre a natureza esportivo-pedagógica do programa.');
      return;
    }
    if (!declareAccurateInfo) {
      alert('Por favor, confirme a veracidade das informações prestadas.');
      return;
    }
    if (ageProfile === 'crianca_adolescente' && !guardianAuthorized) {
      alert('O responsável legal deve marcar a autorização do atendimento para menores.');
      return;
    }

    // Create provisional booking record
    const studentObj: StudentData = {
      fullName,
      birthDate,
      cpf,
      whatsapp,
      email,
      ageProfile,
      heightCm,
      weightKg,
      hasSpecificNeeds,
      specificNeedsDescription: hasSpecificNeeds ? specificNeedsDesc : undefined,
      guardian: ageProfile === 'crianca_adolescente' ? {
        fullName: guardianName,
        cpf: guardianCpf,
        birthDate: guardianBirthDate,
        whatsapp: guardianWhatsapp,
        email: guardianEmail,
        relation: guardianRelation
      } : undefined
    };

    const finalPrice = currentCalculatedPrice;

    // 60-minute temporary reservation
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const activeProduct = getProductForLocation(selectedLocation || activeBooking?.location);

    const newBooking: BookingRecord = {
      id: activeBooking?.id || `booking_${Date.now()}`,
      productId: activeProduct.id,
      productName: activeProduct.name,
      price: finalPrice,
      location: selectedLocation || activeBooking?.location || undefined,
      student: studentObj,
      slot: {
        id: selectedSlot!.id,
        date: selectedSlot!.date,
        time: selectedSlot!.time,
        durationMinutes: 50,
        locationId: selectedSlot?.locationId || selectedLocation?.locationId,
        locationName: selectedSlot?.locationName || selectedLocation?.locationName
      },
      assignedLocationName: selectedSlot?.locationName || selectedLocation?.locationName,
      policies: {
        acceptedLessonPolicy: acceptPolicy,
        acknowledgedNotTherapy,
        declaredAccurateInfo: declareAccurateInfo,
        guardianAuthorized: ageProfile === 'crianca_adolescente' ? guardianAuthorized : undefined
      },
      imageAuthorization: {
        authorized: imageAuthorized === 'sim'
      },
      status: 'reserva-temporaria',
      createdAt: new Date().toISOString(),
      preReservationExpiresAt: expiresAt,
      currentABCDE: 'A',
      milestones: {
        startWithoutAssistance: false,
        pedalContinuously: false,
        maintainBalanceMoving: false,
        performTurns: false,
        changeDirection: false,
        controlTrajectory: false,
        reduceSpeed: false,
        stopSafely: false,
        resumeMovementIndependently: false
      }
    };

    setActiveBooking(newBooking);

    // Save provisional booking and lock slot temporarily
    const allBookings = getStoredBookings();
    saveStoredBookings([newBooking, ...allBookings]);
    saveStoredCurrentBookingId(newBooking.id);
    saveBookingToFirestore(newBooking).catch(() => {});

    // Update slot as booked
    const updatedSlots = slots.map(s => {
      if (s.id === selectedSlot!.id) {
        return { ...s, status: 'occupied' as const, bookedByStudentName: fullName, bookingId: newBooking.id };
      }
      return s;
    });
    setSlots(updatedSlots);
    saveStoredSlots(updatedSlots);
    saveSlotsToFirestore(updatedSlots).catch(() => {});

    // REGRA ESPECIAL EXCLUSIVA PARA OUTRAS LOCALIDADES DO ABC:
    // (Diadema, Mauá, São Caetano do Sul, Ribeirão Pires)
    // Abre o WhatsApp oficial com a mensagem pré-formatada contendo os dados do aluno e agendamento
    if (isSpecialAbcPaymentCity(selectedLocation)) {
      const waUrl = generateSpecialAbcPaymentWhatsAppUrl(newBooking);
      if (typeof window !== 'undefined') {
        window.open(waUrl, '_blank', 'noopener,noreferrer');
      }
    }

    setCurrentStep(5); // Advance to Step 5: Pagamento
    window.scrollTo({ top: 150, behavior: 'smooth' });
  };

  // Step 4 - PIX Copy
  const pixKeyCopyCode = '00020126580014BR.GOV.BCB.PIX0136abc-do-pedal-pix-oficial-499@bcb.gov.br5204000053039865405499.005802BR5922ANDERSON ROSA DOS REIS6009SAO PAULO62070503***6304D12F';

  const handleCopyPix = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(pixKeyCopyCode);
      setPixCopied(true);
      setTimeout(() => setPixCopied(false), 3000);
    }
  };

  // Step 4 - Voucher upload and preview
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploadedFile(file);
      setUploadedFileName(file.name);

      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (evt) => {
          if (evt.target?.result) {
            setUploadedFilePreview(evt.target.result as string);
          }
        };
        reader.readAsDataURL(file);
      } else {
        setUploadedFilePreview('');
      }
    }
  };

  // Helper to copy image to clipboard
  const copyImageFileToClipboard = async (file: File) => {
    try {
      if (typeof window !== 'undefined' && navigator.clipboard && typeof ClipboardItem !== 'undefined') {
        if (file.type.startsWith('image/')) {
          let blobToCopy: Blob = file;
          if (file.type === 'image/jpeg' || file.type === 'image/jpg') {
            const img = document.createElement('img');
            img.src = URL.createObjectURL(file);
            await new Promise((resolve) => { img.onload = resolve; });
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth || img.width;
            canvas.height = img.naturalHeight || img.height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0);
              const pngBlob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/png'));
              if (pngBlob) blobToCopy = pngBlob;
            }
          }
          const item = new ClipboardItem({ [blobToCopy.type]: blobToCopy });
          await navigator.clipboard.write([item]);
          setImageCopiedToast(true);
          setTimeout(() => setImageCopiedToast(false), 9000);
          return true;
        }
      }
    } catch (err) {
      console.warn('Clipboard image copy fallback:', err);
    }
    return false;
  };

  const handleShareVoucherAndContract = async (booking: BookingRecord) => {
    const contractText = generateContractDetailsText(booking);

    if (uploadedFile && typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [uploadedFile] })) {
      try {
        await navigator.share({
          title: 'Contratação & Comprovante PIX — ABC do Pedal',
          text: contractText,
          files: [uploadedFile]
        });
        return;
      } catch {
        // Fallback below
      }
    }

    if (uploadedFile) {
      await copyImageFileToClipboard(uploadedFile);
    }

    const waUrl = generateCustomerToAbcWhatsAppUrl(booking);
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  const handleSubmitPayment = async () => {
    if (!uploadedFileName) {
      alert('Por favor, selecione ou anexe o comprovante do PIX para concluir o envio.');
      return;
    }

    let bookingToNotify = activeBooking;

    if (activeBooking) {
      const updated: BookingRecord = {
        ...activeBooking,
        status: 'aguardando-confirmacao-instrutor',
        voucherFileName: uploadedFileName,
        voucherUrl: uploadedFilePreview || activeBooking.voucherUrl,
        voucherSentAt: new Date().toISOString()
      };
      setActiveBooking(updated);
      bookingToNotify = updated;

      const all = getStoredBookings();
      const nextList = all.map(b => b.id === updated.id ? updated : b);
      saveStoredBookings(nextList);
      saveBookingToFirestore(updated);

      const studentPhone = updated.student.guardian?.whatsapp || updated.student.whatsapp;
      if (studentPhone) {
        saveStoredStudentWhatsApp(studentPhone);
      }
    }

    setPaymentSent(true);
    if (bookingToNotify && onGoToStudentPortal) {
      onGoToStudentPortal(bookingToNotify.id);
    }

    // Disparo automático do comprovante + dados da contratação para o WhatsApp oficial
    if (bookingToNotify && typeof window !== 'undefined') {
      await handleShareVoucherAndContract(bookingToNotify);
    }
  };

  const minutesRemaining = Math.floor(reservationTimer / 60);
  const secondsRemaining = reservationTimer % 60;

  // Link oficial de pagamento PagSeguro para a Etapa 03:
  // - Santo André e São Bernardo do Campo: https://pag.ae/82bm3JV69
  // - São Paulo / Ibirapuera: https://pag.ae/828yL-9S6 (REGRA OBRIGATÓRIA: INALTERADO)
  const step3PaymentUrl = useMemo(() => {
    if (selectedLocation?.locationId === 'ibirapuera') {
      return PAGBANK_PAYMENT_URL_SAO_PAULO;
    }
    return PAGBANK_PAYMENT_URL_DESAFIO_ABC; // 'https://pag.ae/82bm3JV69'
  }, [selectedLocation]);

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-6 text-slate-100" id="booking-container">
      
      {/* 1. TOP DYNAMIC PHOTOGRAPHY PROGRESS BAR */}
      <div className="relative rounded-2xl overflow-hidden mb-8 border border-slate-800 bg-slate-950 shadow-2xl">
        {/* Dynamic Horizontal Photo of Cyclist */}
        <div className="relative h-44 sm:h-52 md:h-60 w-full overflow-hidden">
          <Image
            src="/ciclovia_progresso.jpg"
            alt="Pessoa pedalando com liberdade em ciclovia moderna"
            fill
            priority
            className="object-cover object-center transform transition-transform duration-700 hover:scale-105"
            sizes="(max-width: 1200px) 100vw, 1200px"
          />
          {/* Subtle Dark Editorial Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#060608] via-[#060608]/70 to-black/30" />
          
          {/* Top Progress Info Badge */}
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 text-white">
              <span className="w-2 h-2 rounded-full bg-pink-500 animate-pulse" />
              <span className="font-semibold uppercase tracking-wider">Agendamento Oficial</span>
            </div>

            {timerActive && (
              <div className="flex items-center gap-1.5 bg-pink-950/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-pink-500/40 text-pink-300 font-bold">
                <Clock className="w-3.5 h-3.5" />
                <span>Vaga reservada: {minutesRemaining}:{secondsRemaining < 10 ? `0${secondsRemaining}` : secondsRemaining}</span>
              </div>
            )}
          </div>

          {/* Heading overlay */}
          <div className="absolute bottom-4 left-4 sm:left-8 right-4">
            <span className="text-[11px] font-mono text-pink-400 font-bold uppercase tracking-wider block mb-1">
              Programa Aprender a Pedalar
            </span>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-white tracking-tight leading-tight">
              Sua jornada para conquistar autonomia começa aqui
            </h1>
          </div>
        </div>

        {/* 6-Step Visual Progress Bar */}
        <div className="bg-[#0b0c10] border-t border-slate-800/80 px-4 sm:px-8 py-3.5">
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-4 items-center">
            {[
              { num: 1, label: '01 Local' },
              { num: 2, label: '02 Aluno' },
              { num: 3, label: '03 Horário' },
              { num: 4, label: '04 Revisão' },
              { num: 5, label: '05 Pagamento' },
              { num: 6, label: '06 Conclusão' }
            ].map((step) => {
              const isCurrent = currentStep === step.num;
              const isDone = currentStep > step.num;
              return (
                <div key={step.num} className="flex flex-col items-center sm:items-start text-center sm:text-left">
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mb-2">
                    <div
                      className={`h-full transition-all duration-500 ${
                        isDone ? 'bg-pink-500 w-full' : isCurrent ? 'bg-pink-400 w-2/3' : 'w-0'
                      }`}
                    />
                  </div>
                  <span className={`text-[10px] sm:text-xs font-mono font-bold tracking-tight ${
                    isCurrent ? 'text-pink-400 font-black' : isDone ? 'text-white' : 'text-slate-400'
                  }`}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2. PRODUCT HEADER CARD */}
      <div className="hidden bg-slate-900/60 border border-slate-800 rounded-2xl p-6 mb-8 relative">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="bg-pink-500/10 border border-pink-500/30 text-pink-400 text-xs font-mono font-bold uppercase px-2.5 py-0.5 rounded-full">
                {CURRENT_PRODUCT.badge}
              </span>
              <span className="text-xs text-slate-400 font-mono">Duração: 50 minutos por encontro</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {CURRENT_PRODUCT.name}
            </h2>

            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              {CURRENT_PRODUCT.description}
            </p>
          </div>

          {/* Pricing Box - Dynamic according to selected location */}
          <div className="bg-slate-950 border border-pink-500/30 p-5 rounded-xl md:min-w-[260px] text-center md:text-right shrink-0 shadow-lg shadow-pink-950/20">
            <span className="block text-[11px] font-mono text-slate-400 uppercase tracking-wider">
              Investimento no Programa
            </span>
            <div className="flex items-baseline justify-center md:justify-end gap-1 my-1">
              <span className="text-xs text-pink-400 font-bold">R$</span>
              <span className="text-3xl sm:text-4xl font-black text-white font-mono tracking-tight">
                {currentCalculatedPrice.toFixed(2).replace('.', ',')}
              </span>
            </div>
            <span className="block text-[11px] text-pink-400 font-medium italic">
              {selectedLocation?.priceNote || CURRENT_PRODUCT.valueTag}
            </span>
          </div>

        </div>

        {/* 3. LOCATION SELECTION SUMMARY PILL */}
        <div className="mt-6 pt-5 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400 shrink-0 mt-0.5">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-white uppercase">Região da Aula:</span>
                <span className="text-xs font-bold text-pink-400">
                  {selectedLocation ? selectedLocation.locationName : 'Escolha o local da sua aula na etapa abaixo'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {selectedLocation
                  ? (selectedLocation.address || `${selectedLocation.city}, SP`)
                  : 'São Paulo (Ibirapuera ou seu endereço), ABC Paulista (Santo André, SBC) ou Outras localidades'}
              </p>
              {selectedLocation?.isFixed && (
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-300 mt-1.5 font-sans">
                  <span className="flex items-center gap-1">🚗 Carro: {CURRENT_PRODUCT.location.access.car}</span>
                  <span className="flex items-center gap-1">🚕 Uber: {CURRENT_PRODUCT.location.access.uber}</span>
                  <span className="flex items-center gap-1">🚶 A pé: {CURRENT_PRODUCT.location.access.walking}</span>
                </div>
              )}
            </div>
          </div>

          {currentStep > 1 && (
            <button
              type="button"
              onClick={() => {
                setCurrentStep(1);
                window.scrollTo({ top: 150, behavior: 'smooth' });
              }}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-pink-400 hover:text-pink-300 text-xs font-mono font-bold transition-colors shrink-0 border border-pink-500/30"
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>Trocar Local</span>
            </button>
          )}
        </div>
      </div>

      {/* ========================================================= */}
      {/* STEP 01: ESCOLHA DO LOCAL POR CARDS VISUAIS */}
      {/* ========================================================= */}
      {currentStep === 1 && (
        <div className="animate-in fade-in" id="step-01-local">
          <LocationSelectionCards
            initialSelection={selectedLocation}
            onLocationSelected={handleLocationSelected}
          />
        </div>
      )}

      {/* ========================================================= */}
      {/* STEP 02: DADOS DO ALUNO */}
      {/* ========================================================= */}
      {currentStep === 2 && (
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 sm:p-8 animate-in fade-in" id="step-02-dados">
          <div className="mb-6">
            <span className="text-xs font-mono text-pink-400 font-bold uppercase tracking-wider">Etapa 02</span>
            <h3 className="text-2xl font-black text-white mt-1">Quem vai aprender a pedalar?</h3>
            <p className="text-sm text-slate-400 font-light mt-1">
              Informe os dados completos de quem vivenciará a aprendizagem para prepararmos o atendimento individualizado.
            </p>
          </div>

          {/* Age Profile Selector */}
          <div className="mb-8">
            <label className="block text-xs font-mono text-slate-300 uppercase tracking-wider mb-2 font-semibold">
              Perfil de idade *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { id: 'crianca_adolescente', label: 'Criança / Adolescente', sub: 'Até 17 anos (com responsável)' },
                { id: 'adulto', label: 'Adulto', sub: '18 a 59 anos' },
                { id: 'idoso', label: 'Idoso', sub: '60 anos ou mais' }
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setAgeProfile(opt.id as AgeProfile)}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    ageProfile === opt.id
                      ? 'bg-pink-950/40 border-pink-500 text-white shadow-lg shadow-pink-950/30'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <span className={`block font-bold text-sm ${ageProfile === opt.id ? 'text-pink-400' : 'text-slate-200'}`}>
                    {opt.label}
                  </span>
                  <span className="block text-xs text-slate-400 mt-0.5">{opt.sub}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Student Form Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-8">
            <div className="sm:col-span-2">
              <label className="block text-xs font-mono text-slate-300 uppercase tracking-wider mb-1.5">
                Nome completo do aluno *
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Ex: Juliana Santos Silva"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-pink-500"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-300 uppercase tracking-wider mb-1.5">
                Data de nascimento *
              </label>
              <input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-pink-500"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-300 uppercase tracking-wider mb-1.5">
                WhatsApp *
              </label>
              <input
                type="tel"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="(11) 98765-4321"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-pink-500"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-300 uppercase tracking-wider mb-1.5">
                E-mail *
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seuemail@exemplo.com"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-pink-500"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-300 uppercase tracking-wider mb-1.5">
                Altura em centímetros *
              </label>
              <input
                type="number"
                value={heightCm}
                onChange={(e) => setHeightCm(e.target.value)}
                placeholder="Ex: 168 (em cm)"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-pink-500"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">Para regulagem milimétrica do aro e selim da bicicleta</span>
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-300 uppercase tracking-wider mb-1.5">
                Peso em quilogramas *
              </label>
              <input
                type="number"
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
                placeholder="Ex: 65 (em kg)"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-pink-500"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">Para calibração da pressão dos pneus e equilíbrio postural</span>
            </div>
          </div>

          {/* 5. NECESSIDADES ESPECÍFICAS */}
          <div className="p-5 rounded-xl bg-slate-950/80 border border-slate-800 mb-8">
            <h4 className="text-sm font-bold text-white mb-2">
              Há alguma condição, necessidade específica ou característica que o instrutor deva conhecer para preparar adequadamente o atendimento?
            </h4>
            
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              Essas informações ajudam o instrutor a preparar o atendimento e, quando necessário, indicar o formato mais adequado para o aluno.
            </p>

            <div className="flex items-center gap-4 mb-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="specificNeeds"
                  checked={!hasSpecificNeeds}
                  onChange={() => setHasSpecificNeeds(false)}
                  className="accent-pink-500 w-4 h-4"
                />
                <span className="text-sm text-slate-200">Não</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="specificNeeds"
                  checked={hasSpecificNeeds}
                  onChange={() => setHasSpecificNeeds(true)}
                  className="accent-pink-500 w-4 h-4"
                />
                <span className="text-sm text-slate-200">Sim</span>
              </label>
            </div>

            {hasSpecificNeeds && (
              <div className="mt-3 pt-3 border-t border-slate-800">
                <label className="block text-xs font-mono text-pink-400 font-semibold mb-1">
                  Conte brevemente o que devemos saber:
                </label>
                <textarea
                  value={specificNeedsDesc}
                  onChange={(e) => setSpecificNeedsDesc(e.target.value)}
                  placeholder="Ex: Receio acentuado de quedas, vertigem leve em solo irregular, cirurgia recente no joelho..."
                  rows={3}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-pink-500"
                />
              </div>
            )}
          </div>

          {/* 6. RESPONSÁVEL LEGAL (Condicional: apenas Criança/Adolescente) */}
          {ageProfile === 'crianca_adolescente' && (
            <div className="p-5 rounded-xl bg-pink-950/20 border border-pink-500/30 mb-8 animate-in fade-in">
              <div className="flex items-center gap-2 mb-3">
                <Shield className="w-4 h-4 text-pink-400" />
                <h4 className="text-sm font-bold text-white uppercase tracking-wide">Dados do responsável legal</h4>
              </div>

              <p className="text-xs text-pink-300 font-medium mb-4 bg-pink-950/60 p-3 rounded-lg border border-pink-500/30">
                Para alunos menores de 18 anos, a contratação e autorização do atendimento devem ser realizadas pelo responsável legal.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-mono text-slate-300 mb-1">Nome completo do responsável *</label>
                  <input
                    type="text"
                    value={guardianName}
                    onChange={(e) => setGuardianName(e.target.value)}
                    placeholder="Ex: Carlos Santos Silva"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-pink-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-1">WhatsApp do responsável *</label>
                  <input
                    type="tel"
                    value={guardianWhatsapp}
                    onChange={(e) => setGuardianWhatsapp(e.target.value)}
                    placeholder="(11) 98765-4321"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-pink-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-1">Data de nascimento do responsável</label>
                  <input
                    type="date"
                    value={guardianBirthDate}
                    onChange={(e) => setGuardianBirthDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-pink-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-1">Relação com o aluno *</label>
                  <select
                    value={guardianRelation}
                    onChange={(e) => setGuardianRelation(e.target.value as GuardianRelation)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-pink-500"
                  >
                    <option value="mae">Mãe</option>
                    <option value="pai">Pai</option>
                    <option value="responsavel_legal">Responsável legal</option>
                    <option value="tutor">Tutor</option>
                    <option value="outro">Outro</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Step 2 Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => {
                setCurrentStep(1);
                window.scrollTo({ top: 150, behavior: 'smooth' });
              }}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 text-xs font-mono font-bold transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar ao local</span>
            </button>

            <button
              type="button"
              onClick={handleValidateStep1}
              className="flex items-center gap-2 bg-pink-600 hover:bg-pink-500 text-white font-bold text-sm px-6 py-3.5 rounded-xl transition-all shadow-lg shadow-pink-600/30"
              id="btn-step-1-next"
            >
              <span>Continuar para Escolha do Horário</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* STEP 03: ESCOLHA DO PRIMEIRO ENCONTRO */}
      {/* ========================================================= */}
      {currentStep === 3 && (
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 sm:p-8 animate-in fade-in" id="step-03-horario">
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-pink-400 font-bold uppercase tracking-wider">Etapa 03</span>
                {selectedLocation && (
                  <span className="text-[11px] font-mono bg-pink-500/10 text-pink-300 border border-pink-500/20 px-2 py-0.5 rounded-full font-bold">
                    Local: {selectedLocation.locationName}
                  </span>
                )}
              </div>
              <h3 className="text-2xl font-black text-white mt-1">Escolha o primeiro encontro</h3>
              <p className="text-sm text-slate-400 font-light mt-1">
                {hasNoSlotsOverall
                  ? `Verificação de disponibilidade para ${selectedLocation?.locationName || 'sua região'}.`
                  : `Horários disponibilizados especificamente para ${selectedLocation?.locationName || 'sua região'}. Selecione a data e o horário desejados.`}
              </p>
            </div>

            <div className="bg-slate-950 px-4 py-2 rounded-xl border border-slate-800 text-xs font-mono flex items-center gap-2 text-slate-300 self-start">
              <Clock className="w-3.5 h-3.5 text-pink-400" />
              <span>Duração: <strong>50 minutos</strong></span>
            </div>
          </div>

          {/* Conflict Error Notice */}
          {slotConflictError && (
            <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-500 text-rose-200 text-sm flex items-center gap-3 mb-6">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
              <span>{slotConflictError}</span>
            </div>
          )}

          {/* QUANDO NÃO HOUVER HORÁRIOS DISPONÍVEIS NA AGENDA GERAL */}
          {hasNoSlotsOverall ? (
            <div id="card-sem-horarios-whatsapp" className="my-6 p-6 sm:p-8 rounded-2xl bg-gradient-to-b from-amber-950/20 via-slate-950 to-slate-950 border border-amber-500/40 text-center shadow-xl">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto mb-4 text-amber-400 shadow-lg shadow-amber-500/10">
                <Clock className="w-8 h-8" />
              </div>
              <span className="text-xs font-mono text-amber-400 font-bold uppercase tracking-wider block mb-1">
                Agenda Completa / Atendimento Sob Consulta
              </span>
              <h4 className="text-xl sm:text-2xl font-black text-white mb-2">
                Não há horários disponíveis no momento para este endereço
              </h4>
              <p className="text-sm text-slate-300 max-w-xl mx-auto mb-6 leading-relaxed">
                Não encontramos vagas abertas na grade automática para <strong>{selectedLocation?.locationName || 'o endereço informado'}</strong>.
                Para que você possa iniciar suas aulas sem ter que aguardar a abertura de novas turmas, encaminhamos sua solicitação diretamente para o <strong>WhatsApp do instrutor</strong> com todos os seus dados coletados:
              </p>

              {/* Box com o resumo dos dados coletados e mensagem exata que será enviada */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 max-w-lg mx-auto mb-6 text-left text-xs space-y-2">
                <div className="text-[11px] font-bold text-pink-400 uppercase tracking-wider flex items-center gap-1.5">
                  <FileCheck className="w-3.5 h-3.5" />
                  <span>Dados Coletados Prontos para Envio</span>
                </div>
                <div className="space-y-1 font-mono text-slate-300">
                  <p><span className="text-slate-400">Aluno:</span> <strong className="text-white">{fullName || 'Não informado'}</strong></p>
                  <p><span className="text-slate-400">WhatsApp:</span> <strong className="text-white">{whatsapp || 'Não informado'}</strong></p>
                  <p><span className="text-slate-400">E-mail:</span> <strong className="text-white">{email || 'Não informado'}</strong></p>
                  <p><span className="text-slate-400">Endereço:</span> <strong className="text-white">{selectedLocation?.address || selectedLocation?.locationName || 'Endereço informado'}</strong></p>
                </div>
                <div className="pt-2 border-t border-slate-800 text-xs text-emerald-300/90 font-medium italic">
                  &ldquo;Vim do site, gostaria de saber a disponibilidade de aulas para o endereço acima:&rdquo;
                </div>
              </div>

              {/* Botão de Encaminhamento Direto para o WhatsApp do Instrutor */}
              <a
                id="btn-whatsapp-no-slots"
                href={noSlotsWhatsAppUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-3 px-8 py-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm sm:text-base shadow-xl shadow-emerald-600/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <MessageCircle className="w-5 h-5 fill-white" />
                <span>Encaminhar para o WhatsApp do Instrutor</span>
                <ExternalLink className="w-4 h-4 opacity-80" />
              </a>

              <p className="text-xs text-slate-400 mt-4 font-mono">
                WhatsApp Oficial do Instrutor: {OFFICIAL_WHATSAPP_DISPLAY}
              </p>
            </div>
          ) : (
            <>
              {/* Date Picker Horizontal Carousel */}
              <div className="mb-6">
                <label className="block text-xs font-mono text-slate-400 uppercase tracking-wider mb-2 font-semibold">
                  Selecione a data:
                </label>
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
                  {availableDates.length === 0 ? (
                    <div className="py-4 px-3 text-xs text-slate-400 font-mono">
                      Nenhuma data futura com horários disponíveis no momento.
                    </div>
                  ) : (
                    availableDates.map((date) => {
                      const isSelected = activeSelectedDate === date;
                      const weekday = getWeekdayName(date).split('-')[0];
                      const parts = date.split('-');
                      const dayMonth = `${parts[2]}/${parts[1]}`;
                      const slotsCount = validSlots.filter(s => s.date === date && s.status === 'available').length;

                      return (
                        <button
                          key={date}
                          type="button"
                          onClick={() => setSelectedDate(date)}
                          className={`shrink-0 min-w-[100px] p-3 rounded-xl border text-center transition-all ${
                            isSelected
                              ? 'bg-pink-600 border-pink-400 text-white shadow-lg shadow-pink-600/30'
                              : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:border-slate-700'
                          }`}
                        >
                          <span className="block text-[10px] uppercase font-mono tracking-wider font-semibold opacity-80">
                            {weekday}
                          </span>
                          <span className="block text-base font-black my-0.5">{dayMonth}</span>
                          <span className={`block text-[10px] font-mono ${isSelected ? 'text-pink-100' : 'text-slate-500'}`}>
                            {slotsCount} vaga{slotsCount !== 1 ? 's' : ''}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Slots Visual Legend */}
              <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-slate-400 mb-4 bg-slate-950/50 p-3 rounded-xl border border-slate-900">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-md bg-slate-950 border border-pink-500/50" />
                  Disponível
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-md bg-pink-600 border border-pink-400" />
                  Selecionado
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-md bg-slate-900 border border-slate-800 opacity-60" />
                  Ocupado
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-md bg-slate-900 border border-rose-900/50 opacity-40" />
                  Bloqueado
                </span>
              </div>

              {/* Slots Grid for Selected Date */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                {dateSlots.length === 0 || dateAvailableSlotsCount === 0 ? (
                  <div className="col-span-full py-8 px-6 text-center bg-slate-950/60 border border-slate-900 rounded-2xl">
                    <Clock className="w-7 h-7 text-amber-400 mx-auto mb-2" />
                    <p className="text-sm font-bold text-white">Não há horários disponíveis para esta data.</p>
                    <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                      Selecione outra data acima ou envie os dados coletados diretamente para o WhatsApp do instrutor para verificar encaixes exclusivos.
                    </p>
                    <div className="mt-4">
                      <a
                        id="btn-whatsapp-no-date-slots"
                        href={noSlotsWhatsAppUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/25 transition-all"
                      >
                        <MessageCircle className="w-4 h-4 fill-white" />
                        <span>Consultar disponibilidade no WhatsApp</span>
                        <ExternalLink className="w-3.5 h-3.5 opacity-75" />
                      </a>
                    </div>
                  </div>
                ) : (
                  dateSlots.map((slot) => {
                    const isSelected = selectedSlot?.id === slot.id;
                    const isAvailable = slot.status === 'available';
                    const isOccupied = slot.status === 'occupied';
                    const isBlocked = slot.status === 'blocked';
                    const isRestrictedForAdult = Boolean(slot.isKidsOnly && ageProfile !== 'crianca_adolescente');
                    const canSelect = isAvailable && !isRestrictedForAdult;

                    return (
                      <button
                        key={slot.id}
                        type="button"
                        disabled={!canSelect && !isSelected}
                        onClick={() => handleSelectSlot(slot)}
                        className={`p-3.5 rounded-xl border transition-all text-left relative flex flex-col justify-between min-h-[92px] ${
                          isSelected
                            ? 'bg-pink-600 border-pink-400 text-white shadow-xl shadow-pink-600/30'
                            : isRestrictedForAdult
                            ? 'bg-slate-950/60 border-amber-900/40 text-slate-500 cursor-not-allowed opacity-60'
                            : isAvailable
                            ? 'bg-slate-950 border-slate-800 hover:border-pink-500/60 text-slate-200 cursor-pointer'
                            : isOccupied
                            ? 'bg-slate-900/40 border-slate-800/60 text-slate-600 cursor-not-allowed'
                            : 'bg-slate-950/30 border-slate-900 text-slate-700 cursor-not-allowed'
                        }`}
                        title={isRestrictedForAdult ? 'Local exclusivo para crianças e adolescentes (Parque Celso Daniel)' : undefined}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="font-mono text-base font-bold">{slot.time}</span>
                          {isSelected && <CheckCircle className="w-4 h-4 text-white" />}
                          {isBlocked && <Lock className="w-3.5 h-3.5 text-slate-600" />}
                        </div>

                        {slot.locationName && (
                          <span className={`text-[10px] font-mono truncate max-w-full block ${
                            isSelected ? 'text-pink-100' : 'text-slate-400'
                          }`}>
                            {slot.locationName}
                          </span>
                        )}

                        <span className={`text-[10px] font-mono uppercase tracking-wider ${
                          isSelected
                            ? 'text-pink-100 font-bold'
                            : isRestrictedForAdult
                            ? 'text-amber-500 font-bold'
                            : isAvailable
                            ? 'text-pink-400 font-bold'
                            : 'text-slate-600'
                        }`}>
                          {isSelected
                            ? 'Selecionado'
                            : isRestrictedForAdult
                            ? 'Exclusivo Crianças'
                            : isAvailable
                            ? 'Disponível'
                            : isOccupied
                            ? 'Ocupado'
                            : 'Bloqueado'}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>

              {/* Caixa de ajuda rápida para consultar outros horários no WhatsApp */}
              <div className="mb-8 p-4 rounded-xl bg-slate-950/40 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-start sm:items-center gap-2.5 text-slate-400">
                  <MessageCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5 sm:mt-0" />
                  <span>Não encontrou um horário ideal para sua rotina para este endereço?</span>
                </div>
                <a
                  id="btn-whatsapp-consultar-outro-horario"
                  href={noSlotsWhatsAppUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 font-mono text-emerald-400 hover:text-emerald-300 font-bold hover:underline shrink-0"
                >
                  <span>Falar com o Instrutor</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </>
          )}

          {/* Pre-Reservation Active Callout */}
          {selectedSlot && (
            <div className="p-4 rounded-xl bg-pink-950/30 border border-pink-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-8">
              <div>
                <span className="text-[11px] font-mono text-pink-400 font-bold uppercase block">
                  Status: Pré-agendado — aguardando pagamento
                </span>
                <p className="text-sm font-bold text-white mt-0.5">
                  Primeiro encontro: {formatDateBrazilian(selectedSlot.date)} às {selectedSlot.time} ({getWeekdayName(selectedSlot.date)})
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Horário reservado temporariamente por 60 minutos para você revisar e concluir.
                </p>
              </div>

              <div className="text-right shrink-0">
                <span className="text-xs font-mono text-pink-300 font-bold block">Expira em:</span>
                <span className="text-lg font-mono font-black text-pink-400">
                  {minutesRemaining}:{secondsRemaining < 10 ? `0${secondsRemaining}` : secondsRemaining}
                </span>
              </div>
            </div>
          )}

          {/* Informação e Fluxo de Pagamento da Etapa 03 */}
          {selectedSlot && (
            <div className="mb-4 p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono">
              <span className="text-slate-300">
                1. Efetue o pagamento no PagSeguro → 2. Anexe o recibo em Enviar Comprovante
              </span>
              <a
                id="btn-link-pagamento-step-03"
                href={step3PaymentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-pink-400 hover:text-pink-300 underline inline-flex items-center gap-1 shrink-0"
              >
                <span>{step3PaymentUrl}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 text-xs font-mono font-bold transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar aos dados</span>
            </button>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {/* Botão de Pagamento em CAIXA ALTA */}
              <a
                id="btn-pagamento-step-03"
                href={step3PaymentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-pink-600 via-rose-500 to-pink-500 hover:from-pink-500 hover:to-rose-400 text-white font-black text-sm uppercase tracking-wider px-6 py-3.5 rounded-xl transition-all shadow-lg shadow-pink-600/30 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                title="Acessar ambiente seguro de pagamento do PagSeguro"
              >
                <CreditCard className="w-4 h-4" />
                <span>PAGAMENTO</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-80" />
              </a>

              {/* Input nativo oculto acionado pelo botão Enviar Comprovante */}
              <input
                ref={step3FileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/jpg"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleStep3VoucherUpload(e.target.files[0]);
                  }
                  e.target.value = '';
                }}
              />

              <button
                type="button"
                onClick={handleStep3UploadButtonClick}
                disabled={isUploadingStep3Voucher}
                className="flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-slate-600 text-white font-bold text-sm px-6 py-3.5 rounded-xl transition-all hover:scale-[1.02] cursor-pointer"
                id="btn-step-2-next"
              >
                {isUploadingStep3Voucher ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Enviando Comprovante...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    <span>Enviar Comprovante</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* STEP 04: REVISÃO, POLÍTICAS E ACEITES */}
      {/* ========================================================= */}
      {currentStep === 4 && (
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 sm:p-8 animate-in fade-in" id="step-04-revisao">
          <div className="mb-6">
            <span className="text-xs font-mono text-pink-400 font-bold uppercase tracking-wider">Etapa 04</span>
            <h3 className="text-2xl font-black text-white mt-1">Confira seu agendamento</h3>
            <p className="text-sm text-slate-400 font-light mt-1">
              Revise o resumo do programa, horários e confirme os termos para prosseguir ao pagamento.
            </p>
          </div>

          {/* Summary Box */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 mb-8 divide-y divide-slate-800/80">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4">
              <div>
                <span className="text-xs font-mono text-slate-400 uppercase">Programa</span>
                <p className="text-base font-bold text-white mt-0.5">{CURRENT_PRODUCT.name}</p>
                <span className="text-xs text-pink-400 font-light">Programa de aprendizagem individualizado</span>
              </div>

              <div>
                <span className="text-xs font-mono text-slate-400 uppercase">Aluno</span>
                <p className="text-base font-bold text-white mt-0.5">{fullName}</p>
                <span className="text-xs text-slate-400">{cpf ? `CPF: ${cpf} | ` : ''}WhatsApp: {whatsapp}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 py-4">
              <div>
                <span className="text-xs font-mono text-slate-400 uppercase">Primeiro encontro</span>
                <p className="text-base font-bold text-white mt-0.5">
                  {selectedSlot ? formatDateBrazilian(selectedSlot.date) : ''}
                </p>
                <span className="text-xs text-slate-400">
                  {selectedSlot ? getWeekdayName(selectedSlot.date) : ''}
                </span>
              </div>

              <div>
                <span className="text-xs font-mono text-slate-400 uppercase">Horário & Duração</span>
                <p className="text-base font-bold text-white mt-0.5">{selectedSlot?.time}</p>
                <span className="text-xs text-pink-400 font-mono font-semibold">Duração: 50 minutos</span>
              </div>

              <div>
                <span className="text-xs font-mono text-slate-400 uppercase">Local da Aula</span>
                <p className="text-base font-bold text-white mt-0.5">
                  {selectedLocation?.locationName || CURRENT_PRODUCT.location.name}
                </p>
                <span className="text-xs text-slate-400">
                  {selectedLocation?.address || selectedLocation?.city || CURRENT_PRODUCT.location.address}
                </span>
              </div>
            </div>

            {/* Investment Row */}
            <div className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-mono text-slate-400 uppercase">Investimento</span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-sm font-bold text-pink-400">R$</span>
                  <span className="text-3xl font-black text-white font-mono">
                    {currentCalculatedPrice.toFixed(2).replace('.', ',')}
                  </span>
                </div>
              </div>
              <p className="text-xs text-pink-400 font-medium italic sm:text-right max-w-sm">
                (Você investe no aprendizado, não na quantidade de aulas.)
              </p>
            </div>
          </div>

          {/* 10. POLÍTICAS E ACEITES */}
          <div className="space-y-4 mb-8">
            <h4 className="text-sm font-mono text-slate-300 font-bold uppercase tracking-wider">
              Políticas e Termos Obrigatórios
            </h4>

            {/* Checkbox 1: Política da Aula */}
            <label className="flex items-start gap-3 p-4 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={acceptPolicy}
                onChange={(e) => setAcceptPolicy(e.target.checked)}
                className="mt-1 accent-pink-500 w-4 h-4 shrink-0 rounded"
              />
              <div className="text-xs text-slate-300 leading-relaxed">
                <span>Li e concordo com a </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    setIsPolicyModalOpen(true);
                  }}
                  className="text-pink-400 underline font-bold hover:text-pink-300 inline"
                >
                  Política da Aula
                </button>
                <span> (regras de cancelamento com 24h, condições climáticas e pontualidade estrita).</span>
              </div>
            </label>

            {/* Checkbox 2: Não constitui terapia */}
            <label className="flex items-start gap-3 p-4 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={acknowledgedNotTherapy}
                onChange={(e) => setAcknowledgedNotTherapy(e.target.checked)}
                className="mt-1 accent-pink-500 w-4 h-4 shrink-0 rounded"
              />
              <span className="text-xs text-slate-300 leading-relaxed">
                Estou ciente de que o <strong>Aprender a Pedalar</strong> é um programa pedagógico e esportivo de ensino de bicicleta e <strong>não constitui terapia, tratamento clínico ou serviço de reabilitação</strong>.
              </span>
            </label>

            {/* Checkbox 3: Informações verdadeiras */}
            <label className="flex items-start gap-3 p-4 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={declareAccurateInfo}
                onChange={(e) => setDeclareAccurateInfo(e.target.checked)}
                className="mt-1 accent-pink-500 w-4 h-4 shrink-0 rounded"
              />
              <span className="text-xs text-slate-300 leading-relaxed">
                Declaro que as informações fornecidas são verdadeiras e que informei qualquer condição, limitação ou necessidade específica relevante para o atendimento.
              </span>
            </label>

            {/* Checkbox 4: Minor Guardian Authorization */}
            {ageProfile === 'crianca_adolescente' && (
              <label className="flex items-start gap-3 p-4 rounded-xl bg-pink-950/30 border border-pink-500/40 hover:border-pink-500 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={guardianAuthorized}
                  onChange={(e) => setGuardianAuthorized(e.target.checked)}
                  className="mt-1 accent-pink-500 w-4 h-4 shrink-0 rounded"
                />
                <span className="text-xs text-pink-200 leading-relaxed font-medium">
                  Declaro ser responsável legal pelo aluno ({fullName}) e autorizo formalmente a realização do atendimento sob minha responsabilidade.
                </span>
              </label>
            )}
          </div>

          {/* 11. AUTORIZAÇÃO DE IMAGEM (Independente) */}
          <div className="p-5 rounded-xl bg-slate-950 border border-slate-800 mb-8">
            <div className="flex items-center gap-2 mb-2">
              <Camera className="w-4 h-4 text-pink-400" />
              <h4 className="text-sm font-bold text-white">Autorização de uso de imagem</h4>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed mb-3">
              Permite o registro fotográfico e em vídeo de momentos de superação para fins institucionais e pedagógicos. A contratação não depende desta autorização.
            </p>

            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="imageAuth"
                  value="sim"
                  checked={imageAuthorized === 'sim'}
                  onChange={() => setImageAuthorized('sim')}
                  className="accent-pink-500 w-4 h-4"
                />
                <span className="text-xs font-semibold text-slate-200">Autorizo o uso de imagem</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="imageAuth"
                  value="nao"
                  checked={imageAuthorized === 'nao'}
                  onChange={() => setImageAuthorized('nao')}
                  className="accent-pink-500 w-4 h-4"
                />
                <span className="text-xs text-slate-400">Não autorizo</span>
              </label>
            </div>
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setCurrentStep(3)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 text-xs font-mono font-bold transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar ao horário</span>
            </button>

            <button
              type="button"
              onClick={handleValidateStep3}
              className="flex items-center gap-2 bg-pink-600 hover:bg-pink-500 text-white font-bold text-sm px-8 py-3.5 rounded-xl transition-all shadow-lg shadow-pink-600/30"
              id="btn-step-3-next"
            >
              <span>CONTINUAR PARA PAGAMENTO</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* STEP 05: PAGAMENTO & FINALIZAÇÃO */}
      {/* ========================================================= */}
      {currentStep === 5 && (
        <div id="step-05-pagamento" className="animate-in fade-in">
          {activeBooking ? (
            <FinalizeBookingView
              booking={activeBooking}
              onBookingUpdated={(updated) => {
                setActiveBooking(updated);
                if (updated.voucherSentAt || updated.voucherUrl || updated.status === 'aguardando-confirmacao-instrutor' || updated.status === 'comprovante-enviado') {
                  setTimerActive(false);
                  onGoToStudentPortal?.(updated.id);
                }
              }}
              onGoToStudentPortal={(id) => onGoToStudentPortal?.(id)}
              onChooseNewSlot={() => {
                setSelectedSlot(null);
                setCurrentStep(3);
                window.scrollTo({ top: 150, behavior: 'smooth' });
              }}
            />
          ) : (
            <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 sm:p-8 text-center">
              <p className="text-sm text-slate-400 mb-4">Nenhuma reserva ativa encontrada para finalização.</p>
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="px-6 py-2.5 rounded-xl bg-pink-600 text-white font-bold text-xs"
              >
                Escolher Horário
              </button>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* STEP 06: CONFIRMAÇÃO & SUCESSO */}
      {/* ========================================================= */}
      {currentStep === 6 && (
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 sm:p-10 animate-in fade-in" id="step-06-confirmacao">
          
          <div className="text-center max-w-xl mx-auto mb-8">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto mb-4">
              <CheckCircle className="w-8 h-8" />
            </div>
            <span className="text-xs font-mono text-emerald-400 font-bold uppercase tracking-wider">
              {paymentSent ? 'Comprovante Enviado com Sucesso' : 'Agendamento Confirmado'}
            </span>
            <h3 className="text-3xl font-black text-white mt-1">Tudo certo!</h3>
            <p className="text-base text-slate-300 mt-2 leading-relaxed">
              {paymentSent
                ? 'Seu pagamento foi enviado e está em processo de validação manual pelo instrutor. Seu horário está garantido!'
                : 'Seu primeiro encontro está confirmado. Prepare-se para vivenciar uma experiência transformadora de liberdade.'}
            </p>
          </div>

          {/* Toast / Banner: Imagem copiada para envio no WhatsApp */}
          {imageCopiedToast && (
            <div className="max-w-2xl mx-auto mb-6 p-4 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-left flex items-start gap-3 animate-in slide-in-from-top-2">
              <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <p className="font-bold text-white text-sm">
                  Imagem do comprovante copiada para sua área de transferência!
                </p>
                <p className="text-emerald-200/90 leading-relaxed">
                  O WhatsApp do ABC do Pedal foi aberto com todos os dados da contratação. Basta clicar na barra de mensagem do WhatsApp e pressionar <strong>Ctrl + V</strong> (ou <strong>Colar</strong> no celular) para enviar a imagem do comprovante junto com a mensagem.
                </p>
              </div>
            </div>
          )}

          {/* Comprovante em Anexo Card */}
          <div className="bg-slate-950 border border-pink-500/20 rounded-2xl p-6 mb-8 max-w-2xl mx-auto space-y-4 text-left shadow-lg">
            <div className="flex items-center justify-between pb-3 border-b border-slate-900">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-pink-400" />
                <span className="font-bold text-sm text-white font-sans">Comprovante de Pagamento Anexado</span>
              </div>
              <span className="text-[11px] font-mono text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                PIX R$ {(activeBooking?.price || currentCalculatedPrice).toFixed(2).replace('.', ',')}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              {(uploadedFilePreview || activeBooking?.voucherUrl) && (
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden border border-slate-700 shrink-0 bg-slate-900 flex items-center justify-center">
                  <img
                    src={uploadedFilePreview || activeBooking?.voucherUrl}
                    alt="Comprovante de Pagamento"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              <div className="flex-1 min-w-0 space-y-1.5 text-center sm:text-left">
                <p className="text-xs font-mono text-slate-300 truncate">
                  Arquivo: <strong>{uploadedFileName || activeBooking?.voucherFileName || 'comprovante.jpg'}</strong>
                </p>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Os dados completos da sua contratação e as informações do horário foram formatados para envio direto ao WhatsApp oficial ({OFFICIAL_WHATSAPP_DISPLAY}).
                </p>

                <div className="pt-2 flex flex-wrap gap-2 justify-center sm:justify-start">
                  {uploadedFile && (
                    <button
                      type="button"
                      onClick={() => copyImageFileToClipboard(uploadedFile)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-xs font-mono text-pink-300 border border-slate-800 transition-colors"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiar Imagem (Ctrl+V)</span>
                    </button>
                  )}

                  {(uploadedFilePreview || activeBooking?.voucherUrl) && (
                    <a
                      href={uploadedFilePreview || activeBooking?.voucherUrl}
                      download={uploadedFileName || 'comprovante-pix-abc-do-pedal.jpg'}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-xs font-mono text-slate-300 border border-slate-800 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Baixar Arquivo</span>
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Details Card */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 mb-8 max-w-2xl mx-auto space-y-4">
            <div className="grid grid-cols-2 gap-4 pb-4 border-b border-slate-900 text-xs">
              <div>
                <span className="font-mono text-slate-400 uppercase">Aluno:</span>
                <p className="text-sm font-bold text-white mt-0.5">{fullName}</p>
              </div>
              <div>
                <span className="font-mono text-slate-400 uppercase">Programa:</span>
                <p className="text-sm font-bold text-white mt-0.5">Aprender a Pedalar</p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pb-4 border-b border-slate-900 text-xs">
              <div>
                <span className="font-mono text-slate-400 uppercase">Data:</span>
                <p className="text-sm font-bold text-white mt-0.5">
                  {selectedSlot ? formatDateBrazilian(selectedSlot.date) : ''}
                </p>
                <span className="text-[11px] text-slate-400">
                  {selectedSlot ? getWeekdayName(selectedSlot.date) : ''}
                </span>
              </div>
              <div>
                <span className="font-mono text-slate-400 uppercase">Horário:</span>
                <p className="text-sm font-bold text-white mt-0.5">{selectedSlot?.time}</p>
                <span className="text-[11px] text-pink-400 font-mono">50 minutos</span>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <span className="font-mono text-slate-400 uppercase">Status:</span>
                <p className="text-xs font-mono font-bold text-emerald-400 mt-0.5">
                  {paymentSent ? 'Aguardando Validação' : 'Confirmado'}
                </p>
              </div>
            </div>

            {/* Location details */}
            <div className="pt-2">
              <span className="font-mono text-xs text-pink-400 font-bold uppercase block mb-1">
                Local da Aula: {activeBooking?.location?.locationName || selectedLocation?.locationName || (selectedLocation?.cep ? `Local no CEP ${selectedLocation.cep.replace(/\D/g, '').replace(/^(\d{5})(\d{3})$/, '$1-$2')}` : 'Parque do Ibirapuera')}
              </span>
              <p className="text-xs text-slate-300">
                {activeBooking?.location?.address || selectedLocation?.address || selectedLocation?.city || 'Avenida Pedro Álvares Cabral, s/n — Vila Mariana — São Paulo/SP'}
              </p>
              {(activeBooking?.location?.cep || selectedLocation?.cep) && (
                <p className="text-[11px] font-mono text-pink-300 mt-1">
                  CEP Pesquisado: {(activeBooking?.location?.cep || selectedLocation?.cep || '').replace(/\D/g, '').replace(/^(\d{5})(\d{3})$/, '$1-$2')}
                </p>
              )}
              {(activeBooking?.location?.isFixed || (!activeBooking?.location && (!selectedLocation || selectedLocation?.locationId === 'ibirapuera'))) && (
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-400 mt-2">
                  <span>🚗 Carro: Portões 3 e 4</span>
                  <span>🚕 Uber: Portão 10</span>
                  <span>🚶 A pé: Portão 10</span>
                </div>
              )}
            </div>

            <div className="pt-4 flex justify-center">
              <a
                href={activeBooking?.location?.mapsUrl || selectedLocation?.mapsUrl || CURRENT_PRODUCT.location.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-pink-400 text-xs font-bold transition-colors border border-slate-800"
              >
                <Navigation className="w-3.5 h-3.5" />
                <span>VER ROTA NO GOOGLE MAPS</span>
              </a>
            </div>
          </div>

          {/* Direct Actions: WhatsApp notification to admin & Area Pessoal */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-lg mx-auto">
            {activeBooking && (
              <button
                type="button"
                onClick={() => handleShareVoucherAndContract(activeBooking)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white text-xs font-bold px-6 py-3.5 rounded-xl transition-all shadow-lg shadow-emerald-600/25 cursor-pointer"
                id="btn-confirmacao-whatsapp"
              >
                <MessageCircle className="w-4 h-4 fill-white/10" />
                <span>Enviar Comprovante & Dados no WhatsApp</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                if (onGoToStudentPortal && activeBooking) {
                  onGoToStudentPortal(activeBooking.id);
                } else {
                  alert('Redirecionando para a sua Área Pessoal do Aluno.');
                }
              }}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold px-6 py-3.5 rounded-xl transition-all shadow-lg shadow-pink-600/30"
              id="btn-go-to-student-portal"
            >
              <span>Acessar Área Pessoal do Aluno</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

        </div>
      )}

      {/* Modal de Upload Direto do Comprovante (Passo 1 do fluxo direto) */}
      {showStep3UploadModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in"
          id="modal-step3-voucher-upload"
        >
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto text-slate-100">
            {/* Cabeçalho */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-pink-500/10 border border-pink-500/30 flex items-center justify-center text-pink-400">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-white">Anexar Comprovante PIX</h3>
                  <p className="text-xs text-slate-400 font-mono">Envie o print ou foto do comprovante</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowStep3UploadModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Resumo da Vaga e Valor */}
            <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs space-y-1.5 font-mono">
              <div className="flex justify-between items-center text-slate-300">
                <span>Aluno(a):</span>
                <span className="font-bold text-white truncate max-w-[200px]">
                  {fullName || activeBooking?.student?.fullName || 'Aluno(a)'}
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-300">
                <span>Primeiro Encontro:</span>
                <span className="font-bold text-pink-400">
                  {selectedSlot ? `${formatDateBrazilian(selectedSlot.date)} às ${selectedSlot.time}` : 'Sob consulta'}
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-300 pt-1 border-t border-slate-800/80">
                <span className="text-slate-200 font-bold">Valor Total:</span>
                <span className="text-sm font-black text-emerald-400">
                  R$ {currentCalculatedPrice.toFixed(2).replace('.', ',')}
                </span>
              </div>
            </div>

            {/* Chave PIX Rápida */}
            <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono text-slate-400 font-bold">Chave PIX (Copia e Cola):</span>
                <span className="text-[11px] font-mono text-slate-400">Favorecido: Anderson Rosa</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={generatePixCopyPasteCode(currentCalculatedPrice)}
                  className="w-full bg-slate-900 border border-slate-700/70 rounded-lg px-3 py-2 text-xs font-mono text-slate-300 truncate select-all"
                />
                <button
                  type="button"
                  onClick={handleCopyStep3Pix}
                  className="px-3 py-2 rounded-lg bg-pink-600 hover:bg-pink-500 text-white text-xs font-mono font-bold flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
                >
                  {step3PixCopied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-white" />
                      <span>Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiar</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Zona de Drop / Seleção de Comprovante */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setStep3IsDragging(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                setStep3IsDragging(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                setStep3IsDragging(false);
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  handleStep3VoucherUpload(e.dataTransfer.files[0]);
                }
              }}
              onClick={() => step3FileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2.5 ${
                step3IsDragging
                  ? 'border-pink-500 bg-pink-500/10 scale-[1.01]'
                  : 'border-slate-700 hover:border-pink-500/60 bg-slate-950/40 hover:bg-slate-950/70'
              }`}
            >
              {isUploadingStep3Voucher ? (
                <div className="py-4 space-y-3">
                  <div className="w-10 h-10 border-3 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-sm font-bold text-pink-400">Processando comprovante...</p>
                  <p className="text-xs text-slate-400 font-mono">
                    Salvando agendamento e encaminhando para a Área do Aluno...
                  </p>
                </div>
              ) : (
                <>
                  <div className="w-12 h-12 rounded-2xl bg-pink-500/10 border border-pink-500/30 flex items-center justify-center text-pink-400">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">
                      Clique aqui para selecionar a foto ou print
                    </p>
                    <p className="text-xs text-slate-400 font-mono mt-1">
                      ou arraste o arquivo do comprovante para esta área
                    </p>
                  </div>
                  <span className="inline-block mt-2 px-4 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold font-mono transition-colors shadow-md">
                    Selecionar Arquivo do Comprovante
                  </span>
                  <p className="text-[11px] text-slate-500 font-mono mt-1">
                    Formatos aceitos: JPG, PNG, WEBP (máx. 15MB)
                  </p>
                </>
              )}
            </div>

            {/* Aviso Informativo do Fluxo Direto */}
            <div className="p-3 rounded-xl bg-amber-400/10 border border-amber-400/30 text-xs text-amber-300 font-mono flex items-start gap-2 leading-relaxed">
              <span className="text-base shrink-0">🟨</span>
              <span>
                <strong>Atenção:</strong> Ao finalizar o upload, você será encaminhado <strong>diretamente para a Área do Aluno</strong> com o status <strong>Aguardando Confirmação do Instrutor</strong>. O comprovante ficará disponível para conferência sua e do instrutor.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Policy Modal */}
      <PolicyModal
        isOpen={isPolicyModalOpen}
        onClose={() => setIsPolicyModalOpen(false)}
      />

    </div>
  );
}
