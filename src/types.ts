import { z } from 'zod';

export const functionIdentifierSchema = z
  .string()
  .refine(
    (val) => {
      const uuidWithHyphensRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const uuidWithoutHyphensRegex = /^[0-9a-f]{32}$/i;
      const usernameFormatRegex = /^[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+$/;
      return (
        uuidWithHyphensRegex.test(val) ||
        uuidWithoutHyphensRegex.test(val) ||
        usernameFormatRegex.test(val)
      );
    },
    {
      message:
        "Identifier must be a UUID (with or without hyphens) or in username/function format.",
    },
  )
  .describe(
    'The function identifier. Can be a UUID (e.g., "12345678-1234-5678-1234-567812345678"), a UUID without hyphens (e.g., "12345678123456781234567812345678"), or in username/function format (e.g., "david/my-function").',
  );

export interface UserProps {
	claims?: {
		sub?: string;
		email?: string;
		name?: string;
	};
	tokenSet?: any;
}