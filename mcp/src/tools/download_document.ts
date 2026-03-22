import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getClient } from "../client.js";
import { toMCPError } from "../utils/errors.js";

export function registerDownloadDocument(server: McpServer) {
  server.tool(
    "download_document",
    "Download the raw file for a document to a local path on the machine running the MCP server.",
    {
      source_url: z.string().url().describe("The source_url from a document object"),
      destination: z.string().describe("Local file path to save to, e.g. './output/doc-123.pdf'"),
    },
    async ({ source_url, destination }) => {
      try {
        const client = getClient();
        
        await client.datasets.downloadFile(source_url, destination);

        return {
          content: [
            {
              type: "text",
              text: `Successfully downloaded document to: ${destination}`,
            },
          ],
          annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
        };
      } catch (error: any) {
        // Handle ENOENT specifically if possible, otherwise use general mapper
        let message = toMCPError(error);
        if (error.code === 'ENOENT') {
          message = `Error: The directory for the destination '${destination}' does not exist. Please create it first.`;
        }
        
        return {
          content: [
            {
              type: "text",
              text: message,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
