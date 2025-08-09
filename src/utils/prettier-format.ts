import type { TSESLint } from "@typescript-eslint/utils";

import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Options as PrettierOptions } from "prettier";
import { createSyncFn } from "synckit";

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

interface PrettierFormatResult {
	error?: string;
	formatted: string;
	isMultiline: boolean;
	lineLength: number;
}

interface ResolveConfigRequest {
	filePath?: string;
	type: "resolveConfig";
}

type WorkerRequest = FormatRequest | ResolveConfigRequest;

type WorkerResult = ConfigResult | ErrorResult | FormatResult;

const currentFilename = fileURLToPath(import.meta.url);
const currentDirname = dirname(currentFilename);

const workerPath =
	process.env.PRETTIER_WORKER_PATH !== undefined && process.env.PRETTIER_WORKER_PATH !== ""
		? resolve(process.env.PRETTIER_WORKER_PATH)
		: resolve(currentDirname, "../workers/prettier-worker.ts");

const prettierWorkerSync = createSyncFn(workerPath) as (request: WorkerRequest) => WorkerResult;

const formatCache = new Map<string, PrettierFormatResult>();

export function formatWithPrettier(
	code: string,
	context: TSESLint.RuleContext<any, any>,
	configOverride?: PrettierOptions,
): PrettierFormatResult {
	const filePath = context.physicalFilename || context.filename || "file.ts";
	const configKey = configOverride ? JSON.stringify(configOverride) : "";
	const cacheKey = `${code}:${filePath}:${configKey}`;

	const cached = formatCache.get(cacheKey);
	if (cached) {
		return cached;
	}

	try {
		const workerResult = prettierWorkerSync({
			code,
			configOverride,
			filePath,
			type: "format",
		});

		const result = processWorkerResult(workerResult, code);
		formatCache.set(cacheKey, result);
		return result;
	} catch (err) {
		const result = handleFormattingError(err, code);
		formatCache.set(cacheKey, result);
		return result;
	}
}

/**
 * Checks if Prettier integration is available.
 *
 * @returns True if Prettier is available, false otherwise.
 */
export function isPrettierAvailable(): boolean {
	try {
		const result = prettierWorkerSync({
			filePath: "package.json",
			type: "resolveConfig",
		});
		return result.success;
	} catch {
		return false;
	}
}

/**
 * Resolve Prettier configuration options for the project.
 *
 * @param filePath - The file path to resolve config for.
 * @returns The Prettier configuration options, or an empty object if none
 *   found.
 */
export function resolvePrettierConfigOptions(filePath = "package.json"): Record<string, any> {
	try {
		const result = prettierWorkerSync({
			filePath,
			type: "resolveConfig",
		});
		return result.success && "config" in result ? result.config : {};
	} catch {
		return {};
	}
}

/**
 * Creates a fallback result when Prettier formatting fails.
 *
 * @param code - The code to format.
 * @param error - Optional error message.
 * @returns Formatting result with line length and multiline info.
 */
function createFallbackResult(code: string, error?: string): PrettierFormatResult {
	return {
		error,
		formatted: code,
		isMultiline: code.includes("\n"),
		lineLength: code.replace(/\n.*$/s, "").length,
	};
}

/**
 * Handles errors during prettier formatting and returns fallback result.
 *
 * @param err - The error that occurred.
 * @param code - The original code to format.
 * @returns Fallback result with error information.
 */
function handleFormattingError(err: unknown, code: string): PrettierFormatResult {
	const errorMessage =
		err instanceof Error ? `Worker error: ${err.message}` : "Worker communication failed";
	return createFallbackResult(code, errorMessage);
}

/**
 * Processes worker result and returns a PrettierFormatResult.
 *
 * @param workerResult - The result from the prettier worker.
 * @param code - The original code that was formatted.
 * @returns Processed format result.
 */
function processWorkerResult(workerResult: WorkerResult, code: string): PrettierFormatResult {
	if (workerResult.success && "formatted" in workerResult) {
		return {
			formatted: workerResult.formatted,
			isMultiline: workerResult.isMultiline,
			lineLength: workerResult.lineLength,
		};
	}

	const errorMessage = workerResult.success ? "Invalid worker response" : workerResult.error;
	return createFallbackResult(code, errorMessage);
}
