import { DatasetQueryResponseSchema, DatasetDocument } from '../models/dataset';
import type { DatasetService } from './datasets';

export class QueryBuilder {
  private _service: DatasetService;
  private _dataset: string;
  private _searchTerm?: string;
  private _filters: Record<string, any> = {};
  private _fields?: string[];
  private _limit: number = 100;
  private _offset?: number;
  private _cursor?: string;

  constructor(service: DatasetService, dataset: string) {
    this._service = service;
    this._dataset = dataset;
  }

  search(term: string): this {
    this._searchTerm = term;
    return this;
  }

  where(key: string, value: any): this {
    this._filters[key] = value;
    return this;
  }

  fields(projection: string[]): this {
    this._fields = projection;
    return this;
  }

  limit(count: number): this {
    this._limit = count;
    return this;
  }

  offset(n: number): this {
    this._offset = n;
    return this;
  }

  after(cursor: string): this {
    this._cursor = cursor;
    return this;
  }

  async execute(): Promise<ReturnType<typeof DatasetQueryResponseSchema.parse>> {
    return this._service.query(this._dataset, {
      search_term: this._searchTerm,
      filters: this._filters,
      fields: this._fields,
      limit: this._limit,
      offset: this._offset,
      cursor: this._cursor,
    });
  }

  /**
   * Returns an async generator for streaming results.
   */
  async *stream(): AsyncIterableIterator<DatasetDocument> {
    let currentCursor = this._cursor;

    while (true) {
      const result = await this._service.query(this._dataset, {
        search_term: this._searchTerm,
        filters: this._filters,
        fields: this._fields,
        limit: this._limit,
        offset: this._offset,
        cursor: currentCursor,
      });

      for (const doc of result.data) {
        yield doc;
      }

      if (!result.next_cursor) break;
      currentCursor = result.next_cursor;
    }
  }
}
