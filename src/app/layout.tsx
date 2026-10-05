import type { Metadata, Viewport } from "next";
import { DM_Sans } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-dm-sans",
});

export const metadata: Metadata = {
  title: "Green Grove Family Clinic",
  description:
    "Compassionate, whole-person primary care for every generation — chronic care, women's health, pediatrics, vaccinations, laboratory services, and same-day appointments.",
  applicationName: "Health Care Clinic",
  keywords: [
    "family clinic",
    "primary care",
    "pediatrics",
    "women's health",
    "vaccinations",
    "preventive care",
  ],
  openGraph: {
    title: "Green Grove Family Clinic",
    description:
      "Compassionate care that listens, explains, and supports you through every stage of life.",
    type: "website",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Critical for notched devices: lets the hero bleed into safe areas.
  viewportFit: "cover",
  themeColor: "#264a39",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body
        className={`${dmSans.variable} bg-background font-sans text-foreground antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
