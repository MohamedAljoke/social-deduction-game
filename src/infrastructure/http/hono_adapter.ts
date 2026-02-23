import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { Context } from "hono";
import {
  HttpHandler,
  HttpMethod,
  HttpResponse,
  HttpServer,
  mapErrorToHttp,
  normalizeQuery,
} from "./server";

export class HonoServer implements HttpServer {
  private app = new Hono();

  register(method: HttpMethod, path: string, handler: HttpHandler) {
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

        await handler(
          {
            body: await safeJson(c),
            params: c.req.param() as Record<string, string>,
            query: normalizeQuery(c.req.query()),
            headers: c.req.header() as any,
          },
          httpResponse,
        );
      } catch (error) {
        const { status, body } = mapErrorToHttp(error);
        return c.json(body, status as any);
      }
    });
  }

  listen(port: number) {
    serve(
      {
        fetch: this.app.fetch,
        port,
      },
      () => {
        console.log(`hono app is running on port: ${port}`);
      },
    );
  }
}

async function safeJson(c: Context): Promise<unknown> {
  try {
    return await c.req.json();
  } catch {
    return undefined;
  }
}
