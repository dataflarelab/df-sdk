import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getClient } from "../client.js";
import { toMCPError } from "../utils/errors.js";

export function registerGetDocument(server: McpServer) {
  server.tool(
    "get_document",
    "Fetch a single document by its ID, for when an agent already has a reference.",
    {
      dataset: z.string().describe("Dataset the document belongs to"),
      document_id: z.string().describe("The document ID to retrieve"),
    },
    async ({ dataset, document_id }) => {
      try {
        const client = getClient();
        
        // Use filtered query instead of O(n) stream scan
        const result = await client.datasets.query(dataset, {
          filters: { id: document_id },
          limit: 1,
        });

        const foundDoc = result.data[0] ?? null;

        if (!foundDoc) {
          return {
            content: [
              {
                type: "text",
                text: `Document '${document_id}' not found in dataset '${dataset}'.`,
              },
            ],
            isError: true,
          };
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(foundDoc, null, 2),
            },
          ],
          annotations: { readOnlyHint: true, openWorldHint: false },
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
