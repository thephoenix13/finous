import type { Api, HealthScore, RequestOptions } from "../api";

/** Both health screens read the same thing; one stable function, so each loads it once. */
export const loadHealth = (api: Api, options: RequestOptions): Promise<HealthScore> => api.getHealthScore(options);
