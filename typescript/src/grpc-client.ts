import * as grpc from '@grpc/grpc-js';
import { GrpcReflection } from 'grpc-js-reflection-client';
import { DatasetDocument } from './models/dataset';

/**
 * Dynamic DataFlare gRPC Client using Server Reflection.
 * Mirrors the Python implementation.
 */
export class DFGRPCClient {
  private readonly apiKey: string;
  private readonly target: string;
  private _reflection?: GrpcReflection;
  private _services: Record<string, any> = {};

  public readonly datasets: DatasetGRPCService;

  constructor(options: { apiKey?: string; target?: string } = {}) {
    this.apiKey = options.apiKey || process.env.DF_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('DF API key must be provided or set as DF_API_KEY environment variable.');
    }
    this.target = options.target || 'rpc.dataflare.com:443';

    this.datasets = new DatasetGRPCService(this);
  }

  /**
   * Lazily initializes and returns the reflection client.
   */
  private getReflection(): GrpcReflection {
    if (!this._reflection) {
      // Configuration for keepalives, matching Python's gRPC options
      const options: grpc.ChannelOptions = {
        'grpc.keepalive_time_ms': 60000,
        'grpc.keepalive_timeout_ms': 20000,
        'grpc.keepalive_permit_without_calls': 1,
        'grpc.http2.max_pings_without_data': 0,
      };

      this._reflection = new GrpcReflection(this.target, grpc.credentials.createSsl(), options);
    }
    return this._reflection;
  }

  /**
   * Loads a service definition via reflection.
   */
  public async getService(serviceName: string): Promise<any> {
    if (this._services[serviceName]) {
      return this._services[serviceName];
    }

    const reflection = this.getReflection();
    const descriptor = await reflection.getDescriptorBySymbol(serviceName);
    const packageObject = descriptor.getPackageObject();
    
    // The serviceName might be 'dfapi.v1.DatasetService'
    // We need to traverse the packageObject to find the actual Service constructor
    const parts = serviceName.split('.');
    let current: any = packageObject;
    for (const part of parts) {
      if (!current[part]) {
        throw new Error(`Service ${serviceName} not found in reflection descriptor at part: ${part}`);
      }
      current = current[part];
    }

    // Instantiate the client
    const ServiceClient = current;
    const client = new ServiceClient(this.target, grpc.credentials.createSsl());
    this._services[serviceName] = client;
    return client;
  }

  public getMetadata(): grpc.Metadata {
    const metadata = new grpc.Metadata();
    metadata.add('x-api-key', this.apiKey);
    return metadata;
  }

  public close(): void {
    for (const client of Object.values(this._services)) {
      if (typeof client.close === 'function') {
        client.close();
      }
    }
    this._services = {};
  }
}

export class DatasetGRPCService {
  constructor(private readonly client: DFGRPCClient) {}

  /**
   * Query the Dataset service via gRPC.
   */
  public async query(
    dataset: string,
    options: {
      limit?: number;
      cursor?: string;
      searchTerm?: string;
      filters?: Record<string, any>;
    } = {}
  ): Promise<[DatasetDocument[], string | undefined]> {
    const service = await this.client.getService('dfapi.v1.DatasetService');
    
    const request = {
      dataset,
      limit: options.limit || 10,
      cursor: options.cursor || '',
      search_term: options.searchTerm || '',
      filters: options.filters ? 
        Object.fromEntries(Object.entries(options.filters).map(([k, v]) => [k, String(v)])) 
        : undefined,
    };

    return new Promise((resolve, reject) => {
      service.Query(request, this.client.getMetadata(), (err: any, response: any) => {
        if (err) {
          return reject(err);
        }

        const documents: DatasetDocument[] = (response.data || []).map((record: any) => {
          return {
            ...record.fields,
          };
        });

        resolve([documents, response.next_cursor]);
      });
    });
  }
}
