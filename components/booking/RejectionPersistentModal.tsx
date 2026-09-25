'use client';

import React, { useEffect } from 'react';
import { XCircle, Lock, AlertTriangle } from 'lucide-react';
import { BookingRecord, acknowledgeBookingRejection } from '@/lib/booking-store';

interface RejectionPersistentModalProps {
  booking: BookingRecord;
  onAcknowledge: () => void;
}

/**
 * POPUP ESTÁTICO DE REJEIÇÃO DO COMPROVANTE (Regras 9, 10, 11, 12, 13, 14)
 * - Não fecha com 'X', clique fora, ESC ou voltar do navegador.
 * - Permanece estático até que o aluno clique em "OK, ENTENDI".
 * - Ao confirmar, registra no backend, invalida a sessão e redireciona ao início do agendamento.
 */
export function RejectionPersistentModal({ booking, onAcknowledge }: RejectionPersistentModalProps) {
  // Previne fechamento via tecla ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.code === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, []);

  const handleConfirmOk = () => {
    // 1. Registrar no backend que a notificação foi visualizada/confirmada
    // 2. Invalidar a sessão atual e deslogar imediatamente
    acknowledgeBookingRejection(booking.id);

    // 3. Executar callback de redirecionamento para o início do agendamento
    onAcknowledge();
  };

  const reason = booking.rejectionReason?.trim() || 'Comprovante não válido ou ilegível';

  return (
    <div
      className="fixed inset-0 z-[999999] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto select-none"
      id="modal-rejeicao-estatico"
      onClick={(e) => {
        // Bloqueia clique fora
        e.preventDefault();
        e.stopPropagation();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="rejeicao-modal-title"
    >
      <div
        className="w-full max-w-lg bg-slate-900 border border-rose-500/50 rounded-3xl p-6 sm:p-8 text-center shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        id="rejeicao-modal-box"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ambient Glow */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-rose-600/15 rounded-full blur-3xl pointer-events-none" />

        {/* Static Header Badge */}
        <div className="w-16 h-16 rounded-2xl bg-rose-950/80 border border-rose-500/50 flex items-center justify-center text-rose-400 mx-auto mb-4 shadow-lg shadow-rose-950/40">
          <XCircle className="w-9 h-9 text-rose-400" />
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-950 border border-rose-500/30 text-[10px] font-mono uppercase font-bold text-rose-300 mb-2">
          <Lock className="w-3 h-3 text-rose-400" />
          <span>Processo Finalizado</span>
        </div>

        {/* Título Oficial Exato (Regra 9) */}
        <h3
          id="rejeicao-modal-title"
          className="text-xl sm:text-2xl font-black text-white uppercase font-display tracking-tight"
        >
          COMPROVANTE NÃO APROVADO
        </h3>

        {/* Subtítulo Oficial Exato */}
        <p className="text-xs sm:text-sm text-rose-300 mt-2 font-medium">
          Seu comprovante de pagamento não foi aprovado.
        </p>

        {/* Bloco com o Motivo da Rejeição Informado pelo Instrutor */}
        <div className="mt-5 p-4 rounded-2xl bg-slate-950 border border-rose-500/40 text-left space-y-1.5" id="box-motivo-rejeicao">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-rose-400 block">
            Motivo da rejeição:
          </span>
          <p className="text-xs sm:text-sm font-mono text-white font-semibold break-words leading-relaxed">
            {reason}
          </p>
        </div>

        {/* Mensagem de Encerramento e Nova Tentativa (Regra 9) */}
        <div className="mt-4 space-y-1.5 text-xs text-slate-300 leading-relaxed">
          <p className="font-semibold text-slate-200">
            Sua solicitação de agendamento foi encerrada.
          </p>
          <p className="text-slate-400">
            Para realizar uma nova tentativa, será necessário iniciar um novo processo.
          </p>
        </div>

        {/* Botão Único Obrigatório: OK, ENTENDI */}
        <div className="mt-6 pt-4 border-t border-slate-800/80">
          <button
            type="button"
            id="btn-confirmar-rejeicao-ok-entendi"
            onClick={handleConfirmOk}
            className="w-full py-3.5 px-6 rounded-xl bg-pink-600 hover:bg-pink-500 active:bg-pink-700 text-white font-black text-sm tracking-wide transition-all shadow-lg shadow-pink-600/30 cursor-pointer"
          >
            OK, ENTENDI
          </button>
        </div>

        {/* Indicador de Segurança */}
        <p className="text-[10px] text-slate-500 font-mono mt-3">
          ABC do Pedal • Atendimento e Segurança Pedagógica
        </p>
      </div>
    </div>
  );
}
