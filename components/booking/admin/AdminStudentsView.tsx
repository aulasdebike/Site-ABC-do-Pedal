'use client';

import React, { useState, useMemo } from 'react';
import {
  Users,
  Search,
  Plus,
  User,
  Phone,
  Mail,
  Calendar,
  Clock,
  Shield,
  FileText,
  MessageCircle,
  Award,
  CheckCircle,
  CheckCircle2,
  XCircle,
  ExternalLink,
  ChevronRight,
  Eye,
  MapPin,
  Sparkles,
  DollarSign,
  X,
  Check,
  FileCheck,
  Upload
} from 'lucide-react';
import {
  BookingRecord,
  formatDateBrazilian,
  saveStoredBookings,
  getStoredBookings,
  isBookingAwaitingInstructorSchedule,
  getBookingVoucherUrl,
  isBookingVoucherPending,
  submitBookingVoucher,
  compressReceiptImage
} from '@/lib/booking-store';
import { saveBookingToFirestore } from '@/lib/firebase';

interface AdminStudentsViewProps {
  bookings: BookingRecord[];
  onSelectBooking: (booking: BookingRecord) => void;
  onNavigate: (tab: any) => void;
  onOpenCertificateModal: (booking: BookingRecord) => void;
  onOpenVoucherModal: (url: string) => void;
  onUpdateBookings: (updated: BookingRecord[]) => void;
  onApproveVoucher?: (booking: BookingRecord) => void;
  onRequestReproveVoucher?: (booking: BookingRecord) => void;
}

