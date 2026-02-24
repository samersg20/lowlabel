import { inflateRawSync } from "zlib";

type XlsxRow = Record<string, string>;

const HEADERS = [
  "itemCode",
  "name",
  "group",
  "sif",
  "methodQuente",
  "methodPistaFria",
  "methodDescongelando",
  "methodResfriado",
  "methodCongelado",
  "methodAmbienteSecos",
] as const;

function xmlEscape(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function columnLetter(index: number) {
  let n = index + 1;
  let s = "";
  while (n > 0) {
    const mod = (n - 1) % 26;
    s = String.fromCharCode(65 + mod) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

function sheetXml(rows: XlsxRow[]) {
  const headerRow = `<row r="1">${HEADERS.map((h, i) => `<c r="${columnLetter(i)}1" t="inlineStr"><is><t>${xmlEscape(h)}</t></is></c>`).join("")}</row>`;
  const bodyRows = rows
    .map((row, rowIndex) => {
      const r = rowIndex + 2;
      const cells = HEADERS.map((h, i) => {
        const value = String(row[h] ?? "");
        return `<c r="${columnLetter(i)}${r}" t="inlineStr"><is><t>${xmlEscape(value)}</t></is></c>`;
      }).join("");
      return `<row r="${r}">${cells}</row>`;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${headerRow}${bodyRows}</sheetData></worksheet>`;
}

function uint16LE(v: number) {
  const b = Buffer.alloc(2);
  b.writeUInt16LE(v, 0);
  return b;
}
function uint32LE(v: number) {
  const b = Buffer.alloc(4);
  b.writeUInt32LE(v >>> 0, 0);
  return b;
}

const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf: Buffer) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function buildZip(files: Array<{ name: string; data: Buffer }>) {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;

  for (const file of files) {
    const name = Buffer.from(file.name, "utf8");
    const data = file.data;
    const crc = crc32(data);

    const localHeader = Buffer.concat([
      uint32LE(0x04034b50),
      uint16LE(20),
      uint16LE(0),
      uint16LE(0),
      uint16LE(0),
      uint16LE(0),
      uint32LE(crc),
      uint32LE(data.length),
      uint32LE(data.length),
      uint16LE(name.length),
      uint16LE(0),
      name,
    ]);

    locals.push(localHeader, data);

    const centralHeader = Buffer.concat([
      uint32LE(0x02014b50),
      uint16LE(20),
      uint16LE(20),
      uint16LE(0),
      uint16LE(0),
      uint16LE(0),
      uint16LE(0),
      uint32LE(crc),
      uint32LE(data.length),
      uint32LE(data.length),
      uint16LE(name.length),
      uint16LE(0),
      uint16LE(0),
      uint16LE(0),
      uint16LE(0),
      uint32LE(0),
      uint32LE(offset),
      name,
    ]);

    centrals.push(centralHeader);
    offset += localHeader.length + data.length;
  }

  const centralDir = Buffer.concat(centrals);
  const localData = Buffer.concat(locals);
  const eocd = Buffer.concat([
    uint32LE(0x06054b50),
    uint16LE(0),
    uint16LE(0),
    uint16LE(files.length),
    uint16LE(files.length),
    uint32LE(centralDir.length),
    uint32LE(localData.length),
    uint16LE(0),
  ]);

  return Buffer.concat([localData, centralDir, eocd]);
}

export function buildItemsWorkbook(rows: XlsxRow[]) {
  const files = [
    {
      name: "[Content_Types].xml",
      data: Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`),
    },
    {
      name: "_rels/.rels",
      data: Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`),
    },
    {
      name: "xl/workbook.xml",
      data: Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Itens" sheetId="1" r:id="rId1"/></sheets></workbook>`),
    },
    {
      name: "xl/_rels/workbook.xml.rels",
      data: Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`),
    },
    {
      name: "xl/styles.xml",
      data: Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts><fills count="1"><fill><patternFill patternType="none"/></fill></fills><borders count="1"><border/></borders><cellXfs count="1"><xf/></cellXfs></styleSheet>`),
    },
    {
      name: "xl/worksheets/sheet1.xml",
      data: Buffer.from(sheetXml(rows)),
    },
  ];

  return buildZip(files);
}

