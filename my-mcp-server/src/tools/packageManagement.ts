// packageManagement.ts
import { MicroFnApiClient } from "../microfnApiClient";

// Interfaces for requests and responses
export interface PackageListRequest {
	functionId: string;
}

export interface PackageListResponse {
	packages: Array<{ name: string; version: string }>;
}

export interface PackageInstallRequest {
	functionId: string;
	packageName: string;
	packageVersion?: string;
}

export interface PackageInstallResponse {
	name: string;
	version: string;
}

export interface PackageUpdateRequest {
	functionId: string;
	packageName: string;
	packageVersion?: string;
}

export interface PackageUpdateResponse {
	name: string;
	version: string;
}

export interface PackageRemoveRequest {
	functionId: string;
	packageName: string;
}

export interface PackageRemoveResponse {
	success: boolean;
}

export interface PackageUpdateLayerRequest {
	functionId: string;
}

export interface PackageUpdateLayerResponse {
	success: boolean;
	message?: string;
}

// Main handler
export async function handlePackageManager(
	token: string,
	params: {
		action: "list" | "install" | "update" | "remove" | "updateLayer";
		functionId: string;
		packageName?: string;
		packageVersion?: string;
	},
	env: any,
	ctx: ExecutionContext,
): Promise<any> {
	try {
		switch (params.action) {
			case "list":
				return await listPackages(token, { functionId: params.functionId });
			case "install":
				if (!params.packageName) throw new Error("packageName required for install");
				return await installPackage(token, {
					functionId: params.functionId,
					packageName: params.packageName,
					packageVersion: params.packageVersion,
				});
			case "update":
				if (!params.packageName) throw new Error("packageName required for update");
				return await updatePackage(token, {
					functionId: params.functionId,
					packageName: params.packageName,
					packageVersion: params.packageVersion,
				});
			case "remove":
				if (!params.packageName) throw new Error("packageName required for remove");
				return await removePackage(token, {
					functionId: params.functionId,
					packageName: params.packageName,
				});
			case "updateLayer":
				return await updatePackageLayer(token, {
					functionId: params.functionId,
				});
			default:
				throw new Error("Unknown action");
		}
	} catch (error) {
		return { error: (error as Error).message };
	}
}

// Sub-handlers

export async function listPackages(
	token: string,
	req: PackageListRequest,
): Promise<PackageListResponse | { error: string }> {
	try {
		const client = new MicroFnApiClient(token);
		const packages = await client.listPackages(req.functionId);
		return { packages };
	} catch (error) {
		return { error: (error as Error).message };
	}
}

export async function installPackage(
	token: string,
	req: PackageInstallRequest,
): Promise<PackageInstallResponse | { error: string }> {
	try {
		const client = new MicroFnApiClient(token);
		const result = await client.installPackage(
			req.functionId,
			req.packageName,
			req.packageVersion,
		);
		return result;
	} catch (error) {
		return { error: (error as Error).message };
	}
}

export async function updatePackage(
	token: string,
	req: PackageUpdateRequest,
): Promise<PackageUpdateResponse | { error: string }> {
	try {
		const client = new MicroFnApiClient(token);
		const result = await client.updatePackage(
			req.functionId,
			req.packageName,
			req.packageVersion,
		);
		return result;
	} catch (error) {
		return { error: (error as Error).message };
	}
}

export async function removePackage(
	token: string,
	req: PackageRemoveRequest,
): Promise<PackageRemoveResponse | { error: string }> {
	try {
		const client = new MicroFnApiClient(token);
		await client.removePackage(req.functionId, req.packageName);
		return { success: true };
	} catch (error) {
		return { error: (error as Error).message };
	}
}

export async function updatePackageLayer(
	token: string,
	req: PackageUpdateLayerRequest,
): Promise<PackageUpdateLayerResponse | { error: string }> {
	try {
		const client = new MicroFnApiClient(token);
		const result = await client.updatePackageLayer(req.functionId);
		return { success: true, ...result };
	} catch (error) {
		return { error: (error as Error).message };
	}
}
