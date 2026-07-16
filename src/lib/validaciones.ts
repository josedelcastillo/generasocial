// Archivo de DEMO: contiene problemas de CÓDIGO que SonarCloud detecta
// (independientes de los secretos que atrapa Semgrep).

// 🐛 Bug (SonarCloud typescript:S1764): la misma expresión aparece a ambos
// lados de "&&", así que la segunda comparación es redundante. Baja el
// Reliability Rating del código nuevo y hace fallar el Quality Gate.
export function estaVigente(dias: number): boolean {
  return dias > 0 && dias > 0;
}

// 🔒 Security Hotspot (SonarCloud typescript:S2245): Math.random() no es un
// generador seguro; usarlo para un "token" es un riesgo. Mientras el hotspot
// no se revise, el Quality Gate no pasa.
export function generarTokenInseguro(): string {
  return Math.random().toString(36).slice(2);
}
