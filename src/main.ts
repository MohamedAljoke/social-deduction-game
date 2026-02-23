import { ExpressServer } from "./infrastructure/http/express_adapter";
import { HonoServer } from "./infrastructure/http/hono_adapter";
import { registerRoutes } from "./infrastructure/http/routes/route";

const expressServer = new ExpressServer();
const honoServer = new HonoServer();

registerRoutes(expressServer);
registerRoutes(honoServer);

expressServer.listen(3000);
honoServer.listen(3001);