export function AdminStudentsView({
  bookings,
  onSelectBooking,
  onNavigate,
  onOpenCertificateModal,
  onOpenVoucherModal,
  onUpdateBookings,
  onApproveVoucher,
  onRequestReproveVoucher
}: AdminStudentsViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudentKey, setSelectedStudentKey] = useState<string | null>(null);
  const [isRegisteringStudent, setIsRegisteringStudent] = useState(false);

  // Form para cadastro manual rápido de aluno
  const [newFullName, setNewFullName] = useState('');
  const [newWhatsapp, setNewWhatsapp] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newCpf, setNewCpf] = useState('');
  const [newBirthDate, setNewBirthDate] = useState('');
  const [newHeight, setNewHeight] = useState('');
  const [newWeight, setNewWeight] = useState('');
  const [newRestrictions, setNewRestrictions] = useState('');
  const [newLevel, setNewLevel] = useState('Nunca andou de bicicleta');
  const [formFeedback, setFormFeedback] = useState<string | null>(null);

  // Agrupamento de inscrições por Aluno Único
  const studentsMap = useMemo(() => {
    const map = new Map<string, {
      key: string;
      fullName: string;
      whatsapp: string;
      email: string;
      cpf: string;
      latestBooking: BookingRecord;
      allBookings: BookingRecord[];
      totalInvested: number;
    }>();

    bookings.forEach((b) => {
      const cleanPhone = (b.student?.whatsapp || '').replace(/\D/g, '');
      const key = cleanPhone || b.student?.cpf || b.student?.fullName || b.id;

      if (!map.has(key)) {
        map.set(key, {
          key,
          fullName: b.student?.fullName || 'Aluno Sem Nome',
          whatsapp: b.student?.whatsapp || '',
          email: b.student?.email || '',
          cpf: b.student?.cpf || '',
          latestBooking: b,
          allBookings: [b],
          totalInvested: (b.price || b.location?.price || 499)
        });
      } else {
        const existing = map.get(key)!;
        existing.allBookings.push(b);
        existing.totalInvested += (b.price || b.location?.price || 499);
        // Atualiza latestBooking se for mais recente
        if (new Date(b.createdAt).getTime() > new Date(existing.latestBooking.createdAt).getTime()) {
          existing.latestBooking = b;
          if (b.student?.fullName) existing.fullName = b.student.fullName;
          if (b.student?.email) existing.email = b.student.email;
          if (b.student?.cpf) existing.cpf = b.student.cpf;
        }
      }
    });

    return map;
  }, [bookings]);

  const studentsList = useMemo(() => {
    return Array.from(studentsMap.values());
  }, [studentsMap]);

  // Alunos filtrados pela busca
  const filteredStudents = useMemo(() => {
    if (!searchTerm.trim()) return studentsList;
    const term = searchTerm.toLowerCase();
    return studentsList.filter(
      (s) =>
        s.fullName.toLowerCase().includes(term) ||
        s.whatsapp.includes(term) ||
        s.email.toLowerCase().includes(term) ||
        s.cpf.includes(term)
    );
  }, [studentsList, searchTerm]);

  // Aluno atualmente selecionado para visualização detalhada
  const activeStudent = useMemo(() => {
    if (selectedStudentKey && studentsMap.has(selectedStudentKey)) {
      return studentsMap.get(selectedStudentKey);
    }
    return filteredStudents[0] || null;
  }, [selectedStudentKey, studentsMap, filteredStudents]);

  // Salvar novo aluno cadastrado manualmente pelo instrutor
  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFullName.trim() || !newWhatsapp.trim()) {
      setFormFeedback('Por favor, informe ao menos o nome completo e o WhatsApp.');
      return;
    }

    const timestamp = Date.now();
    const newId = `rec_admin_${timestamp}`;
    const todayIso = new Date().toISOString().split('T')[0];

    const newBooking: BookingRecord = {
      id: newId,
      productId: 'aprender-a-pedalar',
      productName: 'APRENDER A PEDALAR',
      price: 499,
      slot: {
        id: `slot_manual_${timestamp}`,
        date: todayIso,
        time: '09:00',
        durationMinutes: 50,
        locationId: 'ibirapuera',
        locationName: 'Parque do Ibirapuera'
      },
      student: {
        fullName: newFullName.trim(),
        whatsapp: newWhatsapp.trim(),
        email: newEmail.trim() || 'aluno@abcdopedal.com',
        cpf: newCpf.trim() || '000.000.000-00',
        birthDate: newBirthDate || '1995-01-01',
        ageProfile: 'adulto',
        heightCm: newHeight || '170',
        weightKg: newWeight || '70',
        hasSpecificNeeds: Boolean(newRestrictions),
        specificNeedsDescription: newRestrictions || undefined
      },
      policies: {
        acceptedLessonPolicy: true,
        acknowledgedNotTherapy: true,
        declaredAccurateInfo: true
      },
      imageAuthorization: {
        authorized: true
      },
      location: {
        region: 'sao_paulo',
        regionTitle: 'São Paulo',
        locationId: 'ibirapuera',
        locationName: 'Parque do Ibirapuera',
        address: 'Avenida Pedro Álvares Cabral, s/n — Vila Mariana, São Paulo - SP',
        city: 'São Paulo',
        state: 'SP',
        price: 499,
        isFixed: true
      },
      status: 'agendamento-confirmado',
      createdAt: new Date().toISOString(),
      preReservationExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      currentABCDE: 'A',
      milestones: {}
    };

    const currentBookings = getStoredBookings();
    const updated = [newBooking, ...currentBookings];
    saveStoredBookings(updated);
    onUpdateBookings(updated);

    // Salva no Firestore
    saveBookingToFirestore(newBooking).catch((err) => {
      console.warn('Erro ao sincronizar novo aluno com Firestore:', err);
    });

    // Limpar form
    setNewFullName('');
    setNewWhatsapp('');
    setNewEmail('');
    setNewCpf('');
    setNewBirthDate('');
    setNewHeight('');
    setNewWeight('');
    setNewRestrictions('');
    setIsRegisteringStudent(false);
    setSelectedStudentKey(newBooking.student.whatsapp.replace(/\D/g, '') || newBooking.id);
    setFormFeedback('Aluno cadastrado com sucesso e adicionado ao sistema!');
    setTimeout(() => setFormFeedback(null), 4000);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300" id="admin-students-module">
      {/* Top Header & Barra de Busca / Cadastro */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-slate-950 p-4 sm:p-5 rounded-2xl border border-slate-800 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome, CPF ou WhatsApp..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-3 py-2.5 text-xs text-white focus:outline-none focus:border-pink-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          <span className="text-xs font-mono text-slate-400">
            Total: <strong className="text-white">{studentsList.length}</strong> alunos
          </span>
          <button
            type="button"
            onClick={() => setIsRegisteringStudent(true)}
            className="px-4 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white text-xs font-mono font-bold flex items-center gap-2 shadow-md shadow-pink-950 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Cadastrar Aluno</span>
          </button>
        </div>
      </div>

      {formFeedback && (
        <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 text-xs font-mono flex items-center justify-between">
          <span className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            {formFeedback}
          </span>
          <button type="button" onClick={() => setFormFeedback(null)} className="text-xs text-emerald-400 hover:text-white">
            ✕
          </button>
        </div>
      )}

      {/* Modal de Cadastro de Aluno */}
      {isRegisteringStudent && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-pink-400" />
                <h3 className="font-bold text-white text-base">Novo Cadastro de Aluno</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsRegisteringStudent(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateStudent} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-300">Nome Completo *</label>
                <input
                  type="text"
                  required
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  placeholder="Ex: Mariana Silveira"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-pink-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-300">WhatsApp *</label>
                  <input
                    type="text"
                    required
                    value={newWhatsapp}
                    onChange={(e) => setNewWhatsapp(e.target.value)}
                    placeholder="(11) 98888-7777"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-pink-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-300">E-mail</label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="aluno@email.com"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-pink-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-300">CPF</label>
                  <input
                    type="text"
                    value={newCpf}
                    onChange={(e) => setNewCpf(e.target.value)}
                    placeholder="000.000.000-00"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-pink-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-300">Altura (cm)</label>
                  <input
                    type="text"
                    value={newHeight}
                    onChange={(e) => setNewHeight(e.target.value)}
                    placeholder="170"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-pink-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-300">Peso (kg)</label>
                  <input
                    type="text"
                    value={newWeight}
                    onChange={(e) => setNewWeight(e.target.value)}
                    placeholder="68"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-pink-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-300">Nível Inicial</label>
                <select
                  value={newLevel}
                  onChange={(e) => setNewLevel(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-pink-500 focus:outline-none"
                >
                  <option value="Nunca andou de bicicleta">Nunca andou de bicicleta</option>
                  <option value="Andou com rodinhas na infância">Andou com rodinhas na infância</option>
                  <option value="Sabe pedalar mas tem medo/trauma">Sabe pedalar mas tem medo/trauma</option>
                  <option value="Busca aperfeiçoamento e segurança">Busca aperfeiçoamento e segurança</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-300">Restrições Físicas / Observações</label>
                <textarea
                  rows={2}
                  value={newRestrictions}
                  onChange={(e) => setNewRestrictions(e.target.value)}
                  placeholder="Ex: Dores no joelho, labirintite, etc."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-pink-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsRegisteringStudent(false)}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-bold"
                >
                  Cadastrar Aluno
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Grid Principal: Lista de Alunos (Esquerda) + Ficha Detalhada (Direita) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Lista de Alunos */}
        <div className="lg:col-span-5 space-y-3">
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs font-mono text-slate-400 flex items-center justify-between">
            <span>Listagem de Alunos ({filteredStudents.length})</span>
            <span>Clique para ver detalhes</span>
          </div>

          {filteredStudents.length === 0 ? (
            <div className="p-8 text-center bg-slate-950 border border-slate-800 rounded-2xl text-slate-500 text-xs space-y-2">
              <Users className="w-8 h-8 mx-auto opacity-40 text-slate-600" />
              <p>Nenhum aluno encontrado para os critérios de busca.</p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[750px] overflow-y-auto pr-1">
              {filteredStudents.map((s) => {
                const isSelected = activeStudent?.key === s.key;
                const b = s.latestBooking;
                const dateStr = isBookingAwaitingInstructorSchedule(b)
                  ? 'Aguardando confirmação do instrutor'
                  : (b.slot?.date ? formatDateBrazilian(b.slot.date) : 'Sem data');

                return (
                  <div
                    key={s.key}
                    onClick={() => {
                      setSelectedStudentKey(s.key);
                      onSelectBooking(b);
                    }}
                    className={`p-4 rounded-xl border text-xs transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-slate-900 border-pink-500 shadow-md shadow-pink-950/20'
                        : 'bg-slate-950 border-slate-850 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="font-bold text-white text-sm flex items-center gap-2">
                          <span>{s.fullName}</span>
                          {s.allBookings.length > 1 && (
                            <span className="px-1.5 py-0.5 rounded bg-pink-500/20 text-pink-300 text-[10px] font-mono">
                              {s.allBookings.length} aulas
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-slate-400 font-mono text-[11px]">
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3 text-emerald-400" />
                            {s.whatsapp || 'Sem telefone'}
                          </span>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-mono text-[10px]">
                        {b.status}
                      </span>
                    </div>

                    <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-800/80 text-[11px] text-slate-400">
                      <span>Última aula: {dateStr}</span>
                      <span className="text-pink-400 font-mono font-medium flex items-center gap-0.5">
                        Ver Ficha <ChevronRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Ficha Completa do Aluno Selecionado */}
        <div className="lg:col-span-7">
          {activeStudent ? (
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-xl">
              {/* Header do Aluno */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-pink-500/20 text-pink-400 font-mono text-[10px] font-bold border border-pink-500/30">
                      Ficha do Aluno
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">
                      ID: #{activeStudent.latestBooking.id.slice(-6)}
                    </span>
                  </div>
                  <h3 className="text-xl font-black text-white mt-1">
                    {activeStudent.fullName}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Cadastrado no sistema em {new Date(activeStudent.latestBooking.createdAt).toLocaleDateString('pt-BR')}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {activeStudent.whatsapp && (
                    <a
                      href={`https://wa.me/55${activeStudent.whatsapp.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold flex items-center gap-1.5 shadow"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>WhatsApp</span>
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      onSelectBooking(activeStudent.latestBooking);
                      onNavigate('evolucao');
                    }}
                    className="px-3 py-1.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-mono text-xs font-bold flex items-center gap-1.5 shadow"
                  >
                    <Award className="w-3.5 h-3.5" />
                    <span>Evolução ABCDE</span>
                  </button>
                </div>
              </div>

              {/* Dados Cadastrais e Biometria */}
              <div className="space-y-3">
                <h4 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-pink-400" />
                  <span>Dados Cadastrais & Perfil Físico</span>
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs">
                    <span className="text-slate-500 text-[10px] uppercase font-mono block">WhatsApp</span>
                    <span className="font-mono text-slate-200 font-bold">{activeStudent.whatsapp || '-'}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs">
                    <span className="text-slate-500 text-[10px] uppercase font-mono block">E-mail</span>
                    <span className="text-slate-200 truncate block">{activeStudent.email || '-'}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs">
                    <span className="text-slate-500 text-[10px] uppercase font-mono block">CPF</span>
                    <span className="font-mono text-slate-200">{activeStudent.cpf || '-'}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs">
                    <span className="text-slate-500 text-[10px] uppercase font-mono block">Nascimento / Idade</span>
                    <span className="font-mono text-slate-200">
                      {activeStudent.latestBooking.student?.birthDate
                        ? `${formatDateBrazilian(activeStudent.latestBooking.student.birthDate)}`
                        : '-'}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs">
                    <span className="text-slate-500 text-[10px] uppercase font-mono block">Altura</span>
                    <span className="font-mono text-slate-200">
                      {activeStudent.latestBooking.student?.heightCm ? `${activeStudent.latestBooking.student.heightCm} cm` : '-'}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs">
                    <span className="text-slate-500 text-[10px] uppercase font-mono block">Peso</span>
                    <span className="font-mono text-slate-200">
                      {activeStudent.latestBooking.student?.weightKg ? `${activeStudent.latestBooking.student.weightKg} kg` : '-'}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs sm:col-span-2">
                    <span className="text-slate-500 text-[10px] uppercase font-mono block">Nível Declarado</span>
                    <span className="text-pink-400 font-medium">
                      {activeStudent.latestBooking.currentABCDE ? `Etapa ${activeStudent.latestBooking.currentABCDE}` : 'Iniciante'}
                    </span>
                  </div>
                </div>

                {activeStudent.latestBooking.student?.hasSpecificNeeds && activeStudent.latestBooking.student?.specificNeedsDescription && (
                  <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/30 text-xs space-y-1">
                    <span className="text-[10px] font-mono text-amber-400 font-bold uppercase block">
                      Restrições Físicas / Recomendações Médicas
                    </span>
                    <p className="text-slate-300">
                      {activeStudent.latestBooking.student.specificNeedsDescription}
                    </p>
                  </div>
                )}
              </div>

              {/* Endereço / Local de Encontro e CEP */}
              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-pink-400 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>Local da Aula / Encontro</span>
                  </span>
                  {activeStudent.latestBooking.location?.cep && (
                    <span className="px-2 py-0.5 rounded bg-pink-500/20 text-pink-300 font-mono text-[10px]">
                      CEP Pesquisado: {activeStudent.latestBooking.location.cep}
                    </span>
                  )}
                </div>
                <p className="text-slate-300 font-light">
                  {activeStudent.latestBooking.location?.address || 'Parque do Ibirapuera — Portão 10'}
                </p>
              </div>

              {/* Contratos e Termos Aceitos */}
              <div className="space-y-3">
                <h4 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <Shield className="w-3.5 h-3.5 text-pink-400" />
                  <span>Contratos & Termos Aceitos</span>
                </h4>
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs space-y-2 font-mono">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Termo de Ciência e Responsabilidade:</span>
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Aceito
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Política de Reagendamento e Cancelamento:</span>
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Aceito
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-[11px] text-slate-500">
                    <span>Data do Registro:</span>
                    <span>
                      {activeStudent.latestBooking.createdAt
                        ? new Date(activeStudent.latestBooking.createdAt).toLocaleString('pt-BR')
                        : 'No momento da inscrição'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Comprovante de Pagamento do Aluno */}
              {(() => {
                const voucherBooking =
                  [...activeStudent.allBookings].reverse().find((b) => Boolean(getBookingVoucherUrl(b)) || isBookingVoucherPending(b)) ||
                  activeStudent.latestBooking;
                if (!voucherBooking) return null;
                const vUrl = getBookingVoucherUrl(voucherBooking);
                const isPending = isBookingVoucherPending(voucherBooking);
                const isApproved = voucherBooking.status === 'agendamento-confirmado' || voucherBooking.status === 'pagamento-confirmado' || voucherBooking.status === 'confirmado';
                const isReproved = voucherBooking.status === 'comprovante-reprovado' || voucherBooking.status === 'comprovante-rejeitado';

                return (
                  <div className="p-4 rounded-2xl bg-slate-900 border border-slate-700/80 space-y-3.5 shadow-md" id="student-voucher-card">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                        <FileCheck className="w-4 h-4 text-amber-400" />
                        <span>Comprovante de Pagamento da Contratação</span>
                      </h4>
                      {isPending ? (
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-mono font-black animate-pulse flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                          COMPROVANTE EM ANÁLISE
                        </span>
                      ) : isApproved ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono font-bold flex items-center gap-1">
                          <CheckCircle className="w-3 h-3 text-emerald-400" />
                          COMPROVANTE APROVADO
                        </span>
                      ) : isReproved ? (
                        <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-mono font-bold flex items-center gap-1">
                          <XCircle className="w-3 h-3 text-rose-400" />
                          COMPROVANTE REPROVADO
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 text-[10px] font-mono font-medium">
                          SEM COMPROVANTE
                        </span>
                      )}
                    </div>

                    {/* Imagem do Comprovante */}
                    {vUrl ? (
                      <div className="space-y-1.5">
                        <div
                          onClick={() => onOpenVoucherModal(vUrl)}
                          className="relative group cursor-pointer overflow-hidden rounded-xl border border-slate-700 bg-black/90 p-2 flex flex-col items-center justify-center transition-all hover:border-pink-500/60 shadow-inner max-h-56"
                          title="Clique para conferir e ampliar comprovante"
                        >
                          <img
                            src={vUrl}
                            alt={`Comprovante de ${activeStudent.fullName}`}
                            className="w-full max-h-48 object-contain rounded-lg transition-transform duration-200 group-hover:scale-[1.02]"
                          />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-xs font-mono font-bold gap-1.5 backdrop-blur-[1px]">
                            <Eye className="w-4 h-4 text-pink-400" />
                            <span>Clique para Ampliar Comprovante</span>
                          </div>
                        </div>
                        {voucherBooking.voucherFileName && (
                          <p className="text-[10px] font-mono text-slate-400">
                            Arquivo: <span className="text-slate-200">{voucherBooking.voucherFileName}</span>
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="p-4 rounded-xl bg-slate-950/60 border border-dashed border-slate-800 text-center space-y-2">
                        <p className="text-xs text-slate-400 font-mono">
                          Nenhum arquivo de comprovante anexado ainda para este agendamento.
                        </p>
                      </div>
                    )}

                    {/* Motivo de reprovação se aplicável */}
                    {isReproved && (voucherBooking.rejectionReason || voucherBooking.notes) && (
                      <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-500/30 text-xs text-rose-200">
                        <span className="text-[10px] font-mono font-bold block text-rose-300 uppercase">Motivo da Reprovação:</span>
                        {voucherBooking.rejectionReason || voucherBooking.notes}
                      </div>
                    )}

                    {/* Anexar / Substituir comprovante manualmente pelo instrutor */}
                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
                      <label className="flex items-center gap-1.5 text-xs font-mono text-pink-400 hover:text-pink-300 cursor-pointer py-1 px-2.5 rounded-lg hover:bg-pink-500/10 border border-pink-500/30 transition-colors">
                        <Upload className="w-3.5 h-3.5" />
                        <span>{vUrl ? 'Substituir / Reanexar Comprovante' : 'Anexar Comprovante do Aluno'}</span>
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            try {
                              const compressed = await compressReceiptImage(file);
                              if (!compressed) return;
                              const updated = submitBookingVoucher(voucherBooking.id, {
                                voucherUrl: compressed,
                                voucherFileName: file.name
                              }, voucherBooking);
                              if (updated) {
                                const latest = getStoredBookings();
                                onUpdateBookings(latest);
                              }
                            } catch (err) {
                              console.error('Erro ao anexar comprovante:', err);
                            }
                          }}
                        />
                      </label>
                    </div>

                    {/* Botões de Ação: Aprovar ou Reprovar */}
                    <div className="flex items-center gap-2 pt-1 border-t border-slate-800">
                      <button
                        type="button"
                        onClick={() => onApproveVoucher && onApproveVoucher(voucherBooking)}
                        className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold flex items-center justify-center gap-1.5 shadow transition-all cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>{isApproved ? 'Re-confirmar' : 'Aprovar Comprovante'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onRequestReproveVoucher && onRequestReproveVoucher(voucherBooking)}
                        className="px-3.5 py-2 rounded-xl bg-rose-950/60 hover:bg-rose-900 border border-rose-500/40 text-rose-300 font-mono text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Reprovar</span>
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* Histórico de Aulas e Agendamentos */}
              <div className="space-y-3">
                <h4 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-pink-400" />
                  <span>Histórico de Agendamentos ({activeStudent.allBookings.length})</span>
                </h4>
                <div className="space-y-2">
                  {activeStudent.allBookings.map((b) => (
                    <div
                      key={b.id}
                      className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between text-xs"
                    >
                      <div className="space-y-0.5">
                        <div className="font-bold text-white flex items-center gap-2">
                          <span>
                            {isBookingAwaitingInstructorSchedule(b) ? (
                              <span className="text-amber-300 font-bold">Aguardando confirmação do instrutor</span>
                            ) : (
                              `${formatDateBrazilian(b.slot?.date || '')} às ${b.slot?.time || '09:00'}`
                            )}
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                            {b.status}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 truncate">
                          {b.assignedLocationName || b.location?.locationName || b.slot?.locationName || 'Parque do Ibirapuera'}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {Boolean(getBookingVoucherUrl(b)) && (
                          <button
                            type="button"
                            onClick={() => onOpenVoucherModal(getBookingVoucherUrl(b)!)}
                            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-mono flex items-center gap-1 cursor-pointer"
                          >
                            <Eye className="w-3 h-3 text-pink-400" />
                            <span>Comprovante</span>
                          </button>
                        )}
                        <span className="font-mono text-emerald-400 font-bold">
                          R$ {(b.price || 499).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Ações Rápidas de Certificação */}
              <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => onOpenCertificateModal(activeStudent.latestBooking)}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-white font-mono text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <Award className="w-4 h-4 text-pink-400" />
                  <span>Visualizar Certificado Oficial</span>
                </button>

                <div className="text-xs font-mono text-slate-400">
                  Total Investido: <strong className="text-emerald-400">R$ {activeStudent.totalInvested.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-12 text-center text-slate-500 text-xs">
              Selecione um aluno na lista para visualizar a ficha completa.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
