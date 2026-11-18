import { Injectable, Logger } from '@nestjs/common';
import { isProduction } from '../common/config/production';

export interface MailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

const RESEND_ENDPOINT = 'https://api.resend.com/emails';
const DEFAULT_FROM = 'DM alquiler <onboarding@resend.dev>';

/**
 * Envío de correos por la API HTTPS de Resend. Railway (plan Hobby) bloquea SMTP,
 * así que se usa HTTPS. Sin RESEND_API_KEY:
 *  - en desarrollo el correo se escribe en la consola (para probar el flujo);
 *  - en producción no se envía nada y se registra una advertencia.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly env: NodeJS.ProcessEnv = process.env) {}

  /** True si hay un proveedor configurado para enviar correos reales. */
  isConfigured(): boolean {
    return Boolean(this.env.RESEND_API_KEY?.trim());
  }

  /** True si el flujo de correo puede usarse (real, o en consola durante el desarrollo). */
  isAvailable(): boolean {
    return this.isConfigured() || !isProduction(this.env);
  }

  /** Devuelve true si el correo se entregó al proveedor (o a la consola en desarrollo). */
  async send(message: MailMessage): Promise<boolean> {
    if (!this.isConfigured()) {
      if (isProduction(this.env)) {
        this.logger.warn('RESEND_API_KEY no está configurada: no se envió el correo.');
        return false;
      }
      this.logger.log(
        `[correo de desarrollo] Para: ${message.to}\nAsunto: ${message.subject}\n${message.text}`,
      );
      return true;
    }

    try {
      const response = await fetch(RESEND_ENDPOINT, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.env.RESEND_API_KEY!.trim()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: this.env.MAIL_FROM?.trim() || DEFAULT_FROM,
          to: [message.to],
          subject: message.subject,
          html: message.html,
          text: message.text,
        }),
        signal: AbortSignal.timeout(10_000),
      });

      if (!response.ok) {
        const detail = (await response.text()).slice(0, 300);
        this.logger.error(`Resend respondió ${response.status}: ${detail}`);
        return false;
      }
      return true;
    } catch (error) {
      this.logger.error(`No se pudo enviar el correo: ${(error as Error).message}`);
      return false;
    }
  }
}
