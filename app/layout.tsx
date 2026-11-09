import type { Metadata } from "next";
import "./globals.css";
export const metadata:Metadata={title:"Sheep Palpites | Inteligência em handicaps",description:"Plataforma de análise estatística focada em handicaps esportivos."};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="pt-BR"><body>{children}</body></html>}
