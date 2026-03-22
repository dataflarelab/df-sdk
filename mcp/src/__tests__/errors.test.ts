import { describe, it, expect } from "vitest";
import { AuthenticationError, RateLimitError, APIError } from "dataflare-sdk";
import { toMCPError } from "../utils/errors.js";

describe("toMCPError", () => {
  it("should format AuthenticationError", () => {
    const error = new AuthenticationError("Unauthorized");
    expect(toMCPError(error)).toContain("Authentication failed");
  });

  it("should format RateLimitError", () => {
    const error = new RateLimitError("Too many requests");
    expect(toMCPError(error)).toContain("rate limit reached");
  });

  it("should format APIError", () => {
    const error = new APIError("Internal server error", 500);
    expect(toMCPError(error)).toContain("Dataflare API error: Internal server error");
  });

  it("should format generic Error", () => {
    const error = new Error("Something went wrong");
    expect(toMCPError(error)).toContain("Unexpected error: Something went wrong");
  });
});
