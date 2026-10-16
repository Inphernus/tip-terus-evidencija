import { requireAdmin } from "@/lib/auth";
import { exportFileName, loadReport, parseReportParams } from "@/lib/report";
import { buildSihterica } from "@/lib/sihterica";

export async function GET(request: Request) {
  await requireAdmin();
  const params = parseReportParams((key) => new URL(request.url).searchParams.get(key));
  if ("error" in params) return new Response(params.error, { status: 400 });

  const report = await loadReport(params);
  if (!report) return new Response("Djelatnik ne postoji.", { status: 404 });

  const file = await buildSihterica(report.rows, params.from, params.to, !params.userId);
  return new Response(new Uint8Array(file), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${exportFileName(report)}"`,
      "Cache-Control": "no-store",
    },
  });
}
