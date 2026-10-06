import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Von Neumann · Dashboard",
  description: "A dashboard that evolves with your questions.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
