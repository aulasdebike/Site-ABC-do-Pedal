'use client';

import React, { useState, useEffect } from 'react';
import {
  MapPin,
  Plus,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Building2,
  Sparkles,
  Info,
  Edit2,
  Trash2,
  Save,
  X,
  Search,
  Check,
  ShieldCheck,
  Clock,
  RotateCcw
} from 'lucide-react';
import {
  MunicipalClassLocation,
  MunicipalLocationStatus,
  getStoredMunicipalClassLocations,
  saveStoredMunicipalClassLocations,
  addMunicipalClassLocation,
  updateMunicipalClassLocation,
  toggleMunicipalLocationStatus,
  deleteMunicipalClassLocation,
  resetMunicipalClassLocationsToDefault
} from '@/lib/locations-config';

interface AdminLocationsViewProps {
  onSelectMunicipalityForBooking?: (city: string, locationName: string) => void;
}

export function AdminLocationsView({ onSelectMunicipalityForBooking }: AdminLocationsViewProps) {
  const [locations, setLocations] = useState<MunicipalClassLocation[]>(() => {
    if (typeof window !== 'undefined') {
      return getStoredMunicipalClassLocations();
    }
    return [];
  });
  const [selectedCityFilter, setSelectedCityFilter] = useState<string>('todos');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isAddingNew, setIsAddingNew] = useState<boolean>(false);
  const [editingLocationId, setEditingLocationId] = useState<string | null>(null);

  // Form state for adding new location
  const [newName, setNewName] = useState('');
  const [newCity, setNewCity] = useState('São Bernardo do Campo');
  const [customCity, setCustomCity] = useState('');
  const [newStatus, setNewStatus] = useState<MunicipalLocationStatus>('disponivel');
  const [newRestrictionNote, setNewRestrictionNote] = useState('');
  const [newIsKidsOnly, setNewIsKidsOnly] = useState(false);
  const [newAddress, setNewAddress] = useState('');
  const [newNotes, setNewNotes] = useState('');

  // Form state for editing
  const [editName, setEditName] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editStatus, setEditStatus] = useState<MunicipalLocationStatus>('disponivel');
  const [editRestrictionNote, setEditRestrictionNote] = useState('');
  const [editIsKidsOnly, setEditIsKidsOnly] = useState(false);
  const [editAddress, setEditAddress] = useState('');
  const [editNotes, setEditNotes] = useState('');

  // Notification feedback
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const showFeedback = (msg: string) => {
    setFeedbackMessage(msg);
    setTimeout(() => {
      setFeedbackMessage(null);
    }, 4000);
  };

  const loadLocations = () => {
    const data = getStoredMunicipalClassLocations();
    setLocations(data);
  };

  useEffect(() => {
    const handleCustomEvent = (e: any) => {
      if (e.detail) {
        setLocations(e.detail);
      } else {
        const data = getStoredMunicipalClassLocations();
        setLocations(data);
      }
    };

    window.addEventListener('abc_municipal_locations_updated', handleCustomEvent);
    return () => {
      window.removeEventListener('abc_municipal_locations_updated', handleCustomEvent);
    };
  }, []);

  // Filtered list
  const filteredLocations = locations.filter((loc) => {
    // City filter
    if (selectedCityFilter !== 'todos') {
      const normLocCity = loc.city.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const normFilter = selectedCityFilter.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (!normLocCity.includes(normFilter)) return false;
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchName = loc.name.toLowerCase().includes(q);
      const matchCity = loc.city.toLowerCase().includes(q);
      const matchNote = (loc.restrictionNote || '').toLowerCase().includes(q);
      const matchAddress = (loc.address || '').toLowerCase().includes(q);
      return matchName || matchCity || matchNote || matchAddress;
    }

    return true;
  });

  // Group by municipality
  const distinctCities = Array.from(new Set(locations.map((l) => l.city)));

  // Metrics
  const totalCount = locations.length;
  const availableCount = locations.filter((l) => l.status === 'disponivel').length;
  const unavailableCount = locations.filter((l) => l.status === 'indisponivel').length;

  const handleCreateLocation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      alert('Informe o nome do local.');
      return;
    }

    const resolvedCity = newCity === 'OUTRO' ? customCity.trim() : newCity;
    if (!resolvedCity) {
      alert('Informe o município.');
      return;
    }

    const restriction = newIsKidsOnly
      ? (newRestrictionNote.trim() || 'Exclusivo para crianças')
      : newRestrictionNote.trim();

    const updated = addMunicipalClassLocation({
      name: newName.trim(),
      city: resolvedCity,
      status: newStatus,
      restrictionNote: restriction || undefined,
      isKidsOnly: newIsKidsOnly,
      address: newAddress.trim() || undefined,
      notes: newNotes.trim() || undefined
    });

    setLocations(updated);
    setIsAddingNew(false);
    setNewName('');
    setNewRestrictionNote('');
    setNewIsKidsOnly(false);
    setNewAddress('');
    setNewNotes('');
    showFeedback(`Local "${newName.trim()}" cadastrado com sucesso!`);
  };

  const handleToggleStatus = (loc: MunicipalClassLocation) => {
    const updated = toggleMunicipalLocationStatus(loc.id);
    setLocations(updated);
    const newSt = loc.status === 'disponivel' ? 'Indisponível' : 'Disponível';
    showFeedback(`Status do local "${loc.name}" alterado para ${newSt}.`);
  };

  const handleStartEdit = (loc: MunicipalClassLocation) => {
    setEditingLocationId(loc.id);
    setEditName(loc.name);
    setEditCity(loc.city);
    setEditStatus(loc.status);
    setEditRestrictionNote(loc.restrictionNote || '');
    setEditIsKidsOnly(Boolean(loc.isKidsOnly));
    setEditAddress(loc.address || '');
    setEditNotes(loc.notes || '');
  };

  const handleSaveEdit = (id: string) => {
    if (!editName.trim()) {
      alert('Informe o nome do local.');
      return;
    }
    const restriction = editIsKidsOnly
      ? (editRestrictionNote.trim() || 'Exclusivo para crianças')
      : editRestrictionNote.trim();

    const updated = updateMunicipalClassLocation(id, {
      name: editName.trim(),
      city: editCity.trim(),
      status: editStatus,
      restrictionNote: restriction || undefined,
      isKidsOnly: editIsKidsOnly,
      address: editAddress.trim() || undefined,
      notes: editNotes.trim() || undefined
    });

    setLocations(updated);
    setEditingLocationId(null);
    showFeedback('Local atualizado com sucesso!');
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Tem certeza que deseja remover o local "${name}" do cadastro? Os agendamentos históricos anteriores continuarão preservados.`)) {
      const updated = deleteMunicipalClassLocation(id);
      setLocations(updated);
      showFeedback(`Local "${name}" removido.`);
    }
  };

  const handleResetDefaults = () => {
    if (confirm('Deseja restaurar os locais iniciais padrão do sistema (São Bernardo do Campo, Santo André e São Paulo)?')) {
      const def = resetMunicipalClassLocationsToDefault();
      setLocations(def);
      showFeedback('Locais padrão restaurados com sucesso.');
    }
  };

  return (
    <div className="space-y-6" id="admin-locations-manager">
      {/* Feedback Banner */}
      {feedbackMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 text-xs font-mono flex items-center justify-between shadow-lg animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{feedbackMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackMessage(null)}
            className="text-emerald-400 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-pink-500/10 border border-pink-500/30 text-pink-400">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white font-mono tracking-tight">
                Locais de Aula por Município
              </h2>
              <p className="text-xs text-slate-400">
                Cadastre e controle os polos credenciados para as aulas práticas da ABC do Pedal em cada cidade.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsAddingNew(!isAddingNew)}
            className="px-3.5 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-mono text-xs font-bold flex items-center gap-1.5 shadow-md shadow-pink-900/30 transition-all cursor-pointer"
            id="btn-cadastrar-novo-local"
          >
            <Plus className="w-4 h-4" />
            <span>Cadastrar Novo Local</span>
          </button>

          <button
            type="button"
            onClick={handleResetDefaults}
            title="Restaurar locais padrão (SBC, Santo André e SP)"
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Explanatory Rule Box */}
      <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 text-xs text-slate-300 space-y-2">
        <div className="flex items-center gap-2 text-pink-400 font-bold font-mono text-[11px] uppercase tracking-wider">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Regras de Controle & Agendamento</span>
        </div>
        <p className="text-[11px] text-slate-300 leading-relaxed">
          • <strong>Controle do Instrutor:</strong> O instrutor tem total autonomia para ativar ou desativar qualquer local a qualquer momento.
        </p>
        <p className="text-[11px] text-slate-300 leading-relaxed">
          • <strong>Novos Agendamentos:</strong> Locais marcados como <strong>Indisponíveis</strong> não aparecem para novos agendamentos, mas permanecem registrados nos agendamentos antigos.
        </p>
        <p className="text-[11px] text-slate-300 leading-relaxed">
          • <strong>Preservação:</strong> Os locais de São Paulo/Ibirapuera permanecem inalterados. Para Santo André e São Bernardo, o local definitivo é selecionado pelo instrutor considerando espaço, idade do aluno e tipo de aula.
        </p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
          <span className="text-[10px] font-mono text-slate-400 uppercase block tracking-wider">
            Total Cadastrado
          </span>
          <p className="text-xl font-bold font-mono text-white">{totalCount}</p>
          <span className="text-[10px] text-slate-500 font-mono">locais no sistema</span>
        </div>

        <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 space-y-1">
          <span className="text-[10px] font-mono text-emerald-400 uppercase block tracking-wider">
            Disponíveis (Ativos)
          </span>
          <p className="text-xl font-bold font-mono text-emerald-400">{availableCount}</p>
          <span className="text-[10px] text-emerald-400/70 font-mono">visíveis para agendamento</span>
        </div>

        <div className="p-3.5 rounded-xl bg-rose-950/30 border border-rose-500/30 space-y-1">
          <span className="text-[10px] font-mono text-rose-400 uppercase block tracking-wider">
            Indisponíveis (Inativos)
          </span>
          <p className="text-xl font-bold font-mono text-rose-400">{unavailableCount}</p>
          <span className="text-[10px] text-rose-400/70 font-mono">ocultos p/ novos</span>
        </div>

        <div className="p-3.5 rounded-xl bg-blue-950/30 border border-blue-500/30 space-y-1">
          <span className="text-[10px] font-mono text-blue-400 uppercase block tracking-wider">
            Municípios
          </span>
          <p className="text-xl font-bold font-mono text-blue-400">{distinctCities.length}</p>
          <span className="text-[10px] text-blue-400/70 font-mono">cidades atendidas</span>
        </div>
      </div>

      {/* Form: Add New Location (Expandable) */}
      {isAddingNew && (
        <form
          onSubmit={handleCreateLocation}
          className="p-5 rounded-2xl bg-slate-900/90 border border-pink-500/40 space-y-4 shadow-xl shadow-pink-950/20 animate-in fade-in duration-150"
          id="form-novo-local"
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2 text-white font-mono text-sm font-bold">
              <Plus className="w-4 h-4 text-pink-400" />
              <span>Cadastrar Novo Local de Aula</span>
            </div>
            <button
              type="button"
              onClick={() => setIsAddingNew(false)}
              className="text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
            {/* Nome do Local */}
            <div className="space-y-1.5">
              <label className="text-slate-300 font-bold block">
                Nome do Local *
              </label>
              <input
                type="text"
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ex: Poliesportivo da Kennedy, Parque..."
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-pink-500"
              />
            </div>

            {/* Município */}
            <div className="space-y-1.5">
              <label className="text-slate-300 font-bold block">
                Município *
              </label>
              <select
                value={newCity}
                onChange={(e) => setNewCity(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-pink-500"
              >
                <option value="São Bernardo do Campo">São Bernardo do Campo</option>
                <option value="Santo André">Santo André</option>
                <option value="São Paulo">São Paulo</option>
                <option value="OUTRO">Outro município...</option>
              </select>
              {newCity === 'OUTRO' && (
                <input
                  type="text"
                  required
                  value={customCity}
                  onChange={(e) => setCustomCity(e.target.value)}
                  placeholder="Digite o nome da cidade"
                  className="w-full mt-1.5 px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-pink-500"
                />
              )}
            </div>

            {/* Status Inicial */}
            <div className="space-y-1.5">
              <label className="text-slate-300 font-bold block">
                Status Inicial *
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setNewStatus('disponivel')}
                  className={`py-2 px-3 rounded-xl border flex items-center justify-center gap-1.5 font-bold transition-all ${
                    newStatus === 'disponivel'
                      ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300 shadow-sm'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Disponível</span>
                </button>
                <button
                  type="button"
                  onClick={() => setNewStatus('indisponivel')}
                  className={`py-2 px-3 rounded-xl border flex items-center justify-center gap-1.5 font-bold transition-all ${
                    newStatus === 'indisponivel'
                      ? 'bg-rose-950/80 border-rose-500 text-rose-300 shadow-sm'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <XCircle className="w-3.5 h-3.5 text-rose-400" />
                  <span>Indisponível</span>
                </button>
              </div>
            </div>

            {/* Restrição de Uso */}
            <div className="space-y-1.5">
              <label className="text-slate-300 font-bold block">
                Restrição de Uso (Opcional)
              </label>
              <input
                type="text"
                value={newRestrictionNote}
                onChange={(e) => setNewRestrictionNote(e.target.value)}
                placeholder="Ex: Exclusivo para crianças, Portão 10..."
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-pink-500"
              />
              <div className="pt-1 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="check-new-kids"
                  checked={newIsKidsOnly}
                  onChange={(e) => {
                    setNewIsKidsOnly(e.target.checked);
                    if (e.target.checked && !newRestrictionNote) {
                      setNewRestrictionNote('Exclusivo para crianças');
                    }
                  }}
                  className="rounded border-slate-700 text-pink-500 focus:ring-0"
                />
                <label htmlFor="check-new-kids" className="text-[11px] text-amber-300 font-semibold cursor-pointer">
                  Marcar como exclusivo para crianças
                </label>
              </div>
            </div>

            {/* Endereço / Ponto de Referência */}
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-slate-300 font-bold block">
                Endereço / Referência de Acesso (Opcional)
              </label>
              <input
                type="text"
                value={newAddress}
                onChange={(e) => setNewAddress(e.target.value)}
                placeholder="Ex: Praça Samuel Sabatini, 50 - Centro..."
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-pink-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsAddingNew(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs font-semibold cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-mono text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer"
              id="btn-confirmar-cadastro-local"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Salvar Local</span>
            </button>
          </div>
        </form>
      )}

      {/* Filters and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* City Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono">
          <button
            type="button"
            onClick={() => setSelectedCityFilter('todos')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              selectedCityFilter === 'todos'
                ? 'bg-pink-600 text-white font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Todos ({totalCount})
          </button>
          <button
            type="button"
            onClick={() => setSelectedCityFilter('São Bernardo do Campo')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              selectedCityFilter.includes('Bernardo')
                ? 'bg-pink-600 text-white font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            São Bernardo ({locations.filter((l) => l.city.toLowerCase().includes('bernardo')).length})
          </button>
          <button
            type="button"
            onClick={() => setSelectedCityFilter('Santo André')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              selectedCityFilter.includes('Andr')
                ? 'bg-pink-600 text-white font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Santo André ({locations.filter((l) => l.city.toLowerCase().includes('andr')).length})
          </button>
          <button
            type="button"
            onClick={() => setSelectedCityFilter('São Paulo')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              selectedCityFilter.includes('Paulo')
                ? 'bg-pink-600 text-white font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            São Paulo ({locations.filter((l) => l.city.toLowerCase().includes('paulo')).length})
          </button>
        </div>

        {/* Search Input */}
        <div className="relative min-w-[220px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nome ou restrição..."
            className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs font-mono placeholder-slate-500 focus:outline-none focus:border-pink-500"
          />
        </div>
      </div>

      {/* Locations List Grouped by Municipality */}
      <div className="space-y-6">
        {distinctCities
          .filter((city) => {
            if (selectedCityFilter === 'todos') return true;
            return city.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(
              selectedCityFilter.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            );
          })
          .map((cityName) => {
            const cityLocations = filteredLocations.filter((l) => l.city === cityName);
            if (cityLocations.length === 0) return null;

            return (
              <div key={cityName} className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-pink-400" />
                    <h3 className="font-mono font-bold text-white text-sm">
                      {cityName}
                    </h3>
                    <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[10px] font-mono text-slate-400 font-semibold">
                      {cityLocations.length} {cityLocations.length === 1 ? 'local' : 'locais'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {cityLocations.map((loc) => {
                    const isEditing = editingLocationId === loc.id;
                    const isAvailable = loc.status === 'disponivel';
                    const isParqueCentral = loc.name.toLowerCase().includes('parque central');
                    const isCelsoDaniel = loc.name.toLowerCase().includes('celso daniel');

                    if (isEditing) {
                      return (
                        <div
                          key={loc.id}
                          className="p-4 rounded-xl bg-slate-900 border border-pink-500/50 space-y-3 font-mono text-xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-pink-400">Editando Local:</span>
                            <button
                              type="button"
                              onClick={() => setEditingLocationId(null)}
                              className="text-slate-400 hover:text-white"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="space-y-2">
                            <div>
                              <label className="text-[11px] text-slate-400 block">Nome do Local</label>
                              <input
                                type="text"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-pink-500"
                              />
                            </div>

                            <div>
                              <label className="text-[11px] text-slate-400 block">Município</label>
                              <input
                                type="text"
                                value={editCity}
                                onChange={(e) => setEditCity(e.target.value)}
                                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-pink-500"
                              />
                            </div>

                            <div>
                              <label className="text-[11px] text-slate-400 block">Status</label>
                              <select
                                value={editStatus}
                                onChange={(e) => setEditStatus(e.target.value as MunicipalLocationStatus)}
                                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-pink-500"
                              >
                                <option value="disponivel">Disponível</option>
                                <option value="indisponivel">Indisponível</option>
                              </select>
                            </div>

                            <div>
                              <label className="text-[11px] text-slate-400 block">Restrição de Uso</label>
                              <input
                                type="text"
                                value={editRestrictionNote}
                                onChange={(e) => setEditRestrictionNote(e.target.value)}
                                placeholder="Ex: Exclusivo para crianças"
                                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-pink-500"
                              />
                              <div className="pt-1 flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  id={`edit-kids-${loc.id}`}
                                  checked={editIsKidsOnly}
                                  onChange={(e) => setEditIsKidsOnly(e.target.checked)}
                                  className="rounded border-slate-700 text-pink-500"
                                />
                                <label htmlFor={`edit-kids-${loc.id}`} className="text-[10px] text-amber-300 font-semibold cursor-pointer">
                                  Exclusivo para crianças
                                </label>
                              </div>
                            </div>

                            <div>
                              <label className="text-[11px] text-slate-400 block">Endereço / Referência</label>
                              <input
                                type="text"
                                value={editAddress}
                                onChange={(e) => setEditAddress(e.target.value)}
                                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-pink-500"
                              />
                            </div>
                          </div>

                          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                            <button
                              type="button"
                              onClick={() => setEditingLocationId(null)}
                              className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-[11px]"
                            >
                              Cancelar
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSaveEdit(loc.id)}
                              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] flex items-center gap-1"
                            >
                              <Save className="w-3 h-3" />
                              <span>Salvar</span>
                            </button>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={loc.id}
                        className={`p-4 rounded-2xl border transition-all ${
                          isAvailable
                            ? 'bg-slate-900/90 border-slate-800 hover:border-slate-700 shadow-sm'
                            : 'bg-slate-950/90 border-dashed border-slate-800/90 opacity-90'
                        }`}
                        id={`card-local-${loc.id}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-mono font-bold text-white text-sm">
                                {loc.name}
                              </h4>

                              {/* Status Badge */}
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase inline-flex items-center gap-1 ${
                                  isAvailable
                                    ? 'bg-emerald-950/90 text-emerald-400 border border-emerald-500/40'
                                    : 'bg-rose-950/70 text-rose-300 border border-rose-500/40'
                                }`}
                              >
                                {isAvailable ? (
                                  <>
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                    <span>Disponível</span>
                                  </>
                                ) : (
                                  <>
                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                                    <span>Indisponível</span>
                                  </>
                                )}
                              </span>
                            </div>

                            <p className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-pink-400 shrink-0" />
                              <span>{loc.city}</span>
                            </p>
                          </div>

                          {/* Quick Toggle Button */}
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(loc)}
                            className={`px-3 py-1.5 rounded-xl font-mono text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                              isAvailable
                                ? 'bg-slate-800 hover:bg-rose-950 hover:text-rose-300 hover:border-rose-500/40 text-slate-300 border border-slate-700'
                                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-950/40'
                            }`}
                            title={isAvailable ? 'Desativar este local (tornar indisponível)' : 'Ativar este local para novos agendamentos'}
                          >
                            {isAvailable ? (
                              <>
                                <XCircle className="w-3.5 h-3.5 text-rose-400" />
                                <span>Desativar</span>
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Ativar Local</span>
                              </>
                            )}
                          </button>
                        </div>

                        {/* Special Badges and Information */}
                        <div className="mt-3 space-y-2 pt-2 border-t border-slate-800/80">
                          {/* Restriction Note */}
                          {loc.restrictionNote && (
                            <div className="flex items-center gap-1.5 text-[11px] font-mono">
                              <span className={`px-2 py-0.5 rounded border flex items-center gap-1 ${
                                loc.isKidsOnly || isCelsoDaniel
                                  ? 'bg-amber-950/80 border-amber-500/50 text-amber-300 font-bold'
                                  : isParqueCentral
                                  ? 'bg-purple-950/80 border-purple-500/50 text-purple-300 font-semibold'
                                  : 'bg-slate-800 border-slate-700 text-slate-300'
                              }`}>
                                <AlertTriangle className="w-3 h-3 shrink-0" />
                                <span>Restrição: {loc.restrictionNote}</span>
                              </span>
                            </div>
                          )}

                          {/* Parque Central specific notice */}
                          {isParqueCentral && !isAvailable && (
                            <div className="p-2 rounded-lg bg-purple-950/40 border border-purple-500/30 text-[10px] font-mono text-purple-300 space-y-0.5">
                              <span className="font-bold flex items-center gap-1 text-purple-200">
                                <Clock className="w-3 h-3 text-purple-400" />
                                INATIVO INICIALMENTE
                              </span>
                              <p className="text-purple-300/90 leading-tight">
                                Cadastrado no sistema e pronto para ser ativado pelo instrutor com 1 clique quando estiver liberado para as aulas.
                              </p>
                            </div>
                          )}

                          {/* Address */}
                          {loc.address && (
                            <p className="text-[11px] text-slate-400 font-mono leading-tight">
                              {loc.address}
                            </p>
                          )}

                          {/* Notes */}
                          {loc.notes && (
                            <p className="text-[10px] text-slate-500 font-mono italic">
                              {loc.notes}
                            </p>
                          )}

                          {/* Footer Actions (Edit & Delete) */}
                          <div className="flex items-center justify-between pt-2 border-t border-slate-800/50 text-[10px] font-mono">
                            <span className="text-slate-500">
                              {isAvailable ? 'Liberado para novos agendamentos' : 'Oculto na agenda para novos alunos'}
                            </span>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleStartEdit(loc)}
                                className="text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
                              >
                                <Edit2 className="w-3 h-3 text-pink-400" />
                                <span>Editar</span>
                              </button>

                              {/* Only allow deleting if not default */}
                              <button
                                type="button"
                                onClick={() => handleDelete(loc.id, loc.name)}
                                className="text-slate-500 hover:text-rose-400 flex items-center gap-1 cursor-pointer transition-colors"
                                title="Remover local"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>Excluir</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}
export default AdminLocationsView;
