import Link from "next/link";
import { WifiOff, Shield } from "lucide-react";

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-hero-pattern flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="h-20 w-20 rounded-3xl bg-white/10 border border-white/20 flex items-center justify-center mx-auto mb-6">
          <WifiOff className="h-10 w-10 text-white/60" />
        </div>
        <h1 className="font-display text-3xl font-bold text-white mb-3">You&apos;re offline</h1>
        <p className="text-white/60 text-base mb-8">
          No internet connection detected. Some features may be unavailable until you reconnect.
        </p>
        <div className="flex flex-col gap-3">
          <Link href="/" className="inline-flex items-center justify-center gap-2 rounded-xl bg-gold-gradient px-6 py-3 text-sm font-bold text-navy-900">
            <Shield className="h-4 w-4" />
            Try Reconnecting
          </Link>
        </div>
      </div>
    </div>
  );
}
