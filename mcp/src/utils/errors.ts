import { AuthenticationError, RateLimitError, APIError } from "dataflare-sdk";

export function toMCPError(error: unknown): string {
  if (error instanceof AuthenticationError) {
    return "Authentication failed. Check that DF_API_KEY is valid and has not expired.";
  }
  if (error instanceof RateLimitError) {
    return "Dataflare API rate limit reached. Wait a moment before retrying.";
  }
  if (error instanceof APIError) {
    return `Dataflare API error: ${error.message}`;
  }
  if (error instanceof Error) {
    return `Unexpected error: ${error.message}`;
  }
  return "An unknown error occurred.";
}
