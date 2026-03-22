import { describe, it, expect } from "vitest";
import { createServer } from "../server.js";

describe("createServer", () => {
  it("should create an McpServer instance", () => {
    const server = createServer();
    expect(server).toBeDefined();
    expect(typeof server.connect).toBe("function");
  });
});
