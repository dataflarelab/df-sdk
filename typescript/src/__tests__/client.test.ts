import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DFClient } from '../client';
import { AuthenticationError, RateLimitError, APIError } from '../exceptions';

describe('DFClient', () => {
  const VALID_KEY = 'dfk_1234567890abcdef1234567890abcdef12345678';

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    process.env.DF_API_KEY = VALID_KEY;
  });

  it('should initialize with an API key from options', () => {
    const client = new DFClient({ apiKey: VALID_KEY });
    expect((client as any).apiKey).toBe(VALID_KEY);
  });

  it('should throw if no API key is provided', () => {
    delete process.env.DF_API_KEY;
    expect(() => new DFClient()).toThrow(/API key must be provided/);
  });

  it('should handle 401 AuthenticationError', async () => {
    const client = new DFClient({ apiKey: VALID_KEY });
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: async () => 'Unauthorized',
    } as Response);

    await expect(client.datasets.query('test')).rejects.toThrow(AuthenticationError);
  });

  it('should handle 429 RateLimitError after retries', async () => {
    const client = new DFClient({ apiKey: VALID_KEY, maxRetries: 0 });
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 429,
      text: async () => 'Rate limit exceeded',
    } as Response);

    await expect(client.datasets.query('test')).rejects.toThrow(RateLimitError);
  });

  it('should handle 500 APIError after retries', async () => {
    const client = new DFClient({ apiKey: VALID_KEY, maxRetries: 0 });
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => 'Internal Server Error',
    } as Response);

    await expect(client.datasets.query('test')).rejects.toThrow(APIError);
  });

  it('should retry on transient 500 errors and eventually succeed', async () => {
    const client = new DFClient({ apiKey: VALID_KEY, maxRetries: 1 });
    
    // First call fails, second succeeds
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error',
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: [{ id: 'doc1' }], next_cursor: null }),
      } as Response);

    const stream = client.datasets.stream('test');
    const result = await stream.next();
    expect(result.value.id).toBe('doc1');
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
