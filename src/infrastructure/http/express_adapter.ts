import express, { Request, Response } from "express";
import {
  HttpHandler,
  HttpMethod,
  HttpResponse,
  HttpServer,
  mapErrorToHttp,
  normalizeQuery,
} from "./server";
import { Server } from "http";

export class ExpressServer implements HttpServer {
  private app = express();
  private server?: Server;

  constructor() {
    this.app.use(express.json());
  }

  register(method: HttpMethod, path: string, handler: HttpHandler) {
    this.app[method](path, async (req: Request, res: Response) => {
      try {
        const httpResponse: HttpResponse = {
          status(code: number) {
            res.status(code);
            return this;
          },
          json(data: unknown) {
            res.setHeader("Connection", "close");
            res.json(data);
          },
        };

        await handler(
          {
            body: req.body,
            params: req.params as Record<string, string>,
            query: normalizeQuery(req.query),
            headers: req.headers as any,
          },
          httpResponse,
        );
      } catch (error) {
        // Temporary logging to debug server-side errors during tests.
        // eslint-disable-next-line no-console
        // console.error("HTTP handler error:", error);
        const { status, body } = mapErrorToHttp(error);
        res.setHeader("Connection", "close");
        res.status(status).json(body);
      }
    });
  }

  listen(port: number) {
    return new Promise<void>((resolve, reject) => {
      this.server = this.app.listen(port, () => {
        resolve();
      });

      this.server.on("error", (err) => {
        // eslint-disable-next-line no-console
        console.error("HTTP server listen error:", err);
        reject(err);
      });
    });
  }

  async close() {
    return new Promise<void>((resolve, reject) => {
      if (!this.server) return resolve();
      this.server.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}
