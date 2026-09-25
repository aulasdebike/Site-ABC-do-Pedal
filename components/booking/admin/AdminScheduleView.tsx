'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  Plus,
  Lock,
  Unlock,
  Trash2,
  Edit2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  X,
  Filter,
  Search,
  Building2,
  Sparkles,
  User,
  Info,
  ShieldCheck,
  ChevronRight,
  ArrowRight,
  RotateCcw,
  Loader2
} from 'lucide-react';
import {
  TimeSlot,
  SlotRegion,
  SlotStatus,
  BookingRecord,
  getStoredSlots,
  saveStoredSlots,
  getStoredBookings,
  saveStoredBookings,
  formatDateBrazilian,
  isSlotExpired,
  checkScheduleConflict,
  deleteInstructorSlot,
  isBookingAwaitingInstructorSchedule,
  assignInstructorScheduleToBooking,
  ScheduleConflictCheckResult
} from '@/lib/booking-store';
import {
  saveSingleSlotToFirestore,
  deleteSingleSlotFromFirestore
} from '@/lib/firebase';
import {
  getStoredMunicipalClassLocations,
  getAvailableClassLocationsForCity,
  getAllClassLocationsForCity
} from '@/lib/locations-config';

interface AdminScheduleViewProps {
  onScheduleAwaitingStudent?: (booking: BookingRecord) => void;
}

