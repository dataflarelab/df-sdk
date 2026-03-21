import { describe, it, expect, beforeEach, vi } from 'vitest';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { DFClient } from '../client';
import { AuthenticationError, RateLimitError, APIError } from '../exceptions';

describe('DFClient', () => {
  let mock: MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter(axios);
    process.env.DF_API_KEY = 'test-key';
  });

  it('should initialize with an API key from options', () => {
    const client = new DFClient({ apiKey: 'option-key' });
    expect((client as any).apiKey).toBe('option-key');
  });

  it('should throw if no API key is provided', () => {
    delete process.env.DF_API_KEY;
    expect(() => new DFClient()).toThrow(/API key must be provided/);
  });

  it('should handle 401 AuthenticationError', async () => {
    const client = new DFClient({ apiKey: 'invalid' });
    mock.onPost('/v1/datasets').reply(401);

    await expect(client.datasets.stream('test').next()).rejects.toThrow(AuthenticationError);
  });

  it('should handle 429 RateLimitError after retries', async () => {
    const client = new DFClient({ apiKey: 'key', maxRetries: 1 });
    // Mock 429 twice (initial + 1 retry)
    mock.onPost('/v1/datasets').reply(429);

    const stream = client.datasets.stream('test');
    await expect(stream.next()).rejects.toThrow(RateLimitError);
  });

  it('should handle 500 APIError after retries', async () => {
    const client = new DFClient({ apiKey: 'key', maxRetries: 1 });
    mock.onPost('/v1/datasets').reply(500, 'Internal Server Error');

    const stream = client.datasets.stream('test');
    await expect(stream.next()).rejects.toThrow(APIError);
  });

  it('should retry on transient 500 errors and eventually succeed', async () => {
    const client = new DFClient({ apiKey: 'key', maxRetries: 2 });
    
    // First call fails, second succeeds
    mock.onPost('/v1/datasets').replyOnce(500);
    mock.onPost('/v1/datasets').replyOnce(200, { data: [{ id: 'doc1' }], next_cursor: null });

    const stream = client.datasets.stream('test');
    const result = await stream.next();
    expect(result.value.id).toBe('doc1');
    expect(mock.history.post.length).toBe(2);
  });
});
