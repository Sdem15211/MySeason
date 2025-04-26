import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { Navbar } from "@/components/layout/navbar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "MySeason",
  description: "AI Personal Color Analysis App",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.className} antialiased flex flex-col min-h-screen`}
      >
        <div className="fixed inset-0 -z-10 bg-gradient-to-t from-[rgb(244,130,87,0.2)] to-[rgb(255,255,255,0)]" />
        <header>
          <Navbar />
        </header>
        <main className="flex-grow">{children}</main>
        <Toaster />
      </body>
    </html>
  );
}
