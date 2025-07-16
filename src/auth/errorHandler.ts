import type { Request } from "@cloudflare/workers-types";

export interface AuthError {
	code: number;
	message: string;
	error?: string;
}

export interface ErrorInfo {
	statusCode: number;
	errorType: string;
	message: string;
}

/**
 * Creates a proper 401 response with WWW-Authenticate header
 */
export function createAuthErrorResponse(error: AuthError): Response {
	const headers = new Headers({
		"Content-Type": "application/json",
		"WWW-Authenticate": `Bearer realm="MicroFn MCP Server", error="${error.error || "invalid_token"}", error_description="${error.message}"`,
	});

	// For SSE endpoints, we need to handle this differently
	// SSE expects a stream, so we send an error event
	if (error.error === "sse_auth_failed") {
		headers.set("Content-Type", "text/event-stream");
		headers.set("Cache-Control", "no-cache");
		headers.set("Connection", "keep-alive");

		const errorEvent = `event: error\ndata: ${JSON.stringify({
			error: "Authentication failed",
			message: error.message,
			code: 401,
		})}\n\n`;

		return new Response(errorEvent, {
			status: 401,
			headers,
		});
	}

	return new Response(
		JSON.stringify({
			error: error.error || "invalid_token",
			error_description: error.message,
			code: error.code,
		}),
		{
			status: error.code,
			headers,
		},
	);
}

/**
 * Creates a generic error response based on request type
 */
export function createErrorResponse(request: Request, errorInfo: ErrorInfo): Response {
	const isSSE = request.headers.get("Accept")?.includes("text/event-stream");

	if (isSSE) {
		const headers = new Headers({
			"Content-Type": "text/event-stream",
			"Cache-Control": "no-cache",
			Connection: "keep-alive",
		});

		const errorEvent = `event: error\ndata: ${JSON.stringify({
			error: errorInfo.errorType,
			message: errorInfo.message,
			code: errorInfo.statusCode,
		})}\n\n`;

		return new Response(errorEvent, {
			status: errorInfo.statusCode,
			headers,
		});
	}

	// For regular HTTP requests, return JSON error
	return new Response(
		JSON.stringify({
			error: errorInfo.errorType,
			error_description: errorInfo.message,
			code: errorInfo.statusCode,
		}),
		{
			status: errorInfo.statusCode,
			headers: {
				"Content-Type": "application/json",
			},
		},
	);
}

/**
 * Handles errors and returns appropriate response
 */
function handleError(error: any, request: Request): Response {
	console.error("[AuthErrorHandler] Caught error:", error);

	// Check for authentication-related errors
	if (
		error.message?.includes("Auth0 ID token") ||
		error.message?.includes("re-authenticate") ||
		error.message?.includes("expired")
	) {
		return createAuthErrorResponse({
			code: 401,
			message: error.message,
			error: request.headers.get("Accept")?.includes("text/event-stream")
				? "sse_auth_failed"
				: "invalid_token",
		});
	}

	// Handle all other errors gracefully
	console.error("[AuthErrorHandler] Non-auth error occurred:", error.message);
	return createErrorResponse(request, {
		statusCode: 500,
		errorType: "internal_error",
		message: error.message || "An unexpected error occurred",
	});
}

/**
 * Wraps a Durable Object handler to catch authentication errors
 * Maintains the ExportedHandler interface expected by OAuthProvider
 */
export function wrapDurableObjectMount(handler: any): any {
	// If the handler has a fetch method, wrap it
	if (handler && typeof handler.fetch === "function") {
		const originalFetch = handler.fetch.bind(handler);
		handler.fetch = async (request: Request, ...args: any[]): Promise<Response> => {
			try {
				return await originalFetch(request, ...args);
			} catch (error: any) {
				return handleError(error, request);
			}
		};
		return handler;
	}

	// If it's a class, create a wrapper class
	if (typeof handler === "function" && handler.prototype) {
		return class extends handler {
			async fetch(request: Request, ...args: any[]): Promise<Response> {
				try {
					return await super.fetch(request, ...args);
				} catch (error: any) {
					return handleError(error, request);
				}
			}
		};
	}

	// Return as-is if we can't wrap it
	return handler;
}
