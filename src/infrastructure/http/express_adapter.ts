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
        const { status, body } = mapErrorToHttp(error);
        res.status(status).json(body);
      }
    });
  }

  listen(port: number) {
    return new Promise<void>((resolve) => {
      this.server = this.app.listen(port, () => {
        resolve();
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
