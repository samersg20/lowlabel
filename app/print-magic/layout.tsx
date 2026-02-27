import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Impressão Mágica",
};

export default function PrintMagicLayout({ children }: { children: React.ReactNode }) {
  return children;
}
