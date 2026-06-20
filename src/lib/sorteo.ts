/**
 * Lógica pura del sorteo (asignación aleatoria de coaches a beneficiarios).
 *
 * Reglas acordadas:
 *  - Asignación aleatoria, sin restricción de organización.
 *  - Sólo se sortean beneficiarios "pendientes" (sin asignación activa).
 *  - Se prioriza a los coaches sin beneficiario en curso: en cada paso se
 *    elige al coach con menor cantidad de asignaciones activas.
 *  - Un coach puede recibir varios beneficiarios; un beneficiario puede tener
 *    más de un coach (en sorteos distintos).
 */

export interface CoachLoad {
  id: string;
  nombre: string;
  /** Cantidad de asignaciones activas que ya tiene el coach. */
  activeCount: number;
}

export interface BeneficiarioInput {
  id: string;
  nombre: string;
}

export interface Pairing {
  coachId: string;
  coachNombre: string;
  beneficiarioId: string;
  beneficiarioNombre: string;
}

function shuffle<T>(arr: readonly T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Genera las parejas coach–beneficiario.
 * Reparte de forma balanceada empezando por los coaches más libres.
 */
export function sortear(
  beneficiarios: readonly BeneficiarioInput[],
  coaches: readonly CoachLoad[],
): Pairing[] {
  if (coaches.length === 0) return [];

  const pendientes = shuffle(beneficiarios);
  // Copia mutable y barajada para desempatar al azar entre coaches con igual carga.
  const loads = shuffle(coaches).map((c) => ({ ...c }));
  const pairings: Pairing[] = [];

  for (const b of pendientes) {
    // Elegir el coach con menor carga actual (los desempates ya están barajados).
    let elegido = loads[0];
    for (const c of loads) {
      if (c.activeCount < elegido.activeCount) elegido = c;
    }
    pairings.push({
      coachId: elegido.id,
      coachNombre: elegido.nombre,
      beneficiarioId: b.id,
      beneficiarioNombre: b.nombre,
    });
    elegido.activeCount += 1;
  }

  return pairings;
}
