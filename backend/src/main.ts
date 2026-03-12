import "dotenv/config";
import path from "path";
import { createApp } from "./app";

async function bootstrap() {
  const server = createApp();

  if (process.env.NODE_ENV === "production") {
    const clientDist = path.join(__dirname, "../../../client");
    server.serveStatic(clientDist);
  }

  const port = Number(process.env.PORT) || 3000;
  const host = process.env.NODE_ENV === "production" ? "0.0.0.0" : "127.0.0.1";

  server.listen(port, host);
}

bootstrap();
