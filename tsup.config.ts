// cspell:ignore publint
import { defineConfig } from "tsdown";

export default defineConfig({
	clean: true,
	entry: ["src/index.ts"],
	external: ["@typescript-eslint/utils", "@typescript-eslint/type-utils", "typescript"],
	fixedExtension: true,
	format: ["esm"],
	noExternal: ["ts-api-utils"],
	onSuccess() {
		console.info("🙏 Build succeeded!");
	},
	publint: true,
	shims: true,
	unused: {
		level: "error",
	},
});
