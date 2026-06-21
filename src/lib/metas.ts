/**
 * Lógica de metas y semáforos.
 *
 * Cada asignación tiene una fecha de asignación (cuándo se sorteó) y una fecha
 * objetivo (cuándo deberían estar listas las sesiones). Comparando el tiempo
 * transcurrido contra el avance real se determina un semáforo:
 *   🟢 verde   → en camino (o meta cumplida)
 *   🟡 amarillo→ en riesgo (vamos algo atrasados)
 *   🔴 rojo    → fuera de meta (muy atrasados o se pasó la fecha sin terminar)
 */

/** Fechas por defecto para datos existentes sin meta cargada. */
export const FECHA_ASIGNACION_DEFECTO = '2026-06-01';
export const FECHA_OBJETIVO_DEFECTO = '2026-06-30';

export type Semaforo = 'verde' | 'amarillo' | 'rojo';

export const SEMAFORO_COLOR: Record<Semaforo, string> = {
  verde: '#16a34a',
  amarillo: '#d97706',
  rojo: '#dc2626',
};

export const SEMAFORO_LABEL: Record<Semaforo, string> = {
  verde: 'En camino',
  amarillo: 'En riesgo',
  rojo: 'Fuera de meta',
};

/** Fracción de tiempo transcurrido entre asignación y objetivo (0..1). */
export function fraccionTiempo(
  fechaAsignacion: string,
  fechaObjetivo: string,
  hoy: Date = new Date(),
): number {
  const ini = new Date(fechaAsignacion).getTime();
  const fin = new Date(fechaObjetivo).getTime();
  if (!isFinite(ini) || !isFinite(fin) || fin <= ini) return 1;
  const t = (hoy.getTime() - ini) / (fin - ini);
  return Math.min(1, Math.max(0, t));
}

/**
 * Determina el semáforo comparando avance (0..1) contra el tiempo transcurrido.
 * @param avance     proporción lograda (p.ej. sesiones efectuadas / planeadas)
 * @param transcurrido fracción de tiempo consumida (de fraccionTiempo)
 * @param pasadaFecha  true si ya se pasó la fecha objetivo
 */
export function semaforo(
  avance: number,
  transcurrido: number,
  pasadaFecha: boolean,
): Semaforo {
  if (avance >= 1) return 'verde';
  if (pasadaFecha) return 'rojo';
  const brecha = avance - transcurrido; // negativo = atrasado
  if (brecha >= -0.1) return 'verde';
  if (brecha >= -0.25) return 'amarillo';
  return 'rojo';
}
