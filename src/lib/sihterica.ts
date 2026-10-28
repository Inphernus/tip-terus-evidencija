import ExcelJS from "exceljs";
import type { Employee, PeriodSummary } from "@/lib/data";
import { ABSENCE_HOURS, ABSENCE_LABEL, ABSENCE_TYPES } from "@/lib/hours";
import { formatDate, weekdayShort, zagrebTime } from "@/lib/time";

type Row = { employee: Employee; summary: PeriodSummary };

const HOURS_FMT = "0.00";
const GREY = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEFEFEF" } } as const;
const HEAD = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDCE6F7" } } as const;
const THIN = { style: "thin", color: { argb: "FFBFBFBF" } } as const;

const round2 = (h: number) => Math.round(h * 100) / 100;
const name = (e: Employee) => `${e.first_name} ${e.last_name}`;
const dana = (n: number) => `${n} ${n % 10 === 1 && n % 100 !== 11 ? "dan" : "dana"}`;

function sheetName(e: Employee, used: Set<string>) {
  const base = `${e.last_name} ${e.first_name}`.replace(/[[\]:*?/\\]/g, "").slice(0, 28);
  let candidate = base;
  for (let i = 2; used.has(candidate); i++) candidate = `${base.slice(0, 26)} ${i}`;
  used.add(candidate);
  return candidate;
}

function title(ws: ExcelJS.Worksheet, text: string, from: string, to: string, cols: number) {
  ws.mergeCells(1, 1, 1, cols);
  ws.getCell(1, 1).value = text;
  ws.getCell(1, 1).font = { bold: true, size: 14 };
  ws.mergeCells(2, 1, 2, cols);
  ws.getCell(2, 1).value = `Tip-Terus · razdoblje ${formatDate(from)} – ${formatDate(to)}`;
  ws.getCell(2, 1).font = { color: { argb: "FF666666" } };
}

function header(ws: ExcelJS.Worksheet, rowNo: number, labels: string[]) {
  const row = ws.getRow(rowNo);
  labels.forEach((label, i) => {
    const cell = row.getCell(i + 1);
    cell.value = label;
    cell.font = { bold: true };
    cell.fill = HEAD;
    cell.border = { top: THIN, bottom: THIN, left: THIN, right: THIN };
    cell.alignment = { vertical: "middle", wrapText: true };
  });
  row.height = 30;
}

