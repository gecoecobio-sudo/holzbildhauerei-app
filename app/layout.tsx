import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Holzbildhauerei Wissen - Entdecke hochwertige Ressourcen",
  description: "Eine kuratierte Plattform für hochwertige Artikel, Tutorials und Ressourcen rund um Holzbildhauerei und Holzhandwerk.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
