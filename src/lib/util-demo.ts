// DEMO: función con un BUG que SonarCloud detecta (Reliability).
// Bug typescript:S1764: la misma expresión aparece a ambos lados de "||",
// así que la segunda comparación es redundante y probablemente un error.
export function tieneCupo(disponibles: number): boolean {
  return disponibles > 0 || disponibles > 0;
}
