import MagicPrint from "@/components/MagicPrint";
import { auth } from "@/lib/auth";

export default async function PrintMagicPage() {
  const session = await auth();
  const unitId = session?.user?.unit ? String(session.user.unit) : "";
  return (
    <>
      <h1>Impressão Mágica</h1>
      <p>Digite ou fale seu pedido. Revise a prévia antes de imprimir.</p>
      <MagicPrint unitId={unitId} />
    </>
  );
}
