import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../amplify/data/resource';

/**
 * Cliente tipado de datos (AppSync/DynamoDB).
 * Se usa en toda la app: client.models.<Modelo>.list()/create()/update()...
 */
export const client = generateClient<Schema>();

// Tipos derivados del esquema, reutilizables en los componentes.
export type Organizacion = Schema['Organizacion']['type'];
export type Beneficiario = Schema['Beneficiario']['type'];
export type CoachProfile = Schema['CoachProfile']['type'];
export type Sorteo = Schema['Sorteo']['type'];
export type Asignacion = Schema['Asignacion']['type'];
export type Sesion = Schema['Sesion']['type'];
export type Aprendizaje = Schema['Aprendizaje']['type'];

export type EstadoSesion = 'por_agendar' | 'agendada' | 'realizada';

export const ESTADOS_SESION: { value: EstadoSesion; label: string }[] = [
  { value: 'por_agendar', label: 'Por agendar' },
  { value: 'agendada', label: 'Agendada' },
  { value: 'realizada', label: 'Realizada' },
];

export const estadoLabel = (e?: string | null): string =>
  ESTADOS_SESION.find((s) => s.value === e)?.label ?? '—';
