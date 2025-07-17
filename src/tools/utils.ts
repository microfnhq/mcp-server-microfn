/**
 * Parses a functionName in the format "username/functionName" into its components
 * @param functionName - The combined function identifier
 * @returns An object with username and functionName properties
 * @throws Error if the format is invalid
 */
export function parseFunctionName(functionName: string): {
	username: string;
	functionName: string;
} {
	const [username, ...nameParts] = functionName.split("/");
	if (!username || nameParts.length === 0) {
		throw new Error('functionName must be in format "username/functionName"');
	}
	return {
		username,
		functionName: nameParts.join("/"), // handles function names with slashes
	};
}
