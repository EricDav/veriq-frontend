import type { PendingUnlockCheckout } from '@/types/renter';

const STORAGE_KEY = 'veriq:pending-unlock-checkout';

/** Remembers the checkout before leaving for the payment page so the callback can confirm the right unlock. */
export function savePendingCheckout(checkout: Omit<PendingUnlockCheckout, 'savedAt'>) {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ ...checkout, savedAt: new Date().toISOString() }));
  } catch {
    // Storage can be unavailable (private mode); the callback falls back to Unlock History lookup.
  }
}

export function readPendingCheckout(): PendingUnlockCheckout | null {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PendingUnlockCheckout>;
    if (!parsed.unlockId || !parsed.reference || !parsed.targetType || !parsed.targetId) return null;
    return {
      unlockId: parsed.unlockId,
      reference: parsed.reference,
      targetType: parsed.targetType,
      targetId: parsed.targetId,
      returnPath: parsed.returnPath ?? '',
      savedAt: parsed.savedAt ?? '',
    };
  } catch {
    return null;
  }
}

export function clearPendingCheckout() {
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to clear when storage is unavailable.
  }
}
