import type { MailMessage } from '../mail/mail.service';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Hora de la solicitud en la zona del negocio, p. ej. "6:30 p. m.". */
export function formatRequestTime(date: Date, timeZone = 'America/Bogota') {
  const time = new Intl.DateTimeFormat('es-CO', {
    timeZone,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
    .format(date)
    .replace(/\u00a0|\u202f/g, ' ');
  const day = new Intl.DateTimeFormat('es-CO', {
    timeZone,
    day: 'numeric',
    month: 'long',
  }).format(date);
  return { time, full: `${day} a las ${time}` };
}

/** Correo en español con el enlace para crear una contraseña nueva. */
export function passwordResetEmail(params: {
  to: string;
  nombre: string;
  link: string;
  minutes: number;
  appName?: string;
  requestedAt?: Date;
  timeZone?: string;
}): MailMessage {
  const appName = params.appName ?? 'DM alquiler';
  const nombre = escapeHtml(params.nombre);
  const link = escapeHtml(params.link);
  const requested = formatRequestTime(params.requestedAt ?? new Date(), params.timeZone);

  const text = [
    `Hola ${params.nombre},`,
    '',
    `Recibimos una solicitud para restablecer tu contraseña de ${appName} (${requested.full}).`,
    `Abre este enlace para crear una nueva (vence en ${params.minutes} minutos y solo sirve una vez):`,
    params.link,
    '',
    'Si no fuiste tú, ignora este correo: tu contraseña actual sigue funcionando.',
  ].join('\n');

  const html = `<!doctype html>
<html lang="es">
  <body style="margin:0;background:#f4f5f7;font-family:Arial,Helvetica,sans-serif;color:#1f2933">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 12px">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:12px;padding:32px">
          <tr><td>
            <p style="margin:0 0 24px;font-size:18px;font-weight:bold">${escapeHtml(appName)}</p>
            <p style="margin:0 0 12px">Hola ${nombre},</p>
            <p style="margin:0 0 24px;line-height:1.5">Recibimos una solicitud para restablecer tu contraseña el ${escapeHtml(requested.full)}. Pulsa el botón para crear una nueva.</p>
            <p style="margin:0 0 24px"><a href="${link}" style="display:inline-block;background:#f59e0b;color:#111827;text-decoration:none;font-weight:bold;padding:12px 20px;border-radius:8px">Crear nueva contraseña</a></p>
            <p style="margin:0 0 8px;font-size:13px;color:#52606d">El enlace vence en ${params.minutes} minutos y solo sirve una vez. Si pediste varios, usa cualquiera que no haya vencido.</p>
            <p style="margin:0 0 24px;font-size:13px;color:#52606d;word-break:break-all">Si el botón no funciona, copia esta dirección en el navegador:<br>${link}</p>
            <p style="margin:0;font-size:13px;color:#52606d">Si no fuiste tú, ignora este correo: tu contraseña actual sigue funcionando.</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;

  return {
    to: params.to,
    // La hora en el asunto evita que Gmail agrupe varios correos en una conversación.
    subject: `Restablece tu contraseña de ${appName} (${requested.time})`,
    html,
    text,
  };
}
