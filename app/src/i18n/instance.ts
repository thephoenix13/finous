import { createI18n } from "./index";

/** The app's one instance. Imported once, from main.tsx; tests build their own with createI18n(). */
export const i18n = createI18n();
