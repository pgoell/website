import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pascal's Website",
  description: "Blog and games",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
