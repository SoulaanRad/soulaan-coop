import type { ConfigContext, ExpoConfig } from "@expo/config";

import { env } from "./env";

void env;

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  extra: {
    ...config.extra,
    apiBaseUrl: env.EXPO_PUBLIC_API_BASE_URL,
  },
});
