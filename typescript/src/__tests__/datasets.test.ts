import { describe, it, expect, beforeEach } from 'vitest';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { DFClient } from '../client';

describe('DatasetService', () => {
  let mock: MockAdapter;
  let client: DFClient;

  beforeEach(() => {
    mock = new MockAdapter(axios);
    client = new DFClient({ apiKey: 'test-key' });
  });

  it('should stream all pages of data automatically', async () => {
    // Page 1
    mock.onPost('/v1/datasets', { dataset: 'test', limit: 1 }).replyOnce(200, {
      data: [{ id: '1', fields: { text: 'one' } }],
      next_cursor: 'cursor-2'
    });

    // Page 2
    mock.onPost('/v1/datasets', { dataset: 'test', limit: 1, cursor: 'cursor-2' }).replyOnce(200, {
      data: [{ id: '2', fields: { text: 'two' } }],
      next_cursor: null
    });

    const results: any[] = [];
    for await (const doc of client.datasets.stream('test', { limit: 1 })) {
      results.push(doc);
    }

    expect(results.length).toBe(2);
    expect(results[0].id).toBe('1');
    expect(results[1].id).toBe('2');
    expect(mock.history.post.length).toBe(2);
  });

  it('should handle empty datasets gracefully', async () => {
    mock.onPost('/v1/datasets').reply(200, {
      data: [],
      next_cursor: null
    });

    const results: any[] = [];
    for await (const doc of client.datasets.stream('test')) {
      results.push(doc);
    }

    expect(results.length).toBe(0);
  });

  it('should throw APIError on invalid schema response', async () => {
    mock.onPost('/v1/datasets').reply(200, {
      invalid_key: 'invalid_value'
      // missing 'data' and 'next_cursor'
    });

    const stream = client.datasets.stream('test');
    await expect(stream.next()).rejects.toThrow(/Validation failed/);
  });
});
