import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rugby Team Manager",
  description: "Scheduling and availability for parents and coaches",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
