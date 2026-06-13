import Image from "next/image";
import type { Metadata } from "next";

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
      {/* Left panel — brand */}
      <div className="hidden lg:flex flex-col bg-brand p-10 text-white relative overflow-hidden">
        {/* Subtle pattern overlay */}
        <div className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
            backgroundSize: "28px 28px",
          }}
        />
        <div className="relative z-10">
          <Image
            src="/logo.webp"
            alt="TAO"
            width={80}
            height={32}
            className="brightness-0 invert"
            priority
          />
        </div>
        <div className="relative z-10 mt-auto">
          <blockquote className="space-y-3">
            <p className="text-lg font-medium leading-relaxed opacity-95">
              &ldquo;Smarter hiring starts here. TAO Recruit AI automates the
              heavy lifting so your team can focus on finding the right people.&rdquo;
            </p>
            <footer className="text-sm opacity-70">TAO Recruit AI Platform</footer>
          </blockquote>
        </div>
      </div>

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
