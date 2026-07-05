import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Lottery",
  description:
    "Loterías online con premio único: compra tu número, espera el sorteo y recibe el premio por transferencia.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-zinc-950 text-zinc-100 font-[family-name:var(--font-geist-sans)]">
        <Navbar />
        <main className="flex-1">
          <div className="max-w-6xl mx-auto px-6 py-10">{children}</div>
        </main>
        <Footer />
      </body>
    </html>
  );
}
