import XLSX from "xlsx";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fp = path.join(__dirname, "..", "PROFORMA DA-BELGRAVIA V-GLP17718961.xlsx");

const wb = XLSX.readFile(fp, { cellFormula: true, bookSheets: true });

console.log("Workbook sheets:", wb.SheetNames.length);
for (const name of wb.SheetNames) {
  const ws = wb.Sheets[name];
  const ref = ws["!ref"] || "?";
  console.log("\n---", name, "--- range:", ref);

  // Sample: dump non-empty cells in first 40 rows, cols A–M as JSON-ish
  const range = XLSX.utils.decode_range(ref);
  const maxRow = Math.min(range.e.r, 60);
  const maxCol = Math.min(range.e.c, 15);
  for (let R = range.s.r; R <= maxRow; R++) {
    const row = [];
    for (let C = range.s.c; C <= maxCol; C++) {
      const addr = XLSX.utils.encode_cell({ r: R, c: C });
      const cell = ws[addr];
      if (!cell) continue;
      const v = cell.f ? `=${cell.f}` : cell.v;
      if (v !== undefined && v !== "" && v !== null) {
        row.push(`${addr}:${JSON.stringify(v)}`);
      }
    }
    if (row.length) console.log("R" + (R + 1), row.join(" | "));
  }

  const formulae = XLSX.utils.sheet_to_formulae(ws);
  const withF = formulae.filter((f) => f && String(f).includes("="));
  console.log("Total formula strings:", withF.length);
  console.log("First 50 formulas:");
  withF.slice(0, 50).forEach((x) => console.log(x));
}
