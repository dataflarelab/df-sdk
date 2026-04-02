import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getClient } from "../client.js";
import { toMCPError } from "../utils/errors.js";
import { formatResults } from "../utils/format.js";

export function registerQueryDatasets(server: McpServer) {
  server.tool(
    "query_datasets",
    "Search and paginate documents from a Dataflare dataset.",
    {
      dataset: z.string().describe("Dataset category to query, e.g. 'legal', 'financial'"),
      search_term: z.string().optional().describe("Optional keyword to filter results"),
      limit: z.number().int().min(1).max(100).default(20).describe("Max documents to return (1–100)"),
      cursor: z.string().optional().describe("Pagination cursor from a previous response"),
    },
    async ({ dataset, search_term, limit, cursor }) => {
      try {
        const client = getClient();
        
        // Use single-page query instead of stream to preserve cursor for AI agent
        const result = await client.datasets.query(dataset, {
          search_term,
          limit,
          cursor,
        });

        return {
          content: [
            {
              type: "text",
              text: formatResults(dataset, result.data, result.next_cursor ?? undefined),
            },
          ],
          structuredData: {
            documents: result.data,
            dataset,
            next_cursor: result.next_cursor ?? null,
            count: result.count,
          },
          annotations: { readOnlyHint: true, openWorldHint: true },
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: toMCPError(error),
            },
          ],
          isError: true,
        };
      }
    }
  );
}
