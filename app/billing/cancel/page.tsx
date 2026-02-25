import Link from "next/link";

export default function BillingCancelPage() {
  return (
    <div className="card" style={{ maxWidth: 560, margin: "40px auto", textAlign: "center" }}>
      <h1>Pagamento cancelado</h1>
      <p>Você pode tentar novamente quando quiser.</p>
      <p style={{ marginTop: 12 }}>
        <Link href="/login">Voltar para login</Link>
      </p>
    </div>
  );
}
