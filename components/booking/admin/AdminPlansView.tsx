'use client';

import React, { useState, useMemo } from 'react';
import {
  Tag,
  Package,
  Plus,
  CheckCircle,
  Clock,
  Sparkles,
  DollarSign,
  Users,
  Edit2,
  Trash2,
  Check,
  X,
  Layers,
  ArrowRight
} from 'lucide-react';
import { CURRENT_PRODUCT, PRODUCTS_CATALOG, ProductConfig } from '@/lib/products';
import { BookingRecord } from '@/lib/booking-store';

export interface PlanItem {
  id: string;
  name: string;
  badge: string;
  subtitle: string;
  price: number;
  durationMinutes: number;
  totalClasses: number;
  description: string;
  features: string[];
  isActive: boolean;
  isSystemDefault?: boolean;
}

const INITIAL_PLANS: PlanItem[] = [
  {
    id: CURRENT_PRODUCT.id,
    name: CURRENT_PRODUCT.name,
    badge: 'Produto Oficial • Método ABCDE',
    subtitle: CURRENT_PRODUCT.subtitle,
    price: CURRENT_PRODUCT.price,
    durationMinutes: CURRENT_PRODUCT.sessionDurationMinutes,
    totalClasses: 1,
    description: CURRENT_PRODUCT.description,
    features: [
      'Metodologia exclusiva ABCDE com acompanhamento individual',
      'Bicicleta calibrada e ajustada à sua altura inclusa',
      'Capacete higienizado com touca descartável',
      'Seguro contra acidentes pessoais durante a aula',
      'Certificado oficial de conclusão do Método ABCDE'
    ],
    isActive: true,
    isSystemDefault: true
  },
  {
    id: 'pacote-ciclo-essencial',
    name: 'Pacote Ciclo Essencial (4 Aulas)',
    badge: 'Consolidação & Segurança',
    subtitle: 'Ciclo completo para consolidação de equilíbrio dinâmico e propulsão autônoma',
    price: 1799,
    durationMinutes: 120,
    totalClasses: 4,
    description: 'Indicado para quem deseja dominar o pedal com calma e acompanhamento progressivo ao longo de 4 semanas.',
    features: [
      '4 aulas individuais de 2h de duração cada',
      'Acompanhamento do instrutor em todas as sessões',
      'Bike e equipamentos higienizados inclusos',
      'Treinamento de curvas, paradas e frenagem controlada',
      'Acesso à área do aluno com evolução detalhada'
    ],
    isActive: true,
    isSystemDefault: true
  },
  {
    id: 'pacote-dominio-urbano',
    name: 'Pacote Domínio Urbano & Trânsito (8 Aulas)',
    badge: 'Autonomia Total na Cidade',
    subtitle: 'Transição da aprendizagem para deslocamentos reais em ciclovias e vias públicas',
    price: 3199,
    durationMinutes: 120,
    totalClasses: 8,
    description: 'Programa avançado para quem já se equilibra e busca segurança no trânsito de São Paulo.',
    features: [
      '8 sessões personalizadas de 2 horas',
      'Ciclismo em ciclovias, ciclofaixas e travessias viárias',
      'Leitura de trânsito e sinalização defensiva',
      'Troca de marchas em subidas e descidas íngremes',
      'Certificado de Ciclista Urbano Autônomo'
    ],
    isActive: true,
    isSystemDefault: true
  },
  {
    id: 'mentoria-domicilio-cep',
    name: 'Aula Individual sob Demanda (No CEP do Aluno)',
    badge: 'Atendimento a Domicílio',
    subtitle: 'Treinamento personalizado no condomínio, rua fechada ou praça próxima à sua residência',
    price: 599,
    durationMinutes: 120,
    totalClasses: 1,
    description: 'O instrutor leva toda a estrutura (bicicleta e capacete) até a região pesquisada pelo aluno via CEP.',
    features: [
      'Atendimento em endereço/CEP escolhido pelo aluno',
      'Avaliação prévia da topografia do local',
      'Total privacidade e conforto perto de casa',
      'Metodologia pedagógica ABCDE individualizada'
    ],
    isActive: true,
    isSystemDefault: true
  }
];

interface AdminPlansViewProps {
  bookings: BookingRecord[];
  onNavigate: (tab: any) => void;
}

