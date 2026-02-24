import { HttpServer } from "./server";

export function registerRoutes(server: HttpServer) {
  server.register("get", "/players/:id", () => {});
}
