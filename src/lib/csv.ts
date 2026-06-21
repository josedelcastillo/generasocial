import Papa from 'papaparse';
import * as XLSX from 'xlsx';

export type Fila = Record<string, string>;

/** Normaliza las claves de una fila: minúsculas y sin espacios. */
function normalizar(row: Record<string, unknown>): Fila {
  const out: Fila = {};
  for (const [k, v] of Object.entries(row)) {
    out[k.trim().toLowerCase()] = v == null ? '' : String(v).trim();
  }
  return out;
}

/** Parsea un CSV a filas con encabezados normalizados. */
function parseCsv(file: File): Promise<Fila[]> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim().toLowerCase(),
      complete: (res) => resolve(res.data.map(normalizar)),
      error: (err) => reject(err),
    });
  });
}

/** Parsea un Excel (.xlsx/.xls) tomando la primera hoja. */
async function parseExcel(file: File): Promise<Fila[]> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
    defval: '',
  });
  return rows.map(normalizar);
}

/** Parsea un archivo tabular: detecta Excel o CSV por su extensión. */
export function parseTabla(file: File): Promise<Fila[]> {
  const name = file.name.toLowerCase();
  if (name.endsWith('.xlsx') || name.endsWith('.xls')) return parseExcel(file);
  return parseCsv(file);
}

/** Toma el primer valor no vacío entre varios nombres de columna posibles. */
export function pick(row: Fila, ...keys: string[]): string {
  for (const k of keys) {
    const v = row[k];
    if (v != null && String(v).trim() !== '') return String(v).trim();
  }
  return '';
}
