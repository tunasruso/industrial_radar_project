import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Промышленный Радар | Лабораторные Технологии",
  description: "Система поиска и анализа изделий для импортозамещения. Bürkle, Hamilton, Swagelok аналоги.",
  keywords: ["импортозамещение", "лабораторное оборудование", "пробоотборники", "Bürkle"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className="dark">
      <body className={`${inter.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
