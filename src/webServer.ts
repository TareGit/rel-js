import cors from "cors";
import express from "express";
import compression from "compression";

const utils = bus.sync.require(`./utils`) as typeof import("./utils");
const wsm = bus.sync.require(
  "./webServerMethods"
) as typeof import("./webServerMethods");

const app = express();

const port = process.argv.includes("debug") ? 3001 : 80;

app.use(compression());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(cors());

app.get("/", (request, response) => {
  wsm.getServerInfo(request, response).catch(utils.log);
});

app.get("/ping", (request, response) => {
  wsm.getServerPing(request, response).catch(utils.log);
});

app.post("/guild-update", (request, response) => {
  wsm.updateGuild(request, response).catch(utils.log);
});

app.post("/user-update", (request, response) => {
  wsm.updateUser(request, response).catch(utils.log);
});

app.listen(port, () => {
  utils.log(`Umeko HTTP Server listening at ${process.env.CLUSTER_API}/`);
});

export { };
