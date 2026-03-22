import { describe, it, expect } from "vitest";
import { formatDocumentText } from "../utils/format.js";

describe("formatDocumentText", () => {
  it("should format a document correctly from root fields", () => {
    const doc = {
      id: "doc-1",
      title: "Test Title",
      category: "legal",
      summary: "This is a summary",
      source_url: "https://example.com"
    };
    const result = formatDocumentText(doc, 1);
    expect(result).toContain("1. [doc-1] Test Title");
    expect(result).toContain("Category: legal");
    expect(result).toContain("Source: https://example.com");
  });

  it("should format a document correctly from metadata", () => {
    const doc = {
      id: "doc-2",
      metadata: {
        title: "Metadata Title",
        category: "financial",
        summary: "Metadata summary"
      },
      source_url: "https://example.com"
    };
    const result = formatDocumentText(doc, 1);
    expect(result).toContain("1. [doc-2] Metadata Title");
    expect(result).toContain("Category: financial");
    expect(result).toContain("Summary: Metadata summary");
  });

  it("should truncate long summaries", () => {
    const doc = {
      id: "doc-3",
      title: "Long Summary Doc",
      category: "legal",
      summary: "a".repeat(300),
      source_url: "https://example.com"
    };
    const result = formatDocumentText(doc, 1);
    expect(result).toContain("a".repeat(197) + "...");
  });
});
