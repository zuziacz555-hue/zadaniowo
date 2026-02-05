import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";
import ThemeController from "@/components/layout/ThemeController";

const manrope = Manrope({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Zadaniowo - Twój Panel",
  description: "Panel zarządzania zespołami i wydarzeniami",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pl">
      <body className={`${manrope.variable} antialiased`}>
        <ThemeController />
        {children}
      </body>
    </html>
  );
}
