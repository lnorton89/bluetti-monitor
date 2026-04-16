import { create } from 'zustand';
import type { AppRouteId } from '../lib/routes';

interface ShellStore {
  routeId: AppRouteId | null;
  value: string;
  setRouteSignal: (routeId: AppRouteId, value: string) => void;
  resetRouteSignal: (routeId?: AppRouteId) => void;
}

export const useShellStore = create<ShellStore>((set) => ({
  routeId: null,
  value: '',

  setRouteSignal(routeId, value) {
    set({ routeId, value });
  },

  resetRouteSignal(routeId) {
    set((state) => {
      if (routeId && state.routeId !== routeId) {
        return state;
      }

      return {
        routeId: null,
        value: '',
      };
    });
  },
}));
