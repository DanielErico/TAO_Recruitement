import type { Metadata } from "next";
import Image from "next/image";
import { AuthCarousel } from "@/components/shared/AuthCarousel";

export const metadata: Metadata = {
  title: "Sign In",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left panel — premium auto-playing animated brand carousel */}
      <AuthCarousel />

      {/* Right panel — form */}
      <div className="flex flex-col items-center justify-center p-8 lg:p-12">
        {/* Mobile logo */}
        <div className="lg:hidden mb-8">
          <Image src="/logo.webp" alt="TAO" width={72} height={28} priority />
        </div>
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}
