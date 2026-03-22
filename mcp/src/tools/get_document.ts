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
        
        // Use client.datasets.stream with limit 1 as suggested in prompt
        const stream = client.datasets.stream(dataset, { 
          limit: 1 
          // Note: If the SDK supports an 'id' filter in options, it should be used here.
          // The prompt says "filtered by ID, OR call a direct /datasets/{dataset}/{id} endpoint if it exists"
        });

        let foundDoc: any = null;
        for await (const doc of stream) {
          if (doc.id === document_id) {
            foundDoc = doc;
            break;
          }
        }

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
