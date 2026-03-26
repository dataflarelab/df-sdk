import * as fs from 'fs';
import * as path from 'path';
import { 
  DatasetDocument, 
  DatasetQueryRequest, 
  DatasetQueryResponseSchema 
} from '../models/dataset';
import { APIError } from '../exceptions';
import { QueryBuilder } from './query-builder';
import type { DFClient } from '../client';

export class DatasetService {
  constructor(private readonly client: DFClient) {}

  /**
   * Create a fluent QueryBuilder for this dataset.
   */
  builder(dataset: string): QueryBuilder {
    return new QueryBuilder(this, dataset);
  }

  /**
   * Query documents from a dataset (single page).
   */
  async query(
    dataset: string,
    options: Omit<DatasetQueryRequest, 'dataset'> = {}
  ): Promise<ReturnType<typeof DatasetQueryResponseSchema.parse>> {
    try {
      const data = await this.client.request('/v1/datasets', {
        method: 'POST',
        body: JSON.stringify({ dataset, ...options }),
      });
      return DatasetQueryResponseSchema.parse(data);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        throw new APIError(`Validation failed: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Stream documents from a dataset using an async generator.
   */
  async *stream(
    dataset: string,
    options: Omit<DatasetQueryRequest, 'dataset' | 'cursor'> = {}
  ): AsyncIterableIterator<DatasetDocument> {
    let cursor: string | undefined = undefined;

    while (true) {
      const result = await this.query(dataset, { ...options, cursor });
      
      for (const doc of result.data) {
        yield doc;
      }

      if (!result.next_cursor) break;
      cursor = result.next_cursor;
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
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Status ${response.status}`);
      if (!response.body) throw new Error('ReadableStream not available');

      const writer = fs.createWriteStream(absolutePath);
      const reader = response.body.getReader();

      const pump = async () => {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            writer.end();
            break;
          }
          writer.write(Buffer.from(value));
        }
      };

      await pump();
    } catch (error: any) {
      throw new APIError(`File download failed: ${error.message}`);
    }
  }
}
