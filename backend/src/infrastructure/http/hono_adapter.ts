import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { Context } from "hono";

import {
  HttpHandler,
  HttpMethod,
  HttpRequest,
  HttpResponse,
  HttpServer,
  mapErrorToHttp,
  normalizeQuery,
} from "./server";

type NodeServer = ReturnType<typeof serve>;

export class HonoServer implements HttpServer {
  private app = new Hono();
  private server?: NodeServer;

  register(method: HttpMethod, path: string, ...handlers: HttpHandler[]) {
    this.app[method](path, async (c: Context) => {
      try {
        const httpResponse: HttpResponse = {
          status(code: number) {
            c.status(code as any);
            return this;
          },
          json(data: unknown) {
            return c.json(data);
          },
        };

        const httpRequest: HttpRequest = {
          body: await safeJson(c),
          params: c.req.param() as Record<string, string>,
          query: normalizeQuery(c.req.query()),
          headers: c.req.header() as any,
        };

        for (const handler of handlers) {
          await handler(httpRequest, httpResponse);
        }
      } catch (error) {
        const { status, body } = mapErrorToHttp(error);
        return c.json(body, status as any);
      }
    });
  }

  async listen(port: number, host?: string): Promise<void> {
    return new Promise((resolve) => {
      this.server = serve(
        {
          fetch: this.app.fetch,
          port,
          hostname: host,
        },
        () => resolve(),
      );
    });
  }

  async close(): Promise<void> {
    if (!this.server) return;

    return new Promise((resolve, reject) => {
      this.server?.close((err?: Error) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}

async function safeJson(c: Context): Promise<unknown> {
  try {
    return await c.req.json();
  } catch {
    return undefined;
  }
}
