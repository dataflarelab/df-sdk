import { AxiosInstance } from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { 
  DatasetDocument, 
  DatasetQueryRequest, 
  DatasetQueryResponseSchema 
} from '../models/dataset';
import { APIError } from '../exceptions';

export class DatasetService {
  constructor(private readonly axios: AxiosInstance) {}

  /**
   * Stream documents from a dataset using an async generator.
   * Handles pagination automatically via cursors.
   */
  async *stream(
    dataset: string,
    options: Omit<DatasetQueryRequest, 'dataset' | 'cursor'> = {}
  ): AsyncIterableIterator<DatasetDocument> {
    let cursor: string | undefined = undefined;

    while (true) {
      try {
        const response = await this.axios.post('/v1/datasets', {
          dataset,
          ...options,
          cursor,
        });

        const parsed = DatasetQueryResponseSchema.parse(response.data);

        for (const doc of parsed.data) {
          yield doc;
        }

        if (!parsed.next_cursor) {
          break;
        }

        cursor = parsed.next_cursor;
      } catch (error: any) {
        // Validation errors (Zod) should be wrapped in APIError or rethrown
        if (error.name === 'ZodError') {
          throw new APIError(`Validation failed: ${error.message}`);
        }
        throw error;
      }
    }
  }

  /**
   * Memory-safe helper to download a file directly to disk.
   */
  async downloadFile(url: string, destination: string): Promise<void> {
    const absolutePath = path.resolve(destination);
    const dir = path.dirname(absolutePath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    try {
      const response = await this.axios({
        method: 'GET',
        url,
        responseType: 'stream',
        // Important: we don't want auth headers leaked to third-party links (S3, etc.)
        // but if the URL is internal, the client should have headers.
        // For downloads, typically we don't want the default headers if it's a presigned URL.
        headers: { 'X-API-Key': undefined } 
      });

      const writer = fs.createWriteStream(absolutePath);

      return new Promise((resolve, reject) => {
        response.data.pipe(writer);
        let error: Error | null = null;
        writer.on('error', (err) => {
          error = err;
          writer.close();
          reject(err);
        });
        writer.on('close', () => {
          if (!error) {
            resolve();
          }
        });
      });
    } catch (error: any) {
      throw new APIError(`File download failed: ${error.message}`);
    }
  }
}
