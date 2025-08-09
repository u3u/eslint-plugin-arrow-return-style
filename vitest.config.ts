import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		env: {
			PRETTIER_WORKER_PATH: resolve("workers/prettier-worker.ts"),
		},
		exclude: [
			"**/node_modules/**",
			"**/dist/**",
			"**/fixtures/integration/**/*.{js,jsx,ts,tsx,mjs}",
		],
		reporters: "dot",
		testTimeout: 30000,
	},
});
