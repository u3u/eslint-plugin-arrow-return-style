import type { Options as PrettierOptions } from "prettier";
import { runAsWorker } from "synckit";

interface ConfigResult {
	config: Record<string, any>;
	success: true;
}

interface ErrorResult {
	error: string;
	success: false;
}

interface FormatRequest {
	code: string;
	configOverride?: PrettierOptions;
	filePath?: string;
	type: "format";
}

interface FormatResult {
	formatted: string;
	isMultiline: boolean;
	lineLength: number;
	success: true;
}

interface ResolveConfigRequest {
	filePath?: string;
	type: "resolveConfig";
}

type WorkerRequest = FormatRequest | ResolveConfigRequest;

type WorkerResult = ConfigResult | ErrorResult | FormatResult;

let prettier: typeof import("prettier") | undefined;
let prettierLoadAttempted = false;

/**
 * Handles format request type.
 *
 * @param request - The format request to process.
 * @returns Promise resolving to format result.
 */
async function handleFormatRequest(request: FormatRequest): Promise<FormatResult> {
	if (!prettier) {
		throw new Error("Prettier not loaded");
	}

	let config = await prettier.resolveConfig(request.filePath ?? "package.json", {
		editorconfig: true,
	});

	// Override with provided config if available
	if (request.configOverride) {
		config = { ...config, ...request.configOverride };
	}

	const formatted = await prettier.format(request.code, {
		...config,
		filepath: request.filePath,
	});

	const lines = formatted.trim().split("\n");
	const isMultiline = lines.length > 1;
	const lineLength = lines[0]?.length ?? 0;

	return {
		formatted: formatted.trim(),
		isMultiline,
		lineLength,
		success: true,
	};
}

/**
 * Handles resolveConfig request type.
 *
 * @param request - The resolve config request to process.
 * @returns Promise resolving to config result.
 */
async function handleResolveConfigRequest(request: ResolveConfigRequest): Promise<ConfigResult> {
	if (!prettier) {
		throw new Error("Prettier not loaded");
	}

	const config = await prettier.resolveConfig(request.filePath ?? "package.json", {
		editorconfig: true,
	});

	return {
		config: config ?? {},
		success: true,
	};
}

/**
 * Loads prettier module dynamically.
 *
 * @returns Promise resolving to boolean indicating if prettier was loaded
 *   successfully.
 */
async function loadPrettier(): Promise<boolean> {
	if (prettierLoadAttempted) {
		return prettier !== undefined;
	}

	prettierLoadAttempted = true;

	try {
		prettier = await import("prettier");
		return true;
	} catch {
		return false;
	}
}

runAsWorker(async (request: WorkerRequest): Promise<WorkerResult> => {
	try {
		const loaded = await loadPrettier();
		if (!loaded || !prettier) {
			return {
				error: "Prettier not available",
				success: false,
			};
		}

		if (request.type === "format") {
			return await handleFormatRequest(request);
		}

		return await handleResolveConfigRequest(request);
	} catch (err) {
		return {
			error: err instanceof Error ? err.message : "Prettier operation failed",
			success: false,
		};
	}
});
