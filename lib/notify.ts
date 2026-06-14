'use client';

let audioContext: AudioContext | null = null;

export function playChatSound() {
  try {
    audioContext = audioContext ?? new AudioContext();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(740, audioContext.currentTime);
    oscillator.frequency.setValueAtTime(520, audioContext.currentTime + 0.08);
    gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.16, audioContext.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.18);

    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.2);
  } catch {
    // Browsers may block sound until user interaction.
  }
}

export function canUseNotifications() {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export async function requestNotificationPermission() {
  if (!canUseNotifications()) return 'unsupported';
  return Notification.requestPermission();
}

export function showChatNotification(title: string, body: string, url = '/dashboard/chat') {
  if (!canUseNotifications() || Notification.permission !== 'granted') return;
  const notification = new Notification(title, {
    body,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    data: { url },
  });
  notification.onclick = () => {
    window.focus();
    window.location.href = url;
  };
}
