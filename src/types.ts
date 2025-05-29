import type { JWTPayload } from "jose";

export type UserProps = {
	claims: JWTPayload;
	tokenSet: {
		accessToken: string;
		idToken: string;
		refreshToken?: string;
		accessTokenTTL?: number;
	};
	microfnToken?: string; // MicroFn PAT from token exchange
};
