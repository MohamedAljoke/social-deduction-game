import express, { Request, Response } from "express";
import cors from "cors";
import {
  HttpHandler,
  HttpMethod,
  HttpRequest,
  HttpResponse,
  HttpServer,
  mapErrorToHttp,
  normalizeQuery,
} from "./server";
import { Server } from "http";

interface WebSocketManager {
  attach(server: Server): void;
  close?(): Promise<void> | void;
}

export class ExpressServer implements HttpServer {
  private app = express();
  private server?: Server;
  private wsManager?: WebSocketManager;

  constructor(wsManager?: WebSocketManager) {
    this.app.use(cors());
    this.app.use(express.json());
    this.wsManager = wsManager;
  }

  register(method: HttpMethod, path: string, ...handlers: HttpHandler[]) {
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

        const httpRequest: HttpRequest = {
          body: req.body,
          params: req.params as Record<string, string>,
          query: normalizeQuery(req.query),
          headers: req.headers as any,
        };

        for (const handler of handlers) {
          await handler(httpRequest, httpResponse);
        }
      } catch (error) {
        // Temporary logging to debug server-side errors during tests.
        // eslint-disable-next-line no-console
        console.error("HTTP handler error:", error);
        const { status, body } = mapErrorToHttp(error);
        res.setHeader("Connection", "close");
        res.status(status).json(body);
      }
    });
  }

  listen(port: number, host?: string) {
    return new Promise<void>((resolve, reject) => {
      const onListen = () => {
        console.log("server is on");
        this.wsManager?.attach(this.server!);
        resolve();
      };
      
      if (host) {
        this.server = this.app.listen(port, host, onListen);
      } else {
        this.server = this.app.listen(port, onListen);
      }

      this.server.on("error", (err) => {
        // eslint-disable-next-line no-console
        console.error("HTTP server listen error:", err);
        reject(err);
      });
    });
  }

  async close() {
    await this.wsManager?.close?.();

    return new Promise<void>((resolve, reject) => {
      if (!this.server) return resolve();
      this.server.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}
