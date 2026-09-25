'use client';

import React, { useRef, useState } from 'react';
import Image from 'next/image';
import {
  X,
  Printer,
  Sparkles,
  Award,
  CheckCircle2,
  ShieldCheck,
  Compass,
  Download,
  Share2,
  FileCheck,
  Loader2,
  ChevronDown
} from 'lucide-react';
import { BookingRecord, formatCertificateDate } from '@/lib/booking-store';

interface ConquestCertificateModalProps {
  booking: BookingRecord;
  isOpen: boolean;
  onClose: () => void;
}

export function ConquestCertificateModal({
  booking,
  isOpen,
  onClose
}: ConquestCertificateModalProps) {
  const certificateRef = useRef<HTMLDivElement>(null);

  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [showDirectionModal, setShowDirectionModal] = useState(false);

  if (!isOpen) return null;

  const studentName = booking.student.fullName || 'Aluno(a) do ABC do Pedal';
  const issueDate = formatCertificateDate(booking.conquestCompletedAt || booking.certificateIssuedAt || booking.slot.date);
  const certificateCode = `ABC-${new Date().getFullYear()}-${booking.id.slice(0, 8).toUpperCase()}`;

  const handlePrint = () => {
    try {
      const certificateEl = document.getElementById('printable-certificate');
      if (!certificateEl) {
        window.print();
        return;
      }

      // Check if running in iframe (e.g. AI Studio preview)
      const isInIframe = typeof window !== 'undefined' && window.self !== window.top;
      if (isInIframe) {
        window.print();
        return;
      }

      // Open dedicated clean print window maintaining exact original format, aspect ratio and rounded borders
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const printWindow = window.open('', '_blank', 'width=1150,height=800');
      if (printWindow) {
        const styleSheets = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
          .map((tag) => tag.outerHTML)
          .join('\n');

        const certHtml = certificateEl.outerHTML;

        printWindow.document.write(`
          <!DOCTYPE html>
          <html lang="pt-BR">
            <head>
              <meta charset="utf-8">
              <base href="${origin}/">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Certificado Oficial ABC do Pedal - Impressão PDF</title>
              ${styleSheets}
              <style>
                @page {
                  size: 297mm 210mm landscape;
                  margin: 0;
                }
                *, *::before, *::after {
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                  color-adjust: exact !important;
                  box-sizing: border-box;
                }
                html, body {
                  margin: 0 !important;
                  padding: 0 !important;
                  background: #0f172a;
                  color: #0f172a;
                  font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;
                }
                .print-bar {
                  position: sticky;
                  top: 0;
                  z-index: 9999;
                  display: flex;
                  justify-content: space-between;
                  align-items: center;
                  padding: 12px 24px;
                  background: #020617;
                  color: #f8fafc;
                  border-bottom: 2px solid rgba(244, 63, 94, 0.4);
                  box-shadow: 0 4px 20px rgba(0,0,0,0.6);
                }
                .print-bar-info {
                  display: flex;
                  align-items: center;
                  gap: 8px;
                  font-size: 13px;
                }
                .print-bar-badge {
                  background: rgba(244, 63, 94, 0.2);
                  color: #fda4af;
                  border: 1px solid rgba(244, 63, 94, 0.4);
                  border-radius: 9999px;
                  padding: 2px 8px;
                  font-size: 11px;
                  font-weight: 700;
                }
                .print-bar-actions {
                  display: flex;
                  gap: 10px;
                }
                .btn-print {
                  background: linear-gradient(135deg, #e11d48, #db2777);
                  color: white;
                  border: 1px solid rgba(255, 255, 255, 0.2);
                  padding: 8px 18px;
                  border-radius: 10px;
                  font-weight: 700;
                  font-size: 13px;
                  cursor: pointer;
                  display: flex;
                  align-items: center;
                  gap: 6px;
                  box-shadow: 0 4px 12px rgba(225, 29, 72, 0.35);
                }
                .btn-close {
                  background: #1e293b;
                  color: #cbd5e1;
                  border: 1px solid #334155;
                  padding: 8px 14px;
                  border-radius: 10px;
                  font-size: 13px;
                  cursor: pointer;
                }
                .cert-outer-wrapper {
                  display: flex;
                  justify-content: center;
                  align-items: center;
                  padding: 30px 15px;
                  min-height: calc(100vh - 65px);
                }
                #printable-certificate {
                  width: 280mm !important;
                  height: 196mm !important;
                  max-width: 280mm !important;
                  max-height: 196mm !important;
                  margin: 0 auto !important;
                  padding: 8mm 14mm !important;
                  border-radius: 16px !important;
                  border: 8px solid rgba(212, 175, 55, 0.5) !important;
                  box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.6) !important;
                  background: #fdfbf7 !important;
                  page-break-inside: avoid !important;
                  break-inside: avoid !important;
                  overflow: visible !important;
                  display: flex !important;
                  flex-direction: column !important;
                  justify-content: space-between !important;
                }
                /* Print Calibration for 100% In-Full Document */
                #printable-certificate .cert-logo-container {
                  margin-bottom: 2px !important;
                }
                #printable-certificate .cert-logo-container > div {
                  width: 50px !important;
                  height: 50px !important;
                }
                #printable-certificate .cert-school-name {
                  font-size: 8.5pt !important;
                  letter-spacing: 0.2em !important;
                }
                #printable-certificate .cert-title {
                  font-size: 18pt !important;
                  line-height: 1.1 !important;
                  margin-top: 2px !important;
                }
                #printable-certificate .cert-subtitle {
                  font-size: 14pt !important;
                  line-height: 1.1 !important;
                  margin-top: 1px !important;
                }
                #printable-certificate .cert-badge-row {
                  margin-top: 2px !important;
                  margin-bottom: 4px !important;
                }
                #printable-certificate .cert-badge-text {
                  font-size: 8.5pt !important;
                }
                #printable-certificate .cert-body {
                  margin-top: 2px !important;
                  gap: 2px !important;
                }
                #printable-certificate .cert-body-p {
                  font-size: 8.5pt !important;
                  line-height: 1.35 !important;
                  margin: 2px auto !important;
                }
                #printable-certificate .cert-name-box {
                  padding: 2px 16px !important;
                  margin: 2px 0 !important;
                }
                #printable-certificate .cert-name {
                  font-size: 18pt !important;
                  line-height: 1.15 !important;
                }
                #printable-certificate .cert-quote-box {
                  margin: 4px auto !important;
                  padding: 4px 14px !important;
                }
                #printable-certificate .cert-quote-text {
                  font-size: 8pt !important;
                  line-height: 1.25 !important;
                }
                #printable-certificate .cert-stages {
                  padding: 1px 0 !important;
                  font-size: 7.5pt !important;
                  gap: 4px !important;
                }
                #printable-certificate .cert-footer {
                  margin-top: 4px !important;
                  padding-top: 4px !important;
                  gap: 8px !important;
                }
                #printable-certificate .cert-seal {
                  width: 52px !important;
                  height: 52px !important;
                }
                #printable-certificate .cert-sig {
                  font-size: 16pt !important;
                }
                @media print {
                  .print-bar {
                    display: none !important;
                  }
                  html, body {
                    background: #ffffff !important;
                    width: 297mm !important;
                    height: 210mm !important;
                    margin: 0 !important;
                    padding: 0 !important;
                  }
                  .cert-outer-wrapper {
                    padding: 0 !important;
                    margin: 0 !important;
                    min-height: auto !important;
                    height: 210mm !important;
                    width: 297mm !important;
                  }
                  #printable-certificate {
                    box-shadow: none !important;
                    margin: auto !important;
                  }
                }
              </style>
            </head>
            <body>
              <div class="print-bar">
                <div class="print-bar-info">
                  <strong>ABC do Pedal</strong>
                  <span>• Certificado Oficial de Conquista</span>
                  <span class="print-bar-badge">Arquivo Completo na Íntegra (A4 Paisagem)</span>
                </div>
                <div class="print-bar-actions">
                  <button onclick="window.print()" class="btn-print">🖨️ Imprimir / Salvar em PDF</button>
                  <button onclick="window.close()" class="btn-close">✕ Fechar Janela</button>
                </div>
              </div>
              <div class="cert-outer-wrapper">
                ${certHtml}
              </div>
              <script>
                function triggerPrint() {
                  setTimeout(function() {
                    window.focus();
                    window.print();
                  }, 400);
                }
                if (document.fonts && document.fonts.ready) {
                  document.fonts.ready.then(triggerPrint).catch(triggerPrint);
                } else {
                  window.addEventListener('load', triggerPrint);
                }
              </script>
            </body>
          </html>
        `);
        printWindow.document.close();
      } else {
        window.print();
      }
    } catch (err) {
      console.warn('Fallback para janela de impressão padrão:', err);
      window.print();
    }
  };

  const handleDownloadPNG = async () => {
    if (!certificateRef.current) return;
    setIsDownloading(true);
    setDownloadSuccess(false);

    try {
      const element = certificateRef.current;
      const html2canvasModule = await import('html2canvas');
      const html2canvas = html2canvasModule.default || html2canvasModule;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#fdfbf7',
        logging: false,
        onclone: (clonedDoc) => {
          const el = clonedDoc.getElementById('printable-certificate');
          if (el) {
            el.style.boxShadow = 'none';
            el.style.margin = '0 auto';
            el.style.transform = 'none';
          }
        }
      });

      // Convert canvas to high quality PNG blob/dataURL
      canvas.toBlob((blob) => {
        if (!blob) {
          // Fallback to dataURL
          const dataUrl = canvas.toDataURL('image/png', 1.0);
          const cleanName = studentName.trim().replace(/[^a-zA-Z0-9À-ÿ]/g, '_');
          const filename = `Certificado_Conquista_ABC_do_Pedal_${cleanName}.png`;
          const link = document.createElement('a');
          link.href = dataUrl;
          link.download = filename;
          link.style.display = 'none';
          document.body.appendChild(link);
          link.click();
          setTimeout(() => {
            try {
              document.body.removeChild(link);
            } catch (_) {}
          }, 500);
        } else {
          // Blob download (optimal for PC downloads folder / Photos gallery)
          const blobUrl = URL.createObjectURL(blob);
          const cleanName = studentName.trim().replace(/[^a-zA-Z0-9À-ÿ]/g, '_');
          const filename = `Certificado_Conquista_ABC_do_Pedal_${cleanName}.png`;
          const link = document.createElement('a');
          link.href = blobUrl;
          link.download = filename;
          link.style.display = 'none';
          document.body.appendChild(link);
          link.click();
          setTimeout(() => {
            try {
              document.body.removeChild(link);
              URL.revokeObjectURL(blobUrl);
            } catch (_) {}
          }, 1000);
        }

        setDownloadSuccess(true);
        setTimeout(() => setDownloadSuccess(false), 5000);
        setIsDownloading(false);
      }, 'image/png', 1.0);
    } catch (error) {
      console.error('Erro ao gerar download do certificado:', error);
      setIsDownloading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto"
      id="certificate-modal-overlay"
    >
      <div className="relative w-full max-w-5xl bg-slate-900 rounded-3xl border border-pink-500/30 shadow-2xl overflow-hidden my-auto print:m-0 print:p-0 print:border-none print:shadow-none">
        {/* Top Control Bar (Hidden when printing) */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-950 border-b border-slate-800 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Certificado Oficial de Conquista</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 text-[10px] font-mono border border-emerald-500/30">
                  100% Concluído
                </span>
              </h3>
              <p className="text-xs text-slate-400 font-light">
                Metodologia ABCDE • Conquista Sobre Duas Rodas
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setShowDirectionModal(true)}
              type="button"
              className="px-3.5 sm:px-4 py-2 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-semibold text-xs transition-all shadow-lg shadow-pink-600/30 flex items-center gap-2 cursor-pointer border border-pink-400/30"
              id="btn-imprimir-certificado"
              title="Imprimir ou Baixar Certificado"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir / Baixar</span>
            </button>
            <button
              onClick={onClose}
              type="button"
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
              id="btn-fechar-certificado-topo"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Certificate Container with Horizontal A4 Ratio */}
        <div
          id="certificate-scroll-container"
          className="p-4 sm:p-8 bg-slate-950/60 overflow-x-auto print:p-0 print:m-0 print:bg-transparent print:w-full print:h-full print:flex print:items-center print:justify-center print:overflow-visible"
        >
          <div
            id="printable-certificate"
            ref={certificateRef}
            className="relative mx-auto w-full max-w-[960px] min-h-[640px] bg-[#fdfbf7] text-slate-900 rounded-2xl p-7 sm:p-11 shadow-2xl border-[10px] border-[#d4af37]/30 select-none overflow-hidden print:rounded-2xl print:shadow-none print:border-[10px] print:border-[#d4af37]/50"
            style={{
              boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.4), inset 0 0 50px rgba(212, 175, 55, 0.08)'
            }}
          >
            {/* Ornamental Outer Thin Border */}
            <div className="absolute inset-3 border-2 border-[#b8860b]/40 rounded-xl pointer-events-none" />
            {/* Ornamental Inner Delicate Border */}
            <div className="absolute inset-4.5 border border-pink-700/20 rounded-lg pointer-events-none" />

            {/* Corner Filigree Ornaments */}
            <div className="absolute top-5 left-5 w-8 h-8 border-t-2 border-l-2 border-[#b8860b] pointer-events-none" />
            <div className="absolute top-5 right-5 w-8 h-8 border-t-2 border-r-2 border-[#b8860b] pointer-events-none" />
            <div className="absolute bottom-5 left-5 w-8 h-8 border-b-2 border-l-2 border-[#b8860b] pointer-events-none" />
            <div className="absolute bottom-5 right-5 w-8 h-8 border-b-2 border-r-2 border-[#b8860b] pointer-events-none" />

            {/* Subtle Watermark in Center (Bike and Path Silhouette) */}
            <div className="absolute inset-0 flex items-center justify-center opacity-[0.035] pointer-events-none">
              <svg viewBox="0 0 512 512" className="w-[520px] h-[520px] fill-current text-slate-900">
                <path d="M416 352c-44.1 0-80-35.9-80-80s35.9-80 80-80 80 35.9 80 80-35.9 80-80 80zm0-128c-26.5 0-48 21.5-48 48s21.5 48 48 48 48-21.5 48-48-21.5-48-48-48zM96 352c-44.1 0-80-35.9-80-80s35.9-80 80-80 80 35.9 80 80-35.9 80-80 80zm0-128c-26.5 0-48 21.5-48 48s21.5 48 48 48 48-21.5 48-48-21.5-48-48-48zm120.3-64h42.1l28.6 64h62.3l-34.9-78.5c-4.1-9.2-13.3-15.1-23.4-15.1h-56.1l-18-40.6c-4.1-9.2-13.3-15.1-23.4-15.1H144c-8.8 0-16 7.2-16 16s7.2 16 16 16h40.6l23.7 53.3zm-68.5 160h136.4l-40-96h-56.4l-40 96z" />
              </svg>
            </div>

            {/* Certificate Header: Official Brand Logo & School Emblem */}
            <div className="cert-header relative z-10 flex flex-col items-center text-center">
              {/* Official Project Logo */}
              <div className="cert-logo-container flex items-center justify-center mb-2">
                <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full p-1 bg-gradient-to-tr from-[#d4af37] via-pink-500 to-[#d4af37] shadow-md">
                  <div className="w-full h-full rounded-full bg-[#0d0712] flex items-center justify-center p-1.5 overflow-hidden">
                    <Image
                      src="/logo.png"
                      alt="ABC do Pedal Logo Oficial"
                      width={80}
                      height={80}
                      className="w-full h-full object-contain"
                      priority
                    />
                  </div>
                </div>
              </div>

              <span className="cert-school-name font-mono text-[11px] sm:text-xs tracking-[0.25em] text-[#9c7a14] uppercase font-bold">
                Escola de Ciclismo & Metodologia ABCDE
              </span>

              {/* Title Requested */}
              <h1 className="cert-title mt-2 text-2xl sm:text-3xl md:text-4xl font-black uppercase tracking-wider text-slate-900 leading-tight">
                CERTIFICADO DE CONQUISTA
                <span className="cert-subtitle block text-xl sm:text-2xl md:text-3xl text-pink-700 tracking-widest mt-0.5">
                  SOBRE DUAS RODAS
                </span>
              </h1>

              <div className="cert-badge-row flex items-center justify-center gap-3 mt-1.5 mb-4">
                <div className="h-[1px] w-12 sm:w-20 bg-gradient-to-r from-transparent to-[#d4af37]" />
                <span className="cert-badge-text font-mono text-xs sm:text-sm font-black tracking-[0.2em] text-[#b8860b] uppercase">
                  DESAFIO ABC DO PEDAL
                </span>
                <div className="h-[1px] w-12 sm:w-20 bg-gradient-to-l from-transparent to-[#d4af37]" />
              </div>
            </div>

            {/* Certificate Body Text (Exact Text Mandated) */}
            <div className="cert-body relative z-10 text-center max-w-3xl mx-auto space-y-3 mt-3">
              <p className="cert-body-p text-xs sm:text-sm text-slate-700 font-serif leading-relaxed">
                Eu, Professor Anderson Rosa dos Reis (“Zigui”), venho por meio deste certificar que o(a) aluno(a),
              </p>

              {/* Student Name Callout */}
              <div className="cert-name-box py-2 sm:py-2.5 px-6 my-1 inline-block border-b-2 border-t border-[#d4af37]/60 bg-gradient-to-r from-transparent via-[#f5edd6]/50 to-transparent">
                <h2 className="cert-name text-2xl sm:text-3xl md:text-4xl font-serif font-black tracking-wide text-slate-950 uppercase drop-shadow-sm">
                  {studentName}
                </h2>
              </div>

              <p className="cert-body-p text-xs sm:text-sm text-slate-800 font-serif leading-relaxed text-justify sm:text-center">
                cumpriu, com persistência, coragem e bravura, o Desafio ABC do Pedal, conquistando a habilidade de andar de bicicleta com autonomia, segurança e confiança.
              </p>

              <p className="cert-body-p text-xs sm:text-[13px] text-slate-700 font-serif leading-relaxed text-justify sm:text-center font-light">
                Esta conquista representa muito mais do que aprender a pedalar. Representa superar desafios, acreditar em si mesmo e descobrir que, com equilíbrio, persistência e coragem, é possível ir cada vez mais longe.
              </p>

              <p className="cert-body-p text-xs sm:text-[13px] text-slate-700 font-serif leading-relaxed text-justify sm:text-center font-light">
                Que os conhecimentos e experiências aqui adquiridos conduzam você para novas conquistas além da bike, levando equilíbrio, coragem e alegria para todos os caminhos da sua vida.
              </p>
            </div>

            {/* Featured Quote with Special Visual Treatment */}
            <div className="cert-quote-box relative z-10 my-4 py-2.5 px-6 max-w-2xl mx-auto text-center border-l-2 border-r-2 border-pink-600/40 bg-pink-50/50 rounded-lg">
              <p className="cert-quote-text text-xs sm:text-sm font-serif italic font-semibold text-slate-900 tracking-wide">
                “A vida é como andar de bicicleta: para ter equilíbrio, você tem que se manter em movimento.”
              </p>
            </div>

            {/* 5 ABCDE Stages Micro Row */}
            <div className="cert-stages relative z-10 flex items-center justify-center gap-1.5 sm:gap-3 py-1 text-[10px] sm:text-xs font-mono font-bold text-slate-600 uppercase">
              <span className="px-2 py-0.5 rounded bg-[#f3ebd5] border border-[#d4af37]/40 text-[#8c6d11]">
                A • Autoconhecimento
              </span>
              <span>→</span>
              <span className="px-2 py-0.5 rounded bg-[#f3ebd5] border border-[#d4af37]/40 text-[#8c6d11]">
                B • Base
              </span>
              <span>→</span>
              <span className="px-2 py-0.5 rounded bg-[#f3ebd5] border border-[#d4af37]/40 text-[#8c6d11]">
                C • Controle
              </span>
              <span>→</span>
              <span className="px-2 py-0.5 rounded bg-[#f3ebd5] border border-[#d4af37]/40 text-[#8c6d11]">
                D • Domínio
              </span>
              <span>→</span>
              <span className="px-2 py-0.5 rounded bg-pink-100 border border-pink-400/50 text-pink-800">
                E • Excelência
              </span>
            </div>

            {/* Certificate Footer / Signatures & Authenticity Stamp */}
            <div className="cert-footer relative z-10 grid grid-cols-1 sm:grid-cols-3 items-end gap-4 mt-6 pt-4 border-t border-[#d4af37]/30">
              {/* Date & Registry */}
              <div className="cert-date-col text-center sm:text-left space-y-1">
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 block">
                  Data da Conquista
                </span>
                <p className="text-xs sm:text-sm font-serif font-bold text-slate-900">
                  São Paulo, {issueDate}
                </p>
                <span className="text-[10px] font-mono text-slate-400 block">
                  Registro: {certificateCode}
                </span>
              </div>

              {/* Official Seal of Conquest */}
              <div className="cert-seal-col flex flex-col items-center justify-center text-center">
                <div className="cert-seal relative w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 border-dashed border-[#b8860b] flex items-center justify-center p-1 bg-gradient-to-tr from-[#f7f0df] via-[#fffdfa] to-[#f7f0df] shadow-inner">
                  <div className="w-full h-full rounded-full border border-[#b8860b] flex flex-col items-center justify-center text-[#8c6d11]">
                    <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6 text-pink-600" />
                    <span className="text-[8px] sm:text-[9px] font-mono font-black uppercase tracking-tighter mt-0.5">
                      100% CONQUISTA
                    </span>
                    <span className="text-[7px] font-mono text-slate-500">
                      MÉTODO ABCDE
                    </span>
                  </div>
                </div>
              </div>

              {/* Professor Signature Block */}
              <div className="cert-sig-col text-center sm:text-right space-y-1">
                {/* Elegant Signature Representation */}
                <div className="h-9 flex items-end justify-center sm:justify-end">
                  <span
                    id="signature-professor-anderson"
                    className="cert-sig font-serif italic text-xl sm:text-2xl text-slate-800 tracking-wider whitespace-nowrap"
                    style={{ fontFamily: 'Brush Script MT, cursive, Georgia, serif' }}
                  >
                    Anderson Rosa dos Reis
                  </span>
                </div>
                <div className="w-56 sm:ml-auto mx-auto border-t border-slate-900" />
                <p className="text-xs sm:text-sm font-serif font-bold text-slate-950">
                  Professor Anderson Rosa dos Reis (“Zigui”)
                </p>
                <p className="text-[11px] text-pink-700 font-medium">
                  ABC do Pedal – Bike Coaching
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Bottom Actions (Hidden when printing) */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 bg-slate-950 border-t border-slate-800 print:hidden">
          <div className="flex items-center gap-2 text-xs text-slate-400 font-light">
            <Sparkles className="w-4 h-4 text-pink-400 shrink-0" />
            <span>Certificado emitido automaticamente após a conclusão das 20 habilidades do Método ABCDE.</span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={() => setShowDirectionModal(true)}
              type="button"
              className="flex-1 sm:flex-none px-5 sm:px-6 py-2.5 sm:py-3 rounded-xl bg-gradient-to-r from-pink-600 via-rose-600 to-amber-600 hover:from-pink-500 hover:to-amber-500 text-white font-bold text-xs sm:text-sm tracking-wide transition-all shadow-lg shadow-pink-600/30 hover:shadow-pink-500/50 hover:scale-[1.02] active:scale-[0.98] border border-amber-300/40 flex items-center justify-center gap-2.5 cursor-pointer ring-2 ring-pink-500/20"
              id="btn-imprimir-salvar-modal"
              title="Clique para direcionar para Impressão ou Download do Certificado"
            >
              <Printer className="w-4 h-4 text-amber-200" />
              <span>Imprimir ou Baixar Certificado</span>
              <Download className="w-4 h-4 text-white/90" />
            </button>
            <button
              onClick={handleDownloadPNG}
              disabled={isDownloading}
              type="button"
              className="hidden sm:inline-flex px-4 py-2.5 rounded-xl bg-emerald-700/80 hover:bg-emerald-600 text-emerald-100 border border-emerald-500/40 text-xs font-semibold items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              id="btn-download-rapido-png"
              title="Baixar imagem PNG de alta resolução"
            >
              {isDownloading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Gerando...</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>Baixar PNG</span>
                </>
              )}
            </button>
            <button
              onClick={onClose}
              type="button"
              className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs transition-colors cursor-pointer"
              id="btn-fechar-modal-rodape"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>

      {/* Direction Modal: Choose between Print or Download */}
      {showDirectionModal && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          id="modal-direcionar-certificado"
          onClick={() => setShowDirectionModal(false)}
        >
          <div
            className="relative w-full max-w-md bg-slate-900 border border-amber-500/30 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-white">
                    Direcionar Certificado
                  </h4>
                  <p className="text-xs text-slate-400">
                    Como deseja obter o seu certificado oficial?
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowDirectionModal(false)}
                type="button"
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                title="Fechar opções"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              {/* Option 1: Print / PDF */}
              <button
                type="button"
                onClick={() => {
                  setShowDirectionModal(false);
                  setTimeout(() => {
                    handlePrint();
                  }, 120);
                }}
                className="w-full p-4.5 sm:p-5 rounded-2xl bg-gradient-to-r from-rose-950/90 via-slate-900 to-pink-950/90 hover:from-rose-900 hover:via-slate-850 hover:to-pink-900 border-2 border-rose-500/70 hover:border-rose-400 text-left flex items-start gap-4 group cursor-pointer shadow-xl shadow-rose-950/50 hover:shadow-rose-500/30 transition-all hover:scale-[1.01] active:scale-[0.99] ring-2 ring-rose-500/30 hover:ring-rose-400/50"
                id="opcao-direcionar-impressao"
                title="Clique para abrir a página de impressão em PDF na íntegra"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-rose-500/25 to-pink-500/15 border border-rose-400/60 flex items-center justify-center text-rose-300 group-hover:text-rose-200 group-hover:scale-105 transition-all shadow-md shadow-rose-950/50 shrink-0">
                  <Printer className="w-6 h-6 text-rose-400 group-hover:translate-y-[-1px] transition-transform" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="font-bold text-white text-sm sm:text-base group-hover:text-rose-100 transition-colors flex items-center gap-2">
                      <span>Abrir Página de Impressão em PDF</span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/30 text-rose-200 border border-rose-400/50">
                        PDF
                      </span>
                    </span>
                    <span className="text-[10px] font-mono font-bold uppercase px-2.5 py-0.5 rounded-md bg-rose-500/25 text-rose-100 border border-rose-400/50 shadow-sm">
                      A4 Paisagem • Na Íntegra
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    Abre a tela de impressão oficial em PDF exibindo o arquivo completo na íntegra: brasão oficial, texto integral, metodologia ABCDE, autenticidade e assinaturas sem cortes.
                  </p>
                  <div className="mt-2.5 flex items-center gap-2 text-[11px] text-rose-300 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    <span>Arquivo integral sem cortes • 100% fiel para impressão ou PDF</span>
                  </div>
                </div>
              </button>

              {/* Option 2: High-Res Automatic PNG 2x Download */}
              <button
                type="button"
                disabled={isDownloading}
                onClick={handleDownloadPNG}
                className="w-full p-4.5 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-950/90 via-slate-900 to-teal-950/90 hover:from-emerald-900 hover:via-slate-850 hover:to-teal-900 border-2 border-emerald-500/70 hover:border-emerald-400 text-left flex items-start gap-4 group cursor-pointer disabled:opacity-60 shadow-xl shadow-emerald-950/50 hover:shadow-emerald-500/30 transition-all hover:scale-[1.01] active:scale-[0.99] ring-2 ring-emerald-500/30 hover:ring-emerald-400/50"
                id="opcao-direcionar-download"
                title="Clique para iniciar o download automático em formato PNG 2x"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/25 to-teal-500/15 border border-emerald-400/60 flex items-center justify-center text-emerald-300 group-hover:text-emerald-200 group-hover:scale-105 transition-all shadow-md shadow-emerald-950/50 shrink-0">
                  {isDownloading ? (
                    <Loader2 className="w-6 h-6 animate-spin text-emerald-300" />
                  ) : (
                    <Download className="w-6 h-6 text-emerald-400 group-hover:translate-y-0.5 transition-transform" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="font-bold text-white text-sm sm:text-base group-hover:text-emerald-100 transition-colors flex items-center gap-2">
                      <span>Download Automático do Certificado</span>
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/25 text-emerald-300 border border-emerald-400/40 animate-pulse">
                        Automático
                      </span>
                    </span>
                    <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-200 border border-emerald-400/40 shadow-sm">
                      PNG 2X • Galeria do PC
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    {isDownloading
                      ? 'Processando certificado em 2X e gerando download automático para a sua galeria / downloads...'
                      : 'Baixa automaticamente o arquivo oficial com resolução ultra nítida (PNG 2X) direto na pasta de Downloads e galeria de fotos do seu computador.'}
                  </p>
                  <div className="mt-2.5 flex items-center gap-2 text-[11px] text-emerald-300 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Inicia o download direto sem etapas intermediárias</span>
                  </div>
                </div>
              </button>
            </div>

            {downloadSuccess && (
              <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-emerald-950/90 border border-emerald-400/50 text-emerald-200 text-xs animate-in fade-in zoom-in-95 duration-200 shadow-lg">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-bold text-emerald-300">
                    Download automático concluído em formato PNG 2X!
                  </p>
                  <p className="text-[11px] text-slate-300">
                    O arquivo foi salvo na pasta de <strong>Downloads</strong> e já está disponível para abrir na sua galeria ou fotos do computador.
                  </p>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-1">
              <button
                onClick={() => setShowDirectionModal(false)}
                type="button"
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Voltar ao Certificado
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Embedded CSS for Exact Landscape A4 Printing */}
      <style jsx global>{`
        @media print {
          @page {
            size: landscape A4;
            margin: 0;
          }
          *, *::before, *::after {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            width: 297mm !important;
            height: 210mm !important;
            max-width: 297mm !important;
            max-height: 210mm !important;
            overflow: hidden !important;
          }
          body * {
            visibility: hidden !important;
          }
          #certificate-modal-overlay,
          #certificate-modal-overlay > div,
          #certificate-scroll-container,
          #printable-certificate,
          #printable-certificate * {
            visibility: visible !important;
          }
          #certificate-modal-overlay {
            position: fixed !important;
            inset: 0 !important;
            width: 297mm !important;
            height: 210mm !important;
            max-width: 297mm !important;
            max-height: 210mm !important;
            background: #ffffff !important;
            padding: 0 !important;
            margin: 0 !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            border: none !important;
            box-shadow: none !important;
            z-index: 9999999 !important;
            overflow: hidden !important;
          }
          #certificate-modal-overlay > div {
            width: 100% !important;
            height: 100% !important;
            max-width: 297mm !important;
            max-height: 210mm !important;
            margin: 0 auto !important;
            padding: 0 !important;
            background: transparent !important;
            border: none !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
          }
          #certificate-scroll-container {
            width: 100% !important;
            height: 100% !important;
            max-width: 297mm !important;
            max-height: 210mm !important;
            padding: 0 !important;
            margin: 0 !important;
            background: transparent !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            overflow: visible !important;
          }
          #modal-direcionar-certificado,
          .print\\:hidden {
            display: none !important;
            visibility: hidden !important;
          }
          #printable-certificate {
            position: relative !important;
            left: auto !important;
            top: auto !important;
            transform: none !important;
            /* Mantém o formato e tamanho original do certificado na folha na íntegra */
            width: 280mm !important;
            height: 196mm !important;
            max-width: 280mm !important;
            max-height: 196mm !important;
            margin: auto !important;
            padding: 8mm 14mm !important;
            box-sizing: border-box !important;
            border-radius: 16px !important;
            border: 8px solid rgba(212, 175, 55, 0.45) !important;
            background: #fdfbf7 !important;
            box-shadow: none !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            overflow: visible !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
          }
          #printable-certificate .cert-logo-container {
            margin-bottom: 2px !important;
          }
          #printable-certificate .cert-logo-container > div {
            width: 50px !important;
            height: 50px !important;
          }
          #printable-certificate .cert-school-name {
            font-size: 8.5pt !important;
            letter-spacing: 0.2em !important;
          }
          #printable-certificate .cert-title {
            font-size: 18pt !important;
            line-height: 1.1 !important;
            margin-top: 2px !important;
          }
          #printable-certificate .cert-subtitle {
            font-size: 14pt !important;
            line-height: 1.1 !important;
            margin-top: 1px !important;
          }
          #printable-certificate .cert-badge-row {
            margin-top: 2px !important;
            margin-bottom: 4px !important;
          }
          #printable-certificate .cert-badge-text {
            font-size: 8.5pt !important;
          }
          #printable-certificate .cert-body {
            margin-top: 2px !important;
            gap: 2px !important;
          }
          #printable-certificate .cert-body-p {
            font-size: 8.5pt !important;
            line-height: 1.35 !important;
            margin: 2px auto !important;
          }
          #printable-certificate .cert-name-box {
            padding: 2px 16px !important;
            margin: 2px 0 !important;
          }
          #printable-certificate .cert-name {
            font-size: 18pt !important;
            line-height: 1.15 !important;
          }
          #printable-certificate .cert-quote-box {
            margin: 4px auto !important;
            padding: 4px 14px !important;
          }
          #printable-certificate .cert-quote-text {
            font-size: 8pt !important;
            line-height: 1.25 !important;
          }
          #printable-certificate .cert-stages {
            padding: 1px 0 !important;
            font-size: 7.5pt !important;
            gap: 4px !important;
          }
          #printable-certificate .cert-footer {
            margin-top: 4px !important;
            padding-top: 4px !important;
            gap: 8px !important;
          }
          #printable-certificate .cert-seal {
            width: 52px !important;
            height: 52px !important;
          }
          #printable-certificate .cert-sig {
            font-size: 16pt !important;
          }
        }
      `}</style>
    </div>
  );
}
