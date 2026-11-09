import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Sheep Palpites | Inteligência em handicaps",
  description: "Análises estatísticas de futebol com foco em handicaps asiáticos."
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
