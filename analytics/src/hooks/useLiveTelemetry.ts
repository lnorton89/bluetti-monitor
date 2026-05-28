import { useEffect, useState } from 'react';
import {
  IS_MOCK_MODE,
  IS_STATIC_ANALYTICS,
  WS_URL,
  mockState,
  type AllState,
  type LiveUpdate,
  type WsMessage,
} from '../lib/api';

export function useLiveTelemetry() {
  const [state, setState] = useState<AllState>(() => (IS_MOCK_MODE ? mockState : {}));
  const [connected, setConnected] = useState(IS_MOCK_MODE && !IS_STATIC_ANALYTICS);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);

  useEffect(() => {
    if (IS_STATIC_ANALYTICS) {
      setState({});
      setConnected(false);
      setLastUpdate(null);
      return undefined;
    }

    if (IS_MOCK_MODE) {
      setState(mockState);
      setConnected(true);
      setLastUpdate(new Date().toISOString());
      return undefined;
    }

    let closedByEffect = false;
    let reconnectTimer: number | null = null;
    let frameTimer: number | null = null;
    let pendingLastUpdate: string | null = null;
    const pendingUpdates = new Map<string, LiveUpdate>();
    let ws: WebSocket | null = null;

    const flushPendingUpdates = () => {
      frameTimer = null;
      if (pendingUpdates.size === 0) {
        return;
      }

      const updates = [...pendingUpdates.values()];
      pendingUpdates.clear();
      const nextLastUpdate = pendingLastUpdate;
      pendingLastUpdate = null;

      if (nextLastUpdate) {
        setLastUpdate(nextLastUpdate);
      }
      setState((current) => {
        let next = current;
        for (const update of updates) {
          next = {
            ...next,
            [update.device]: {
              ...(next[update.device] ?? {}),
              [update.field]: { value: update.value, ts: update.ts },
            },
          };
        }
        return next;
      });
    };

    const scheduleTelemetryFlush = () => {
      if (frameTimer !== null) {
        return;
      }
      frameTimer = window.setTimeout(flushPendingUpdates, 100);
    };

    const connect = () => {
      ws = new WebSocket(WS_URL);
      ws.onopen = () => setConnected(true);
      ws.onclose = () => {
        setConnected(false);
        if (!closedByEffect) {
          reconnectTimer = window.setTimeout(connect, 3_000);
        }
      };
      ws.onmessage = (event) => {
        const message = JSON.parse(event.data) as WsMessage;
        if ('type' in message && message.type === 'snapshot') {
          setState(message.data);
          return;
        }

        const update = message as LiveUpdate;
        pendingLastUpdate = update.ts;
        pendingUpdates.set(`${update.device}:${update.field}`, update);
        scheduleTelemetryFlush();
      };
    };

    connect();

    return () => {
      closedByEffect = true;
      if (reconnectTimer !== null) {
        window.clearTimeout(reconnectTimer);
      }
      if (frameTimer !== null) {
        window.clearTimeout(frameTimer);
      }
      ws?.close();
    };
  }, []);

  return { state, connected, lastUpdate };
}
