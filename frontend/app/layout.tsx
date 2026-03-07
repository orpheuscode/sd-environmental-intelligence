import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SD Environmental Intelligence",
  description: "Real-time air, water, and contamination risk for San Diego — Claude Impact Lab 2026",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
