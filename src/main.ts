import { createApp } from "./app";

async function bootstrap() {
  const server = createApp();
  server.listen(3000);
}

bootstrap();
