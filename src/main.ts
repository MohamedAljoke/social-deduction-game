import { ExpressServer } from "./http/express_adapter";
import { HonoServer } from "./http/hono_adapter";
import { registerRoutes } from "./http/routes";

const expressServer = new ExpressServer();
const honoServer = new HonoServer();

registerRoutes(expressServer);
registerRoutes(honoServer);

expressServer.listen(3000);
honoServer.listen(3001);
