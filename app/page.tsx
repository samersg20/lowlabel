import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function todayRange() {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

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

  const { start, end } = todayRange();

  const [totalHoje, totalHojeUnidade] = await Promise.all([
    prisma.labelPrint.count({
      where: {
        createdAt: { gte: start, lte: end },
      },
    }),
    prisma.labelPrint.count({
      where: {
        createdAt: { gte: start, lte: end },
        user: { unit: session.user.unit },
      },
    }),
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
    </>
  );
}
