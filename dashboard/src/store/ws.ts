import { create } from 'zustand';
import type { AllState } from '../lib/api';
import { IS_MOCK_MODE, WS_URL } from '../lib/api';
import { mockState } from '../lib/mock';

interface LiveUpdate {
  device: string;
  field: string;
  value: string;
  ts: string;
}

interface WsStore {
  state: AllState;
  connected: boolean;
  lastUpdate: string | null;
  connect: () => void;
  disconnect: () => void;
  _ws: WebSocket | null;
}

type WsStoreSetter = (
  partial: Partial<WsStore> | ((state: WsStore) => Partial<WsStore>),
  replace?: false,
) => void;

const THROTTLE_MS = 100;
let reconnectTimer: number | null = null;
let flushTimer: number | null = null;
const pendingUpdates = new Map<string, LiveUpdate>();

function clearFlushTimer() {
  if (flushTimer !== null) {
    window.clearTimeout(flushTimer);
    flushTimer = null;
  }
}

function queueUpdate(update: LiveUpdate, set: WsStoreSetter) {
  pendingUpdates.set(`${update.device}:${update.field}`, update);

  if (flushTimer !== null) {
    return;
  }

  flushTimer = window.setTimeout(() => {
    flushTimer = null;

    if (pendingUpdates.size === 0) {
      return;
    }

    const updates = [...pendingUpdates.values()];
    pendingUpdates.clear();

    set((s) => {
      const nextState = { ...s.state };
      let newestTs = s.lastUpdate;

      for (const item of updates) {
        newestTs = newestTs === null || item.ts > newestTs ? item.ts : newestTs;
        nextState[item.device] = {
          ...(nextState[item.device] ?? {}),
          [item.field]: { value: item.value, ts: item.ts },
        };
      }

      return {
        lastUpdate: newestTs,
        state: nextState,
      };
    });
  }, THROTTLE_MS);
}

export const useWsStore = create<WsStore>((set, get) => ({
  state: IS_MOCK_MODE ? mockState : {},
  connected: IS_MOCK_MODE,
  lastUpdate: null,
  _ws: null,

  connect() {
    if (get()._ws) return;

    if (IS_MOCK_MODE) {
      set({ state: mockState, connected: true });
      return;
    }

    const ws = new WebSocket(WS_URL);

    ws.onopen = () => set({ connected: true });
    ws.onclose = () => {
      set({ connected: false, _ws: null });

      if (reconnectTimer !== null) {
        window.clearTimeout(reconnectTimer);
      }

      reconnectTimer = window.setTimeout(() => get().connect(), 3000);
    };

    ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);

      if (msg.type === 'snapshot') {
        pendingUpdates.clear();
        clearFlushTimer();
        set({ state: msg.data });
        return;
      }

      queueUpdate(msg as LiveUpdate, set);
    };

    set({ _ws: ws });
  },

  disconnect() {
    if (reconnectTimer !== null) {
      window.clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }

    pendingUpdates.clear();
    clearFlushTimer();

    get()._ws?.close();
    set({ _ws: null, connected: false });
  },
}));
