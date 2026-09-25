'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  DollarSign,
  TrendingUp,
  ArrowDownRight,
  ArrowUpRight,
  Plus,
  Trash2,
  Calendar,
  Filter,
  PieChart,
  BarChart3,
  Layers,
  FileSpreadsheet,
  CheckCircle,
  Tag,
  Clock,
  X
} from 'lucide-react';
import { BookingRecord, formatDateBrazilian } from '@/lib/booking-store';

interface OperationalExpense {
  id: string;
  date: string; // YYYY-MM-DD
  category: 'Manutenção de Bicicletas' | 'Equipamentos & Peças' | 'Combustível & Transporte' | 'Seguro & Licenças' | 'Marketing & Divulgação' | 'Outras';
  description: string;
  amount: number;
}

const DEFAULT_EXPENSES: OperationalExpense[] = [
  {
    id: 'exp_1',
    date: '2026-09-02',
    category: 'Manutenção de Bicicletas',
    description: 'Revisão preventiva das bikes de instrução, troca de cabos e calibragem',
    amount: 280.00
  },
  {
    id: 'exp_2',
    date: '2026-09-08',
    category: 'Equipamentos & Peças',
    description: 'Kits de higienização de capacetes e spray desinfetante hospitalar',
    amount: 110.00
  },
  {
    id: 'exp_3',
    date: '2026-09-12',
    category: 'Combustível & Transporte',
    description: 'Deslocamento logístico para atendimento sob demanda no CEP do aluno',
    amount: 145.00
  },
  {
    id: 'exp_4',
    date: '2026-08-15',
    category: 'Seguro & Licenças',
    description: 'Apólice de seguro contra acidentes para alunos e instrutores',
    amount: 350.00
  }
];

interface AdminFinancialViewProps {
  bookings: BookingRecord[];
}

