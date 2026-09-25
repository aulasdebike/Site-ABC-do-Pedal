'use client';

import React from 'react';
import { X, ShieldCheck, Clock, CloudRain, AlertTriangle, FileText } from 'lucide-react';

interface PolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PolicyModal({ isOpen, onClose }: PolicyModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div 
        className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto bg-slate-950 border border-slate-800 rounded-2xl p-6 sm:p-8 text-slate-200 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-slate-900 text-slate-400 hover:text-white transition-colors"
          aria-label="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Política da Aula & Diretrizes do Programa</h3>
            <p className="text-xs text-pink-400 font-mono">Programa Aprender a Pedalar — ABC do Pedal</p>
          </div>
        </div>

        <div className="space-y-6 text-sm text-slate-300 leading-relaxed font-light">
          
          {/* Nature of the program */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
            <h4 className="text-white font-semibold flex items-center gap-2 mb-2">
              <ShieldCheck className="w-4 h-4 text-pink-400" />
              1. Natureza do Programa
            </h4>
            <p>
              O <strong>Aprender a Pedalar</strong> é um programa pedagógico e esportivo individualizado de ensino de bicicleta. Ele <strong>não constitui terapia, tratamento clínico, acompanhamento psicológico ou serviço de reabilitação fisioterapêutica</strong>.
            </p>
          </div>

          {/* Cancellation */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
            <h4 className="text-white font-semibold flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-pink-400" />
              2. Política de Cancelamento e Remarcação (Regra de 24 Horas)
            </h4>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                <strong>Com 24 horas ou mais de antecedência:</strong> O cancelamento ou remarcação é livremente permitido, sem cobrança de qualquer taxa.
              </li>
              <li>
                <strong>Com menos de 24 horas de antecedência:</strong> Cancelamentos sem justificativa médica ou de força maior estarão sujeitos a uma <strong>taxa de R$ 50,00</strong> para liberação de novo horário de remarcação.
              </li>
              <li>
                Ausência não comunicada (no-show) com menos de 24 horas poderá ser computada como encontro realizado, sem direito a reembolso do valor investido.
              </li>
              <li>
                Casos excepcionais comprovados (doença, emergência médica ou falecimento) serão prontamente analisados com humanidade pelo instrutor.
              </li>
            </ul>
          </div>

          {/* Weather */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
            <h4 className="text-white font-semibold flex items-center gap-2 mb-2">
              <CloudRain className="w-4 h-4 text-pink-400" />
              3. Condições Climáticas (Garantia de Segurança)
            </h4>
            <p>
              A segurança do aluno é prioridade inegociável. Caso chuvas fortes, solo escorregadio ou ventos adversos comprometam a integridade física e o aprendizado, <strong>o encontro será remarcado sem qualquer custo</strong>, mediante avaliação técnica prévia do instrutor.
            </p>
          </div>

          {/* Punctuality */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
            <h4 className="text-white font-semibold flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-pink-400" />
              4. Pontualidade Rigorosa
            </h4>
            <p>
              O encontro tem duração exata de <strong>50 minutos</strong> e começa impreterivelmente no horário agendado. Em virtude do respeito à grade de outros alunos, <strong>não há tolerância para atrasos</strong> e o tempo perdido não será acrescido ao final da sessão.
            </p>
          </div>

          {/* Investment */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
            <h4 className="text-white font-semibold flex items-center gap-2 mb-2">
              <span className="text-pink-400 font-bold">R$</span>
              5. Investimento no Aprendizado
            </h4>
            <p>
              A contratação de R$ 499,00 remunera o <strong>Programa Aprender a Pedalar</strong>, e não uma aula avulsa de bicicleta. O programa é considerado concluído quando o aluno atinge o objetivo principal: pedalar e controlar a bicicleta com autonomia e segurança (Etapa C — Controle).
            </p>
          </div>

        </div>

        <div className="mt-6 pt-4 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-bold text-sm transition-colors shadow-lg shadow-pink-600/20"
          >
            Entendi e concordo
          </button>
        </div>
      </div>
    </div>
  );
}
