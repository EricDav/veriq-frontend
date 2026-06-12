'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

/**
 * Legacy callback path. Older/in-flight Paystack transactions may still be
 * configured with this URL as their callback. Forward straight to the
 * standalone /wallet/callback page (outside the dashboard auth-gated
 * layout), preserving the `reference`/`trxref` query params.
 */
function RedirectInner() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    const query = params.toString();
    router.replace(`/wallet/callback${query ? `?${query}` : ''}`);
  }, [params, router]);

  return null;
}

export default function LegacyWalletCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[50vh] flex items-center justify-center">
          <LoadingSpinner size="lg" className="text-veriq-secondary" />
        </div>
      }
    >
      <RedirectInner />
    </Suspense>
  );
}
