import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ProtectCRM — Gestão Comercial com WhatsApp",
  description: "CRM profissional com integração WhatsApp via Evolution API para equipes comerciais",
  keywords: "CRM, WhatsApp, Gestão Comercial, Leads, Pipeline",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={inter.className}>{children}</body>
    </html>
  );
}