export function AdminScheduleView({ onScheduleAwaitingStudent }: AdminScheduleViewProps) {
  // Slots State
  const [slots, setSlots] = useState<TimeSlot[]>(() => {
    if (typeof window !== 'undefined') {
      return getStoredSlots();
    }
    return [];
  });

  // Bookings State
  const [bookings, setBookings] = useState<BookingRecord[]>(() => {
    if (typeof window !== 'undefined') {
      return getStoredBookings();
    }
    return [];
  });

  // Form State: Criar Novo Horário
  const todayStr = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, []);

  const [newDate, setNewDate] = useState<string>(todayStr);
  const [newTime, setNewTime] = useState<string>('09:00');
  const [newRegion, setNewRegion] = useState<SlotRegion>('abc_paulista');
  const [newSubRegion, setNewSubRegion] = useState<string>('Santo André');
  const [newLocationName, setNewLocationName] = useState<string>('Paço Municipal');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Edit Slot State
  const [editingSlot, setEditingSlot] = useState<TimeSlot | null>(null);
  const [editDate, setEditDate] = useState<string>('');
  const [editTime, setEditTime] = useState<string>('');
  const [editRegion, setEditRegion] = useState<SlotRegion>('abc_paulista');
  const [editSubRegion, setEditSubRegion] = useState<string>('');
  const [editLocationName, setEditLocationName] = useState<string>('');
  const [isSavingEdit, setIsSavingEdit] = useState<boolean>(false);

  // Delete Confirmation State
  const [slotToDelete, setSlotToDelete] = useState<TimeSlot | null>(null);

  // Filters State
  const [statusFilter, setStatusFilter] = useState<'todos' | 'available' | 'reserved' | 'confirmed' | 'blocked'>('todos');
  const [regionFilter, setRegionFilter] = useState<string>('todas');
  const [cityFilter, setCityFilter] = useState<string>('todos');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Feedback & Conflict State
  const [conflictModalData, setConflictModalData] = useState<ScheduleConflictCheckResult | null>(null);
  const [feedbackBanner, setFeedbackBanner] = useState<{
    type: 'success' | 'warning' | 'error';
    title?: string;
    message: string;
    detail?: string;
  } | null>(null);

  // Student to Schedule Modal State (for WhatsApp negotiated students)
  const [studentToSchedule, setStudentToSchedule] = useState<BookingRecord | null>(null);
  const [assignTargetDate, setAssignTargetDate] = useState<string>(todayStr);
  const [assignTargetTime, setAssignTargetTime] = useState<string>('09:00');
  const [assignLocationName, setAssignLocationName] = useState<string>('');

  // Load and Listen to changes
  useEffect(() => {
    const handleSlotsUpdated = () => {
      setSlots(getStoredSlots());
    };
    const handleBookingsUpdated = () => {
      setBookings(getStoredBookings());
    };

    window.addEventListener('abc_slots_updated', handleSlotsUpdated);
    window.addEventListener('abc_booking_updated', handleBookingsUpdated);
    window.addEventListener('abc_municipal_locations_updated', handleSlotsUpdated);

    return () => {
      window.removeEventListener('abc_slots_updated', handleSlotsUpdated);
      window.removeEventListener('abc_booking_updated', handleBookingsUpdated);
      window.removeEventListener('abc_municipal_locations_updated', handleSlotsUpdated);
    };
  }, []);

  // Update default subRegion and location when region changes in Create Form
  const handleRegionChange = (reg: SlotRegion) => {
    setNewRegion(reg);
    if (reg === 'sao_paulo') {
      setNewSubRegion('Ibirapuera');
      setNewLocationName('Parque Ibirapuera');
    } else if (reg === 'abc_paulista') {
      setNewSubRegion('Santo André');
      setNewLocationName('Paço Municipal');
    } else {
      setNewSubRegion('Outras localidades');
      setNewLocationName('Outras localidades (sob demanda)');
    }
  };

  // Update default location when sub-region changes in Create Form
  const handleSubRegionChange = (sub: string) => {
    setNewSubRegion(sub);
    if (sub === 'Santo André') {
      const saLocs = getAvailableClassLocationsForCity('Santo André');
      setNewLocationName(saLocs[0]?.name || 'Paço Municipal');
    } else if (sub === 'São Bernardo do Campo') {
      const sbcLocs = getAvailableClassLocationsForCity('São Bernardo do Campo');
      setNewLocationName(sbcLocs[0]?.name || 'Poliesportivo da Kennedy');
    } else if (sub === 'Ibirapuera') {
      setNewLocationName('Parque Ibirapuera');
    } else if (sub === 'Outros municípios') {
      setNewLocationName('Outros municípios (ABC)');
    } else {
      setNewLocationName('Outras localidades');
    }
  };

  // Update edit form sub-region and location
  const handleEditRegionChange = (reg: SlotRegion) => {
    setEditRegion(reg);
    if (reg === 'sao_paulo') {
      setEditSubRegion('Ibirapuera');
      setEditLocationName('Parque Ibirapuera');
    } else if (reg === 'abc_paulista') {
      setEditSubRegion('Santo André');
      setEditLocationName('Paço Municipal');
    } else {
      setEditSubRegion('Outras localidades');
      setEditLocationName('Outras localidades (sob demanda)');
    }
  };

  const handleEditSubRegionChange = (sub: string) => {
    setEditSubRegion(sub);
    if (sub === 'Santo André') {
      const saLocs = getAvailableClassLocationsForCity('Santo André');
      setEditLocationName(saLocs[0]?.name || 'Paço Municipal');
    } else if (sub === 'São Bernardo do Campo') {
      const sbcLocs = getAvailableClassLocationsForCity('São Bernardo do Campo');
      setEditLocationName(sbcLocs[0]?.name || 'Poliesportivo da Kennedy');
    } else if (sub === 'Ibirapuera') {
      setEditLocationName('Parque Ibirapuera');
    } else if (sub === 'Outros municípios') {
      setEditLocationName('Outros municípios (ABC)');
    } else {
      setEditLocationName('Outras localidades');
    }
  };

  // Dynamic location options for Create Form
  const availableLocationsForNew = useMemo(() => {
    if (newRegion === 'sao_paulo') {
      if (newSubRegion === 'Ibirapuera') {
        return [
          { id: 'sp_ibira', name: 'Parque Ibirapuera', note: 'Polo Oficial (Portão 10)', available: true }
        ];
      }
      return [
        { id: 'sp_outras', name: 'Outras localidades', note: 'Sob consulta de endereço', available: true }
      ];
    }

    if (newRegion === 'abc_paulista') {
      if (newSubRegion === 'Santo André') {
        const saAll = getAllClassLocationsForCity('Santo André');
        if (saAll.length > 0) {
          return saAll.map((loc) => ({
            id: loc.id,
            name: loc.name,
            note: loc.restrictionNote || (loc.status === 'indisponivel' ? 'Inativo no cadastro' : ''),
            available: loc.status === 'disponivel',
            isKidsOnly: loc.isKidsOnly
          }));
        }
        return [
          { id: 'sa_paco', name: 'Paço Municipal', note: 'Disponível', available: true },
          { id: 'sa_celso', name: 'Parque Celso Daniel', note: 'Exclusivo para crianças', available: true, isKidsOnly: true },
          { id: 'sa_central', name: 'Parque Central', note: 'Inativo inicialmente', available: false }
        ];
      }

      if (newSubRegion === 'São Bernardo do Campo') {
        const sbcAll = getAllClassLocationsForCity('São Bernardo do Campo');
        if (sbcAll.length > 0) {
          return sbcAll.map((loc) => ({
            id: loc.id,
            name: loc.name,
            note: loc.restrictionNote || (loc.status === 'indisponivel' ? 'Inativo no cadastro' : ''),
            available: loc.status === 'disponivel'
          }));
        }
        return [
          { id: 'sbc_kennedy', name: 'Poliesportivo da Kennedy', note: 'Disponível', available: true },
          { id: 'sbc_paco', name: 'Paço Municipal', note: 'Disponível', available: true }
        ];
      }

      return [
        { id: 'abc_outros', name: 'Outros municípios (ABC)', note: 'Atendimento Aprenda a Pedalar', available: true }
      ];
    }

    return [
      { id: 'outras_direto', name: 'Outras localidades (sob demanda)', note: 'Consulta por CEP', available: true }
    ];
  }, [newRegion, newSubRegion]);

  // Dynamic location options for Edit Form
  const availableLocationsForEdit = useMemo(() => {
    if (editRegion === 'sao_paulo') {
      if (editSubRegion === 'Ibirapuera') {
        return [
          { id: 'sp_ibira', name: 'Parque Ibirapuera', note: 'Polo Oficial', available: true }
        ];
      }
      return [
        { id: 'sp_outras', name: 'Outras localidades', note: 'Sob consulta', available: true }
      ];
    }

    if (editRegion === 'abc_paulista') {
      if (editSubRegion === 'Santo André') {
        const saAll = getAllClassLocationsForCity('Santo André');
        if (saAll.length > 0) {
          return saAll.map((loc) => ({
            id: loc.id,
            name: loc.name,
            note: loc.restrictionNote || (loc.status === 'indisponivel' ? 'Inativo no cadastro' : ''),
            available: loc.status === 'disponivel',
            isKidsOnly: loc.isKidsOnly
          }));
        }
        return [
          { id: 'sa_paco', name: 'Paço Municipal', note: 'Disponível', available: true },
          { id: 'sa_celso', name: 'Parque Celso Daniel', note: 'Exclusivo para crianças', available: true, isKidsOnly: true },
          { id: 'sa_central', name: 'Parque Central', note: 'Inativo inicialmente', available: false }
        ];
      }

      if (editSubRegion === 'São Bernardo do Campo') {
        const sbcAll = getAllClassLocationsForCity('São Bernardo do Campo');
        if (sbcAll.length > 0) {
          return sbcAll.map((loc) => ({
            id: loc.id,
            name: loc.name,
            note: loc.restrictionNote || (loc.status === 'indisponivel' ? 'Inativo no cadastro' : ''),
            available: loc.status === 'disponivel'
          }));
        }
        return [
          { id: 'sbc_kennedy', name: 'Poliesportivo da Kennedy', note: 'Disponível', available: true },
          { id: 'sbc_paco', name: 'Paço Municipal', note: 'Disponível', available: true }
        ];
      }

      return [
        { id: 'abc_outros', name: 'Outros municípios (ABC)', note: 'Atendimento Aprenda a Pedalar', available: true }
      ];
    }

    return [
      { id: 'outras_direto', name: 'Outras localidades (sob demanda)', note: 'Consulta por CEP', available: true }
    ];
  }, [editRegion, editSubRegion]);

  // Awaiting Students list (WhatsApp negotiation)
  const awaitingStudents = useMemo(() => {
    return bookings.filter(isBookingAwaitingInstructorSchedule);
  }, [bookings]);

  // Determine detailed status of a slot
  const getSlotDetailedStatus = useCallback((slot: TimeSlot): {
    statusType: 'available' | 'reserved' | 'confirmed' | 'blocked';
    badgeLabel: string;
    studentName?: string;
    bookingId?: string;
  } => {
    if (slot.status === 'blocked') {
      return { statusType: 'blocked', badgeLabel: 'BLOQUEADO' };
    }

    if (slot.status === 'available') {
      return { statusType: 'available', badgeLabel: 'DISPONÍVEL' };
    }

    // slot is occupied or has a booking
    const linkedBooking = bookings.find(
      (b) => b.slot?.id === slot.id || b.id === slot.bookingId || (b.slot?.date === slot.date && b.slot?.time === slot.time)
    );

    if (linkedBooking) {
      const isConfirmed =
        linkedBooking.status === 'confirmado' ||
        linkedBooking.status === 'agendamento-confirmado' ||
        linkedBooking.status === 'pagamento-confirmado' ||
        linkedBooking.status === 'concluido';

      if (isConfirmed) {
        return {
          statusType: 'confirmed',
          badgeLabel: 'CONFIRMADO',
          studentName: linkedBooking.student.fullName,
          bookingId: linkedBooking.id
        };
      } else {
        return {
          statusType: 'reserved',
          badgeLabel: 'RESERVADO (PRÉ-AGENDAMENTO)',
          studentName: linkedBooking.student.fullName,
          bookingId: linkedBooking.id
        };
      }
    }

    if (slot.bookedByStudentName) {
      return {
        statusType: 'confirmed',
        badgeLabel: 'CONFIRMADO',
        studentName: slot.bookedByStudentName,
        bookingId: slot.bookingId
      };
    }

    return { statusType: 'reserved', badgeLabel: 'RESERVADO' };
  }, [bookings]);

  // KPIs
  const stats = useMemo(() => {
    let available = 0;
    let reserved = 0;
    let confirmed = 0;
    let blocked = 0;

    slots.forEach((s) => {
      const det = getSlotDetailedStatus(s);
      if (det.statusType === 'available') available++;
      else if (det.statusType === 'reserved') reserved++;
      else if (det.statusType === 'confirmed') confirmed++;
      else if (det.statusType === 'blocked') blocked++;
    });

    return {
      total: slots.length,
      available,
      reserved,
      confirmed,
      blocked
    };
  }, [slots, getSlotDetailedStatus]);

  // Filtered Slots
  const filteredSlots = useMemo(() => {
    return slots.filter((slot) => {
      // 1. Status Filter
      if (statusFilter !== 'todos') {
        const det = getSlotDetailedStatus(slot);
        if (det.statusType !== statusFilter) return false;
      }

      // 2. Region Filter
      if (regionFilter !== 'todas') {
        if (slot.region !== regionFilter) return false;
      }

      // 3. City / Sub-region Filter
      if (cityFilter !== 'todos') {
        const slotSub = slot.subRegion || slot.city || '';
        if (slotSub.toLowerCase() !== cityFilter.toLowerCase()) return false;
      }

      // 4. Date Filter
      if (dateFilter) {
        if (slot.date !== dateFilter) return false;
      }

      // 5. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const dateBr = formatDateBrazilian(slot.date).toLowerCase();
        const loc = (slot.locationName || '').toLowerCase();
        const city = (slot.city || '').toLowerCase();
        const student = (slot.bookedByStudentName || '').toLowerCase();
        const time = slot.time.toLowerCase();

        const match =
          dateBr.includes(q) ||
          loc.includes(q) ||
          city.includes(q) ||
          student.includes(q) ||
          time.includes(q);

        if (!match) return false;
      }

      return true;
    });
  }, [slots, getSlotDetailedStatus, statusFilter, regionFilter, cityFilter, dateFilter, searchQuery]);

  // ==========================================
  // ACTION: CRIAR NOVO HORÁRIO (COM VALIDAÇÃO DE CONFLITO)
  // ==========================================
  const handleCreateSlot = async () => {
    setFeedbackBanner(null);

    // Validações básicas
    if (!newDate) {
      setFeedbackBanner({
        type: 'warning',
        title: 'DATA OBRIGATÓRIA',
        message: 'Por favor, selecione uma data válida para o horário.'
      });
      return;
    }

    if (!newTime) {
      setFeedbackBanner({
        type: 'warning',
        title: 'HORÁRIO OBRIGATÓRIO',
        message: 'Por favor, informe um horário (ex: 09:00).'
      });
      return;
    }

    // REGRA DE CONFLITO DE HORÁRIOS:
    // Antes de criar ou editar qualquer horário, verificar a agenda existente.
    // Não permitir conflito com: outro horário disponível, pré-agendamento, agendamento confirmado, horário bloqueado.
    // A região ou município diferente NÃO elimina o conflito. O instrutor não pode ter dois compromissos simultâneos.
    const conflictResult = checkScheduleConflict(newDate, newTime, 50);
    if (conflictResult.hasConflict) {
      setConflictModalData(conflictResult);
      setFeedbackBanner({
        type: 'error',
        title: conflictResult.title,
        message: conflictResult.message,
        detail: conflictResult.detail
      });
      return;
    }

    setIsSaving(true);

    try {
      const regionTitles: Record<SlotRegion, string> = {
        sao_paulo: 'São Paulo',
        abc_paulista: 'ABC Paulista',
        outras_localidades: 'Outras Regiões'
      };

      const isCelsoDaniel = newLocationName.toLowerCase().includes('celso daniel');

      const slotId = `${newDate}_${newTime}_${newRegion}_${Date.now()}`;
      const newSlot: TimeSlot = {
        id: slotId,
        date: newDate,
        time: newTime,
        durationMinutes: 50,
        status: 'available',
        region: newRegion,
        regionName: regionTitles[newRegion],
        subRegion: newSubRegion,
        city: newSubRegion.includes('André') ? 'Santo André' : (newSubRegion.includes('Bernardo') ? 'São Bernardo do Campo' : (newRegion === 'sao_paulo' ? 'São Paulo' : newSubRegion)),
        locationName: newLocationName.trim(),
        locationId: `loc_${Date.now()}`,
        isKidsOnly: isCelsoDaniel,
        createdAt: new Date().toISOString()
      };

      // 1. Salvar no Firestore (se configurado)
      try {
        await saveSingleSlotToFirestore(newSlot);
      } catch (err) {
        console.warn('Aviso: erro ao salvar slot no Firestore, mantendo em memória e localStorage:', err);
      }

      // 2. Atualizar estado local e localStorage
      const currentSlots = getStoredSlots();
      const updated = [...currentSlots, newSlot].sort((a, b) => {
        const dComp = a.date.localeCompare(b.date);
        if (dComp !== 0) return dComp;
        return a.time.localeCompare(b.time);
      });

      setSlots(updated);
      saveStoredSlots(updated);

      // Sincronizar filtro de data para a data recém-criada
      setDateFilter(newDate);

      setFeedbackBanner({
        type: 'success',
        title: 'HORÁRIO ABERTO COM SUCESSO',
        message: `O horário ${newTime} (${regionTitles[newRegion]} → ${newSubRegion} → ${newLocationName}) foi aberto e já está disponível para os alunos da região selecionada!`
      });
    } catch (e: any) {
      console.error('Erro ao abrir horário:', e);
      setFeedbackBanner({
        type: 'error',
        title: 'ERRO AO SALVAR HORÁRIO',
        message: 'Ocorreu uma falha ao salvar o novo horário na agenda.'
      });
    } finally {
      setIsSaving(false);
    }
  };

  // ==========================================
  // ACTION: INICIAR EDIÇÃO DE HORÁRIO
  // ==========================================
  const handleStartEdit = (slot: TimeSlot) => {
    setEditingSlot(slot);
    setEditDate(slot.date);
    setEditTime(slot.time);
    setEditRegion(slot.region || 'abc_paulista');
    setEditSubRegion(slot.subRegion || slot.city || 'Santo André');
    setEditLocationName(slot.locationName || 'Paço Municipal');
  };

  // ==========================================
  // ACTION: SALVAR EDIÇÃO DE HORÁRIO (COM VALIDAÇÃO DE CONFLITO)
  // ==========================================
  const handleSaveEdit = async () => {
    if (!editingSlot) return;
    setFeedbackBanner(null);

    if (!editDate || !editTime) {
      setFeedbackBanner({
        type: 'warning',
        title: 'CAMPOS OBRIGATÓRIOS',
        message: 'Data e horário devem ser preenchidos.'
      });
      return;
    }

    // Checagem de conflito ignorando o próprio slot que está sendo editado
    const conflictResult = checkScheduleConflict(editDate, editTime, 50, editingSlot.id);
    if (conflictResult.hasConflict) {
      setConflictModalData(conflictResult);
      setFeedbackBanner({
        type: 'error',
        title: conflictResult.title,
        message: conflictResult.message,
        detail: conflictResult.detail
      });
      return;
    }

    setIsSavingEdit(true);

    try {
      const regionTitles: Record<SlotRegion, string> = {
        sao_paulo: 'São Paulo',
        abc_paulista: 'ABC Paulista',
        outras_localidades: 'Outras Regiões'
      };

      const isCelsoDaniel = editLocationName.toLowerCase().includes('celso daniel');

      const updatedSlot: TimeSlot = {
        ...editingSlot,
        date: editDate,
        time: editTime,
        region: editRegion,
        regionName: regionTitles[editRegion],
        subRegion: editSubRegion,
        city: editSubRegion.includes('André') ? 'Santo André' : (editSubRegion.includes('Bernardo') ? 'São Bernardo do Campo' : (editRegion === 'sao_paulo' ? 'São Paulo' : editSubRegion)),
        locationName: editLocationName.trim(),
        isKidsOnly: isCelsoDaniel,
        updatedAt: new Date().toISOString()
      };

      // 1. Salvar no Firestore
      try {
        await saveSingleSlotToFirestore(updatedSlot);
      } catch (err) {
        console.warn('Aviso: erro ao atualizar slot no Firestore:', err);
      }

      // 2. Atualizar estado local e storage
      const currentSlots = getStoredSlots();
      const updated = currentSlots.map((s) => (s.id === editingSlot.id ? updatedSlot : s)).sort((a, b) => {
        const dComp = a.date.localeCompare(b.date);
        if (dComp !== 0) return dComp;
        return a.time.localeCompare(b.time);
      });

      setSlots(updated);
      saveStoredSlots(updated);

      // Se houver booking vinculado, sincroniza a data/local no booking
      if (editingSlot.bookingId) {
        const currentBookings = getStoredBookings();
        const bIdx = currentBookings.findIndex((b) => b.id === editingSlot.bookingId);
        if (bIdx !== -1) {
          currentBookings[bIdx] = {
            ...currentBookings[bIdx],
            slot: {
              ...currentBookings[bIdx].slot,
              date: editDate,
              time: editTime,
              locationName: editLocationName.trim()
            },
            assignedLocationName: editLocationName.trim()
          };
          saveStoredBookings(currentBookings);
        }
      }

      setEditingSlot(null);
      setFeedbackBanner({
        type: 'success',
        title: 'HORÁRIO ATUALIZADO',
        message: `O horário foi atualizado para ${editTime} em ${formatDateBrazilian(editDate)} (${regionTitles[editRegion]} → ${editSubRegion} → ${editLocationName}).`
      });
    } catch (e: any) {
      console.error('Erro ao atualizar horário:', e);
      setFeedbackBanner({
        type: 'error',
        title: 'ERRO AO ATUALIZAR',
        message: 'Não foi possível salvar as alterações do horário.'
      });
    } finally {
      setIsSavingEdit(false);
    }
  };

  // ==========================================
  // ACTION: BLOQUEAR / DESBLOQUEAR HORÁRIO
  // ==========================================
  const handleToggleBlock = async (slotId: string) => {
    setFeedbackBanner(null);
    const target = slots.find((s) => s.id === slotId);
    if (!target) return;

    if (target.status === 'occupied') {
      setFeedbackBanner({
        type: 'warning',
        title: 'HORÁRIO OCUPADO',
        message: 'Não é possível bloquear um horário que já está reservado ou confirmado para um aluno.'
      });
      return;
    }

    const nextStatus: SlotStatus = target.status === 'blocked' ? 'available' : 'blocked';
    const updatedSlot: TimeSlot = {
      ...target,
      status: nextStatus,
      updatedAt: new Date().toISOString()
    };

    const currentSlots = getStoredSlots();
    const updated = currentSlots.map((s) => (s.id === slotId ? updatedSlot : s));
    setSlots(updated);
    saveStoredSlots(updated);

    try {
      await saveSingleSlotToFirestore(updatedSlot);
    } catch (e) {
      console.warn('Aviso: falha ao salvar bloqueio no Firestore:', e);
    }

    setFeedbackBanner({
      type: 'success',
      title: nextStatus === 'blocked' ? 'HORÁRIO BLOQUEADO' : 'HORÁRIO DESBLOQUEADO',
      message: `O horário ${target.time} de ${formatDateBrazilian(target.date)} agora está ${nextStatus === 'blocked' ? 'BLOQUEADO para novos agendamentos' : 'DISPONÍVEL na grade'}.`
    });
  };

  // ==========================================
  // ACTION: EXCLUIR HORÁRIO NÃO UTILIZADO
  // ==========================================
  const handleConfirmDelete = async () => {
    if (!slotToDelete) return;
    setFeedbackBanner(null);

    const result = deleteInstructorSlot(slotToDelete.id);
    if (!result.success) {
      setFeedbackBanner({
        type: 'error',
        title: 'NÃO FOI POSSÍVEL EXCLUIR',
        message: result.message
      });
      setSlotToDelete(null);
      return;
    }

    setSlots(getStoredSlots());
    setFeedbackBanner({
      type: 'success',
      title: 'HORÁRIO EXCLUÍDO',
      message: `O horário ${slotToDelete.time} de ${formatDateBrazilian(slotToDelete.date)} foi removido permanentemente da grade.`
    });
    setSlotToDelete(null);
  };

  // ==========================================
  // ACTION: INSERIR ALUNO NEGOCIADO NA AGENDA
  // ==========================================
  const handleAssignStudentToSchedule = () => {
    if (!studentToSchedule) return;

    // Verificar conflito com outros compromissos
    const conflictResult = checkScheduleConflict(assignTargetDate, assignTargetTime, 50, undefined, studentToSchedule.id);
    if (conflictResult.hasConflict) {
      setConflictModalData(conflictResult);
      setFeedbackBanner({
        type: 'error',
        title: conflictResult.title,
        message: conflictResult.message,
        detail: conflictResult.detail
      });
      return;
    }

    const res = assignInstructorScheduleToBooking(
      studentToSchedule.id,
      assignTargetDate,
      assignTargetTime,
      'Instrutor Responsável - ABC do Pedal',
      assignLocationName || studentToSchedule.location?.locationName
    );

    if (res) {
      setBookings(getStoredBookings());
      setSlots(getStoredSlots());
      setStudentToSchedule(null);
      setFeedbackBanner({
        type: 'success',
        title: 'ALUNO AGENDADO COM SUCESSO',
        message: `O aluno ${studentToSchedule.student.fullName} foi inserido na agenda para ${formatDateBrazilian(assignTargetDate)} às ${assignTargetTime} no local ${assignLocationName || studentToSchedule.location?.locationName || 'Parque do Ibirapuera'}.`
      });
    }
  };

  return (
    <div id="admin-schedule-view" className="space-y-6">
      
      {/* ========================================================= */}
      {/* 1. CABEÇALHO & RESUMO OPERACIONAL */}
      {/* ========================================================= */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full bg-pink-950/80 border border-pink-500/50 text-[10px] font-mono font-bold text-pink-300 uppercase">
                Controle 100% do Instrutor
              </span>
              <span className="text-xs font-mono text-slate-500">•</span>
              <span className="text-xs font-mono text-slate-400">Distribuição Regional & Anticonflito</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
              <Calendar className="w-6 h-6 text-pink-500" />
              <span>Gestão de Horários & Agenda</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
              Criação, edição, bloqueio e distribuição de horários por região e município. O aluno visualiza exclusivamente os horários liberados para a região selecionada.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <button
              type="button"
              onClick={() => {
                setSlots(getStoredSlots());
                setBookings(getStoredBookings());
                setFeedbackBanner({
                  type: 'success',
                  title: 'AGENDA ATUALIZADA',
                  message: 'A lista de horários foi sincronizada com a base de dados.'
                });
              }}
              className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-mono text-slate-300 flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Recarregar dados da agenda"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Atualizar</span>
            </button>
          </div>
        </div>

        {/* Quick KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-5 pt-5 border-t border-slate-900">
          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
            <span className="text-[10px] font-mono text-slate-400 block uppercase">Total na Grade</span>
            <span className="text-xl font-black text-white font-mono">{stats.total}</span>
          </div>
          <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30">
            <span className="text-[10px] font-mono text-emerald-400 block uppercase font-bold">Disponíveis</span>
            <span className="text-xl font-black text-emerald-300 font-mono">{stats.available}</span>
          </div>
          <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/30">
            <span className="text-[10px] font-mono text-amber-400 block uppercase font-bold">Reservados</span>
            <span className="text-xl font-black text-amber-300 font-mono">{stats.reserved}</span>
          </div>
          <div className="p-3 rounded-xl bg-blue-950/40 border border-blue-500/30">
            <span className="text-[10px] font-mono text-blue-400 block uppercase font-bold">Confirmados</span>
            <span className="text-xl font-black text-blue-300 font-mono">{stats.confirmed}</span>
          </div>
          <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 col-span-2 sm:col-span-1">
            <span className="text-[10px] font-mono text-rose-400 block uppercase font-bold">Bloqueados</span>
            <span className="text-xl font-black text-rose-300 font-mono">{stats.blocked}</span>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. FEEDBACK BANNER & ALERTA DE CONFLITO */}
      {/* ========================================================= */}
      {feedbackBanner && (
        <div
          id="schedule-feedback-banner"
          className={`p-4 rounded-2xl border flex items-start justify-between gap-3 text-xs shadow-xl transition-all ${
            feedbackBanner.type === 'success'
              ? 'bg-emerald-950/70 border-emerald-500/60 text-emerald-200'
              : feedbackBanner.type === 'warning'
              ? 'bg-amber-950/70 border-amber-500/60 text-amber-200'
              : 'bg-rose-950/80 border-rose-500/70 text-rose-200 shadow-rose-950/50'
          }`}
        >
          <div className="flex items-start gap-3">
            {feedbackBanner.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />}
            {feedbackBanner.type === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />}
            {feedbackBanner.type === 'error' && <XCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />}
            <div className="space-y-1">
              <p className="font-black font-mono tracking-wide uppercase">
                {feedbackBanner.title || (feedbackBanner.type === 'error' ? 'CONFLITO DE HORÁRIO' : 'AVISO DA AGENDA')}
              </p>
              <p className="leading-relaxed font-sans">{feedbackBanner.message}</p>
              {feedbackBanner.detail && (
                <p className="text-[11px] font-mono opacity-80 pt-1 border-t border-rose-500/30">
                  {feedbackBanner.detail}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackBanner(null)}
            className="text-slate-400 hover:text-white p-1 rounded-lg shrink-0 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ========================================================= */}
      {/* 3. ALUNOS AGUARDANDO DEFINIÇÃO DE HORÁRIO (WHATSAPP) */}
      {/* ========================================================= */}
      {awaitingStudents.length > 0 && (
        <div className="p-5 rounded-2xl bg-amber-950/50 border-2 border-amber-500/50 shadow-xl space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 text-amber-300 font-bold font-mono text-xs">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>ALUNOS AGUARDANDO DEFINIÇÃO DE DATA E HORÁRIO (NEGOCIAÇÃO WHATSAPP) — {awaitingStudents.length}</span>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-amber-900/90 text-amber-200 text-[10px] font-mono font-bold uppercase border border-amber-500/30">
              Ação Requerida
            </span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Os alunos abaixo realizaram a negociação diretamente pelo WhatsApp e enviaram comprovante de pagamento. Eles estão aguardando você inseri-los em uma data e horário específicos da agenda.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            {awaitingStudents.map((ab) => (
              <div
                key={ab.id}
                className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3 text-xs shadow-md"
              >
                <div className="min-w-0 space-y-0.5">
                  <p className="font-bold text-white truncate text-sm">{ab.student.fullName}</p>
                  <p className="text-slate-400 text-[11px] font-mono">{ab.student.whatsapp} • Inscrição #{ab.id}</p>
                  <p className="text-amber-300 text-[10px] font-mono font-semibold">
                    Local solicitado: {ab.assignedLocationName || ab.location?.locationName || 'A definir'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setStudentToSchedule(ab);
                    setAssignTargetDate(todayStr);
                    setAssignTargetTime('09:00');
                    setAssignLocationName(ab.assignedLocationName || ab.location?.locationName || 'Paço Municipal');
                  }}
                  className="shrink-0 px-3.5 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-mono text-xs font-bold transition-all shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Inserir na Agenda</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 4. FORMULÁRIO DE CRIAÇÃO DE HORÁRIOS */}
      {/* ========================================================= */}
      <div className="p-5 sm:p-6 rounded-2xl bg-slate-950 border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-900">
          <div className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-pink-400" />
            <h3 className="text-sm font-bold font-mono text-white uppercase tracking-wide">
              Criar Novo Horário na Grade
            </h3>
          </div>
          <span className="text-[11px] font-mono text-slate-500">
            Duração padrão: 50 minutos por aula
          </span>
        </div>

        {/* Inputs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 items-end">
          
          {/* Data */}
          <div>
            <label className="block text-xs font-mono text-slate-400 mb-1 font-semibold">
              1. Data da Aula:
            </label>
            <input
              type="date"
              value={newDate}
              onChange={(e) => {
                setNewDate(e.target.value);
                setDateFilter(e.target.value);
              }}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-pink-500 font-mono shadow-inner"
            />
          </div>

          {/* Horário */}
          <div>
            <label className="block text-xs font-mono text-slate-400 mb-1 font-semibold">
              2. Horário (Início):
            </label>
            <input
              type="time"
              value={newTime}
              onChange={(e) => setNewTime(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-pink-500 font-mono shadow-inner"
            />
          </div>

          {/* Região */}
          <div>
            <label className="block text-xs font-mono text-slate-400 mb-1 font-semibold">
              3. Região:
            </label>
            <select
              value={newRegion}
              onChange={(e) => handleRegionChange(e.target.value as SlotRegion)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-pink-500 font-mono cursor-pointer"
            >
              <option value="abc_paulista">ABC Paulista</option>
              <option value="sao_paulo">São Paulo</option>
              <option value="outras_localidades">Outras Regiões</option>
            </select>
          </div>

          {/* Município / Sub-região */}
          <div>
            <label className="block text-xs font-mono text-slate-400 mb-1 font-semibold">
              4. Município / Sub-região:
            </label>
            <select
              value={newSubRegion}
              onChange={(e) => handleSubRegionChange(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-pink-500 font-mono cursor-pointer"
            >
              {newRegion === 'sao_paulo' && (
                <>
                  <option value="Ibirapuera">Ibirapuera</option>
                  <option value="Outras localidades">Outras localidades</option>
                </>
              )}

              {newRegion === 'abc_paulista' && (
                <>
                  <option value="Santo André">Santo André</option>
                  <option value="São Bernardo do Campo">São Bernardo do Campo</option>
                  <option value="Outros municípios">Outros municípios</option>
                </>
              )}

              {newRegion === 'outras_localidades' && (
                <option value="Outras localidades">Outras localidades</option>
              )}
            </select>
          </div>

          {/* Local da Aula */}
          <div>
            <label className="block text-xs font-mono text-slate-400 mb-1 font-semibold">
              5. Local da Aula:
            </label>
            <select
              value={newLocationName}
              onChange={(e) => setNewLocationName(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-pink-500 font-mono cursor-pointer"
            >
              {availableLocationsForNew.map((al) => (
                <option
                  key={al.id}
                  value={al.name}
                  disabled={!al.available}
                >
                  {al.name} {al.note ? `— ${al.note}` : ''}
                </option>
              ))}
            </select>
          </div>

        </div>

        {/* Rodapé do Formulário */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-900 flex-wrap gap-3">
          <div className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-pink-400 shrink-0" />
            <span>
              Verificação automática de conflito com compromissos existentes em todas as regiões antes de salvar.
            </span>
          </div>

          <button
            type="button"
            id="btn-criar-novo-horario"
            onClick={handleCreateSlot}
            disabled={isSaving}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-500 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-pink-600/30 transition-all cursor-pointer font-mono"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Verificando e Salvando...</span>
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                <span>Salvar e Disponibilizar Horário</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 5. TABELA DA GRADE & FILTROS OPERACIONAIS */}
      {/* ========================================================= */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        
        {/* Barra Superior de Filtros */}
        <div className="p-4 sm:p-5 border-b border-slate-800 space-y-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
                <span>Grade de Horários Cadastrados</span>
                <span className="px-2 py-0.5 rounded-full bg-slate-900 text-slate-400 text-[10px] border border-slate-800">
                  {filteredSlots.length} de {slots.length}
                </span>
              </h4>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                {dateFilter
                  ? `Exibindo horários para ${formatDateBrazilian(dateFilter)}`
                  : 'Exibindo todos os horários futuros cadastrados'}
              </p>
            </div>

            {/* Busca Rápida */}
            <div className="relative min-w-[220px]">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por local, aluno..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-pink-500 font-mono"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Filtros em linha */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-2 border-t border-slate-900 text-xs">
            
            {/* Filtro Status */}
            <div>
              <label className="block text-[10px] font-mono text-slate-400 mb-1">Status:</label>
              <select
                value={statusFilter}
                onChange={(e: any) => setStatusFilter(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-pink-500 font-mono"
              >
                <option value="todos">Todos os Status</option>
                <option value="available">🟢 Apenas Disponíveis</option>
                <option value="reserved">🟡 Apenas Reservados (Pré-agendamentos)</option>
                <option value="confirmed">🔵 Apenas Confirmados</option>
                <option value="blocked">🔴 Apenas Bloqueados</option>
              </select>
            </div>

            {/* Filtro Região */}
            <div>
              <label className="block text-[10px] font-mono text-slate-400 mb-1">Região:</label>
              <select
                value={regionFilter}
                onChange={(e) => {
                  setRegionFilter(e.target.value);
                  setCityFilter('todos');
                }}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-pink-500 font-mono"
              >
                <option value="todas">Todas as Regiões</option>
                <option value="abc_paulista">ABC Paulista</option>
                <option value="sao_paulo">São Paulo</option>
                <option value="outras_localidades">Outras Regiões</option>
              </select>
            </div>

            {/* Filtro Município / Sub-região */}
            <div>
              <label className="block text-[10px] font-mono text-slate-400 mb-1">Município / Sub-região:</label>
              <select
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-pink-500 font-mono"
              >
                <option value="todos">Todos os Municípios</option>
                {regionFilter !== 'sao_paulo' && regionFilter !== 'outras_localidades' && (
                  <>
                    <option value="Santo André">Santo André</option>
                    <option value="São Bernardo do Campo">São Bernardo do Campo</option>
                    <option value="Outros municípios">Outros municípios</option>
                  </>
                )}
                {regionFilter !== 'abc_paulista' && regionFilter !== 'outras_localidades' && (
                  <>
                    <option value="Ibirapuera">Ibirapuera</option>
                    <option value="Outras localidades">Outras localidades (SP)</option>
                  </>
                )}
                {regionFilter === 'outras_localidades' && (
                  <option value="Outras localidades">Outras localidades</option>
                )}
              </select>
            </div>

            {/* Filtro Data */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] font-mono text-slate-400">Data Específica:</label>
                {dateFilter && (
                  <button
                    type="button"
                    onClick={() => setDateFilter('')}
                    className="text-[10px] font-mono text-pink-400 hover:underline"
                  >
                    Ver todas as datas
                  </button>
                )}
              </div>
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-pink-500 font-mono"
              />
            </div>

          </div>
        </div>

        {/* Lista de Linhas */}
        <div className="max-h-[520px] overflow-y-auto divide-y divide-slate-900">
          {filteredSlots.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400 font-mono space-y-2">
              <Calendar className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="font-semibold text-slate-300">Nenhum horário encontrado para os filtros selecionados.</p>
              <p className="text-slate-500">
                Selecione data, horário e região no formulário acima e clique em &quot;Salvar e Disponibilizar Horário&quot;.
              </p>
            </div>
          ) : (
            filteredSlots.map((slot) => {
              const det = getSlotDetailedStatus(slot);
              const isUsed = det.statusType === 'confirmed' || det.statusType === 'reserved' || slot.status === 'occupied' || Boolean(slot.bookingId) || Boolean(slot.bookedByStudentName);

              return (
                <div
                  key={slot.id}
                  id={`slot-card-${slot.id}`}
                  className={`p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs transition-colors hover:bg-slate-900/40 ${
                    det.statusType === 'blocked'
                      ? 'bg-rose-950/10'
                      : det.statusType === 'confirmed'
                      ? 'bg-blue-950/10'
                      : det.statusType === 'reserved'
                      ? 'bg-amber-950/10'
                      : ''
                  }`}
                >
                  {/* Informações Principais */}
                  <div className="flex items-center gap-3 flex-wrap">
                    
                    {/* Data e Horário */}
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-white text-sm">
                        {formatDateBrazilian(slot.date)}
                      </span>
                      <span className="px-2 py-0.5 rounded-lg bg-pink-950/70 border border-pink-500/40 text-pink-300 font-mono font-black text-sm">
                        {slot.time}
                      </span>
                      <span className="text-slate-500 font-mono text-[11px]">(50 min)</span>
                    </div>

                    {/* Região & Município */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-800 text-[10px] font-mono text-slate-300 font-semibold">
                        {slot.regionName || (slot.region === 'abc_paulista' ? 'ABC Paulista' : (slot.region === 'sao_paulo' ? 'São Paulo' : 'Outras Regiões'))}
                      </span>
                      <span className="px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-800 text-[10px] font-mono text-pink-300 font-semibold flex items-center gap-1">
                        <Building2 className="w-3 h-3 text-pink-400 shrink-0" />
                        <span>{slot.subRegion || slot.city || 'Geral'}</span>
                      </span>
                    </div>

                    {/* Local da Aula */}
                    {slot.locationName && (
                      <span className="px-2.5 py-0.5 rounded-lg bg-slate-900 border border-slate-800 text-[10px] font-mono text-slate-300 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-pink-400 shrink-0" />
                        <span>{slot.locationName}</span>
                        {slot.isKidsOnly && (
                          <span className="text-amber-400 font-bold ml-1">(Exclusivo Crianças)</span>
                        )}
                      </span>
                    )}

                    {/* Aluno Vinculado */}
                    {det.studentName && (
                      <span className="px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-800 text-[10px] font-mono text-white flex items-center gap-1 font-semibold">
                        <User className="w-3 h-3 text-blue-400 shrink-0" />
                        <span>Aluno: {det.studentName}</span>
                      </span>
                    )}

                  </div>

                  {/* Status & Ações */}
                  <div className="flex items-center gap-2 self-end md:self-auto flex-wrap">
                    
                    {/* Badge de Status */}
                    <span
                      className={`px-2.5 py-1 rounded-full font-mono text-[10px] uppercase font-bold border tracking-wider ${
                        det.statusType === 'available'
                          ? 'bg-emerald-950 text-emerald-400 border-emerald-500/40 shadow-sm shadow-emerald-950'
                          : det.statusType === 'confirmed'
                          ? 'bg-blue-950 text-blue-300 border-blue-500/40 shadow-sm shadow-blue-950'
                          : det.statusType === 'reserved'
                          ? 'bg-amber-950 text-amber-300 border-amber-500/40 shadow-sm shadow-amber-950'
                          : 'bg-rose-950 text-rose-300 border-rose-500/40 shadow-sm shadow-rose-950'
                      }`}
                    >
                      {det.badgeLabel}
                    </span>

                    {/* Botão Editar Horário */}
                    <button
                      type="button"
                      onClick={() => handleStartEdit(slot)}
                      className="px-2.5 py-1 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-mono flex items-center gap-1 transition-colors cursor-pointer"
                      title="Editar data, horário, região ou local"
                    >
                      <Edit2 className="w-3 h-3 text-slate-400" />
                      <span>Editar</span>
                    </button>

                    {/* Botão Bloquear / Desbloquear */}
                    <button
                      type="button"
                      onClick={() => handleToggleBlock(slot.id)}
                      disabled={isUsed && det.statusType !== 'blocked'}
                      className={`px-2.5 py-1 rounded-xl border flex items-center gap-1 font-mono text-xs transition-colors cursor-pointer ${
                        isUsed && det.statusType !== 'blocked'
                          ? 'opacity-40 cursor-not-allowed bg-slate-900 border-slate-800 text-slate-500'
                          : slot.status === 'blocked'
                          ? 'bg-emerald-950/50 hover:bg-emerald-900/50 text-emerald-300 border-emerald-500/40'
                          : 'bg-rose-950/40 hover:bg-rose-900/40 text-rose-300 border-rose-500/30'
                      }`}
                      title={slot.status === 'blocked' ? 'Desbloquear horário' : 'Bloquear horário'}
                    >
                      {slot.status === 'blocked' ? (
                        <>
                          <Unlock className="w-3 h-3 text-emerald-400" />
                          <span>Desbloquear</span>
                        </>
                      ) : (
                        <>
                          <Lock className="w-3 h-3 text-rose-400" />
                          <span>Bloquear</span>
                        </>
                      )}
                    </button>

                    {/* Botão Excluir (apenas horários não utilizados) */}
                    <button
                      type="button"
                      onClick={() => setSlotToDelete(slot)}
                      disabled={isUsed}
                      className={`p-1.5 rounded-xl border transition-colors cursor-pointer ${
                        isUsed
                          ? 'opacity-30 cursor-not-allowed bg-slate-900 border-slate-800 text-slate-600'
                          : 'bg-slate-900 hover:bg-rose-950/70 text-slate-400 hover:text-rose-300 border-slate-800 hover:border-rose-500/40'
                      }`}
                      title={
                        isUsed
                          ? 'Este horário já possui agendamento de aluno e não pode ser excluído'
                          : 'Excluir horário não utilizado'
                      }
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                  </div>

                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ========================================================= */}
      {/* 6. MODAL DE EDIÇÃO DE HORÁRIO */}
      {/* ========================================================= */}
      {editingSlot && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-pink-500" />
                <h3 className="text-base font-black text-white font-mono uppercase">
                  Editar Horário na Agenda
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingSlot(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed font-sans">
              Altere a data, horário, região ou local da aula. A alteração passará por validação anticonflito para garantir que você não tenha compromissos simultâneos.
            </p>

            <div className="space-y-3.5 text-xs font-mono">
              <div>
                <label className="block text-slate-400 mb-1">Data:</label>
                <input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-pink-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Horário:</label>
                <input
                  type="time"
                  value={editTime}
                  onChange={(e) => setEditTime(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-pink-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Região:</label>
                <select
                  value={editRegion}
                  onChange={(e) => handleEditRegionChange(e.target.value as SlotRegion)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-pink-500 cursor-pointer"
                >
                  <option value="abc_paulista">ABC Paulista</option>
                  <option value="sao_paulo">São Paulo</option>
                  <option value="outras_localidades">Outras Regiões</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Município / Sub-região:</label>
                <select
                  value={editSubRegion}
                  onChange={(e) => handleEditSubRegionChange(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-pink-500 cursor-pointer"
                >
                  {editRegion === 'sao_paulo' && (
                    <>
                      <option value="Ibirapuera">Ibirapuera</option>
                      <option value="Outras localidades">Outras localidades</option>
                    </>
                  )}
                  {editRegion === 'abc_paulista' && (
                    <>
                      <option value="Santo André">Santo André</option>
                      <option value="São Bernardo do Campo">São Bernardo do Campo</option>
                      <option value="Outros municípios">Outros municípios</option>
                    </>
                  )}
                  {editRegion === 'outras_localidades' && (
                    <option value="Outras localidades">Outras localidades</option>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Local da Aula:</label>
                <select
                  value={editLocationName}
                  onChange={(e) => setEditLocationName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-pink-500 cursor-pointer"
                >
                  {availableLocationsForEdit.map((al) => (
                    <option key={al.id} value={al.name} disabled={!al.available}>
                      {al.name} {al.note ? `— ${al.note}` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-900 font-mono text-xs">
              <button
                type="button"
                onClick={() => setEditingSlot(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={isSavingEdit}
                className="px-5 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-bold flex items-center gap-1.5 shadow-md shadow-pink-600/30 cursor-pointer"
              >
                {isSavingEdit ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <span>Salvar Alterações</span>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 7. MODAL DE CONFIRMAÇÃO DE EXCLUSÃO (HORÁRIO NÃO UTILIZADO) */}
      {/* ========================================================= */}
      {slotToDelete && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-rose-400">
              <Trash2 className="w-6 h-6 shrink-0" />
              <h3 className="text-base font-black text-white font-mono uppercase">
                Excluir Horário da Grade?
              </h3>
            </div>
            
            <p className="text-xs text-slate-300 leading-relaxed font-sans">
              Tem certeza que deseja remover o horário das <strong className="text-white font-mono">{slotToDelete.time}</strong> em <strong className="text-white font-mono">{formatDateBrazilian(slotToDelete.date)}</strong> ({slotToDelete.locationName || slotToDelete.city})?
            </p>
            <p className="text-[11px] text-slate-500 font-mono">
              * Apenas horários sem alunos vinculados podem ser excluídos.
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-900 font-mono text-xs">
              <button
                type="button"
                onClick={() => setSlotToDelete(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold cursor-pointer shadow-md shadow-rose-600/30"
              >
                Sim, Excluir Horário
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 8. MODAL DE AVISO OFICIAL: CONFLITO DE HORÁRIO */}
      {/* ========================================================= */}
      {conflictModalData && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-950 border-2 border-rose-500 rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl shadow-rose-950/60 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6 text-rose-400" />
              </div>
              <div className="space-y-1">
                <span className="text-[11px] font-mono uppercase text-rose-400 font-bold tracking-wider">
                  Validação Anticonflito da Agenda
                </span>
                <h3 className="text-xl font-black text-white font-mono tracking-tight">
                  CONFLITO DE HORÁRIO
                </h3>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/30 text-rose-200 text-sm font-semibold leading-relaxed">
              &ldquo;Este horário entra em conflito com outro compromisso existente na sua agenda.&rdquo;
            </div>

            {conflictModalData.detail && (
              <p className="text-xs text-slate-300 leading-relaxed font-sans bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                {conflictModalData.detail}
              </p>
            )}

            <div className="text-[11px] text-slate-400 font-mono space-y-1">
              <p>• O instrutor não pode ter dois compromissos simultâneos.</p>
              <p>• Região ou município diferente não elimina o conflito.</p>
              <p>• Nenhum agendamento existente foi alterado ou cancelado.</p>
            </div>

            <div className="flex items-center justify-end pt-3 border-t border-slate-900">
              <button
                type="button"
                onClick={() => setConflictModalData(null)}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-mono text-xs font-bold transition-all shadow-md cursor-pointer"
              >
                Entendi, ajustar horário
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 9. MODAL PARA INSERIR ALUNO DO WHATSAPP NA AGENDA */}
      {/* ========================================================= */}
      {studentToSchedule && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-pink-500" />
                <h3 className="text-base font-black text-white font-mono uppercase">
                  Agendar Aluno Negociado
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setStudentToSchedule(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-xs space-y-1">
              <p className="font-bold text-white text-sm">{studentToSchedule.student.fullName}</p>
              <p className="text-slate-400 font-mono">WhatsApp: {studentToSchedule.student.whatsapp}</p>
              <p className="text-pink-300 font-mono">Local sugerido: {studentToSchedule.assignedLocationName || studentToSchedule.location?.locationName || 'A definir'}</p>
            </div>

            <div className="space-y-3 text-xs font-mono">
              <div>
                <label className="block text-slate-400 mb-1">Data da Aula:</label>
                <input
                  type="date"
                  value={assignTargetDate}
                  onChange={(e) => setAssignTargetDate(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-pink-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Horário (50 min):</label>
                <input
                  type="time"
                  value={assignTargetTime}
                  onChange={(e) => setAssignTargetTime(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-pink-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Local da Aula:</label>
                <input
                  type="text"
                  value={assignLocationName}
                  onChange={(e) => setAssignLocationName(e.target.value)}
                  placeholder="Ex: Paço Municipal de Santo André"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-pink-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-900 font-mono text-xs">
              <button
                type="button"
                onClick={() => setStudentToSchedule(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleAssignStudentToSchedule}
                className="px-5 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-bold cursor-pointer shadow-md shadow-pink-600/30"
              >
                Confirmar Agendamento
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
