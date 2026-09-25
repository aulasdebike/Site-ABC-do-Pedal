'use client';

import { BookingRecord, formatDateBrazilian, getWeekdayName } from './booking-store';

export interface WorkspaceEventResult {
  id: string;
  htmlLink: string;
  summary: string;
}

export interface WorkspaceDocResult {
  documentId: string;
  title: string;
  documentUrl: string;
}

export interface DriveFileItem {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  createdTime?: string;
}

/**
 * Creates an event in Google Calendar for a booking.
 * Note: Must be called with a valid OAuth access token.
 */
export async function createGoogleCalendarEvent(
  booking: BookingRecord,
  accessToken: string
): Promise<WorkspaceEventResult> {
  const student = booking.student;
  const slot = booking.slot;

  // Build ISO start and end timestamps (São Paulo: UTC-3)
  const [hours, minutes] = slot.time.split(':').map(Number);
  const startDate = new Date(`${slot.date}T${slot.time}:00-03:00`);
  const endDate = new Date(startDate.getTime() + (slot.durationMinutes || 50) * 60 * 1000);

  const guardianText = student.guardian
    ? `\nResponsável Legal: ${student.guardian.fullName} (${student.guardian.relation || 'Responsável'} - ${student.guardian.whatsapp})`
    : '';

  const eventPayload = {
    summary: `🚲 Aula ABC do Pedal — ${student.fullName}`,
    description: `Agendamento Oficial - ABC do Pedal
Programa: ${booking.productName}
Aluno(a): ${student.fullName}
WhatsApp: ${student.whatsapp}
E-mail: ${student.email}
Calibragem: Altura ${student.heightCm}cm | Peso ${student.weightKg}kg${guardianText}
Status: ${booking.status.toUpperCase()}
Etapa Atual Método ABC-DE: ${booking.currentABCDE}

Local: Parque do Ibirapuera (Acesso sugerido: Portão 10)
Contato ABC do Pedal: (11) 95043-8948`,
    location: 'Parque do Ibirapuera - Av. Pedro Álvares Cabral, Portão 10, São Paulo - SP',
    start: {
      dateTime: startDate.toISOString(),
      timeZone: 'America/Sao_Paulo',
    },
    end: {
      dateTime: endDate.toISOString(),
      timeZone: 'America/Sao_Paulo',
    },
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: 1440 }, // 24 hours before
        { method: 'popup', minutes: 120 },  // 2 hours before
        { method: 'email', minutes: 1440 }
      ],
    },
    colorId: '10' // Green accent in Google Calendar
  };

  const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(eventPayload),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Erro ao criar evento no Google Calendar: ${errText}`);
  }

  const data = await response.json();
  return {
    id: data.id,
    htmlLink: data.htmlLink,
    summary: data.summary,
  };
}

/**
 * Creates a complete Student Anamnesis and Contract Document in Google Docs.
 */
export async function createStudentAnamnesisDoc(
  booking: BookingRecord,
  accessToken: string
): Promise<WorkspaceDocResult> {
  const student = booking.student;
  const docTitle = `ABC do Pedal - Ficha de Matrícula - ${student.fullName}`;

  // 1. Create blank doc
  const createRes = await fetch('https://docs.googleapis.com/v1/documents', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ title: docTitle }),
  });

  if (!createRes.ok) {
    const errText = await createRes.text();
    throw new Error(`Erro ao criar Google Doc: ${errText}`);
  }

  const docData = await createRes.json();
  const documentId = docData.documentId;

  // 2. Populate text in Google Doc
  const dateFormatted = `${formatDateBrazilian(booking.slot.date)} (${getWeekdayName(booking.slot.date)})`;
  const guardianBlock = student.guardian
    ? `\nDADOS DO RESPONSÁVEL LEGAL:\n- Nome: ${student.guardian.fullName}\n- CPF: ${student.guardian.cpf}\n- WhatsApp: ${student.guardian.whatsapp}\n- Parentesco/Relação: ${student.guardian.relation || 'Responsável Legal'}\n`
    : '';

  const contentText = `ESCOLA PROFISSIONAL DE BIKE — ABC DO PEDAL
FICHA CADASTRAL, ANAMNESE E TERMO DE ADESÃO

