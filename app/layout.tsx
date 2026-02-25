import "./globals.css";
import { Nav } from "@/components/Nav";
import { Providers } from "@/components/Providers";

export const metadata = {
  title: "Etiketi",
  description: "Etiquetas de segurança alimentar",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head><meta charSet="UTF-8" /></head>
      <body>
        <Providers>
          <div className="container">
            <Nav />
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}
