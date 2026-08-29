import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "StaySync",
  description: "A calm, connected workspace for hotel operations teams.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
