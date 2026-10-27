/**
 * Stand-in for `virtual:pwa-register/react`, which only exists inside the vite-plugin-pwa build.
 * vitest.config.ts aliases the virtual module here; tests that care about the update flow vi.mock() it.
 */
export function useRegisterSW() {
  return {
    needRefresh: [false, () => {}] as const,
    offlineReady: [false, () => {}] as const,
    updateServiceWorker: async () => {},
  };
}
