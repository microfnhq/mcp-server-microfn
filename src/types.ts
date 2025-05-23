import type { JWTPayload } from "jose";

export type UserProps = {
	claims: JWTPayload;
	tokenSet: {
		accessToken: string;
		idToken: string;
		refreshToken?: string;
		accessTokenTTL?: number;
	};
	// Store the MicroFn API token separately
	microfnToken?: string;
};