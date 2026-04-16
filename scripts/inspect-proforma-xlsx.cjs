const XLSX = require("xlsx");
const path = require("path");

const fp = path.join(__dirname, "..", "PROFORMA DA-BELGRAVIA V-GLP17718961.xlsx");
const wb = XLSX.readFile(fp, { cellFormula: true });

console.log("Sheets:", wb.SheetNames.join(" | "));
for (const name of wb.SheetNames) {
  const ws = wb.Sheets[name];
  const ref = ws["!ref"] || "?";
  console.log("\n---", name, "--- range:", ref);
  const range = XLSX.utils.decode_range(ref);
  const maxRow = Math.min(range.e.r, 80);
  const maxCol = Math.min(range.e.c, 20);
  for (let R = range.s.r; R <= maxRow; R++) {
    const parts = [];
    for (let C = range.s.c; C <= maxCol; C++) {
      const addr = XLSX.utils.encode_cell({ r: R, c: C });
      const cell = ws[addr];
      if (!cell) continue;
      const show = cell.f != null ? "=" + cell.f : cell.w != null ? cell.w : cell.v;
      if (show !== undefined && show !== "") parts.push(addr + ":" + String(show).slice(0, 120));
    }
    if (parts.length) console.log("Row", R + 1, parts.join(" | "));
  }
  const formulae = XLSX.utils.sheet_to_formulae(ws);
  const withF = formulae.filter((f) => f && String(f).includes("="));
  console.log("Formula count:", withF.length);
  console.log("First 40:");
  withF.slice(0, 40).forEach((x) => console.log(x));
}