export function AdminFinancialView({ bookings }: AdminFinancialViewProps) {
  const currentYear = 2026;
  const currentMonthStr = '2026-09';

  // Despesas operacionais com persistência
  const [expenses, setExpenses] = useState<OperationalExpense[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('abc_despesas_operacionais');
        if (saved) return JSON.parse(saved);
      } catch (err) {
        console.warn('Erro ao carregar despesas operacionais:', err);
      }
    }
    return DEFAULT_EXPENSES;
  });

  const saveExpenses = (newExpenses: OperationalExpense[]) => {
    setExpenses(newExpenses);
    if (typeof window !== 'undefined') {
      localStorage.setItem('abc_despesas_operacionais', JSON.stringify(newExpenses));
    }
  };

  // Modal para adicionar nova despesa
  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [expenseDate, setExpenseDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [expenseCategory, setExpenseCategory] = useState<OperationalExpense['category']>('Manutenção de Bicicletas');
  const [expenseDescription, setExpenseDescription] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(expenseAmount.replace(',', '.'));
    if (isNaN(num) || num <= 0 || !expenseDescription.trim()) return;

    const newExp: OperationalExpense = {
      id: `exp_${Date.now()}`,
      date: expenseDate,
      category: expenseCategory,
      description: expenseDescription.trim(),
      amount: num
    };

    const updated = [newExp, ...expenses];
    saveExpenses(updated);
    setExpenseDescription('');
    setExpenseAmount('');
    setIsAddingExpense(false);
  };

  const handleDeleteExpense = (id: string) => {
    const updated = expenses.filter((e) => e.id !== id);
    saveExpenses(updated);
  };

  // Inscrições com pagamento confirmado / realizado
  const confirmedBookings = useMemo(() => {
    return bookings.filter((b) =>
      ['pagamento-confirmado', 'agendamento-confirmado', 'confirmado', 'concluido'].includes(b.status)
    );
  }, [bookings]);

  // Cálculos consolidados
  const totalGrossRevenue = useMemo(() => {
    return confirmedBookings.reduce((acc, b) => acc + (b.price || b.location?.price || 499), 0);
  }, [confirmedBookings]);

  const totalExpenses = useMemo(() => {
    return expenses.reduce((acc, e) => acc + e.amount, 0);
  }, [expenses]);

  const totalNetRevenue = totalGrossRevenue - totalExpenses;

  // Cálculos do Mês Atual (Setembro/2026)
  const currentMonthGross = useMemo(() => {
    return confirmedBookings
      .filter((b) => (b.slot?.date || b.createdAt || '').startsWith(currentMonthStr))
      .reduce((acc, b) => acc + (b.price || b.location?.price || 499), 0);
  }, [confirmedBookings]);

  const currentMonthExpenses = useMemo(() => {
    return expenses
      .filter((e) => e.date.startsWith(currentMonthStr))
      .reduce((acc, e) => acc + e.amount, 0);
  }, [expenses]);

  const currentMonthNet = currentMonthGross - currentMonthExpenses;

  // Faturamento Trimestral
  const quarterlyRevenue = useMemo(() => {
    const getRevenueForMonths = (months: string[]) => {
      return confirmedBookings
        .filter((b) => {
          const d = b.slot?.date || b.createdAt || '';
          return months.some((m) => d.startsWith(`${currentYear}-${m}`));
        })
        .reduce((acc, b) => acc + (b.price || b.location?.price || 499), 0);
    };

    const getExpensesForMonths = (months: string[]) => {
      return expenses
        .filter((e) => months.some((m) => e.date.startsWith(`${currentYear}-${m}`)))
        .reduce((acc, e) => acc + e.amount, 0);
    };

    const q1Gross = getRevenueForMonths(['01', '02', '03']);
    const q1Exp = getExpensesForMonths(['01', '02', '03']);

    const q2Gross = getRevenueForMonths(['04', '05', '06']);
    const q2Exp = getExpensesForMonths(['04', '05', '06']);

    const q3Gross = getRevenueForMonths(['07', '08', '09']);
    const q3Exp = getExpensesForMonths(['07', '08', '09']);

    const q4Gross = getRevenueForMonths(['10', '11', '12']);
    const q4Exp = getExpensesForMonths(['10', '11', '12']);

    return [
      { quarter: '1º Trimestre (Q1)', period: 'Jan - Mar', gross: q1Gross, expenses: q1Exp, net: q1Gross - q1Exp },
      { quarter: '2º Trimestre (Q2)', period: 'Abr - Jun', gross: q2Gross, expenses: q2Exp, net: q2Gross - q2Exp },
      { quarter: '3º Trimestre (Q3)', period: 'Jul - Set (Atual)', gross: q3Gross, expenses: q3Exp, net: q3Gross - q3Exp },
      { quarter: '4º Trimestre (Q4)', period: 'Out - Dez', gross: q4Gross, expenses: q4Exp, net: q4Gross - q4Exp },
    ];
  }, [confirmedBookings, expenses]);

  // Faturamento Semestral
  const semesterRevenue = useMemo(() => {
    const s1 = quarterlyRevenue[0].gross + quarterlyRevenue[1].gross;
    const s1Exp = quarterlyRevenue[0].expenses + quarterlyRevenue[1].expenses;

    const s2 = quarterlyRevenue[2].gross + quarterlyRevenue[3].gross;
    const s2Exp = quarterlyRevenue[2].expenses + quarterlyRevenue[3].expenses;

    return [
      { semester: '1º Semestre (S1)', period: 'Janeiro a Junho', gross: s1, expenses: s1Exp, net: s1 - s1Exp },
      { semester: '2º Semestre (S2)', period: 'Julho a Dezembro (Atual)', gross: s2, expenses: s2Exp, net: s2 - s2Exp },
    ];
  }, [quarterlyRevenue]);

  // Faturamento Mês a Mês do Ano
  const monthlyBreakdown = useMemo(() => {
    const months = [
      { num: '01', name: 'Janeiro' },
      { num: '02', name: 'Fevereiro' },
      { num: '03', name: 'Março' },
      { num: '04', name: 'Abril' },
      { num: '05', name: 'Maio' },
      { num: '06', name: 'Junho' },
      { num: '07', name: 'Julho' },
      { num: '08', name: 'Agosto' },
      { num: '09', name: 'Setembro' },
      { num: '10', name: 'Outubro' },
      { num: '11', name: 'Novembro' },
      { num: '12', name: 'Dezembro' }
    ];

    return months.map((m) => {
      const monthPrefix = `${currentYear}-${m.num}`;
      const gross = confirmedBookings
        .filter((b) => (b.slot?.date || b.createdAt || '').startsWith(monthPrefix))
        .reduce((acc, b) => acc + (b.price || b.location?.price || 499), 0);

      const exp = expenses
        .filter((e) => e.date.startsWith(monthPrefix))
        .reduce((acc, e) => acc + e.amount, 0);

      const count = confirmedBookings.filter((b) => (b.slot?.date || b.createdAt || '').startsWith(monthPrefix)).length;

      return {
        month: m.name,
        monthPrefix,
        gross,
        expenses: exp,
        net: gross - exp,
        plansCount: count
      };
    });
  }, [confirmedBookings, expenses]);

  // Margem Líquida
  const profitMarginPct = totalGrossRevenue > 0 ? Math.round((totalNetRevenue / totalGrossRevenue) * 100) : 100;

  return (
    <div className="space-y-8 animate-in fade-in duration-300" id="admin-financial-module">
      {/* Header Financeiro */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-950 p-6 rounded-2xl border border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono text-[10px] font-bold border border-emerald-500/30">
              Controle Financeiro • Ano 2026
            </span>
            <span className="text-xs text-slate-400 font-mono">
              Atualizado em tempo real
            </span>
          </div>
          <h2 className="text-2xl font-black text-white mt-1">
            Gestão Financeira & Despesas Operacionais
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Relatório consolidado de receitas por PIX, despesas operacionais e resultado líquido da ABC do Pedal.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsAddingExpense(true)}
          className="px-4 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-mono text-xs font-bold flex items-center gap-2 shadow-lg shadow-pink-950 cursor-pointer transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Registrar Despesa</span>
        </button>
      </div>

      {/* Cards de Indicadores Financeiros */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Valores Recebidos (Faturamento Bruto) */}
        <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
            <span>Valores Recebidos (Bruto)</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-400 font-mono">
            R$ {totalGrossRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-slate-500 font-mono">
            Total histórico de pagamentos confirmados
          </p>
        </div>

        {/* Despesas Operacionais */}
        <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
            <span>Despesas Operacionais</span>
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-400 font-mono">
            R$ {totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-slate-500 font-mono">
            {expenses.length} lançamentos de custos operacionais
          </p>
        </div>

        {/* Saldo Líquido Total */}
        <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
            <span>Faturamento Líquido</span>
            <div className="w-8 h-8 rounded-lg bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-pink-400 font-mono">
            R$ {totalNetRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-slate-500 font-mono">
            Margem líquida estimada: <strong className="text-white">{profitMarginPct}%</strong>
          </p>
        </div>

        {/* Saldo do Mês Corrente */}
        <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
            <span>Saldo Mensal (Setembro)</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white font-mono">
            R$ {currentMonthNet.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-slate-500 font-mono">
            Bruto: R$ {currentMonthGross.toFixed(2)} | Desp: R$ {currentMonthExpenses.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Demonstrativo Visual Comparativo: Faturamento Bruto x Despesas x Faturamento Líquido */}
      <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-pink-400" />
              <span>Demonstrativo: Faturamento Bruto x Despesas x Líquido</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Equilíbrio financeiro operacional da ABC do Pedal
            </p>
          </div>
          <span className="px-3 py-1 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300">
            {confirmedBookings.length} planos/aulas vendidos
          </span>
        </div>

        {/* Barra comparativa de proporção */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-emerald-400 font-bold">Faturamento Bruto: 100%</span>
            <span className="text-rose-400 font-bold">
              Despesas: {totalGrossRevenue > 0 ? Math.round((totalExpenses / totalGrossRevenue) * 100) : 0}%
            </span>
            <span className="text-pink-400 font-bold">Resultado Líquido: {profitMarginPct}%</span>
          </div>

          <div className="h-4 w-full bg-slate-900 rounded-full overflow-hidden flex">
            <div
              style={{ width: `${Math.min(profitMarginPct, 100)}%` }}
              className="bg-gradient-to-r from-pink-600 to-pink-500 h-full transition-all duration-500"
              title="Faturamento Líquido"
            />
            <div
              style={{
                width: `${totalGrossRevenue > 0 ? Math.min(Math.round((totalExpenses / totalGrossRevenue) * 100), 100 - profitMarginPct) : 0}%`
              }}
              className="bg-rose-500/80 h-full transition-all duration-500"
              title="Despesas Operacionais"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 text-xs space-y-1">
            <span className="text-slate-400 font-mono block">1. Total de Entradas (Recebido)</span>
            <div className="text-xl font-bold text-emerald-400 font-mono">
              + R$ {totalGrossRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-slate-500">100% via chave PIX verificada</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 text-xs space-y-1">
            <span className="text-slate-400 font-mono block">2. Total de Saídas (Despesas)</span>
            <div className="text-xl font-bold text-rose-400 font-mono">
              - R$ {totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-slate-500">Manutenção, combustível e materiais</p>
          </div>

          <div className="p-4 rounded-xl bg-pink-950/30 border border-pink-500/40 text-xs space-y-1">
            <span className="text-pink-300 font-mono font-bold block">3. Saldo Líquido Final</span>
            <div className="text-xl font-bold text-pink-400 font-mono">
              = R$ {totalNetRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-slate-300">Lucro operacional apurado</p>
          </div>
        </div>
      </div>

      {/* Seção de Faturamento Trimestral e Semestral */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Faturamento Trimestral */}
        <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
          <h3 className="font-bold text-white text-base flex items-center gap-2">
            <Calendar className="w-4 h-4 text-pink-400" />
            <span>Faturamento Trimestral (2026)</span>
          </h3>

          <div className="space-y-3">
            {quarterlyRevenue.map((q) => (
              <div
                key={q.quarter}
                className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-bold text-white block">{q.quarter}</span>
                  <span className="text-slate-500 text-[11px] font-mono">{q.period}</span>
                </div>

                <div className="text-right font-mono space-y-0.5">
                  <div className="font-bold text-white">
                    R$ {q.gross.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-[11px] text-pink-400">
                    Líquido: R$ {q.net.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Faturamento Semestral e Anual */}
        <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
          <h3 className="font-bold text-white text-base flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-pink-400" />
            <span>Faturamento Semestral & Anual (2026)</span>
          </h3>

          <div className="space-y-3">
            {semesterRevenue.map((s) => (
              <div
                key={s.semester}
                className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-bold text-white block">{s.semester}</span>
                  <span className="text-slate-500 text-[11px] font-mono">{s.period}</span>
                </div>

                <div className="text-right font-mono space-y-0.5">
                  <div className="font-bold text-white">
                    R$ {s.gross.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-[11px] text-emerald-400">
                    Líquido: R$ {s.net.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            ))}

            {/* Consolidado Anual */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-slate-900 to-pink-950/40 border border-pink-500/40 flex items-center justify-between text-xs">
              <div>
                <span className="font-mono text-pink-400 font-bold uppercase block text-[10px]">
                  Consolidado Total
                </span>
                <span className="font-bold text-white text-sm">Faturamento Anual 2026</span>
              </div>
              <div className="text-right font-mono">
                <div className="text-lg font-black text-pink-400">
                  R$ {totalGrossRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
                <div className="text-[11px] text-slate-300">
                  Líquido: R$ {totalNetRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Faturamento Mensal (Tabela Detalhada Mês a Mês) */}
      <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
        <h3 className="font-bold text-white text-base flex items-center gap-2">
          <FileSpreadsheet className="w-4 h-4 text-pink-400" />
          <span>Faturamento Mensal Consolidado (Mês a Mês)</span>
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 font-mono text-slate-400">
                <th className="pb-3">Mês / Período</th>
                <th className="pb-3">Aulas / Planos</th>
                <th className="pb-3">Faturamento Bruto</th>
                <th className="pb-3">Despesas</th>
                <th className="pb-3 text-right">Resultado Líquido</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {monthlyBreakdown.map((m) => (
                <tr key={m.month} className="hover:bg-slate-900/40 transition-colors">
                  <td className="py-3 font-sans font-bold text-white flex items-center gap-2">
                    <span>{m.month}</span>
                    {m.monthPrefix === currentMonthStr && (
                      <span className="px-1.5 py-0.5 rounded bg-pink-500/20 text-pink-300 text-[10px] font-mono">
                        Mês Atual
                      </span>
                    )}
                  </td>
                  <td className="py-3 text-slate-300">{m.plansCount}</td>
                  <td className="py-3 text-emerald-400 font-bold">
                    R$ {m.gross.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 text-rose-400">
                    R$ {m.expenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 text-right text-pink-400 font-bold">
                    R$ {m.net.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Gestão de Despesas Operacionais (Tabela e Lançamentos) */}
      <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              <ArrowDownRight className="w-4 h-4 text-rose-400" />
              <span>Registro de Despesas Operacionais</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Custos diretos de manutenção de bicicletas, equipamentos e logística
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsAddingExpense(true)}
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-pink-400" />
            <span>Adicionar Despesa</span>
          </button>
        </div>

        {expenses.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            Nenhuma despesa operacional registrada.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 font-mono text-slate-400">
                  <th className="pb-3">Data</th>
                  <th className="pb-3">Categoria</th>
                  <th className="pb-3">Descrição da Despesa</th>
                  <th className="pb-3">Valor</th>
                  <th className="pb-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {expenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="py-3 font-mono text-slate-400">{formatDateBrazilian(exp.date)}</td>
                    <td className="py-3">
                      <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-mono text-[11px]">
                        {exp.category}
                      </span>
                    </td>
                    <td className="py-3 text-slate-200">{exp.description}</td>
                    <td className="py-3 font-mono font-bold text-rose-400">
                      R$ {exp.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleDeleteExpense(exp.id)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 transition-colors cursor-pointer"
                        title="Excluir despesa"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal para Adicionar Despesa */}
      {isAddingExpense && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-base">Nova Despesa Operacional</h3>
              <button
                type="button"
                onClick={() => setIsAddingExpense(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddExpense} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-300">Data da Despesa</label>
                <input
                  type="date"
                  required
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-pink-500 focus:outline-none font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-300">Categoria</label>
                <select
                  value={expenseCategory}
                  onChange={(e) => setExpenseCategory(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-pink-500 focus:outline-none"
                >
                  <option value="Manutenção de Bicicletas">Manutenção de Bicicletas</option>
                  <option value="Equipamentos & Peças">Equipamentos & Peças</option>
                  <option value="Combustível & Transporte">Combustível & Transporte</option>
                  <option value="Seguro & Licenças">Seguro & Licenças</option>
                  <option value="Marketing & Divulgação">Marketing & Divulgação</option>
                  <option value="Outras">Outras</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-300">Descrição</label>
                <input
                  type="text"
                  required
                  value={expenseDescription}
                  onChange={(e) => setExpenseDescription(e.target.value)}
                  placeholder="Ex: Compra de novas câmaras de ar e óleo de corrente"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-pink-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-300">Valor (R$)</label>
                <input
                  type="text"
                  required
                  value={expenseAmount}
                  onChange={(e) => setExpenseAmount(e.target.value)}
                  placeholder="150,00"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-pink-500 focus:outline-none font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddingExpense(false)}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-bold"
                >
                  Salvar Despesa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
