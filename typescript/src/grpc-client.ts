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
    const descriptor = await reflection.getDescriptorBySymbol(serviceName, this.getMetadata() as any);
    const packageObject = descriptor.getPackageObject();

    // Traverse the packageObject to find the actual Service constructor
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

  /**
   * Helper to make a gRPC call and return a Promise.
   */
  public async call<T = any>(serviceName: string, methodName: string, request: any): Promise<T> {
    const service = await this.getService(serviceName);
    if (!service[methodName] || typeof service[methodName] !== 'function') {
      throw new Error(`Method ${methodName} not found on service ${serviceName}`);
    }

    return new Promise((resolve, reject) => {
      service[methodName].call(service, request, this.getMetadata(), (err: any, response: T) => {
        if (err) {
          return reject(err);
        }
        resolve(response);
      });
    });
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

/**
 * Utility for handling google.protobuf.Value and Struct types.
 * Handles both snake_case (standard) and camelCase (some environments).
 */
export class ProtobufUtils {
  /**
   * Unpacks a google.protobuf.Value into a JS primitive or object.
   */
  public static unpackValue(value: any): any {
    if (!value) return undefined;

    // Check for snake_case fields
    if (value.string_value !== undefined) return value.string_value;
    if (value.number_value !== undefined) return value.number_value;
    if (value.bool_value !== undefined) return value.bool_value;
    if (value.struct_value !== undefined) return this.unpackStruct(value.struct_value);
    if (value.list_value !== undefined) {
      return (value.list_value.values || []).map((v: any) => this.unpackValue(v));
    }
    if (value.null_value !== undefined) return null;

    // Check for camelCase fields (compatibility)
    if (value.stringValue !== undefined) return value.stringValue;
    if (value.numberValue !== undefined) return value.numberValue;
    if (value.boolValue !== undefined) return value.boolValue;
    if (value.structValue !== undefined) return this.unpackStruct(value.structValue);
    if (value.listValue !== undefined) {
      return (value.listValue.values || []).map((v: any) => this.unpackValue(v));
    }
    if (value.nullValue !== undefined) return null;

    return undefined;
  }

  /**
   * Unpacks a google.protobuf.Struct into a plain JS object.
   */
  public static unpackStruct(struct: any): any {
    if (!struct || !struct.fields) return {};
    const result: any = {};

    // gRPC-JS reflection sometimes returns fields as an array of {key, value}
    if (Array.isArray(struct.fields)) {
      for (const entry of struct.fields) {
        if (entry && entry.key !== undefined) {
          result[entry.key] = this.unpackValue(entry.value);
        }
      }
    } else {
      // Standard object/map representation
      for (const [key, value] of Object.entries(struct.fields)) {
        result[key] = this.unpackValue(value);
      }
    }
    return result;
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
    const request = {
      dataset,
      limit: options.limit || 10,
      cursor: options.cursor || '',
      search_term: options.searchTerm || '',
      filters: options.filters ? 
        Object.fromEntries(Object.entries(options.filters).map(([k, v]) => [k, String(v)])) 
        : undefined,
    };

    const response = await this.client.call('dfapi.v1.DatasetService', 'Query', request);

    const documents: DatasetDocument[] = (response.data || []).map((record: any) => {
      // DataRecord.fields is a google.protobuf.Struct
      return ProtobufUtils.unpackStruct(record.fields);
    });

    return [documents, response.next_cursor];
  }
}
