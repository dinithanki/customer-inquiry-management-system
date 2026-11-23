
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["dotenv/config"],

    // Integration tests communicate with a remote Neon database.
    // Allow enough time for database queries and password hashing.
    testTimeout: 20000,

    // Allow additional time for cleanup operations.
    hookTimeout: 20000,

    // Run test files sequentially to reduce contention on Neon.
    fileParallelism: false,
  },
});
