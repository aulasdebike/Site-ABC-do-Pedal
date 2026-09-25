'use client';

import React, { useMemo, useState } from 'react';
import {
  Calendar,
  Clock,
  CheckCircle,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Users,
  DollarSign,
  FileText,
  MessageCircle,
  ArrowRight,
  TrendingUp,
  MapPin,
  Sparkles,
  ExternalLink,
  Phone,
  Eye,
  Check,
  X,
  Maximize2
} from 'lucide-react';
import { BookingRecord, formatDateBrazilian, getWeekdayName, getBookingVoucherUrl, isBookingVoucherPending } from '@/lib/booking-store';

interface AdminDashboardViewProps {
  bookings: BookingRecord[];
  onNavigate: (tab: any) => void;
  onSelectBooking: (booking: BookingRecord) => void;
  onApproveVoucher: (booking: BookingRecord) => void;
  onRequestReproveVoucher: (booking: BookingRecord) => void;
  onOpenVoucherModal: (url: string) => void;
}

export function AdminDashboardView({
  bookings,
  onNavigate,
  onSelectBooking,
  onApproveVoucher,
  onRequestReproveVoucher,
  onOpenVoucherModal
}: AdminDashboardViewProps) {
  const todayStr = useMemo(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  }, []);

  // 1. Aulas de hoje e próximas aulas
  const todaysClasses = useMemo(() => {
    return bookings
      .filter((b) => b.slot?.date === todayStr && b.status !== 'cancelado' && b.status !== 'reserva-expirada')
      .sort((a, b) => (a.slot?.time || '').localeCompare(b.slot?.time || ''));
  }, [bookings, todayStr]);

  const upcomingClasses = useMemo(() => {
    return bookings
      .filter((b) => (b.slot?.date || '') > todayStr && b.status !== 'cancelado' && b.status !== 'reserva-expirada')
      .sort((a, b) => {
        const dateComp = (a.slot?.date || '').localeCompare(b.slot?.date || '');
        if (dateComp !== 0) return dateComp;
        return (a.slot?.time || '').localeCompare(b.slot?.time || '');
      })
      .slice(0, 6);
  }, [bookings, todayStr]);

  // 2. Alunos ativos e novos
  const uniqueStudents = useMemo(() => {
    const map = new Map<string, BookingRecord>();
    bookings.forEach((b) => {
      const key = b.student?.whatsapp?.replace(/\D/g, '') || b.student?.fullName || b.id;
      if (!map.has(key)) {
        map.set(key, b);
      }
    });
    return Array.from(map.values());
  }, [bookings]);

  const [currentTimestamp] = useState(() => Date.now());

  const newStudentsCount = useMemo(() => {
    const thirtyDaysAgo = currentTimestamp - 30 * 24 * 60 * 60 * 1000;
    return uniqueStudents.filter((b) => {
      const created = new Date(b.createdAt).getTime();
      return created >= thirtyDaysAgo;
    }).length;
  }, [uniqueStudents, currentTimestamp]);

  // 3. Comprovantes em análise
  const pendingVouchers = useMemo(() => {
    return bookings.filter((b) => isBookingVoucherPending(b));
  }, [bookings]);

  // 4. Pré-agendamentos / Reservas temporárias
  const preBookings = useMemo(() => {
    return bookings.filter(
      (b) =>
        b.status === 'pre-agendado' ||
        b.status === 'reserva-temporaria' ||
        b.status === 'aguardando-pagamento'
    );
  }, [bookings]);

  // 5. Pendências e alertas
  const awaitingNewPaymentBookings = useMemo(() => {
    return bookings.filter(
      (b) =>
        b.status === 'aguardando-novo-pagamento' ||
        b.status === 'comprovante-rejeitado' ||
        b.status === 'comprovante-reprovado'
    );
  }, [bookings]);

  const totalPendencies = pendingVouchers.length + preBookings.length + awaitingNewPaymentBookings.length;

  // 6. Resumo Financeiro
  const financialSummary = useMemo(() => {
    const confirmedBookings = bookings.filter((b) =>
      ['pagamento-confirmado', 'agendamento-confirmado', 'confirmado', 'concluido'].includes(b.status)
    );

    const totalRevenue = confirmedBookings.reduce(
      (acc, b) => acc + (b.price || b.location?.price || 499),
      0
    );

    // Mês atual
    const currentMonthPrefix = todayStr.slice(0, 7); // YYYY-MM
    const currentMonthRevenue = confirmedBookings
      .filter((b) => (b.slot?.date || b.createdAt || '').startsWith(currentMonthPrefix))
      .reduce((acc, b) => acc + (b.price || b.location?.price || 499), 0);

    return {
      totalRevenue,
      currentMonthRevenue,
      totalConfirmedClasses: confirmedBookings.length,
      averageTicket: confirmedBookings.length > 0 ? totalRevenue / confirmedBookings.length : 499
    };
  }, [bookings, todayStr]);

  return (
    <div className="space-y-8 animate-in fade-in duration-300" id="admin-dashboard-overview">
      {/* Top Banner de Boas-vindas e Status */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-pink-950/40 border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-pink-500/20 text-pink-400 font-mono text-[11px] font-bold border border-pink-500/30">
              Painel do Instrutor • ABC do Pedal
            </span>
            <span className="text-xs text-slate-400 font-mono">
              Hoje: {formatDateBrazilian(todayStr)} ({getWeekdayName(todayStr)})
            </span>
          </div>
          <h2 className="text-2xl font-black text-white mt-1.5 tracking-tight">
            Visão Geral das Operações
          </h2>
          <p className="text-xs text-slate-300 max-w-2xl mt-1 leading-relaxed">
            Acompanhamento em tempo real de aulas, alunos, validações financeiras e atendimento pedagógico no Método ABCDE.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onNavigate('agenda')}
            className="px-4 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-mono text-xs font-bold transition-all shadow-lg shadow-pink-950 flex items-center gap-2 cursor-pointer"
          >
            <Calendar className="w-4 h-4" />
            <span>Abrir Agenda</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('reservas')}
            className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-mono text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
          >
            <FileText className="w-4 h-4" />
            <span>Ver Reservas</span>
          </button>
        </div>
      </div>

      {/* Grid de Métricas Rápidas (Cards Informativos) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Aulas de Hoje */}
        <div
          onClick={() => onNavigate('agenda')}
          className="p-5 rounded-2xl bg-slate-950 border border-slate-800 hover:border-pink-500/50 transition-all cursor-pointer group shadow-sm"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-mono font-medium">Aulas de Hoje</span>
            <div className="w-8 h-8 rounded-lg bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400 group-hover:scale-110 transition-transform">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-white font-mono">
            {todaysClasses.length}
          </div>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between">
            <span>{upcomingClasses.length} próximas aulas agendadas</span>
            <ChevronRightIcon />
          </div>
        </div>

        {/* Alunos Ativos */}
        <div
          onClick={() => onNavigate('alunos')}
          className="p-5 rounded-2xl bg-slate-950 border border-slate-800 hover:border-pink-500/50 transition-all cursor-pointer group shadow-sm"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-mono font-medium">Alunos Cadastrados</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-white font-mono">
            {uniqueStudents.length}
          </div>
          <div className="mt-2 text-[11px] text-emerald-400 flex items-center justify-between">
            <span>+{newStudentsCount} novos no último mês</span>
            <ChevronRightIcon />
          </div>
        </div>

        {/* Comprovantes em Análise */}
        <div
          onClick={() => onNavigate('reservas')}
          className={`p-5 rounded-2xl border transition-all cursor-pointer group shadow-sm ${
            pendingVouchers.length > 0
              ? 'bg-amber-950/40 border-amber-500/60 shadow-amber-950/20'
              : 'bg-slate-950 border-slate-800 hover:border-pink-500/50'
          }`}
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-mono font-medium">Comprovantes em Análise</span>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform ${
              pendingVouchers.length > 0 ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-800 text-slate-400'
            }`}>
              <Clock className={`w-4 h-4 ${pendingVouchers.length > 0 ? 'animate-pulse' : ''}`} />
            </div>
          </div>
          <div className={`text-3xl font-black font-mono ${
            pendingVouchers.length > 0 ? 'text-amber-300' : 'text-white'
          }`}>
            {pendingVouchers.length}
          </div>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between">
            <span>{preBookings.length} pré-agendamentos pendentes</span>
            <ChevronRightIcon />
          </div>
        </div>

        {/* Faturamento do Mês */}
        <div
          onClick={() => onNavigate('financeiro')}
          className="p-5 rounded-2xl bg-slate-950 border border-slate-800 hover:border-pink-500/50 transition-all cursor-pointer group shadow-sm"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-mono font-medium">Faturamento no Mês</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-400 font-mono">
            R$ {financialSummary.currentMonthRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Total: R$ {financialSummary.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            <ChevronRightIcon />
          </div>
        </div>
      </div>

      {/* Seção de Alertas e Comprovantes em Análise com Ação Imediata */}
      {pendingVouchers.length > 0 && (
        <div className="p-6 rounded-2xl bg-slate-950 border border-amber-500/40 space-y-4 shadow-xl">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Comprovantes de Pagamento Aguardando Validação</span>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono text-xs">
                  {pendingVouchers.length} pendente(s)
                </span>
              </h3>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('comprovantes-pendentes')}
              className="text-xs font-mono text-amber-400 hover:text-amber-300 underline flex items-center gap-1 cursor-pointer font-bold"
            >
              <span>Ver todos em Comprovantes Pendentes</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pendingVouchers.map((b) => {
              const amountFormatted = (b.price || b.location?.price || 499).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
              const voucherUrl = getBookingVoucherUrl(b);
              return (
                <div
                  key={b.id}
                  className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 space-y-3.5 flex flex-col justify-between shadow-lg"
                  id={`card-conferencia-comprovante-${b.id}`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold text-amber-400 uppercase bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                        #{b.id.slice(-6)} • Em Análise
                      </span>
                      <span className="text-xs font-mono font-bold text-emerald-400">
                        R$ {amountFormatted}
                      </span>
                    </div>

                    <div>
                      <p className="font-bold text-white text-sm truncate">
                        {b.student?.fullName || 'Aluno(a)'}
                      </p>
                      <p className="text-[11px] text-slate-400 font-mono">
                        Aula: {formatDateBrazilian(b.slot?.date || '')} às {b.slot?.time || '09:00'}
                      </p>
                      {b.location?.cep && (
                        <p className="text-[10px] text-pink-400 font-mono truncate">
                          Local: CEP {b.location.cep}
                        </p>
                      )}
                    </div>

                    {/* IMAGEM DO COMPROVANTE IMEDIATAMENTE VISÍVEL PARA CONFERÊNCIA */}
                    {voucherUrl ? (
                      <div className="space-y-1.5 pt-1">
                        <div className="flex items-center justify-between text-[10px] font-mono text-slate-300">
                          <span className="font-bold text-amber-300 flex items-center gap-1">
                            <Eye className="w-3 h-3 text-amber-400" />
                            Comprovante Anexado:
                          </span>
                          <span className="text-[10px] text-slate-400">Clique p/ ampliar</span>
                        </div>

                        <div 
                          className="relative group cursor-pointer overflow-hidden rounded-xl border border-slate-700 bg-black/90 flex flex-col items-center justify-center p-2 transition-all hover:border-pink-500/60 shadow-inner"
                          onClick={() => onOpenVoucherModal(voucherUrl)}
                          title="Clique para conferir e ampliar comprovante"
                        >
                          <img
                            src={voucherUrl}
                            alt={`Comprovante de pagamento de ${b.student?.fullName || 'Aluno'}`}
                            className="w-full max-h-48 object-contain rounded-lg transition-transform duration-200 group-hover:scale-[1.02]"
                          />
                          <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-xs font-mono font-bold gap-1.5 backdrop-blur-[1px]">
                            <Maximize2 className="w-4 h-4 text-pink-400" />
                            <span>Ampliar Comprovante</span>
                          </div>
                        </div>

                        {b.voucherFileName && (
                          <p className="text-[10px] font-mono text-slate-400 truncate">
                            Arquivo: <span className="text-slate-300">{b.voucherFileName}</span>
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-center font-mono text-[11px] text-slate-500">
                        Nenhuma imagem anexada.
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 pt-2 border-t border-slate-800/80">
                    {voucherUrl && (
                      <button
                        type="button"
                        onClick={() => onOpenVoucherModal(voucherUrl)}
                        className="py-1.5 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-mono text-slate-200 flex items-center justify-center gap-1 transition-colors cursor-pointer"
                        title="Visualizar / Ampliar comprovante"
                      >
                        <Eye className="w-3 h-3 text-pink-400" />
                        <span>Ver</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onApproveVoucher(b)}
                      className="flex-1 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-[11px] font-mono text-white font-bold flex items-center justify-center gap-1 transition-all cursor-pointer shadow"
                      title="Aprovar comprovante e confirmar aula"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Aprovar</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onRequestReproveVoucher(b)}
                      className="px-2.5 py-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900 border border-rose-500/40 text-[11px] font-mono text-rose-300 font-bold transition-all cursor-pointer flex items-center gap-1"
                      title="Reprovar comprovante (solicitar novo anexo)"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Reprovar</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Programação do Dia e Próximas Aulas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Aulas de Hoje */}
        <div className="lg:col-span-1 p-6 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-pink-400" />
              <h3 className="font-bold text-white text-base">Aulas de Hoje</h3>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              {formatDateBrazilian(todayStr)}
            </span>
          </div>

          {todaysClasses.length === 0 ? (
            <div className="p-8 text-center text-slate-500 space-y-2 rounded-xl bg-slate-900/40 border border-slate-900">
              <Calendar className="w-8 h-8 mx-auto text-slate-600 opacity-50" />
              <p className="text-xs">Nenhuma aula agendada para hoje.</p>
              <button
                type="button"
                onClick={() => onNavigate('agenda')}
                className="text-[11px] text-pink-400 hover:text-pink-300 underline font-mono cursor-pointer"
              >
                Abrir horários na agenda
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {todaysClasses.map((b) => (
                <div
                  key={b.id}
                  className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2 hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-pink-400">
                      {b.slot?.time || '09:00'}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-[10px] font-bold">
                      Confirmada
                    </span>
                  </div>
                  <div>
                    <p className="font-bold text-white text-sm">
                      {b.student?.fullName || 'Aluno'}
                    </p>
                    <p className="text-[11px] text-slate-400 truncate">
                      {b.location?.locationName || b.location?.address || 'Parque do Ibirapuera'}
                    </p>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
                    {b.student?.whatsapp && (
                      <a
                        href={`https://wa.me/55${b.student.whatsapp.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-mono text-[11px]"
                      >
                        <MessageCircle className="w-3 h-3" />
                        <span>WhatsApp</span>
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        onSelectBooking(b);
                        onNavigate('evolucao');
                      }}
                      className="text-pink-400 hover:text-pink-300 text-[11px] font-mono cursor-pointer"
                    >
                      Evolução ABCDE →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Próximas Aulas na Grade */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-pink-400" />
              <h3 className="font-bold text-white text-base">Próximas Aulas Agendadas</h3>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('agenda')}
              className="text-xs font-mono text-pink-400 hover:text-pink-300 underline flex items-center gap-1 cursor-pointer"
            >
              <span>Ver calendário completo</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {upcomingClasses.length === 0 ? (
            <div className="p-8 text-center text-slate-500 space-y-2 rounded-xl bg-slate-900/40 border border-slate-900">
              <Clock className="w-8 h-8 mx-auto text-slate-600 opacity-50" />
              <p className="text-xs">Nenhuma próxima aula agendada no momento.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 font-mono text-slate-400">
                    <th className="pb-2">Data & Horário</th>
                    <th className="pb-2">Aluno</th>
                    <th className="pb-2">Local</th>
                    <th className="pb-2">Status</th>
                    <th className="pb-2 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {upcomingClasses.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-900/40 transition-colors">
                      <td className="py-3 font-mono font-medium text-slate-200">
                        <div>{formatDateBrazilian(b.slot?.date || '')}</div>
                        <div className="text-[11px] text-pink-400 font-bold">{b.slot?.time || '09:00'}</div>
                      </td>
                      <td className="py-3">
                        <div className="font-bold text-white">{b.student?.fullName || 'Aluno'}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{b.student?.whatsapp || '-'}</div>
                      </td>
                      <td className="py-3 text-slate-300 max-w-[180px] truncate">
                        {b.location?.locationName || (b.location?.cep ? `CEP ${b.location.cep}` : 'Parque do Ibirapuera')}
                      </td>
                      <td className="py-3">
                        <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-mono text-[10px]">
                          {b.status}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              onSelectBooking(b);
                              onNavigate('alunos');
                            }}
                            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-mono transition-colors cursor-pointer"
                          >
                            Ficha
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              onSelectBooking(b);
                              onNavigate('evolucao');
                            }}
                            className="px-2.5 py-1 rounded bg-pink-950/60 hover:bg-pink-900 border border-pink-500/30 text-pink-300 text-[11px] font-mono transition-colors cursor-pointer"
                          >
                            Evolução
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Atalhos Rápidos para o Instrutor */}
      <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
        <h4 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
          Acesso Rápido aos Módulos de Gestão
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { id: 'agenda', label: 'Gestão de Horários', icon: Calendar, desc: 'Abrir e bloquear slots' },
            { id: 'alunos', label: 'Cadastro de Alunos', icon: Users, desc: 'Fichas e históricos' },
            { id: 'evolucao', label: 'Método ABCDE', icon: Sparkles, desc: 'Evolução e certificados' },
            { id: 'reservas', label: 'Reservas & PIX', icon: FileText, desc: 'Conferir pagamentos' },
            { id: 'automacao', label: 'Disparador WhatsApp', icon: MessageCircle, desc: 'Lembretes e avisos' },
            { id: 'financeiro', label: 'Relatórios Financeiros', icon: DollarSign, desc: 'Receitas e despesas' },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                className="p-3.5 rounded-xl bg-slate-900 hover:bg-slate-800/80 border border-slate-800 hover:border-pink-500/40 text-left transition-all group cursor-pointer"
              >
                <div className="w-7 h-7 rounded-lg bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400 mb-2 group-hover:scale-110 transition-transform">
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div className="text-xs font-bold text-white group-hover:text-pink-300 transition-colors">
                  {item.label}
                </div>
                <div className="text-[10px] text-slate-500 font-mono mt-0.5 truncate">
                  {item.desc}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ChevronRightIcon() {
  return <ArrowRight className="w-3 h-3 text-slate-500" />;
}
