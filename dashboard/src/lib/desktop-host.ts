type DesktopHostBridge = (message: unknown) => void;

function getDesktopHostBridge(): DesktopHostBridge | null {
  const bridge = (window as Window & {
    __electrobunSendToHost?: DesktopHostBridge;
  }).__electrobunSendToHost;

  return typeof bridge === 'function' ? bridge : null;
}

export function isDesktopHostAvailable() {
  return typeof window !== 'undefined' && getDesktopHostBridge() !== null;
}

export function sendToDesktopHost(message: unknown) {
  const bridge = typeof window === 'undefined' ? null : getDesktopHostBridge();

  if (bridge === null) {
    return false;
  }

  bridge(message);
  return true;
}
