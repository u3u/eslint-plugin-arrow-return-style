import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		exclude: [
			"**/node_modules/**",
			"**/dist/**",
			"**/fixtures/integration/**/*.{js,jsx,ts,tsx,mjs}",
		],
		reporters: "dot",
		testTimeout: 30000,
	},
});
