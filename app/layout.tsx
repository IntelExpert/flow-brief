import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Flow Brief",
  description: "Daily water industry editorial briefing workstation"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
