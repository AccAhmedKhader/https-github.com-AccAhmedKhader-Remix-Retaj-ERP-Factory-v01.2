import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    alias: {
      "@": path.resolve(__dirname, "."),
    },
    env: {
      NODE_ENV: "test",
      VITEST: "true",
      JWT_SECRET: "GENERATE_A_SECURE_RANDOM_BASE64_KEY_DO_NOT_USE_THIS_PLACEHOLDER_key_1",
      JWT_REFRESH_SECRET: "GENERATE_A_SECURE_RANDOM_BASE64_KEY_DO_NOT_USE_THIS_PLACEHOLDER_key_2",
      AUDIT_SIGNING_SECRET: "GENERATE_A_SECURE_RANDOM_BASE64_KEY_DO_NOT_USE_THIS_PLACEHOLDER_key_3",
      MASTER_ENCRYPTION_KEY: "GENERATE_A_SECURE_RANDOM_BASE64_KEY_DO_NOT_USE_THIS_PLACEHOLDER_key_4",
      STORAGE_ENCRYPTION_KEY: "GENERATE_A_SECURE_RANDOM_BASE64_KEY_DO_NOT_USE_THIS_PLACEHOLDER_key_5",
    },
    exclude: [
      "node_modules/**",
      "dist/**",
      "src/core/database/tests/**",
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/**",
        "dist/**",
        "src/core/database/tests/**",
        "**/*.d.ts",
        "**/*.config.*",
      ],
    },
  },
});
