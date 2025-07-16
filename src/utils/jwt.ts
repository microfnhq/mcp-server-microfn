/**
 * JWT utility functions for token validation
 */

interface JWTPayload {
	exp?: number;
	iat?: number;
	sub?: string;
	email?: string;
	[key: string]: any;
}

/**
 * Decodes a JWT token without verifying the signature
 * This is sufficient for checking expiration on the server side
 * since we trust Auth0-issued tokens
 */
export function decodeJWT(token: string): JWTPayload | null {
	try {
		const parts = token.split(".");
		if (parts.length !== 3) {
			return null;
		}

		// Decode the payload (second part)
		const payload = parts[1];
		// Add padding if necessary
		const padded = payload + "=".repeat((4 - (payload.length % 4)) % 4);
		const decoded = atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
		return JSON.parse(decoded);
	} catch (error) {
		console.error("Failed to decode JWT:", error);
		return null;
	}
}

/**
 * Checks if a JWT token is expired
 * @param token The JWT token to check
 * @returns true if the token is expired, false otherwise
 */
export function isTokenExpired(token: string): boolean {
	const payload = decodeJWT(token);
	if (!payload || !payload.exp) {
		// If we can't decode or there's no expiration, consider it invalid
		return true;
	}

	// exp is in seconds, Date.now() is in milliseconds
	const expirationTime = payload.exp * 1000;
	const currentTime = Date.now();

	return currentTime >= expirationTime;
}

/**
 * Gets the token expiration details
 * @param token The JWT token to check
 * @returns Object with expiration details or null if invalid
 */
export function getTokenExpirationDetails(token: string): {
	issuedAt: Date | null;
	expiresAt: Date | null;
	isExpired: boolean;
	timeUntilExpiration: number; // in seconds, negative if expired
} | null {
	const payload = decodeJWT(token);
	if (!payload) {
		return null;
	}

	const currentTime = Date.now();
	const issuedAt = payload.iat ? new Date(payload.iat * 1000) : null;
	const expiresAt = payload.exp ? new Date(payload.exp * 1000) : null;
	const isExpired = expiresAt ? currentTime >= expiresAt.getTime() : true;
	const timeUntilExpiration = expiresAt
		? Math.floor((expiresAt.getTime() - currentTime) / 1000)
		: -1;

	return {
		issuedAt,
		expiresAt,
		isExpired,
		timeUntilExpiration,
	};
}
