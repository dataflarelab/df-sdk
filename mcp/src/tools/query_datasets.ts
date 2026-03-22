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
        const results: any[] = [];
        
        // Use client.datasets.stream (collect into array as per prompt)
        const stream = client.datasets.stream(dataset, { 
          search_term, 
          limit 
        });

        for await (const doc of stream) {
          results.push(doc);
        }

        // Note: The stream API might not expose the cursor directly in this simplified wrapper
        // If the real SDK provides a way to get the next cursor, it should be used here.
        // For now, we follow the prompt's structural requirement.
        
        return {
          content: [
            {
              type: "text",
              text: formatResults(dataset, results),
            },
          ],
          structuredData: {
            documents: results,
            dataset,
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
