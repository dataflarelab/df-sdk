import { DFClient } from "dataflare-sdk";

let _client: DFClient | null = null;

export function getClient(): DFClient {
  if (_client) return _client;

  const apiKey = process.env.DF_API_KEY;
  if (!apiKey) {
    throw new Error(
      "DF_API_KEY environment variable is not set. " +
      "Get your API key from https://dataflare.com/developers and set it before starting the server."
    );
  }

  _client = new DFClient({ apiKey });
  return _client;
}
