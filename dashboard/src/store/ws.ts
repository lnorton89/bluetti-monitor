import { create } from 'zustand';
import type { AllState } from '../lib/api';
import { WS_URL } from '../lib/api';

interface LiveUpdate {
  device: string;
  field:  string;
  value:  string;
  ts:     string;
}

interface WsStore {
  state:     AllState;
  connected: boolean;
  lastUpdate: string | null;
  connect:   () => void;
  disconnect: () => void;
  _ws:       WebSocket | null;
}

export const useWsStore = create<WsStore>((set, get) => ({
  state:      {},
  connected:  false,
  lastUpdate: null,
  _ws:        null,

  connect() {
    if (get()._ws) return;
    const ws = new WebSocket(WS_URL);

    ws.onopen = () => set({ connected: true });
    ws.onclose = () => {
      set({ connected: false, _ws: null });
      // Reconnect after 3s
      setTimeout(() => get().connect(), 3000);
    };

    ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);

      if (msg.type === 'snapshot') {
        set({ state: msg.data });
        return;
      }

      const update = msg as LiveUpdate;
      set(s => ({
        lastUpdate: update.ts,
        state: {
          ...s.state,
          [update.device]: {
            ...s.state[update.device],
            [update.field]: { value: update.value, ts: update.ts },
          },
        },
      }));
    };

    set({ _ws: ws });
  },

  disconnect() {
    get()._ws?.close();
    set({ _ws: null, connected: false });
  },
}));
