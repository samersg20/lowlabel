import { auth } from "@/lib/auth";
import { addDaysToDateKey, getSaoPauloDayRange, nowInSaoPauloDateKey } from "@/lib/date";
import { prisma } from "@/lib/prisma";

function HomeLogo() {
  return <img src="/img/Lowlogo.png" alt="Low BBQ" width={180} height={70} style={{ objectFit: "contain" }} />;
}

export default async function Home() {
  const session = await auth();

  if (!session?.user) {
    return (
      <div className="card" style={{ textAlign: "center" }}>
        <HomeLogo />
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
      <div className="card" style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <HomeLogo />
        <h1 style={{ margin: 0 }}>Bem-vindo, {session.user.name}!</h1>
      </div>
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
