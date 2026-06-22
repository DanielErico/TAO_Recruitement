import type { Metadata } from "next";
import "./globals.css";
import { NavigationProgress } from "@/components/shared/NavigationProgress";

export const metadata: Metadata = {
  title: {
    template: "%s | TAO Recruit AI",
    default: "TAO Recruit AI",
  },
  description:
    "AI-powered recruitment platform — automate candidate screening, assessment, and reporting while keeping recruiters in control.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased" suppressHydrationWarning>
        <NavigationProgress />
        {children}
      </body>
    </html>
  );
}

