import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getClient } from "../client.js";

export function registerListDatasets(server: McpServer) {
  server.tool(
    "list_datasets",
    "Discover available dataset categories so an agent doesn't need to hardcode them.",
    {},
    async () => {
      try {
        const client = getClient();
        const datasets = await client.datasets.list();
        
        return {
          content: [
            {
              type: "text",
              text: `Available Dataflare datasets:\n${datasets.map((d: string) => `- ${d}`).join('\n')}\n\nUse the query_datasets tool to search within any dataset.`,
            },
          ],
          annotations: { readOnlyHint: true, openWorldHint: false },
        };
      } catch (error: any) {
        return {
          content: [{ type: "text", text: `Error listing datasets: ${error.message}` }],
          isError: true,
        };
      }
    }
  );
}
