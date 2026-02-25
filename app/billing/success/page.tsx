import Link from "next/link";

export default function BillingSuccessPage() {
  return (
    <div className="card" style={{ maxWidth: 560, margin: "40px auto", textAlign: "center" }}>
      <h1>Assinatura iniciada ✅</h1>
      <p>Recebemos seu pagamento. Seu acesso será liberado após confirmação do webhook.</p>
      <p style={{ marginTop: 12 }}>
        <Link href="/login">Voltar para login</Link>
      </p>
    </div>
  );
}
