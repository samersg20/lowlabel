import { Suspense } from "react";
import { ResetPasswordForm } from "./ResetPasswordForm";

export default function ResetPasswordPage() {
  return (
    <div className="card" style={{ maxWidth: 460, margin: "40px auto" }}>
      <h1>Redefinir senha</h1>
      <Suspense fallback={<p>Carregando...</p>}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
