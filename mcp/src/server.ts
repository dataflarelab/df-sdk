import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerQueryDatasets } from "./tools/query_datasets.js";
import { registerListDatasets } from "./tools/list_datasets.js";
import { registerGetDocument } from "./tools/get_document.js";
import { registerDownloadDocument } from "./tools/download_document.js";
import pkg from "../package.json" with { type: "json" };

export function createServer(): McpServer {
  const version = (pkg as any).version;
  const server = new McpServer({
    name: "dataflare-mcp-server",
    version,
  });

  registerQueryDatasets(server);
  registerListDatasets(server);
  registerGetDocument(server);
  registerDownloadDocument(server);

  return server;
}
