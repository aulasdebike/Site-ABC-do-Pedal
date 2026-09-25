'use client';

import React, { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  FileText,
  HardDrive,
  Database,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  UploadCloud,
  RefreshCw,
  Trash2,
  Plus,
  ShieldCheck,
  User,
  LogOut,
  Layers,
  Sparkles,
  Loader2
} from 'lucide-react';
import { 
  auth, 
  googleSignIn, 
  logoutUser, 
  getAccessToken,
  saveBookingToFirestore,
  getBookingsFromFirestore,
  saveTemplatesToFirestore,
  saveSlotsToFirestore
} from '@/lib/firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { 
  BookingRecord, 
  TimeSlot, 
  WhatsAppMessageTemplate,
  formatDateBrazilian, 
  getWeekdayName 
} from '@/lib/booking-store';
import {
  createGoogleCalendarEvent,
  createStudentAnamnesisDoc,
  uploadBookingRecordToDrive,
  listDriveFiles,
  deleteDriveFile,
  DriveFileItem,
  WorkspaceDocResult,
  WorkspaceEventResult
} from '@/lib/workspace';

interface WorkspaceManagerProps {
  bookings: BookingRecord[];
  onBookingsUpdated?: (bookings: BookingRecord[]) => void;
  slots?: TimeSlot[];
  templates?: WhatsAppMessageTemplate[];
}

