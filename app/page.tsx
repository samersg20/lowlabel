import { auth } from "@/lib/auth";
import { addDaysToDateKey, getSaoPauloDayRange, nowInSaoPauloDateKey } from "@/lib/date";
import { prisma } from "@/lib/prisma";

export default async function Home() {
  const session = await auth();

  if (!session?.user) {
    return (
      <div className="card">
        <h1>Bem-vindo ao Emissor Etiquetas Low</h1>
        <p>Faça login para acessar o sistema.</p>
      </div>
    );
  }

  const todayKey = nowInSaoPauloDateKey();
  const tomorrowKey = addDaysToDateKey(todayKey, 1);

  const todayRange = getSaoPauloDayRange(todayKey);
  const tomorrowRange = getSaoPauloDayRange(tomorrowKey);

  const [
    totalHoje,
    totalHojeUnidade,
    vencendoHoje,
    vencendoAmanha,
  ] = await Promise.all([
    prisma.labelPrint.count({ where: { createdAt: { gte: todayRange.start, lte: todayRange.end } } }),
    prisma.labelPrint.count({
      where: {
        createdAt: { gte: todayRange.start, lte: todayRange.end },
        user: { unit: session.user.unit },
      },
    }),
    prisma.labelPrint.count({ where: { expiresAt: { gte: todayRange.start, lte: todayRange.end } } }),
    prisma.labelPrint.count({ where: { expiresAt: { gte: tomorrowRange.start, lte: tomorrowRange.end } } }),
  ]);

  return (
    <>
      <h1>Bem-vindo, {session.user.name}!</h1>
      <div className="card grid grid-2">
        <div>
          <h2 style={{ marginTop: 0 }}>Etiquetas emitidas hoje (geral)</h2>
          <p style={{ fontSize: 40, fontWeight: 700, margin: "8px 0" }}>{totalHoje}</p>
        </div>
        <div>
          <h2 style={{ marginTop: 0 }}>Etiquetas emitidas hoje ({session.user.unit})</h2>
          <p style={{ fontSize: 40, fontWeight: 700, margin: "8px 0" }}>{totalHojeUnidade}</p>
        </div>
      </div>
      <div className="card grid grid-2">
        <div>
          <h2 style={{ marginTop: 0 }}>Etiquetas vencendo hoje</h2>
          <p style={{ fontSize: 40, fontWeight: 700, margin: "8px 0" }}>{vencendoHoje}</p>
        </div>
        <div>
          <h2 style={{ marginTop: 0 }}>Etiquetas vencendo amanhã</h2>
          <p style={{ fontSize: 40, fontWeight: 700, margin: "8px 0" }}>{vencendoAmanha}</p>
        </div>
      </div>
    </>
  );
}