export function AdminPlansView({ bookings, onNavigate }: AdminPlansViewProps) {
  // Planos com suporte a novos itens salvos localmente
  const [plans, setPlans] = useState<PlanItem[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('abc_custom_plans');
        if (saved) {
          const parsed: PlanItem[] = JSON.parse(saved);
          // Combina preservando o produto oficial
          const baseMap = new Map<string, PlanItem>();
          INITIAL_PLANS.forEach((p) => baseMap.set(p.id, p));
          parsed.forEach((p) => baseMap.set(p.id, p));
          return Array.from(baseMap.values());
        }
      } catch (err) {
        console.warn('Erro ao carregar planos salvos:', err);
      }
    }
    return INITIAL_PLANS;
  });

  const savePlans = (newPlans: PlanItem[]) => {
    setPlans(newPlans);
    if (typeof window !== 'undefined') {
      localStorage.setItem('abc_custom_plans', JSON.stringify(newPlans));
    }
  };

  // Modal para criar novo plano
  const [isCreatingPlan, setIsCreatingPlan] = useState(false);
  const [newPlanName, setNewPlanName] = useState('');
  const [newPlanBadge, setNewPlanBadge] = useState('Novo Plano');
  const [newPlanSubtitle, setNewPlanSubtitle] = useState('');
  const [newPlanPrice, setNewPlanPrice] = useState('');
  const [newPlanDuration, setNewPlanDuration] = useState('120');
  const [newPlanClasses, setNewPlanClasses] = useState('1');
  const [newPlanDescription, setNewPlanDescription] = useState('');
  const [newPlanFeatures, setNewPlanFeatures] = useState('');

  const handleToggleActive = (planId: string) => {
    const updated = plans.map((p) => {
      if (p.id === planId) {
        return { ...p, isActive: !p.isActive };
      }
      return p;
    });
    savePlans(updated);
  };

  const handleCreatePlan = (e: React.FormEvent) => {
    e.preventDefault();
    const priceNum = parseFloat(newPlanPrice.replace(',', '.'));
    if (isNaN(priceNum) || priceNum <= 0 || !newPlanName.trim()) return;

    const featuresList = newPlanFeatures
      .split('\n')
      .map((f) => f.trim())
      .filter(Boolean);

    const newPlan: PlanItem = {
      id: `plan_${Date.now()}`,
      name: newPlanName.trim(),
      badge: newPlanBadge.trim() || 'Plano Personalizado',
      subtitle: newPlanSubtitle.trim() || 'Plano cadastrado pelo instrutor',
      price: priceNum,
      durationMinutes: parseInt(newPlanDuration, 10) || 120,
      totalClasses: parseInt(newPlanClasses, 10) || 1,
      description: newPlanDescription.trim() || 'Treinamento personalizado.',
      features: featuresList.length > 0 ? featuresList : ['Instrutor dedicado', 'Metodologia ABCDE'],
      isActive: true,
      isSystemDefault: false
    };

    const updated = [...plans, newPlan];
    savePlans(updated);

    // Limpar form
    setNewPlanName('');
    setNewPlanBadge('Novo Plano');
    setNewPlanSubtitle('');
    setNewPlanPrice('');
    setNewPlanDuration('120');
    setNewPlanClasses('1');
    setNewPlanDescription('');
    setNewPlanFeatures('');
    setIsCreatingPlan(false);
  };

  const handleDeletePlan = (planId: string) => {
    const updated = plans.filter((p) => p.id !== planId);
    savePlans(updated);
  };

  // Contagem de contratações por plano
  const planSalesMap = useMemo(() => {
    const map = new Map<string, number>();
    bookings.forEach((b) => {
      const pid = b.productId || 'aprender-a-pedalar';
      map.set(pid, (map.get(pid) || 0) + 1);
    });
    return map;
  }, [bookings]);

  return (
    <div className="space-y-8 animate-in fade-in duration-300" id="admin-plans-module">
      {/* Header dos Planos */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-950 p-6 rounded-2xl border border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-pink-500/20 text-pink-400 font-mono text-[10px] font-bold border border-pink-500/30">
              Catálogo de Produtos & Serviços
            </span>
            <span className="text-xs text-slate-400 font-mono">
              {plans.filter((p) => p.isActive).length} planos ativos
            </span>
          </div>
          <h2 className="text-2xl font-black text-white mt-1">
            Gestão de Planos e Produtos
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Organização dos planos cadastrados no sistema. Novos planos e pacotes podem ser adicionados dinamicamente.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsCreatingPlan(true)}
          className="px-4 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-mono text-xs font-bold flex items-center gap-2 shadow-lg shadow-pink-950 cursor-pointer transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Adicionar Novo Plano</span>
        </button>
      </div>

      {/* Grid de Planos e Produtos Cadastrados */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {plans.map((plan) => {
          const salesCount = planSalesMap.get(plan.id) || (plan.isSystemDefault && plan.id === 'aprender-a-pedalar' ? bookings.length : 0);

          return (
            <div
              key={plan.id}
              className={`p-6 rounded-2xl border transition-all flex flex-col justify-between shadow-xl ${
                plan.isActive
                  ? 'bg-slate-950 border-slate-800 hover:border-pink-500/40'
                  : 'bg-slate-950/60 border-slate-900 opacity-60'
              }`}
            >
              <div className="space-y-4">
                {/* Header do Card */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="px-2.5 py-0.5 rounded-full bg-slate-900 text-pink-400 font-mono text-[10px] font-bold border border-slate-800 inline-block mb-1.5">
                      {plan.badge}
                    </span>
                    <h3 className="text-lg font-black text-white leading-snug">
                      {plan.name}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      {plan.subtitle}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-2xl font-black text-pink-400 font-mono block">
                      R$ {plan.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono block">
                      {plan.totalClasses} aula(s) • {plan.durationMinutes} min
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed border-t border-slate-800/80 pt-3">
                  {plan.description}
                </p>

                {/* Benefícios Inclusos */}
                <div className="space-y-1.5 pt-2">
                  <span className="text-[11px] font-mono text-slate-400 uppercase font-bold block">
                    Benefícios e Conteúdo Inclusos:
                  </span>
                  <ul className="space-y-1 text-xs text-slate-300">
                    {plan.features.map((feat, idx) => (
                      <li key={idx} className="flex items-center gap-2">
                        <CheckCircle className="w-3.5 h-3.5 text-pink-400 shrink-0" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Rodapé com Estatísticas e Controles */}
              <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 font-mono text-slate-400">
                  <Users className="w-3.5 h-3.5 text-pink-400" />
                  <span>
                    Contratações: <strong className="text-white">{salesCount}</strong>
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggleActive(plan.id)}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-mono font-bold transition-colors cursor-pointer ${
                      plan.isActive
                        ? 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-300'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {plan.isActive ? 'Ativo no Sistema' : 'Inativo'}
                  </button>

                  {!plan.isSystemDefault && (
                    <button
                      type="button"
                      onClick={() => handleDeletePlan(plan.id)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 transition-colors cursor-pointer"
                      title="Excluir plano personalizado"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal para Adicionar Novo Plano */}
      {isCreatingPlan && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-pink-400" />
                <h3 className="font-bold text-white text-base">Adicionar Novo Plano ou Produto</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreatingPlan(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePlan} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-300">Nome do Plano / Produto *</label>
                <input
                  type="text"
                  required
                  value={newPlanName}
                  onChange={(e) => setNewPlanName(e.target.value)}
                  placeholder="Ex: Pacote Acelerado de Férias"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-pink-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-300">Badge / Categoria</label>
                  <input
                    type="text"
                    value={newPlanBadge}
                    onChange={(e) => setNewPlanBadge(e.target.value)}
                    placeholder="Ex: Intensivo • 3 Aulas"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-pink-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-300">Preço (R$) *</label>
                  <input
                    type="text"
                    required
                    value={newPlanPrice}
                    onChange={(e) => setNewPlanPrice(e.target.value)}
                    placeholder="Ex: 899,00"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-pink-500 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-300">Quantidade de Aulas</label>
                  <input
                    type="number"
                    min="1"
                    value={newPlanClasses}
                    onChange={(e) => setNewPlanClasses(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-pink-500 focus:outline-none font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-300">Duração de cada aula (min)</label>
                  <input
                    type="number"
                    min="30"
                    step="15"
                    value={newPlanDuration}
                    onChange={(e) => setNewPlanDuration(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-pink-500 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-300">Subtítulo / Chamada Curta</label>
                <input
                  type="text"
                  value={newPlanSubtitle}
                  onChange={(e) => setNewPlanSubtitle(e.target.value)}
                  placeholder="Ex: Domine a bike rapidamente com aulas consecutivas"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-pink-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-300">Descrição Completa</label>
                <textarea
                  rows={2}
                  value={newPlanDescription}
                  onChange={(e) => setNewPlanDescription(e.target.value)}
                  placeholder="Descreva para quem é indicado e os diferenciais deste plano..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-pink-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-300">Benefícios Inclusos (1 por linha)</label>
                <textarea
                  rows={3}
                  value={newPlanFeatures}
                  onChange={(e) => setNewPlanFeatures(e.target.value)}
                  placeholder="Bicicleta calibrada inclusa&#10;Capacete higienizado&#10;Seguro contra acidentes&#10;Certificado de conquista"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-pink-500 focus:outline-none font-mono text-[11px]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreatingPlan(false)}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-bold"
                >
                  Salvar Plano
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
