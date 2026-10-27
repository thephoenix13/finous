import type { Messages } from "./locales/en";

// Makes t("nav.home") type-checked: a typo in a key is a compile error, not a blank label.
declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "translation";
    resources: { translation: Messages };
  }
}
