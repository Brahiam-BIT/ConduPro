import { ScheduleType } from '../../scheduling/enums/schedule-type.enum';

export interface ScheduleEmailContext {
  recipientName: string;
  studentName: string;
  instructorName: string;
  type: ScheduleType;
  startTime: Date;
  endTime: Date;
  locationDetail?: string;
}

export interface EmailContent {
  subject: string;
  html: string;
  text: string;
}

function formatDateTime(date: Date): string {
  return date.toLocaleString('es-CO', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function typeLabel(type: ScheduleType): string {
  return type === ScheduleType.THEORY ? 'teórica' : 'práctica';
}

export function buildConfirmationEmail(ctx: ScheduleEmailContext): EmailContent {
  const when = formatDateTime(ctx.startTime);
  const classType = typeLabel(ctx.type);

  return {
    subject: `ConduPro — Clase ${classType} confirmada`,
    text: [
      `Hola ${ctx.recipientName},`,
      '',
      `Tu clase ${classType} ha sido confirmada.`,
      `Estudiante: ${ctx.studentName}`,
      `Instructor: ${ctx.instructorName}`,
      `Fecha y hora: ${when}`,
      ctx.locationDetail ? `Detalle: ${ctx.locationDetail}` : '',
      '',
      '— Equipo ConduPro',
    ]
      .filter(Boolean)
      .join('\n'),
    html: `
      <p>Hola <strong>${ctx.recipientName}</strong>,</p>
      <p>Tu clase <strong>${classType}</strong> ha sido <strong>confirmada</strong>.</p>
      <ul>
        <li><strong>Estudiante:</strong> ${ctx.studentName}</li>
        <li><strong>Instructor:</strong> ${ctx.instructorName}</li>
        <li><strong>Fecha y hora:</strong> ${when}</li>
        ${ctx.locationDetail ? `<li><strong>Detalle:</strong> ${ctx.locationDetail}</li>` : ''}
      </ul>
      <p>— Equipo ConduPro</p>
    `,
  };
}

export function buildReminderEmail(ctx: ScheduleEmailContext): EmailContent {
  const when = formatDateTime(ctx.startTime);
  const classType = typeLabel(ctx.type);

  return {
    subject: `ConduPro — Recordatorio: clase ${classType} mañana`,
    text: [
      `Hola ${ctx.recipientName},`,
      '',
      `Te recordamos que mañana tienes una clase ${classType}.`,
      `Estudiante: ${ctx.studentName}`,
      `Instructor: ${ctx.instructorName}`,
      `Fecha y hora: ${when}`,
      ctx.locationDetail ? `Detalle: ${ctx.locationDetail}` : '',
      '',
      'Por favor llega con 10 minutos de anticipación.',
      '',
      '— Equipo ConduPro',
    ]
      .filter(Boolean)
      .join('\n'),
    html: `
      <p>Hola <strong>${ctx.recipientName}</strong>,</p>
      <p>Te recordamos que <strong>mañana</strong> tienes una clase <strong>${classType}</strong>.</p>
      <ul>
        <li><strong>Estudiante:</strong> ${ctx.studentName}</li>
        <li><strong>Instructor:</strong> ${ctx.instructorName}</li>
        <li><strong>Fecha y hora:</strong> ${when}</li>
        ${ctx.locationDetail ? `<li><strong>Detalle:</strong> ${ctx.locationDetail}</li>` : ''}
      </ul>
      <p>Por favor llega con <strong>10 minutos</strong> de anticipación.</p>
      <p>— Equipo ConduPro</p>
    `,
  };
}

export function buildCancellationEmail(ctx: ScheduleEmailContext): EmailContent {
  const when = formatDateTime(ctx.startTime);
  const classType = typeLabel(ctx.type);

  return {
    subject: `ConduPro — Clase ${classType} cancelada`,
    text: [
      `Hola ${ctx.recipientName},`,
      '',
      `La siguiente clase ${classType} ha sido cancelada:`,
      `Estudiante: ${ctx.studentName}`,
      `Instructor: ${ctx.instructorName}`,
      `Fecha y hora: ${when}`,
      '',
      'Si necesitas reagendar, ingresa a la plataforma ConduPro.',
      '',
      '— Equipo ConduPro',
    ].join('\n'),
    html: `
      <p>Hola <strong>${ctx.recipientName}</strong>,</p>
      <p>La siguiente clase <strong>${classType}</strong> ha sido <strong>cancelada</strong>:</p>
      <ul>
        <li><strong>Estudiante:</strong> ${ctx.studentName}</li>
        <li><strong>Instructor:</strong> ${ctx.instructorName}</li>
        <li><strong>Fecha y hora:</strong> ${when}</li>
      </ul>
      <p>Si necesitas reagendar, ingresa a la plataforma ConduPro.</p>
      <p>— Equipo ConduPro</p>
    `,
  };
}
