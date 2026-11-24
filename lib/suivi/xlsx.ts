// Écriture minimale de classeurs .xlsx, sans dépendance (node:zlib uniquement).
// Suffisant pour le suivi du bureau : cellules texte, nombres, dates ; pas de formules ni de styles riches.
import { crc32, deflateRawSync } from "node:zlib";

export type Cell = string | number | Date | null;

// ---------- ZIP ----------

function writeZip(entries: { name: string; data: Buffer }[]): Buffer {
  const parts: Buffer[] = [];
  const central: Buffer[] = [];
  let offset = 0;
  for (const { name, data } of entries) {
    const nameBuf = Buffer.from(name, "utf8");
    const comp = deflateRawSync(data);
    const crc = crc32(data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6);
    local.writeUInt16LE(8, 8);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(comp.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    parts.push(local, nameBuf, comp);
    const c = Buffer.alloc(46);
    c.writeUInt32LE(0x02014b50, 0);
    c.writeUInt16LE(20, 4);
    c.writeUInt16LE(20, 6);
    c.writeUInt16LE(0x0800, 8);
    c.writeUInt16LE(8, 10);
    c.writeUInt32LE(crc, 16);
    c.writeUInt32LE(comp.length, 20);
    c.writeUInt32LE(data.length, 24);
    c.writeUInt16LE(nameBuf.length, 28);
    c.writeUInt32LE(offset, 42);
    central.push(c, nameBuf);
    offset += 30 + nameBuf.length + comp.length;
  }
  const centralBuf = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralBuf.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...parts, centralBuf, end]);
}

// ---------- XML ----------

function escapeXml(s: string): string {
  return s
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function colName(i: number): string {
  let s = "";
  for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
}

export function dateToSerial(d: Date): number {
  return d.getTime() / 86400000 + 25569;
}

// ---------- Écriture ----------

export function writeXlsx(sheets: { name: string; rows: Cell[][]; widths?: number[] }[]): Buffer {
  const safeName = (n: string) => escapeXml(n.replace(/[\\/?*[\]:]/g, " ").slice(0, 31) || "Feuille");
  const entries: { name: string; data: Buffer }[] = [];
  const add = (name: string, xml: string) => entries.push({ name, data: Buffer.from(xml, "utf8") });
  const head = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';

  add(
    "[Content_Types].xml",
    head +
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
      sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("") +
      "</Types>",
  );
  add("_rels/.rels", head + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>');
  add(
    "xl/workbook.xml",
    head +
      '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>' +
      sheets.map((s, i) => `<sheet name="${safeName(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("") +
      "</sheets></workbook>",
  );
  add(
    "xl/_rels/workbook.xml.rels",
    head +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join("") +
      `<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
  );
  // styles : 0 normal, 1 date jj/mm/aaaa, 2 en-tête gras, 3 texte à la ligne
  add(
    "xl/styles.xml",
    head +
      '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="4"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="14" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf></cellXfs></styleSheet>',
  );
  sheets.forEach((sheet, si) => {
    const cols = sheet.widths?.length ? "<cols>" + sheet.widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join("") + "</cols>" : "";
    const rowsXml = sheet.rows
      .map((row, ri) => {
        const cells = row
          .map((cell, ci) => {
            if (cell === null || cell === undefined || cell === "") return "";
            const ref = `${colName(ci)}${ri + 1}`;
            if (cell instanceof Date) return `<c r="${ref}" s="1"><v>${Math.floor(dateToSerial(cell))}</v></c>`;
            if (typeof cell === "number") return `<c r="${ref}"><v>${cell}</v></c>`;
            return `<c r="${ref}" s="${ri === 0 ? 2 : 3}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(cell)}</t></is></c>`;
          })
          .join("");
        return `<row r="${ri + 1}">${cells}</row>`;
      })
      .join("");
    add(`xl/worksheets/sheet${si + 1}.xml`, head + `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0">${sheet.rows.length ? '<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>' : ""}</sheetView></sheetViews>${cols}<sheetData>${rowsXml}</sheetData></worksheet>`);
  });
  return writeZip(entries);
}
