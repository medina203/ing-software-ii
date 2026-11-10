import type { Client } from '../types';

export function clientFullName(client: Client): string {
  return `${client.nombres} ${client.apellidos}`.trim();
}

export function clientOptionLabel(client: Client): string {
  return `${client.documentoIdentidad} · ${clientFullName(client)}`;
}

export function normalizeClientSearch(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}