function employeeSheet(wb: ExcelJS.Workbook, { employee, summary }: Row, from: string, to: string, used: Set<string>) {
  const ws = wb.addWorksheet(sheetName(employee, used), {
    pageSetup: { paperSize: 9, orientation: "portrait", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
    views: [{ state: "frozen", ySplit: 4 }],
  });
  // Stupci: Datum, Dan, Dolazak – odlazak, Rad, [po jedan za svaku vrstu odsutnosti], Ukupno, Napomena
  const absCols = ABSENCE_TYPES.length;
  const hoursFrom = 4;
  const hoursTo = 5 + absCols;
  const noteCol = hoursTo + 1;
  ws.columns = [
    { width: 12 }, { width: 6 }, { width: 30 }, { width: 9 },
    ...ABSENCE_TYPES.map(() => ({ width: 11 })),
    { width: 10 }, { width: 40 },
  ];
  title(ws, `Šihterica – ${name(employee)}`, from, to, noteCol);
  header(ws, 4, [
    "Datum", "Dan", "Dolazak – odlazak", "Rad (h)",
    ...ABSENCE_TYPES.map((t) => `${ABSENCE_LABEL[t]} (h)`),
    "Ukupno (h)", "Napomena",
  ]);

  let r = 5;
  for (const day of summary.days) {
    const notes = [
      day.holiday,
      day.absence ? ABSENCE_LABEL[day.absence] : null,
      day.unclosed ? "NIJE ZATVOREN" : null,
      ...day.notes,
    ].filter(Boolean);
    const row = ws.getRow(r++);
    row.values = [
      formatDate(day.date),
      weekdayShort(day.date),
      day.entries.map((e) => `${zagrebTime(e.start_at)}–${e.end_at ? zagrebTime(e.end_at) : "?"}`).join(", "),
      day.workedHours ? round2(day.workedHours) : null,
      ...ABSENCE_TYPES.map((t) => (day.absence === t ? day.absenceHours : null)),
      day.totalHours ? round2(day.totalHours) : null,
      notes.join(" · "),
    ];
    row.eachCell({ includeEmpty: true }, (cell, col) => {
      cell.border = { bottom: THIN, left: THIN, right: THIN };
      if (col >= hoursFrom && col <= hoursTo) cell.numFmt = HOURS_FMT;
      if (col === noteCol) cell.alignment = { wrapText: true, vertical: "top" };
      if (day.sunday || day.holiday) cell.fill = GREY;
    });
  }

  const total = ws.getRow(r);
  total.values = [
    "UKUPNO", null, null, round2(summary.workedHours),
    ...ABSENCE_TYPES.map((t) => summary.absenceDays[t] * ABSENCE_HOURS),
    round2(summary.totalHours), null,
  ];
  total.eachCell({ includeEmpty: true }, (cell, col) => {
    cell.font = { bold: true };
    cell.border = { top: { style: "medium" }, bottom: { style: "medium" } };
    if (col >= hoursFrom && col <= hoursTo) cell.numFmt = HOURS_FMT;
  });

  ws.getRow(r + 2).values = [ABSENCE_TYPES.map((t) => `${ABSENCE_LABEL[t]}: ${dana(summary.absenceDays[t])}`).join(" · ")];
  ws.getRow(r + 4).values = ["Potpis djelatnika: ____________________", null, null, null, null, "Potpis odgovorne osobe: ____________________"];
}

function summarySheet(wb: ExcelJS.Workbook, rows: Row[], from: string, to: string) {
  const ws = wb.addWorksheet("Zbirno", {
    pageSetup: { paperSize: 9, orientation: "portrait", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });
  // Stupci: Djelatnik, Rad, [dana + sati za svaku vrstu odsutnosti], Ukupno
  const cols = 3 + ABSENCE_TYPES.length * 2;
  const isHours = (col: number) => col === 2 || col === cols || (col > 2 && col < cols && (col - 3) % 2 === 1);
  ws.columns = [{ width: 28 }, { width: 10 }, ...ABSENCE_TYPES.flatMap(() => [{ width: 13 }, { width: 13 }]), { width: 11 }];
  title(ws, "Šihterica – zbirno", from, to, cols);
  header(ws, 4, [
    "Djelatnik", "Rad (h)",
    ...ABSENCE_TYPES.flatMap((t) => [`${ABSENCE_LABEL[t]} (dana)`, `${ABSENCE_LABEL[t]} (h)`]),
    "Ukupno (h)",
  ]);

  let r = 5;
  for (const { employee, summary } of rows) {
    const row = ws.getRow(r++);
    row.values = [
      name(employee) + (employee.active ? "" : " (neaktivan)"),
      round2(summary.workedHours),
      ...ABSENCE_TYPES.flatMap((t) => [summary.absenceDays[t], summary.absenceDays[t] * ABSENCE_HOURS]),
      round2(summary.totalHours),
    ];
    row.eachCell({ includeEmpty: true }, (cell, col) => {
      cell.border = { bottom: THIN, left: THIN, right: THIN };
      if (isHours(col)) cell.numFmt = HOURS_FMT;
    });
  }
  const total = ws.getRow(r);
  const letter = (col: number) => String.fromCharCode(64 + col);
  total.values = ["UKUPNO", ...Array.from({ length: cols - 1 }, (_, i) => ({ formula: `SUM(${letter(i + 2)}5:${letter(i + 2)}${r - 1})` }))];
  total.eachCell({ includeEmpty: true }, (cell, col) => {
    cell.font = { bold: true };
    cell.border = { top: { style: "medium" }, bottom: { style: "medium" } };
    if (isHours(col)) cell.numFmt = HOURS_FMT;
  });
}

/** Šihterica: jedan list po djelatniku; kod zbirnog exporta prvi list je pregled svih. */
export async function buildSihterica(rows: Row[], from: string, to: string, zbirno: boolean): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Tip-Terus evidencija";
  wb.created = new Date();
  if (zbirno) summarySheet(wb, rows, from, to);
  const used = new Set<string>(["Zbirno"]);
  rows.forEach((row) => employeeSheet(wb, row, from, to, used));
  return Buffer.from(await wb.xlsx.writeBuffer());
}
