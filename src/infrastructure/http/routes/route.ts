import { Container } from "../../../container";
import { HttpServer } from "../server";
import { registerMatchRoutes } from "./match";

export function registerRoutes(server: HttpServer, container: Container) {
  registerMatchRoutes(server, container);
}
