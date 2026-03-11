import { Container } from "../../../container";
import { HttpServer } from "../server";
import { registerMatchRoutes } from "./match";

export function registerRoutes(server: HttpServer, container: Container) {
  server.register("get", "/health", async (_, res) => {
    res.status(200).json({ status: "ok" });
  });

  registerMatchRoutes(server, container);
}
