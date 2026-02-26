import { auth } from "@/lib/auth";
import { addDaysToDateKey, getSaoPauloDayRange, nowInSaoPauloDateKey } from "@/lib/date";
import { tenantDb } from "@/lib/tenant-db";

export default async function Home() {
  const session = await auth();

  if (!session?.user) {
    return (
      <div className="card" style={{ textAlign: "center" }}>
        <h1>Bem-vindo ao Etiketi</h1>
        <p>Faça login para acessar o sistema.</p>
      </div>
    );
  }
  if (!session.user.tenantId) {
    return (
      <div className="card" style={{ textAlign: "center" }}>
        <h1>Conta sem tenant</h1>
        <p>Entre em contato com o suporte para configurar sua empresa.</p>
      </div>
    );
  }

  const todayKey = nowInSaoPauloDateKey();
  const tomorrowKey = addDaysToDateKey(todayKey, 1);
  const todayRange = getSaoPauloDayRange(todayKey);
  const tomorrowRange = getSaoPauloDayRange(tomorrowKey);
  const unitShort = String(session.user.unit || "").slice(0, 3).toUpperCase();

  const db = tenantDb(session.user.tenantId);

  const [totalHoje, totalHojeUnidade, vencendoHoje, vencendoAmanha] = await Promise.all([
    db.labelPrint.count({ where: { createdAt: { gte: todayRange.start, lte: todayRange.end } } }),
    db.labelPrint.count({ where: { createdAt: { gte: todayRange.start, lte: todayRange.end }, user: { unit: session.user.unit, tenantId: session.user.tenantId } } }),
    db.labelPrint.count({ where: { expiresAt: { gte: todayRange.start, lte: todayRange.end } } }),
    db.labelPrint.count({ where: { expiresAt: { gte: tomorrowRange.start, lte: tomorrowRange.end } } }),
  ]);

  return (
    <>
      <div className="grid grid-2">
        <div className="card" style={{ background: "#e9edf1" }}><h2 style={{ marginTop: 0 }}>Emitidas hoje</h2><p style={{ fontSize: 40, fontWeight: 700, margin: "8px 0" }}>{totalHoje}</p></div>
        <div className="card" style={{ background: "#e9edf1" }}><h2 style={{ marginTop: 0 }}>Emitidas hoje ({unitShort})</h2><p style={{ fontSize: 40, fontWeight: 700, margin: "8px 0" }}>{totalHojeUnidade}</p></div>
        <div className="card" style={{ background: "#f8d9dc" }}><h2 style={{ marginTop: 0 }}>Vencendo hoje</h2><p style={{ fontSize: 40, fontWeight: 700, margin: "8px 0" }}>{vencendoHoje}</p></div>
        <div className="card" style={{ background: "#fff3cd" }}><h2 style={{ marginTop: 0 }}>Vencendo amanhã</h2><p style={{ fontSize: 40, fontWeight: 700, margin: "8px 0" }}>{vencendoAmanha}</p></div>
      </div>
    </>
  );
}