function unzipEntries(buf: Buffer) {
  const eocdSig = 0x06054b50;
  let eocdOffset = -1;
  for (let i = buf.length - 22; i >= 0; i--) {
    if (buf.readUInt32LE(i) === eocdSig) {
      eocdOffset = i;
      break;
    }
  }
  if (eocdOffset < 0) throw new Error("Arquivo XLSX inválido");

  const totalEntries = buf.readUInt16LE(eocdOffset + 10);
  const centralOffset = buf.readUInt32LE(eocdOffset + 16);

  const files = new Map<string, Buffer>();
  let ptr = centralOffset;
  for (let i = 0; i < totalEntries; i++) {
    if (buf.readUInt32LE(ptr) !== 0x02014b50) throw new Error("Central directory inválido");
    const compression = buf.readUInt16LE(ptr + 10);
    const compressedSize = buf.readUInt32LE(ptr + 20);
    const fileNameLength = buf.readUInt16LE(ptr + 28);
    const extraLength = buf.readUInt16LE(ptr + 30);
    const commentLength = buf.readUInt16LE(ptr + 32);
    const localOffset = buf.readUInt32LE(ptr + 42);
    const fileName = buf.slice(ptr + 46, ptr + 46 + fileNameLength).toString("utf8");

    const localNameLen = buf.readUInt16LE(localOffset + 26);
    const localExtraLen = buf.readUInt16LE(localOffset + 28);
    const dataStart = localOffset + 30 + localNameLen + localExtraLen;
    const compressed = buf.slice(dataStart, dataStart + compressedSize);
    const data = compression === 0 ? compressed : compression === 8 ? inflateRawSync(compressed) : null;
    if (!data) throw new Error("Compressão XLSX não suportada");
    files.set(fileName, data);

    ptr += 46 + fileNameLength + extraLength + commentLength;
  }

  return files;
}

function parseSharedStrings(xml: string) {
  const values: string[] = [];
  const regex = /<si>[\s\S]*?<t[^>]*>([\s\S]*?)<\/t>[\s\S]*?<\/si>/g;
  let m;
  while ((m = regex.exec(xml))) values.push(m[1].replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">"));
  return values;
}

export function parseItemsWorkbook(data: Buffer): XlsxRow[] {
  const files = unzipEntries(data);
  const sheet = files.get("xl/worksheets/sheet1.xml");
  if (!sheet) throw new Error("Planilha inválida: sheet1 ausente");

  const shared = files.get("xl/sharedStrings.xml");
  const sharedStrings = shared ? parseSharedStrings(shared.toString("utf8")) : [];
  const sheetXml = sheet.toString("utf8");

  const rows: Array<Map<number, string>> = [];
  const rowRegex = /<row[^>]*>([\s\S]*?)<\/row>/g;
  let rowMatch;
  while ((rowMatch = rowRegex.exec(sheetXml))) {
    const cellMap = new Map<number, string>();
    const cellRegex = /<c([^>]*)>([\s\S]*?)<\/c>/g;
    let cellMatch;
    while ((cellMatch = cellRegex.exec(rowMatch[1]))) {
      const attrs = cellMatch[1] || "";
      const inner = cellMatch[2] || "";
      const refMatch = attrs.match(/\br="([A-Z]+)(\d+)"/);
      if (!refMatch) continue;

      const col = refMatch[1];
      const typeMatch = attrs.match(/\bt="([^"]+)"/);
      const type = typeMatch?.[1];
      const index = col.split("").reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0) - 1;

      let value = "";
      if (type === "inlineStr") {
        const t = inner.match(/<t[^>]*>([\s\S]*?)<\/t>/);
        value = t ? t[1] : "";
      } else if (type === "s") {
        const v = inner.match(/<v>(\d+)<\/v>/);
        value = v ? sharedStrings[Number(v[1])] || "" : "";
      } else {
        const v = inner.match(/<v>([\s\S]*?)<\/v>/);
        value = v ? v[1] : "";
      }


      value = value.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim();
      cellMap.set(index, value);
    }
    rows.push(cellMap);
  }

  if (!rows.length) return [];

  const header = HEADERS.map((_, i) => (rows[0].get(i) || "").trim());
  if (header.join("|") !== HEADERS.join("|")) {
    throw new Error(`Cabeçalhos inválidos na planilha. Esperado: ${HEADERS.join(", ")}. Recebido: ${header.join(", ")}`);
  }

  return rows.slice(1).map((r) => {
    const obj: Record<string, string> = {};
    HEADERS.forEach((h, i) => {
      obj[h] = (r.get(i) || "").trim();
    });
    return obj;
  });
}

export { HEADERS };