1. IDENTIFICAÇÃO DO ALUNO(A)
- Nome Completo: ${student.fullName}
- Data de Nascimento: ${student.birthDate}
- CPF: ${student.cpf}
- WhatsApp: ${student.whatsapp}
- E-mail: ${student.email}
- Faixa Etária: ${student.ageProfile.toUpperCase()}
- Altura: ${student.heightCm} cm | Peso: ${student.weightKg} kg
- Necessidades Específicas / Histórico de Saúde: ${student.hasSpecificNeeds ? (student.specificNeedsDescription || 'Sim') : 'Nenhuma restrição relatada'}
${guardianBlock}
2. DADOS DO PROGRAMA CONTRATADO
- Programa: ${booking.productName}
- Valor: R$ ${booking.price.toFixed(2)} (PIX)
- Data da Aula: ${dateFormatted}
- Horário: ${booking.slot.time} (Duração: ${booking.slot.durationMinutes} min)
- Local: Parque do Ibirapuera - Portão 10
- Status Atual: ${booking.status.toUpperCase()}
- Nível Atual no Método ABC-DE: Etapa ${booking.currentABCDE}

3. TERMOS DE ADESÃO E COMPROMISSO
- Política de Cancelamento e Remarcação (Regra das 24 Horas): Aceito integralmente.
- Natureza do Serviço: Serviço estritamente pedagógico e desportivo, não configurando terapia clínica ou tratamento de saúde.
- Veracidade das Informações: O contratante declara que todas as informações acima são verídicas.
- Uso de Imagem: ${booking.imageAuthorization?.authorized ? 'AUTORIZADO para fins pedagógicos e institucionais' : 'NÃO AUTORIZADO'}.

Documento gerado automaticamente pelo Sistema Integrado ABC do Pedal em ${new Date().toLocaleDateString('pt-BR')}.
`;

  await fetch(`https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      requests: [
        {
          insertText: {
            location: { index: 1 },
            text: contentText,
          },
        },
      ],
    }),
  });

  return {
    documentId,
    title: docTitle,
    documentUrl: `https://docs.google.com/document/d/${documentId}/edit`,
  };
}

/**
 * Uploads a text summary of the student record / contract to Google Drive.
 */
export async function uploadBookingRecordToDrive(
  booking: BookingRecord,
  accessToken: string
): Promise<{ fileId: string; webViewLink: string }> {
  const metadata = {
    name: `Contrato_ABC_Pedal_${booking.student.fullName.replace(/\s+/g, '_')}_${booking.slot.date}.txt`,
    mimeType: 'text/plain',
  };

  const fileContent = `ABC DO PEDAL — CONTRATAÇÃO REGISTRADA
Aluno: ${booking.student.fullName}
CPF: ${booking.student.cpf}
WhatsApp: ${booking.student.whatsapp}
Data: ${booking.slot.date} às ${booking.slot.time}
Valor: R$ ${booking.price}
Status: ${booking.status}
Comprovante PIX: ${booking.voucherFileName || 'pix-comprovante.jpg'}
Registrado em: ${new Date().toISOString()}
`;

  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', new Blob([fileContent], { type: 'text/plain' }));

  const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: form,
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Erro ao enviar arquivo para o Google Drive: ${errText}`);
  }

  const data = await response.json();
  return {
    fileId: data.id,
    webViewLink: data.webViewLink || `https://drive.google.com/file/d/${data.id}/view`,
  };
}

/**
 * Lists ABC do Pedal documents / files from Google Drive.
 */
export async function listDriveFiles(accessToken: string): Promise<DriveFileItem[]> {
  const query = encodeURIComponent("name contains 'ABC do Pedal' or name contains 'ABC_Pedal'");
  const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,mimeType,webViewLink,createdTime)&orderBy=createdTime desc&pageSize=15`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const err = await response.text();
    console.warn('Google Drive list error:', err);
    return [];
  }

  const data = await response.json();
  return data.files || [];
}

/**
 * Delete a file in Google Drive (Destructive operation - MUST require user confirmation).
 */
export async function deleteDriveFile(fileId: string, accessToken: string): Promise<void> {
  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok && response.status !== 204) {
    const err = await response.text();
    throw new Error(`Erro ao excluir arquivo do Google Drive: ${err}`);
  }
}
