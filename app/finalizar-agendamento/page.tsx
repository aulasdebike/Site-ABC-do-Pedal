'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, UserCheck, Bike, Sparkles } from 'lucide-react';
import { 
  BookingRecord, 
  getStoredBookings, 
  getStoredCurrentBookingId,
  checkAndExpireReservations 
} from '@/lib/booking-store';
import { FinalizeBookingView } from '@/components/booking/FinalizeBookingView';

function FinalizeBookingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [booking, setBooking] = useState<BookingRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAndExpireReservations();

    const paramId = searchParams.get('id') || searchParams.get('bookingId');
    const storedCurrentId = getStoredCurrentBookingId();
    const allBookings = getStoredBookings();

    let targetBooking: BookingRecord | undefined;

    if (paramId) {
      targetBooking = allBookings.find((b) => b.id === paramId);
    }

    if (!targetBooking && storedCurrentId) {
      targetBooking = allBookings.find((b) => b.id === storedCurrentId);
    }

    if (!targetBooking && allBookings.length > 0) {
      // Find latest pending or provisional booking
      targetBooking = allBookings.find(
        (b) =>
          b.status === 'reserva-temporaria' ||
          b.status === 'aguardando-pagamento' ||
          b.status === 'pre-agendado'
      ) || allBookings[0];
    }

    const timer = setTimeout(() => {
      if (targetBooking) {
        setBooking(targetBooking);
      }
      setLoading(false);
    }, 0);

    return () => clearTimeout(timer);
  }, [searchParams]);

  const handleGoToStudentPortal = (bookingId: string) => {
    router.push(`/?view=agendamento&sub=student_portal&bookingId=${bookingId}`);
  };

  const handleChooseNewSlot = () => {
    router.push('/?view=agendamento');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-pink-500 border-t-transparent animate-spin" />
          <p className="text-xs font-mono text-slate-400">Carregando dados da reserva...</p>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="max-w-md mx-auto my-12 bg-slate-900/60 border border-slate-800 rounded-3xl p-8 text-center">
        <div className="w-14 h-14 rounded-2xl bg-pink-950/60 border border-pink-500/30 text-pink-400 flex items-center justify-center mx-auto mb-4">
          <Bike className="w-7 h-7" />
        </div>
        <h3 className="text-xl font-bold text-white mb-2">Nenhuma reserva ativa encontrada</h3>
        <p className="text-xs text-slate-400 mb-6 leading-relaxed">
          Você ainda não iniciou um agendamento ou a sua reserva anterior já expirou.
        </p>
        <Link
          href="/?view=agendamento"
          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-bold text-xs tracking-wide transition-all shadow-lg shadow-pink-600/30"
        >
          <span>Agendar Aula de Bicicleta</span>
        </Link>
      </div>
    );
  }

  return (
    <FinalizeBookingView
      booking={booking}
      onBookingUpdated={(updated) => setBooking(updated)}
      onGoToStudentPortal={handleGoToStudentPortal}
      onChooseNewSlot={handleChooseNewSlot}
    />
  );
}

export default function FinalizarAgendamentoPage() {
  return (
    <div className="min-h-screen bg-[#060608] text-slate-100 selection:bg-pink-500 selection:text-white relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-pink-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 w-80 h-80 bg-rose-600/10 rounded-full blur-3xl" />
      </div>

      {/* Top Header Bar */}
      <header className="sticky top-0 z-50 bg-[#060608]/90 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-8 py-3.5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex items-center gap-1.5 text-xs font-mono font-bold text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar ao Início</span>
            </Link>

            <div className="h-4 w-px bg-slate-800" />

            <div className="flex items-center gap-1.5">
              <span className="font-display font-black text-white text-base uppercase tracking-tight">
                ABC <span className="text-pink-500">do Pedal</span>
              </span>
              <span className="text-[10px] font-mono text-pink-400 font-semibold uppercase hidden sm:inline">
                • Finalizar Agendamento
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/?view=agendamento&sub=student_portal"
              className="px-3 py-1.5 rounded-lg text-xs font-mono font-bold bg-slate-900 text-slate-400 hover:text-white border border-slate-800 flex items-center gap-1.5 transition-all"
            >
              <UserCheck className="w-3.5 h-3.5 text-pink-400" />
              <span className="hidden sm:inline">Área do Aluno</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 relative z-10">
        <Suspense fallback={
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 rounded-full border-2 border-pink-500 border-t-transparent animate-spin" />
          </div>
        }>
          <FinalizeBookingContent />
        </Suspense>
      </main>

      {/* Footer minimal info */}
      <footer className="border-t border-slate-900 py-6 text-center text-[11px] font-mono text-slate-500">
        <p>ABC do Pedal • Ambiente Seguro • PagBank (UOL) • WhatsApp: (11) 95043-8948</p>
      </footer>
    </div>
  );
}
