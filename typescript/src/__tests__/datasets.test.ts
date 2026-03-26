import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DFClient } from '../client';

describe('DatasetService', () => {
  let client: DFClient;
  const VALID_KEY = 'dfk_1234567890abcdef1234567890abcdef12345678';

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    client = new DFClient({ apiKey: VALID_KEY });
  });

  it('should stream all pages of data automatically', async () => {
    // Page 1
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        data: [{ id: '1', fields: { text: 'one' } }],
        next_cursor: 'cursor-2'
      })
    } as Response);

    // Page 2
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        data: [{ id: '2', fields: { text: 'two' } }],
        next_cursor: null
      })
    } as Response);

    const results: any[] = [];
    for await (const doc of client.datasets.stream('test', { limit: 1 })) {
      results.push(doc);
    }

    expect(results.length).toBe(2);
    expect(results[0].id).toBe('1');
    expect(results[1].id).toBe('2');
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('should handle empty datasets gracefully', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        data: [],
        next_cursor: null
      })
    } as Response);

    const results: any[] = [];
    for await (const doc of client.datasets.stream('test')) {
      results.push(doc);
    }

    expect(results.length).toBe(0);
  });

  it('should throw APIError on invalid schema response', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        invalid_key: 'invalid_value'
      })
    } as Response);

    const stream = client.datasets.stream('test');
    await expect(stream.next()).rejects.toThrow(/Validation failed/);
  });
});
