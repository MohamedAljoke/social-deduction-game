import { DomainError } from "../domain/errors";

export type HttpMethod = "get" | "post" | "put" | "delete";

export interface HttpRequest {
  body: any;
  params: Record<string, string>;
  query: Record<string, string | string[]>;
  headers: Record<string, string | string[] | undefined>;
}

export interface HttpResponse {
  status(code: number): HttpResponse;
  json(data: any): void;
}

export type HttpHandler = (
  request: HttpRequest,
  response: HttpResponse,
) => Promise<void> | void;

export interface HttpServer {
  register(method: HttpMethod, path: string, handler: HttpHandler): void;

  listen(port: number): void;
}

export function normalizeQuery(query: any): Record<string, string> {
  const result: Record<string, string> = {};

  for (const key in query) {
    const value = query[key];

    if (Array.isArray(value)) {
      result[key] = value[0];
    } else if (typeof value === "string") {
      result[key] = value;
    }
  }

  return result;
}

export function mapErrorToHttp(error: unknown) {
  if (error instanceof DomainError) {
    return {
      status: 400,
      body: {
        error: error.code,
        message: error.message,
      },
    };
  }

  return {
    status: 500,
    body: {
      error: "internal_server_error",
      message: "Something went wrong",
    },
  };
}
