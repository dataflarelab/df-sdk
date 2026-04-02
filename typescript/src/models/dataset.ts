import { z } from 'zod';

export const DatasetDocumentSchema = z.object({
  id: z.string().optional(),
  text: z.string().optional(),
  metadata: z.record(z.string(), z.any()).default({}),
  source_url: z.string().optional(),
  created_at: z.string().or(z.date()).optional(),
}).passthrough();

export type DatasetDocument = z.infer<typeof DatasetDocumentSchema>;

export const DatasetQueryRequestSchema = z.object({
  dataset: z.string(),
  limit: z.number().max(1000).optional(),
  cursor: z.string().optional(),
  search_term: z.string().optional(),
  filters: z.record(z.string(), z.any()).optional(),
  fields: z.array(z.string()).optional(),
  offset: z.number().min(0).optional(),
});

export type DatasetQueryRequest = z.infer<typeof DatasetQueryRequestSchema>;

export const DatasetQueryResponseSchema = z.object({
  data: z.array(DatasetDocumentSchema),
  count: z.number().optional().default(0),
  total_count: z.number().optional(),
  next_cursor: z.string().nullable().optional(),
  latency: z.string().optional(),
});

export type DatasetQueryResponse = z.infer<typeof DatasetQueryResponseSchema>;
