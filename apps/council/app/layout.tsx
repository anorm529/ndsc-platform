import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NDSC Council",
  description: "North Down Softball Club — Council Dashboard",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-background text-foreground antialiased">{children}</body>
    </html>
  );
}