export function WorkspaceManager({ 
  bookings, 
  onBookingsUpdated,
  slots = [],
  templates = []
}: WorkspaceManagerProps) {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Active sub-tab inside Workspace
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'calendar' | 'docs' | 'drive' | 'firestore'>('overview');

  // Drive files state
  const [driveFiles, setDriveFiles] = useState<DriveFileItem[]>([]);
  const [isLoadingDrive, setIsLoadingDrive] = useState(false);

  // Operation processing states
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Selected booking for actions
  const [selectedBookingId, setSelectedBookingId] = useState<string>(bookings[0]?.id || '');
  const targetBooking = bookings.find((b) => b.id === selectedBookingId) || bookings[0] || null;

  // Confirmation Modal State (MANDATORY per Workspace Skill)
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    actionType: 'calendar_create' | 'doc_create' | 'drive_upload' | 'drive_delete' | 'firestore_sync';
    payload?: any;
  }>({
    isOpen: false,
    title: '',
    description: '',
    actionType: 'calendar_create'
  });

  // Recent action outputs
  const [lastCreatedDoc, setLastCreatedDoc] = useState<WorkspaceDocResult | null>(null);
  const [lastCreatedEvent, setLastCreatedEvent] = useState<WorkspaceEventResult | null>(null);
  const [isSyncingFirestore, setIsSyncingFirestore] = useState(false);

  const loadDriveFiles = async (token: string) => {
    setIsLoadingDrive(true);
    try {
      const files = await listDriveFiles(token);
      setDriveFiles(files);
    } catch (e) {
      console.warn('Could not load drive files', e);
    } finally {
      setIsLoadingDrive(false);
    }
  };

  // Listen to Auth State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        const token = await getAccessToken();
        setAccessToken(token);
        if (token) {
          loadDriveFiles(token);
        }
      } else {
        setAccessToken(null);
        setDriveFiles([]);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleSignIn = async () => {
    setIsAuthenticating(true);
    setAuthError(null);
    try {
      const res = await googleSignIn();
      if (res?.accessToken) {
        setAccessToken(res.accessToken);
        loadDriveFiles(res.accessToken);
      }
      setSuccessMessage('Conta Google conectada com sucesso!');
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      console.error('Sign-in error:', err);
      setAuthError(err.message || 'Falha ao autenticar com Google. Tente novamente.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleSignOut = async () => {
    await logoutUser();
    setCurrentUser(null);
    setAccessToken(null);
    setDriveFiles([]);
  };

  // Triggers for confirmation dialogs
  const requestCalendarSync = (b: BookingRecord) => {
    if (!accessToken) {
      setErrorMessage('Por favor, conecte sua conta Google primeiro.');
      return;
    }
    setConfirmDialog({
      isOpen: true,
      title: 'Adicionar Aula ao Google Calendar',
      description: `Deseja criar um evento oficial no Google Calendar para o aluno ${b.student.fullName} em ${formatDateBrazilian(b.slot.date)} às ${b.slot.time}?`,
      actionType: 'calendar_create',
      payload: b
    });
  };

  const requestDocCreation = (b: BookingRecord) => {
    if (!accessToken) {
      setErrorMessage('Por favor, conecte sua conta Google primeiro.');
      return;
    }
    setConfirmDialog({
      isOpen: true,
      title: 'Gerar Ficha de Matrícula no Google Docs',
      description: `Deseja gerar um documento completo com termos de adesão e anamnese no seu Google Docs para o aluno ${b.student.fullName}?`,
      actionType: 'doc_create',
      payload: b
    });
  };

  const requestDriveUpload = (b: BookingRecord) => {
    if (!accessToken) {
      setErrorMessage('Por favor, conecte sua conta Google primeiro.');
      return;
    }
    setConfirmDialog({
      isOpen: true,
      title: 'Exportar Registro para Google Drive',
      description: `Deseja salvar o arquivo de contratação de ${b.student.fullName} diretamente no seu Google Drive?`,
      actionType: 'drive_upload',
      payload: b
    });
  };

  const requestDriveDelete = (file: DriveFileItem) => {
    if (!accessToken) {
      setErrorMessage('Por favor, conecte sua conta Google primeiro.');
      return;
    }
    setConfirmDialog({
      isOpen: true,
      title: 'Excluir Arquivo do Google Drive',
      description: `Atenção: Tem certeza de que deseja excluir permanentemente o arquivo "${file.name}" do seu Google Drive? Esta ação é irreversível.`,
      actionType: 'drive_delete',
      payload: file
    });
  };

  const requestFirestoreFullSync = () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Sincronizar com Firebase Firestore',
      description: 'Deseja sincronizar todas as reservas, horários e modelos com o banco de dados em nuvem Firebase Firestore (Projeto gen-lang-client-0885933970)?',
      actionType: 'firestore_sync'
    });
  };

  // Execution of confirmed actions
  const executeConfirmedAction = async () => {
    const { actionType, payload } = confirmDialog;
    setConfirmDialog({ ...confirmDialog, isOpen: false });
    setErrorMessage(null);

    if (actionType === 'calendar_create' && payload) {
      setIsProcessing('calendar');
      try {
        const result = await createGoogleCalendarEvent(payload, accessToken!);
        setLastCreatedEvent(result);
        setSuccessMessage(`Evento criado no Google Calendar com sucesso!`);
      } catch (err: any) {
        setErrorMessage(err.message || 'Falha ao criar evento no Google Calendar.');
      } finally {
        setIsProcessing(null);
      }
    } else if (actionType === 'doc_create' && payload) {
      setIsProcessing('docs');
      try {
        const result = await createStudentAnamnesisDoc(payload, accessToken!);
        setLastCreatedDoc(result);
        setSuccessMessage(`Ficha de matrícula gerada no Google Docs!`);
      } catch (err: any) {
        setErrorMessage(err.message || 'Falha ao gerar documento no Google Docs.');
      } finally {
        setIsProcessing(null);
      }
    } else if (actionType === 'drive_upload' && payload) {
      setIsProcessing('drive');
      try {
        await uploadBookingRecordToDrive(payload, accessToken!);
        setSuccessMessage(`Arquivo salvo com sucesso no Google Drive!`);
        if (accessToken) loadDriveFiles(accessToken);
      } catch (err: any) {
        setErrorMessage(err.message || 'Falha ao enviar arquivo para o Google Drive.');
      } finally {
        setIsProcessing(null);
      }
    } else if (actionType === 'drive_delete' && payload) {
      setIsProcessing('drive');
      try {
        await deleteDriveFile(payload.id, accessToken!);
        setSuccessMessage(`Arquivo "${payload.name}" excluído do Google Drive.`);
        if (accessToken) loadDriveFiles(accessToken);
      } catch (err: any) {
        setErrorMessage(err.message || 'Falha ao excluir arquivo.');
      } finally {
        setIsProcessing(null);
      }
    } else if (actionType === 'firestore_sync') {
      setIsSyncingFirestore(true);
      try {
        for (const b of bookings) {
          await saveBookingToFirestore(b);
        }
        if (slots.length > 0) {
          await saveSlotsToFirestore(slots);
        }
        if (templates.length > 0) {
          await saveTemplatesToFirestore(templates);
        }
        setSuccessMessage('Todos os dados foram sincronizados com sucesso no Firebase Firestore!');
      } catch (err: any) {
        setErrorMessage(err.message || 'Falha ao sincronizar com Firestore.');
      } finally {
        setIsSyncingFirestore(false);
      }
    }
  };

  return (
    <div className="space-y-6" id="workspace-cloud-manager">
      {/* Notifications */}
      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 text-xs text-emerald-300 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-400 hover:text-white">✕</button>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-950/60 border border-rose-500/40 text-xs text-rose-300 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-rose-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Main Connection Status Card */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-pink-500 text-xs font-mono font-bold uppercase mb-1">
              <Sparkles className="w-4 h-4" />
              <span>Integrações Google Workspace & Firebase</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-white">
              Google Workspace (Drive, Docs, Calendar) & Cloud Firestore
            </h3>
            <p className="text-slate-400 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
              Sincronize as aulas diretamente na sua agenda do Google Calendar, gere termos e anamneses formatados no Google Docs, salve registros no Google Drive e persista dados no Firebase Firestore.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {currentUser ? (
              <div className="flex items-center gap-3 bg-slate-950 p-2.5 rounded-2xl border border-slate-800">
                {currentUser.photoURL ? (
                  <img 
                    src={currentUser.photoURL} 
                    alt={currentUser.displayName || 'Google User'} 
                    className="w-10 h-10 rounded-full border border-pink-500/40"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-pink-500/20 text-pink-400 flex items-center justify-center font-bold">
                    {currentUser.displayName?.[0] || 'U'}
                  </div>
                )}
                <div className="pr-2">
                  <p className="text-xs font-bold text-white leading-none">{currentUser.displayName || 'Conta Google'}</p>
                  <p className="text-[11px] text-slate-400 mt-1">{currentUser.email}</p>
                </div>
                <button
                  onClick={handleSignOut}
                  className="p-2 rounded-xl bg-slate-900 hover:bg-rose-950/50 text-slate-400 hover:text-rose-400 border border-slate-800 transition"
                  title="Desconectar"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={handleSignIn}
                disabled={isAuthenticating}
                className="px-5 py-3 rounded-2xl bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-bold text-xs flex items-center gap-2.5 shadow-lg shadow-pink-600/30 transition cursor-pointer disabled:opacity-50"
              >
                {isAuthenticating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Conectando ao Google...</span>
                  </>
                ) : (
                  <>
                    <User className="w-4 h-4" />
                    <span>Conectar Conta Google (Workspace)</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Integration Status Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-800">
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                <CalendarIcon className="w-3.5 h-3.5 text-blue-400" />
                Google Calendar
              </span>
              <span className={`w-2 h-2 rounded-full ${accessToken ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
            </div>
            <p className="text-[10px] text-slate-500">{accessToken ? 'Pronto para agendar' : 'Aguardando login'}</p>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-indigo-400" />
                Google Docs
              </span>
              <span className={`w-2 h-2 rounded-full ${accessToken ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
            </div>
            <p className="text-[10px] text-slate-500">{accessToken ? 'Geração de fichas ativa' : 'Aguardando login'}</p>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                <HardDrive className="w-3.5 h-3.5 text-amber-400" />
                Google Drive
              </span>
              <span className={`w-2 h-2 rounded-full ${accessToken ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
            </div>
            <p className="text-[10px] text-slate-500">{accessToken ? `${driveFiles.length} arquivos` : 'Aguardando login'}</p>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-pink-400" />
                Firebase Firestore
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            </div>
            <p className="text-[10px] text-slate-500">Banco de dados ativo</p>
          </div>
        </div>
      </div>

      {/* Sub-tabs Navigation */}
      <div className="flex gap-2 overflow-x-auto pb-1 border-b border-slate-800">
        {[
          { id: 'overview', label: 'Ações Rápidas por Aluno' },
          { id: 'calendar', label: 'Google Calendar' },
          { id: 'docs', label: 'Google Docs (Anamnese)' },
          { id: 'drive', label: 'Google Drive Explorer' },
          { id: 'firestore', label: 'Firebase Cloud Database' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id as any)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              activeSubTab === tab.id
                ? 'bg-pink-600 text-white shadow'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* SUB-TAB: Overview / Student Quick Actions */}
      {activeSubTab === 'overview' && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
              <div>
                <h4 className="font-bold text-base text-white">Selecione o Aluno para Operar no Workspace:</h4>
                <p className="text-xs text-slate-400">Escolha um agendamento para gerar documentos, eventos na agenda ou backups.</p>
              </div>
              <select
                value={selectedBookingId}
                onChange={(e) => setSelectedBookingId(e.target.value)}
                className="px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold text-white focus:outline-none focus:border-pink-500"
              >
                {bookings.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.student.fullName} ({formatDateBrazilian(b.slot.date)} - {b.slot.time})
                  </option>
                ))}
              </select>
            </div>

            {targetBooking ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                {/* Calendar Action Card */}
                <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
                  <div>
                    <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center mb-3">
                      <CalendarIcon className="w-5 h-5" />
                    </div>
                    <h5 className="font-bold text-sm text-white">Google Calendar</h5>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      Cria evento na sua agenda com data ({formatDateBrazilian(targetBooking.slot.date)}), horário ({targetBooking.slot.time}), local (Portão 10) e lembretes automáticos.
                    </p>
                  </div>
                  <button
                    onClick={() => requestCalendarSync(targetBooking)}
                    disabled={isProcessing === 'calendar'}
                    className="mt-4 w-full py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition disabled:opacity-50"
                  >
                    {isProcessing === 'calendar' ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarIcon className="w-4 h-4" />}
                    <span>Sincronizar no Calendar</span>
                  </button>
                </div>

                {/* Docs Action Card */}
                <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
                  <div>
                    <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-3">
                      <FileText className="w-5 h-5" />
                    </div>
                    <h5 className="font-bold text-sm text-white">Google Docs</h5>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      Gera automaticamente a Ficha de Matrícula, Anamnese Biopedagógica e Termo de Compromisso para {targetBooking.student.fullName}.
                    </p>
                  </div>
                  <button
                    onClick={() => requestDocCreation(targetBooking)}
                    disabled={isProcessing === 'docs'}
                    className="mt-4 w-full py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition disabled:opacity-50"
                  >
                    {isProcessing === 'docs' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                    <span>Gerar Doc de Matrícula</span>
                  </button>
                </div>

                {/* Drive Action Card */}
                <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
                  <div>
                    <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center mb-3">
                      <HardDrive className="w-5 h-5" />
                    </div>
                    <h5 className="font-bold text-sm text-white">Google Drive</h5>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      Salva o registro de contratação e dados cadastrais como arquivo seguro no seu armazenamento em nuvem do Google Drive.
                    </p>
                  </div>
                  <button
                    onClick={() => requestDriveUpload(targetBooking)}
                    disabled={isProcessing === 'drive'}
                    className="mt-4 w-full py-2.5 px-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition disabled:opacity-50"
                  >
                    {isProcessing === 'drive' ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
                    <span>Exportar para Google Drive</span>
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400 py-6 text-center">Nenhum agendamento cadastrado.</p>
            )}

            {/* Direct Links to Recently Created Artifacts */}
            {(lastCreatedDoc || lastCreatedEvent) && (
              <div className="mt-6 pt-5 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {lastCreatedDoc && (
                  <a
                    href={lastCreatedDoc.documentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 rounded-xl bg-indigo-950/40 border border-indigo-500/30 flex items-center justify-between text-xs text-indigo-300 hover:bg-indigo-900/40 transition"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-indigo-400 shrink-0" />
                      <span className="font-bold truncate">{lastCreatedDoc.title}</span>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  </a>
                )}

                {lastCreatedEvent && (
                  <a
                    href={lastCreatedEvent.htmlLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 rounded-xl bg-blue-950/40 border border-blue-500/30 flex items-center justify-between text-xs text-blue-300 hover:bg-blue-900/40 transition"
                  >
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="w-4 h-4 text-blue-400 shrink-0" />
                      <span className="font-bold truncate">{lastCreatedEvent.summary}</span>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB: Google Calendar */}
      {activeSubTab === 'calendar' && (
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-bold text-base text-white flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-blue-400" />
                <span>Sincronização com Google Calendar</span>
              </h4>
              <p className="text-xs text-slate-400 mt-1">
                Todas as aulas podem ser adicionadas diretamente na agenda do instrutor com duração de 50 minutos e endereço completo do Portão 10.
              </p>
            </div>
            {lastCreatedEvent && (
              <a
                href={lastCreatedEvent.htmlLink}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 transition"
              >
                <span>Abrir Google Calendar</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>

          <div className="divide-y divide-slate-800 border border-slate-800 rounded-2xl overflow-hidden mt-4">
            {bookings.map((b) => (
              <div key={b.id} className="p-4 bg-slate-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h5 className="font-bold text-sm text-white">{b.student.fullName}</h5>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {formatDateBrazilian(b.slot.date)} ({getWeekdayName(b.slot.date)}) às {b.slot.time} • {b.student.ageProfile.toUpperCase()}
                  </p>
                </div>
                <button
                  onClick={() => requestCalendarSync(b)}
                  disabled={isProcessing === 'calendar'}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-blue-600 text-slate-300 hover:text-white font-bold text-xs border border-slate-800 transition flex items-center gap-2"
                >
                  <CalendarIcon className="w-3.5 h-3.5 text-blue-400" />
                  <span>Sincronizar Evento</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-TAB: Google Docs */}
      {activeSubTab === 'docs' && (
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
          <div>
            <h4 className="font-bold text-base text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-400" />
              <span>Gerador de Fichas e Contratos no Google Docs</span>
            </h4>
            <p className="text-xs text-slate-400 mt-1">
              Crie documentos oficiais no Google Docs contendo anamnese, calibração física (peso/altura), termos aceitos e assinatura pedagógica da ABC do Pedal.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {bookings.map((b) => (
              <div key={b.id} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300">
                    Ficha Cadastral
                  </span>
                  <h5 className="font-bold text-sm text-white mt-2">{b.student.fullName}</h5>
                  <p className="text-xs text-slate-400 mt-1">
                    CPF: {b.student.cpf} • Altura: {b.student.heightCm}cm • Peso: {b.student.weightKg}kg
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-850 flex items-center justify-between">
                  <span className="text-[11px] text-slate-500">Formato Google Docs</span>
                  <button
                    onClick={() => requestDocCreation(b)}
                    disabled={isProcessing === 'docs'}
                    className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 transition"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Criar Documento</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-TAB: Google Drive Explorer */}
      {activeSubTab === 'drive' && (
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h4 className="font-bold text-base text-white flex items-center gap-2">
                <HardDrive className="w-5 h-5 text-amber-400" />
                <span>Explorador de Arquivos do Google Drive</span>
              </h4>
              <p className="text-xs text-slate-400 mt-1">
                Visualização e gerenciamento seguro dos arquivos salvos na nuvem do Google Drive da escola.
              </p>
            </div>
            {accessToken && (
              <button
                onClick={() => loadDriveFiles(accessToken)}
                disabled={isLoadingDrive}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 flex items-center gap-2 transition"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingDrive ? 'animate-spin' : ''}`} />
                <span>Atualizar Arquivos</span>
              </button>
            )}
          </div>

          {!accessToken ? (
            <div className="p-8 rounded-2xl bg-slate-950 border border-slate-800 text-center">
              <HardDrive className="w-8 h-8 text-amber-500/40 mx-auto mb-2" />
              <p className="text-xs text-slate-300 font-bold">Conecte sua conta Google para listar os arquivos do Drive</p>
              <button
                onClick={handleSignIn}
                className="mt-4 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition"
              >
                Conectar Conta Google
              </button>
            </div>
          ) : isLoadingDrive ? (
            <div className="py-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
              <span>Carregando arquivos do Google Drive...</span>
            </div>
          ) : driveFiles.length === 0 ? (
            <div className="p-8 rounded-2xl bg-slate-950 border border-slate-800 text-center">
              <p className="text-xs text-slate-400">Nenhum arquivo de agendamento encontrado no Google Drive ainda.</p>
              <p className="text-[11px] text-slate-500 mt-1">Gere um documento ou exporte uma contratação na aba Ações Rápidas.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-800 border border-slate-800 rounded-2xl overflow-hidden">
              {driveFiles.map((file) => (
                <div key={file.id} className="p-4 bg-slate-950 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-amber-400 shrink-0" />
                    <div>
                      <h5 className="font-bold text-xs text-white truncate max-w-md">{file.name}</h5>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        {file.createdTime ? new Date(file.createdTime).toLocaleDateString('pt-BR') : 'Arquivo Drive'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {file.webViewLink && (
                      <a
                        href={file.webViewLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white"
                        title="Abrir no Google Drive"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                    <button
                      onClick={() => requestDriveDelete(file)}
                      className="p-2 rounded-lg bg-slate-900 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400"
                      title="Excluir do Drive"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB: Firebase Firestore Database */}
      {activeSubTab === 'firestore' && (
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h4 className="font-bold text-base text-white flex items-center gap-2">
                <Database className="w-5 h-5 text-pink-500" />
                <span>Banco de Dados em Nuvem (Firebase Firestore)</span>
              </h4>
              <p className="text-xs text-slate-400 mt-1">
                Projeto provisionado: <code className="text-pink-400 font-mono">gen-lang-client-0885933970</code> • Região: <code className="text-slate-300 font-mono">us-east1</code>
              </p>
            </div>
            <button
              onClick={requestFirestoreFullSync}
              disabled={isSyncingFirestore}
              className="px-4 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-pink-600/30 transition disabled:opacity-50"
            >
              {isSyncingFirestore ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
              <span>Sincronizar Tudo com Firestore</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
              <span className="text-[10px] font-mono uppercase text-slate-400">Coleção Firestore</span>
              <h5 className="font-bold text-base text-white mt-1">/bookings</h5>
              <p className="text-xs text-pink-400 mt-1 font-bold">{bookings.length} registros prontos</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
              <span className="text-[10px] font-mono uppercase text-slate-400">Coleção Firestore</span>
              <h5 className="font-bold text-base text-white mt-1">/slots</h5>
              <p className="text-xs text-emerald-400 mt-1 font-bold">{slots.length} horários cadastrados</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
              <span className="text-[10px] font-mono uppercase text-slate-400">Coleção Firestore</span>
              <h5 className="font-bold text-base text-white mt-1">/templates</h5>
              <p className="text-xs text-amber-400 mt-1 font-bold">{templates.length} modelos de mensagem</p>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog Modal (MANDATORY per Workspace Skill) */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl text-slate-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-pink-500/10 text-pink-500 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-base text-white">{confirmDialog.title}</h4>
                <p className="text-[11px] text-slate-400">Confirmação obrigatória de operação no Workspace</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed mb-6 bg-slate-950 p-4 rounded-2xl border border-slate-800">
              {confirmDialog.description}
            </p>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={executeConfirmedAction}
                className="px-5 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold transition shadow-lg shadow-pink-600/30"
              >
                Confirmar e Executar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
