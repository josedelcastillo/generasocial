import Papa from 'papaparse';

/** Parsea un archivo CSV a filas tipadas por encabezado (en minúsculas y sin espacios). */
export function parseCsv<T extends Record<string, string>>(
  file: File,
): Promise<T[]> {
  return new Promise((resolve, reject) => {
    Papa.parse<T>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim().toLowerCase(),
      complete: (res) => resolve(res.data),
      error: (err) => reject(err),
    });
  });
}

/** Toma el primer valor no vacío entre varios nombres de columna posibles. */
export function pick(
  row: Record<string, string>,
  ...keys: string[]
): string {
  for (const k of keys) {
    const v = row[k];
    if (v != null && String(v).trim() !== '') return String(v).trim();
  }
  return '';
}
