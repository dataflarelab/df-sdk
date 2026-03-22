import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export function registerListDatasets(server: McpServer) {
  server.tool(
    "list_datasets",
    "Discover available dataset categories so an agent doesn't need to hardcode them.",
    {},
    async () => {
      return {
        content: [
          {
            type: "text",
            text: `Available Dataflare datasets:

- legal: Legal documents and case law
- financial: Financial reports and filings

Use the query_datasets tool to search within any dataset.`,
          },
        ],
        annotations: { readOnlyHint: true, openWorldHint: false },
      };
    }
  );
}
