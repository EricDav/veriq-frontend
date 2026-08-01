'use client';

import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle } from 'lucide-react';

type GoogleCredentialResponse = { credential?: string };

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (options: { client_id: string; callback: (response: GoogleCredentialResponse) => void }) => void;
          renderButton: (element: HTMLElement, options: Record<string, unknown>) => void;
        };
      };
    };
  }
}

export function GoogleSignInButton({ onCredential, disabled = false }: {
  onCredential: (credential: string) => Promise<void>;
  disabled?: boolean;
}) {
  const target = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim();

  useEffect(() => {
    if (!clientId || disabled) return;
    const render = () => {
      if (!target.current || !window.google) return;
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: ({ credential }) => {
          if (!credential) return setError('Google did not return a valid credential.');
          setError(null);
          void onCredential(credential).catch((reason) => setError(reason instanceof Error ? reason.message : 'Google sign-in failed.'));
        },
      });
      target.current.replaceChildren();
      window.google.accounts.id.renderButton(target.current, {
        type: 'standard', theme: 'outline', size: 'large', text: 'continue_with', shape: 'rectangular',
        width: Math.min(336, target.current.clientWidth || 336),
      });
    };
    const existing = document.querySelector<HTMLScriptElement>('script[data-veriq-google]');
    if (existing) {
      if (window.google) render();
      else existing.addEventListener('load', render, { once: true });
      return () => existing.removeEventListener('load', render);
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.dataset.veriqGoogle = 'true';
    script.addEventListener('load', render, { once: true });
    script.addEventListener('error', () => setError('Unable to load Google sign-in.'), { once: true });
    document.head.appendChild(script);
    return () => script.removeEventListener('load', render);
  }, [clientId, disabled, onCredential]);

  if (!clientId) {
    return (
      <div className="space-y-2">
        <button
          type="button"
          onClick={() => setError('Google sign-in needs NEXT_PUBLIC_GOOGLE_CLIENT_ID to be configured.')}
          className="flex min-h-11 w-full items-center justify-center gap-3 rounded border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
          aria-describedby={error ? 'google-signin-config-error' : undefined}
        >
          <span aria-hidden="true" className="text-base font-bold text-blue-600">G</span>
          Continue with Google
        </button>
        {error && <p id="google-signin-config-error" role="alert" className="flex items-start gap-1 text-xs text-red-300"><AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />{error}</p>}
      </div>
    );
  }
  return (
    <div className="space-y-2">
      <div ref={target} className={disabled ? 'pointer-events-none opacity-60' : ''} />
      {error && <p className="flex items-center gap-1 text-xs text-red-300"><AlertCircle className="h-3.5 w-3.5" />{error}</p>}
    </div>
  );
}
