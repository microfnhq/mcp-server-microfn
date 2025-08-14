import { DurableObject } from "cloudflare:workers";
import type { Workspace } from "./microfnApiClient.js";

interface CachedData<T> {
    data: T;
    timestamp: number;
}

// Type for the UserDataCache stub
export interface UserDataCacheStub {
    getFunctions(): Promise<Workspace[] | null>;
    setFunctions(functions: Workspace[]): Promise<void>;
    clear(): Promise<void>;
}

/**
 * Durable Object for caching user-specific data
 * Each user gets their own instance based on their ID
 */
export class UserDataCache extends DurableObject {
    private static CACHE_DURATION_MS = 30 * 60 * 1000; // 30 minutes

    /**
     * Get cached functions for the user
     * Returns null if cache is expired or doesn't exist
     */
    async getFunctions(): Promise<Workspace[] | null> {
        const cached =
            await this.ctx.storage.get<CachedData<Workspace[]>>("functions");

        if (
            cached &&
            Date.now() - cached.timestamp < UserDataCache.CACHE_DURATION_MS
        ) {
            console.log(
                "[UserDataCache] Returning cached functions:",
                cached.data.length,
            );
            return cached.data;
        }

        console.log("[UserDataCache] Cache miss or expired");
        return null;
    }

    /**
     * Cache functions for the user
     */
    async setFunctions(functions: Workspace[]): Promise<void> {
        console.log("[UserDataCache] Caching", functions.length, "functions");
        await this.ctx.storage.put("functions", {
            data: functions,
            timestamp: Date.now(),
        });
    }

    /**
     * Clear all cached data
     */
    async clear(): Promise<void> {
        console.log("[UserDataCache] Clearing all cached data");
        await this.ctx.storage.deleteAll();
    }
}
