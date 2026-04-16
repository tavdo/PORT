import XLSX from "xlsx";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const file = path.join(__dirname, "..", "PROFORMA DA-BELGRAVIA V-GLP17718961.xlsx");

function trunc(s, n = 120) {
  const t = String(s ?? "").replace(/\s+/g, " ").trim();
  if (t.length <= n) return t;
  return t.slice(0, n) + "…";
}

const wb = XLSX.readFile(file, { cellDates: true });
const out = [];

out.push("=== SHEET NAMES ===");
out.push(wb.SheetNames.join(", "));
out.push("");

for (const name of wb.SheetNames) {
  const ws = wb.Sheets[name];
  const ref = ws["!ref"];
  if (!ref) {
    out.push(`--- [${name}] EMPTY ---`);
    continue;
  }
  const range = XLSX.utils.decode_range(ref);
  const rows = range.e.r - range.s.r + 1;
  const cols = range.e.c - range.s.c + 1;
  out.push(`--- [${name}] ---`);
  out.push(`Range: ${ref} (${rows} rows × ${cols} cols)`);

  const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "", raw: false });
  const maxPrint = Math.min(data.length, 100);
  let printed = 0;
  for (let i = 0; i < data.length && printed < maxPrint; i++) {
    const row = data[i];
    const cells = row.map((c) => trunc(c, 100));
    const line = cells.join(" | ");
    if (!line.trim()) continue;
    out.push(`R${i + 1}: ${line}`);
    printed++;
  }
  if (data.length > maxPrint) out.push(`... (${data.length - maxPrint} more rows not shown)`);
  out.push("");
}

fs.writeFileSync(path.join(__dirname, "xlsx-map.txt"), out.join("\n"), "utf8");
console.log(out.join("\n"));
