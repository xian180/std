import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Brightcode Institute | Student Portal & Project Showcase",
  description:
    "Premium computer training institute portal — explore student projects and manage academic progress.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#060b18] text-[#e7ecf7] antialiased">{children}</body>
    </html>
  );
}
