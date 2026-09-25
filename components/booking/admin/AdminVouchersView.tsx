'use client';

import React, { useMemo, useState } from 'react';
import {
  FileCheck,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Search,
  Eye,
  Check,
  X,
  Maximize2,
  Calendar,
  Clock,
  MapPin,
  User,
  Phone,
  Mail,
  DollarSign,
  MessageCircle,
  ShieldCheck,
  ChevronRight,
  Filter,
  FileText,
  RotateCcw,
  Sparkles
} from 'lucide-react';
import {
  BookingRecord,
  formatDateBrazilian,
  getBookingVoucherUrl,
  isBookingVoucherPending,
  isBookingAwaitingInstructorSchedule
} from '@/lib/booking-store';

interface AdminVouchersViewProps {
  bookings: BookingRecord[];
  onNavigate: (tab: any) => void;
  onSelectBooking: (booking: BookingRecord) => void;
  onApproveVoucher: (booking: BookingRecord) => void;
  onRequestReproveVoucher: (booking: BookingRecord) => void;
  onOpenVoucherModal: (url: string) => void;
}

export function AdminVouchersView({
  bookings,
  onNavigate,
  onSelectBooking,
  onApproveVoucher,
  onRequestReproveVoucher,
  onOpenVoucherModal
}: AdminVouchersViewProps) {
  const [filterMode, setFilterMode] = useState<'pending' | 'approved' | 'reproved' | 'all'>('pending');
  const [searchTerm, setSearchTerm] = useState('');

  // 1. Todos os agendamentos que possuem qualquer comprovante (anexado pelo site, WhatsApp, plano avulso ou pacote)
  const allVoucherBookings = useMemo(() => {
    return bookings.filter((b) => {
      if (isBookingVoucherPending(b)) return true;
      const hasUrl = Boolean(getBookingVoucherUrl(b));
      const hasAttempts = Boolean(b.voucherAttempts && b.voucherAttempts.length > 0);
      const hasSentAt = Boolean(b.voucherSentAt);
      const hasFileName = Boolean(b.voucherFileName);
      const isStatusPending =
        b.status === 'aguardando-confirmacao-instrutor' ||
        b.status === 'comprovante-enviado' ||
        b.status === 'pagamento-enviado' ||
        (b as any).status === 'comprovante-em-analise' ||
        b.status === 'comprovante-reprovado' ||
        b.status === 'comprovante-rejeitado';

      return hasUrl || hasAttempts || hasSentAt || hasFileName || isStatusPending;
    });
  }, [bookings]);

  // 2. Contagens segmentadas
  const pendingList = useMemo(() => {
    return allVoucherBookings.filter((b) => isBookingVoucherPending(b));
  }, [allVoucherBookings]);

  const approvedList = useMemo(() => {
    return allVoucherBookings.filter(
      (b) =>
        b.status === 'agendamento-confirmado' ||
        b.status === 'pagamento-confirmado' ||
        b.status === 'confirmado' ||
        b.status === 'concluido'
    );
  }, [allVoucherBookings]);

  const reprovedList = useMemo(() => {
    return allVoucherBookings.filter(
      (b) =>
        (b.status === 'comprovante-reprovado' ||
          b.status === 'comprovante-rejeitado' ||
          b.status === 'pagamento-nao-confirmado' ||
          b.status === 'pedido-rejeitado') &&
        !isBookingVoucherPending(b)
    );
  }, [allVoucherBookings]);

  // 3. Filtragem de acordo com o sub-filtro ativo
  const filteredByMode = useMemo(() => {
    if (filterMode === 'pending') return pendingList;
    if (filterMode === 'approved') return approvedList;
    if (filterMode === 'reproved') return reprovedList;
    return allVoucherBookings;
  }, [filterMode, pendingList, approvedList, reprovedList, allVoucherBookings]);

  // 4. Busca textual
  const finalFiltered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return filteredByMode;

    return filteredByMode.filter((b) => {
      const studentName = (b.student?.fullName || '').toLowerCase();
      const studentWa = (b.student?.whatsapp || '').replace(/\D/g, '');
      const studentCpf = (b.student?.cpf || '').replace(/\D/g, '');
      const studentEmail = (b.student?.email || '').toLowerCase();
      const bookingId = (b.id || '').toLowerCase();
      const planName = (b.productName || (b as any).plan?.name || '').toLowerCase();
      const locationName = (b.location?.address || b.location?.locationName || '').toLowerCase();

      return (
        studentName.includes(term) ||
        studentWa.includes(term) ||
        studentCpf.includes(term) ||
        studentEmail.includes(term) ||
        bookingId.includes(term) ||
        planName.includes(term) ||
        locationName.includes(term)
      );
    });
  }, [filteredByMode, searchTerm]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300" id="admin-vouchers-module">
      {/* Banner de Cabeçalho Oficial */}
      <div className="bg-slate-950 p-5 sm:p-6 rounded-2xl border border-slate-800 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 font-mono text-xs font-bold border border-amber-500/30 flex items-center gap-1.5">
              <FileCheck className="w-3.5 h-3.5" />
              Controle Oficial de Comprovantes
            </span>
            {pendingList.length > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 text-xs font-mono font-extrabold animate-pulse">
                {pendingList.length} aguardando análise
              </span>
            )}
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white">
            Comprovantes de Pagamento Pendentes
          </h2>
          <p className="text-xs text-slate-400 max-w-2xl font-light">
            Todo comprovante anexado por alunos via agendamento web, WhatsApp ou contratação direta entra obrigatoriamente nesta central para conferência imediata, aprovação de vaga ou solicitação de novo comprovante.
          </p>
        </div>

        {/* Resumo Rápido em Cards */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          <div className="px-3.5 py-2 rounded-xl bg-slate-900 border border-amber-500/30 text-center">
            <span className="text-[10px] uppercase font-mono text-amber-400 font-bold block">
              Em Análise
            </span>
            <span className="text-lg font-black text-amber-300 font-mono">
              {pendingList.length}
            </span>
          </div>
          <div className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-center">
            <span className="text-[10px] uppercase font-mono text-emerald-400 font-bold block">
              Aprovados
            </span>
            <span className="text-lg font-black text-emerald-300 font-mono">
              {approvedList.length}
            </span>
          </div>
          <div className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-center">
            <span className="text-[10px] uppercase font-mono text-rose-400 font-bold block">
              Reprovados
            </span>
            <span className="text-lg font-black text-rose-300 font-mono">
              {reprovedList.length}
            </span>
          </div>
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-slate-950 p-4 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto no-scrollbar pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setFilterMode('pending')}
            className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              filterMode === 'pending'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-950/40'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <span>Em Análise</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                filterMode === 'pending' ? 'bg-slate-950/20 text-slate-950 font-black' : 'bg-slate-800 text-slate-300'
              }`}
            >
              {pendingList.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilterMode('approved')}
            className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              filterMode === 'approved'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/40'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <span>Aprovados</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-slate-800 text-slate-300">
              {approvedList.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilterMode('reproved')}
            className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              filterMode === 'reproved'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-950/40'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <span>Reprovados</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-slate-800 text-slate-300">
              {reprovedList.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilterMode('all')}
            className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              filterMode === 'all'
                ? 'bg-pink-600 text-white shadow-md shadow-pink-950/40'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <span>Todos</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-slate-800 text-slate-300">
              {allVoucherBookings.length}
            </span>
          </button>
        </div>

        {/* Input de Busca */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por aluno, WhatsApp ou ID..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 transition-colors"
          />
        </div>
      </div>

      {/* Lista de Comprovantes */}
      {finalFiltered.length === 0 ? (
        <div className="p-12 text-center bg-slate-950 border border-slate-800 rounded-2xl text-slate-500 space-y-3">
          <FileCheck className="w-12 h-12 mx-auto opacity-30 text-slate-400" />
          <p className="text-sm font-bold text-slate-300">
            {filterMode === 'pending'
              ? 'Nenhum comprovante pendente de análise no momento.'
              : 'Nenhum registro encontrado para este filtro.'}
          </p>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Assim que qualquer aluno anexar um novo comprovante pelo fluxo de agendamento ou WhatsApp, ele aparecerá aqui instantaneamente.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {finalFiltered.map((b) => {
            const voucherUrl = getBookingVoucherUrl(b);
            const isPending = isBookingVoucherPending(b);
            const isApproved =
              b.status === 'agendamento-confirmado' ||
              b.status === 'pagamento-confirmado' ||
              b.status === 'confirmado' ||
              b.status === 'concluido';
            const isReproved =
              b.status === 'comprovante-reprovado' ||
              b.status === 'comprovante-rejeitado' ||
              b.status === 'pagamento-nao-confirmado' ||
              b.status === 'pedido-rejeitado';

            const amountFormatted = (b.price || b.location?.price || 499).toLocaleString('pt-BR', {
              minimumFractionDigits: 2
            });

            const scheduleText = isBookingAwaitingInstructorSchedule(b)
              ? 'Aguardando confirmação de horário do instrutor'
              : b.slot?.date
              ? `${formatDateBrazilian(b.slot.date)} às ${b.slot.time || '09:00'}`
              : 'Horário flexível / A definir';

            const attemptsCount = b.voucherAttempts?.length || 1;
            const latestAttempt = b.voucherAttempts && b.voucherAttempts.length > 0
              ? b.voucherAttempts[b.voucherAttempts.length - 1]
              : null;

            return (
              <div
                key={b.id}
                className={`p-5 rounded-2xl bg-slate-950 border flex flex-col justify-between space-y-4 shadow-xl transition-all ${
                  isPending
                    ? 'border-amber-500/40 shadow-amber-950/20'
                    : isApproved
                    ? 'border-emerald-500/30'
                    : 'border-rose-500/30'
                }`}
                id={`card-voucher-${b.id}`}
              >
                <div className="space-y-3.5">
                  {/* Status Badge & ID */}
                  <div className="flex items-center justify-between gap-2 border-b border-slate-900 pb-3">
                    {isPending ? (
                      <span className="px-2.5 py-1 rounded-md bg-amber-500/15 border border-amber-500/40 text-amber-300 font-mono text-[11px] font-black flex items-center gap-1.5 animate-pulse">
                        <span className="w-2 h-2 rounded-full bg-amber-400" />
                        COMPROVANTE EM ANÁLISE
                      </span>
                    ) : isApproved ? (
                      <span className="px-2.5 py-1 rounded-md bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 font-mono text-[11px] font-bold flex items-center gap-1.5">
                        <CheckCircle className="w-3.5 h-3.5" />
                        COMPROVANTE APROVADO
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-md bg-rose-500/15 border border-rose-500/40 text-rose-300 font-mono text-[11px] font-bold flex items-center gap-1.5">
                        <XCircle className="w-3.5 h-3.5" />
                        COMPROVANTE REPROVADO
                      </span>
                    )}

                    <div className="text-right">
                      <span className="text-xs font-mono font-bold text-emerald-400 block">
                        R$ {amountFormatted}
                      </span>
                      <span className="text-[10px] font-mono text-slate-500">
                        #{b.id.slice(-6)}
                      </span>
                    </div>
                  </div>

                  {/* Dados do Aluno */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-white text-sm sm:text-base truncate">
                        {b.student?.fullName || 'Aluno(a)'}
                      </h3>
                      {attemptsCount > 1 && (
                        <span className="px-2 py-0.5 rounded bg-pink-500/20 text-pink-300 text-[10px] font-mono">
                          {attemptsCount}ª tentativa
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px] font-mono text-slate-400 pt-1">
                      <div className="flex items-center gap-1.5 truncate">
                        <Phone className="w-3 h-3 text-emerald-400 shrink-0" />
                        {b.student?.whatsapp ? (
                          <a
                            href={`https://wa.me/55${b.student.whatsapp.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-emerald-300 underline"
                          >
                            {b.student.whatsapp}
                          </a>
                        ) : (
                          'Sem WhatsApp'
                        )}
                      </div>

                      {b.student?.cpf && (
                        <div className="flex items-center gap-1.5 truncate">
                          <User className="w-3 h-3 text-pink-400 shrink-0" />
                          <span>CPF: {b.student.cpf}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Dados da Contratação e Aula */}
                  <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-850 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between text-slate-300">
                      <span className="text-slate-400 font-mono text-[11px]">Plano:</span>
                      <strong className="text-white font-medium">
                        {b.productName || (b as any).plan?.name || 'Metodologia ABCDE (Aula Prática)'}
                      </strong>
                    </div>

                    <div className="flex items-center justify-between text-slate-300">
                      <span className="text-slate-400 font-mono text-[11px]">Horário:</span>
                      <span className="text-pink-300 font-mono text-[11px]">
                        {scheduleText}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-slate-300">
                      <span className="text-slate-400 font-mono text-[11px]">Local:</span>
                      <span className="text-slate-300 text-[11px] truncate max-w-[180px]">
                        {b.location?.address || 'Parque do Ibirapuera'}
                      </span>
                    </div>

                    {b.voucherSentAt && (
                      <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-[10px] font-mono text-slate-500">
                        <span>Enviado em:</span>
                        <span>{new Date(b.voucherSentAt).toLocaleString('pt-BR')}</span>
                      </div>
                    )}
                  </div>

                  {/* Motivo de Reprovação (se aplicável) */}
                  {isReproved && (b.rejectionReason || b.notes) && (
                    <div className="p-2.5 rounded-xl bg-rose-950/40 border border-rose-500/30 text-xs space-y-1">
                      <span className="text-[10px] font-mono text-rose-300 font-bold uppercase block">
                        Motivo da Reprovação Informado:
                      </span>
                      <p className="text-slate-300 text-[11px]">
                        {b.rejectionReason || b.notes}
                      </p>
                    </div>
                  )}

                  {/* Campo de Visualização do Comprovante */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <span className="font-bold text-slate-300 flex items-center gap-1.5">
                        <Eye className="w-3.5 h-3.5 text-amber-400" />
                        <span>Comprovante Anexado:</span>
                      </span>
                      {voucherUrl && (
                        <button
                          type="button"
                          onClick={() => onOpenVoucherModal(voucherUrl)}
                          className="text-pink-400 hover:text-pink-300 font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Maximize2 className="w-3 h-3" />
                          <span>Ampliar</span>
                        </button>
                      )}
                    </div>

                    {voucherUrl ? (
                      <div
                        onClick={() => onOpenVoucherModal(voucherUrl)}
                        className="relative group cursor-pointer overflow-hidden rounded-xl border border-slate-700 bg-black/90 p-2 flex flex-col items-center justify-center transition-all hover:border-pink-500/60 shadow-inner"
                        title="Clique para conferir e ampliar comprovante"
                      >
                        <img
                          src={voucherUrl}
                          alt={`Comprovante de ${b.student?.fullName || 'Aluno'}`}
                          className="w-full max-h-52 object-contain rounded-lg transition-transform duration-200 group-hover:scale-[1.02]"
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-xs font-mono font-bold gap-1.5 backdrop-blur-[1px]">
                          <Maximize2 className="w-4 h-4 text-pink-400" />
                          <span>Ampliar Comprovante</span>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-center font-mono text-xs text-slate-500">
                        Nenhuma imagem vinculada.
                      </div>
                    )}

                    {b.voucherFileName && (
                      <p className="text-[10px] font-mono text-slate-400 truncate">
                        Arquivo: <span className="text-slate-300">{b.voucherFileName}</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Ações do Instrutor: APROVAR ou REPROVAR */}
                <div className="space-y-2 pt-3 border-t border-slate-900">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onApproveVoucher(b)}
                      className={`flex-1 py-2.5 rounded-xl font-mono text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow ${
                        isApproved
                          ? 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                          : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/40'
                      }`}
                      title="Aprovar comprovante e confirmar aula"
                    >
                      <Check className="w-4 h-4" />
                      <span>{isApproved ? 'Re-confirmar' : 'Aprovar Comprovante'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onRequestReproveVoucher(b)}
                      className="px-3.5 py-2.5 rounded-xl bg-rose-950/60 hover:bg-rose-900 border border-rose-500/40 text-xs font-mono text-rose-300 font-bold transition-all cursor-pointer flex items-center gap-1.5"
                      title="Reprovar comprovante (solicitar novo anexo)"
                    >
                      <X className="w-4 h-4" />
                      <span>Reprovar</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      onSelectBooking(b);
                      onNavigate('alunos');
                    }}
                    className="w-full py-1.5 rounded-lg bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-slate-200 text-[11px] font-mono flex items-center justify-center gap-1 transition-colors"
                  >
                    <span>Ver Ficha Completa do Aluno</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
