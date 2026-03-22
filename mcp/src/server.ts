import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerQueryDatasets } from "./tools/query_datasets.js";
import { registerListDatasets } from "./tools/list_datasets.js";
import { registerGetDocument } from "./tools/get_document.js";
import { registerDownloadDocument } from "./tools/download_document.js";

export function createServer(): McpServer {
  const server = new McpServer({
    name: "dataflare-mcp-server",
    version: "0.1.0",
  });

  registerQueryDatasets(server);
  registerListDatasets(server);
  registerGetDocument(server);
  registerDownloadDocument(server);

  return server;
}
