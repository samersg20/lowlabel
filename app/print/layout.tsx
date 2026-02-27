import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Impressão Tradicional",
};

export default function PrintLayout({ children }: { children: React.ReactNode }) {
  return children;
}
