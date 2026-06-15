'use client';

import React, { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

export function InstallPrompt() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [manual, setManual] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem('veriq_install_prompt_dismissed') === '1';
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone;
    setInstalled(Boolean(isStandalone));

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as BeforeInstallPromptEvent);
      if (!dismissed) setVisible(true);
    };

    const onOpenInstallPrompt = () => {
      localStorage.removeItem('veriq_install_prompt_dismissed');
      setManual(!promptEvent);
      setVisible(true);
    };

    const onAppInstalled = () => {
      setInstalled(true);
      setVisible(false);
      setPromptEvent(null);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('veriq:open-install-prompt', onOpenInstallPrompt);
    window.addEventListener('appinstalled', onAppInstalled);

    const isIos = /iphone|ipad|ipod/i.test(window.navigator.userAgent);
    if (!dismissed && isIos && !isStandalone) {
      setManual(true);
      setVisible(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('veriq:open-install-prompt', onOpenInstallPrompt);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, [promptEvent]);

  const dismiss = () => {
    localStorage.setItem('veriq_install_prompt_dismissed', '1');
    setVisible(false);
  };

  const install = async () => {
    if (!promptEvent) {
      setManual(true);
      return;
    }

    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    if (choice.outcome === 'accepted') setVisible(false);
    setPromptEvent(null);
  };

  if (!visible || installed) return null;

  return (
    <div className="fixed inset-x-3 bottom-3 z-[70] rounded-xl border border-slate-200 bg-white p-4 shadow-card-hover sm:left-auto sm:right-4 sm:max-w-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-veriq-secondary/10 text-veriq-secondary">
          <Download className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-navy-900">Add Veriq to your home screen</p>
          <p className="mt-1 text-xs leading-relaxed text-veriq-muted">
            {manual
              ? 'Use your browser menu and choose Add to Home Screen or Install app.'
              : 'Install the app for faster access, full-screen browsing, and a mobile app feel.'}
          </p>
          <div className="mt-3 flex gap-2">
            {!manual && (
              <button type="button" onClick={install} className="btn-primary !px-4 !py-2 !text-xs">
                Add to Home
              </button>
            )}
            <button type="button" onClick={dismiss} className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600">
              Later
            </button>
          </div>
        </div>
        <button type="button" onClick={dismiss} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
