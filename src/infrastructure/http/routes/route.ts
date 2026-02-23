import { HttpServer } from "../server";

export function registerRoutes(server: HttpServer) {
  registerPlayerRoutes(server);
}

export function registerPlayerRoutes(server: HttpServer) {
  server.register("get", "/players/:id", async (req, res) => {
    res.status(200).json({ id: req.params.id });
  });

  server.register("post", "/players", async (req, res) => {
    res.status(201).json({ created: true });
  });
}
