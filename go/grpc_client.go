package dataflare

import (
	"context"
	"os"
	"strings"

	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials"
	"google.golang.org/grpc/credentials/insecure"
	"google.golang.org/grpc/metadata"
)

// DFGRPCClient is a high-performance gRPC client for the Dataflare API.
type DFGRPCClient struct {
	APIKey string
	Target string
	Conn   *grpc.ClientConn
}

// NewGRPCClient creates a new DFGRPCClient for high-performance binary streaming.
func NewGRPCClient(target string) (*DFGRPCClient, error) {
	apiKey := os.Getenv("DF_API_KEY")
	if target == "" {
		target = "rpc.dataflare.com:443"
	}

	var opts []grpc.DialOption
	if strings.Contains(target, "localhost") || strings.Contains(target, "127.0.0.1") || os.Getenv("DF_INSECURE") == "true" {
		opts = append(opts, grpc.WithTransportCredentials(insecure.NewCredentials()))
	} else {
		opts = append(opts, grpc.WithTransportCredentials(credentials.NewTLS(nil)))
	}

	conn, err := grpc.NewClient(target, opts...)
	if err != nil {
		return nil, err
	}

	return &DFGRPCClient{
		APIKey: apiKey,
		Target: target,
		Conn:   conn,
	}, nil
}

// Call performs a gRPC call with the API key injected into the request metadata.
func (c *DFGRPCClient) Call(ctx context.Context, method string, req interface{}, resp interface{}) error {
	ctx = metadata.AppendToOutgoingContext(ctx, "x-api-key", c.APIKey)
	return c.Conn.Invoke(ctx, "/dfapi.v1.DatasetService/"+method, req, resp)
}

// Close closes the gRPC connection.
func (c *DFGRPCClient) Close() error {
	return c.Conn.Close()
}
