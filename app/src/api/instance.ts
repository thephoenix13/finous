import { createMockApi } from "./mock";

/**
 * The app's one Api. Until the backend exists this is the mock, with a short delay so loading states are real.
 * Imported once, from main.tsx; tests build their own with createMockApi().
 */
export const api = createMockApi({ latencyMs: 250 });
