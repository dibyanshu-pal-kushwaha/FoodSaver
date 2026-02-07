import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ShareBite - Food Waste Management",
  description: "Comprehensive food waste management platform connecting restaurants with NGOs",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className="antialiased">{children}</body>
    </html>
  );
}

