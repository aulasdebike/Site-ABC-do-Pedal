'use client';

import React, { useState } from 'react';
import {
  Settings2,
  DollarSign,
  Shield,
  Clock,
  MapPin,
  RefreshCw,
  Download,
  Copy,
  Check,
  Radio,
  FileText,
  Lock,
  Smartphone,
  Mail,
  AlertCircle
} from 'lucide-react';
import { BookingRecord, TimeSlot } from '@/lib/booking-store';

interface AdminSettingsViewProps {
  bookings: BookingRecord[];
  slots: TimeSlot[];
  onManualSync: () => void;
  isSyncing: boolean;
}

export function AdminSettingsView({
  bookings,
  slots,
  onManualSync,
  isSyncing
}: AdminSettingsViewProps) {
  const [copiedKey, setCopiedKey] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const pixKey = '11950438948';
  const pixBeneficiary = 'ABC do Pedal Ciclismo Ltda';
  const pixBank = 'PagBank / Banco Central do Brasil';

  const handleCopyPix = () => {
    navigator.clipboard.writeText(pixKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleExportData = () => {
    try {
      const exportObject = {
        exportedAt: new Date().toISOString(),
        system: 'ABC do Pedal - Painel do Instrutor',
        version: '2.0.0',
        totalBookings: bookings.length,
        totalSlots: slots.length,
        bookings,
        slots,
        settings: {
          pixKey,
          pixBeneficiary,
          pixBank,
          temporaryReservationMinutes: 60,
          regularizationHours: 24
        }
      };

      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportObject, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `abc_do_pedal_backup_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      setFeedback('Backup completo exportado em JSON com sucesso!');
      setTimeout(() => setFeedback(null), 4000);
    } catch (err) {
      console.error('Erro ao exportar dados:', err);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300" id="admin-settings-module">
      {/* Header */}
      <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-pink-500/20 text-pink-400 font-mono text-[10px] font-bold border border-pink-500/30">
              Sistema & Parâmetros
            </span>
            <span className="text-xs text-slate-400 font-mono">
              Versão 2.0 • Painel Central
            </span>
          </div>
          <h2 className="text-2xl font-black text-white mt-1">
            Configurações Administrativas
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Gerencie os parâmetros operacionais, dados de recebimento PIX, regras de tolerância e sincronização.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onManualSync}
            disabled={isSyncing}
            className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-mono text-xs font-bold flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-pink-400 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar Nuvem'}</span>
          </button>
          <button
            type="button"
            onClick={handleExportData}
            className="px-4 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-mono text-xs font-bold flex items-center gap-2 shadow-lg shadow-pink-950 transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar Backup</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div className="p-4 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 text-xs font-mono flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Grid de Configurações */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Dados Bancários & PIX */}
        <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 space-y-4 shadow-xl">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-pink-400" />
            <h3 className="font-bold text-white text-base">Dados Oficiais para Recebimento (PIX)</h3>
          </div>
          <p className="text-xs text-slate-400">
            Chave e titular exibidos aos alunos na etapa de finalização de reserva e pagamento.
          </p>

          <div className="space-y-3 font-mono text-xs">
            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
              <span className="text-slate-500 text-[10px] uppercase block">Chave PIX (Telefone)</span>
              <div className="flex items-center justify-between">
                <span className="text-white font-bold text-sm tracking-wider">{pixKey}</span>
                <button
                  type="button"
                  onClick={handleCopyPix}
                  className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-pink-400 flex items-center gap-1 text-[10px] transition-colors cursor-pointer"
                >
                  {copiedKey ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedKey ? 'Copiado' : 'Copiar'}</span>
                </button>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
              <span className="text-slate-500 text-[10px] uppercase block">Titular / Favorecido</span>
              <span className="text-slate-200 font-bold block">{pixBeneficiary}</span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
              <span className="text-slate-500 text-[10px] uppercase block">Instituição Financeira</span>
              <span className="text-slate-200 block">{pixBank}</span>
            </div>
          </div>
        </div>

        {/* 2. Prazos e Tolerâncias Operacionais */}
        <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 space-y-4 shadow-xl">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-pink-400" />
            <h3 className="font-bold text-white text-base">Prazos e Regras Operacionais</h3>
          </div>
          <p className="text-xs text-slate-400">
            Regras de retenção de vagas e regularização de comprovantes.
          </p>

          <div className="space-y-3 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="font-bold text-white block">Reserva Temporária</span>
                <span className="text-slate-400 text-[11px]">Tempo máximo para envio do comprovante</span>
              </div>
              <span className="px-2.5 py-1 rounded-lg bg-pink-500/20 text-pink-300 font-mono font-bold text-xs">
                60 minutos
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="font-bold text-white block">Prazo de Regularização</span>
                <span className="text-slate-400 text-[11px]">Após reprovação do comprovante</span>
              </div>
              <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 font-mono font-bold text-xs">
                24 horas
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="font-bold text-white block">Cancelamento / Reagendamento</span>
                <span className="text-slate-400 text-[11px]">Antecedência mínima sem taxa</span>
              </div>
              <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 font-mono font-bold text-xs">
                24h antes
              </span>
            </div>
          </div>
        </div>

        {/* 3. Canais de Contato e Comunicação Oficial */}
        <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 space-y-4 shadow-xl">
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-pink-400" />
            <h3 className="font-bold text-white text-base">Canais Oficiais de Contato</h3>
          </div>
          <p className="text-xs text-slate-400">
            Contatos do instrutor utilizados no rodapé, WhatsApp e comunicações automáticas.
          </p>

          <div className="space-y-3 font-mono text-xs">
            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-slate-500 text-[10px] uppercase block">WhatsApp do Instrutor</span>
                <span className="text-white font-bold">(11) 95043-8948</span>
              </div>
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px]">
                Ativo
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-slate-500 text-[10px] uppercase block">E-mail Institucional</span>
                <span className="text-slate-200">aulasdebike@gmail.com</span>
              </div>
              <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px]">
                Oficial
              </span>
            </div>
          </div>
        </div>

        {/* 4. Sincronização e Nuvem (Firestore) */}
        <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 space-y-4 shadow-xl">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-pink-400" />
            <h3 className="font-bold text-white text-base">Nuvem & Banco de Dados (Firestore)</h3>
          </div>
          <p className="text-xs text-slate-400">
            Sincronização em tempo real e persistência permanente dos agendamentos e horários.
          </p>

          <div className="space-y-3 font-mono text-xs">
            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
              <span className="text-slate-500 text-[10px] uppercase block">Status da Conexão</span>
              <div className="flex items-center gap-2 text-emerald-400 font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Conectado em tempo real com o Firestore</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
              <span className="text-slate-500 text-[10px] uppercase block">Coleções Ativas</span>
              <span className="text-slate-300">bookings ({bookings.length} docs) • slots ({slots.length} docs)</span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
              <span className="text-slate-500 text-[10px] uppercase block">Projeto Google Cloud</span>
              <span className="text-slate-400 text-[11px] truncate block">
                ai-studio-abcdopedal-5030920a-87df-496a-b0e8-ad999f9ec2af
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
