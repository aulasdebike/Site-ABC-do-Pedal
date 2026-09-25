'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, UserCheck, Shield, Sparkles } from 'lucide-react';
import { BookingFlow } from '@/components/booking/BookingFlow';
import { StudentPortal } from '@/components/booking/StudentPortal';
import { AdminPanel } from '@/components/booking/AdminPanel';

export default function AgendamentoPage() {
  const [viewMode, setViewMode] = useState<'booking' | 'student_portal' | 'admin'>('booking');
  const [studentBookingId, setStudentBookingId] = useState<string | null>(null);

  const handleGoToStudentPortal = (bookingId: string) => {
    setStudentBookingId(bookingId);
    setViewMode('student_portal');
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

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
                • Aprender a Pedalar
              </span>
            </div>
          </div>

          {/* Quick Switch View Buttons (Student Portal & Instructor Backoffice) */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('booking')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                viewMode === 'booking'
                  ? 'bg-pink-600 text-white shadow-md'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              Agendamento
            </button>

            <button
              onClick={() => setViewMode('student_portal')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1 transition-all ${
                viewMode === 'student_portal'
                  ? 'bg-pink-600 text-white shadow-md'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5 text-pink-400" />
              <span className="hidden sm:inline">Área do Aluno</span>
            </button>

            <button
              onClick={() => setViewMode('admin')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1 transition-all ${
                viewMode === 'admin'
                  ? 'bg-pink-600 text-white shadow-md'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <Shield className="w-3.5 h-3.5 text-pink-400" />
              <span className="hidden sm:inline">Painel Instrutor</span>
            </button>
          </div>

        </div>
      </header>

      {/* Main Body */}
      <main className="relative z-10 py-4">
        {viewMode === 'booking' && (
          <BookingFlow
            onGoToStudentPortal={handleGoToStudentPortal}
            onGoToAdmin={() => setViewMode('admin')}
          />
        )}

        {viewMode === 'student_portal' && (
          <StudentPortal
            initialBookingId={studentBookingId}
            onBackToBooking={() => setViewMode('booking')}
          />
        )}

        {viewMode === 'admin' && (
          <AdminPanel
            onExitAdmin={() => setViewMode('booking')}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="py-6 border-t border-slate-900 text-center text-xs font-mono text-slate-500">
        ABC do Pedal • Programa Aprender a Pedalar • Parque do Ibirapuera, São Paulo
      </footer>

    </div>
  );
}
