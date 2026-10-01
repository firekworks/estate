/** Strict RFC4180-style input. Reject malformed files rather than silently drop rows. */
export function readCsv(text: string): Record<string, string>[] {
  if (text.length > 5_000_000) throw new Error("CSV demasiado grande (máximo 5 MB).");
  const source = text.replace(/^\uFEFF/, "");
  const first = source.split(/\r?\n/)[0];
  const delimiter = first.includes(";") ? ";" : ",";
  const rows: string[][] = []; let row: string[] = [], field = "", quoted = false, closed = false;
  for (let i = 0; i < source.length; i++) {
    const c = source[i];
    if (quoted) {
      if (c === '"' && source[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') { quoted = false; closed = true; }
      else field += c;
    } else if (c === '"') {
      if (field || closed) throw new Error("Comillas CSV no válidas.");
      quoted = true;
    } else if (c === delimiter || c === '\n' || c === '\r') {
      row.push(field.trim()); field = ""; closed = false;
      if (c !== delimiter) { if (row.some(Boolean)) rows.push(row); row = []; if(c === '\r' && source[i+1] === '\n') i++; }
    } else {
      if (closed && c.trim()) throw new Error("Texto después de comillas CSV.");
      if (!closed) field += c;
    }
  }
  if (quoted) throw new Error("CSV con comillas sin cerrar.");
  row.push(field.trim()); if (row.some(Boolean)) rows.push(row);
  if (rows.length < 2) throw new Error("CSV necesita cabecera y datos.");
  const headers = rows.shift()!.map(h => h.toLowerCase());
  if (new Set(headers).size !== headers.length || headers.some(h => !h || ["__proto__","prototype","constructor"].includes(h))) throw new Error("Cabeceras CSV inválidas o repetidas.");
  if (rows.length > 25000) throw new Error("Máximo 25000 filas por importación.");
  return rows.map((values, i) => {
    if (values.length !== headers.length) throw new Error(`Fila ${i+2}: número de columnas incorrecto.`);
    return Object.fromEntries(headers.map((key,j)=>[key, values[j]]));
  });
}
export function csvNumber(raw?: string): number | null {
  if (!raw?.trim()) return null;
  let s = raw.trim().replace(/\s|€/g, "");
  if (s.includes(",") && s.includes(".")) s = s.lastIndexOf(",") > s.lastIndexOf(".") ? s.replaceAll(".", "").replace(",", ".") : s.replaceAll(",", "");
  else if (s.includes(",")) s = s.replace(",", ".");
  if (!/^-?\d+(\.\d+)?$/.test(s) || !Number.isFinite(Number(s))) throw new Error(`Número no válido: ${raw.slice(0,40)}`);
  return Number(s);
}
export function canonicalListingUrl(value: string) {
  const url = new URL(value);
  if (!["https:","http:"].includes(url.protocol) || url.username || url.password) throw new Error("URL debe ser HTTP/HTTPS sin credenciales.");
  url.hash = "";
  for (const key of [...url.searchParams.keys()]) if (/^(utm_|fbclid|gclid)/i.test(key)) url.searchParams.delete(key);
  return url.toString().replace(/\/$/, "");
}
