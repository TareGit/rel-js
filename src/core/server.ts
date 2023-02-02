import cors from "cors";
import express from "express";
import compression from "compression";
import { log } from '@core/utils';

const app = express();

const port = process.argv.includes("debug") ? 3001 : 80;

app.use(compression());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(cors());

app.get("/", (req, res) => {
  res.send({ recieved_at: Date.now() });
});

app.get("/ping", async (req, res) => {
  const data = await bus.cluster?.broadcastEval(function (cluster) {
    return cluster.client.guilds.cache.size;
  });

  const guildsCount = data?.reduce(function (previous, current) {
    return previous + current;
  });

  res.send({ id: "umeko", guilds: guildsCount });
});

app.post("/guild-update", (req, res) => {
  const guildId = req.body.id;
  ClientManager?.broadcastEval(`
    if(bus.guildSettings.get('${guildId}') && !bus.guildsPendingUpdate.includes('${guildId}'))
    {
        bus.guildsPendingUpdate.push('${guildId}');
    }
    `);

  log(`Queued Update For Guild ${guildId}`);

  res.send({ result: "recieved" });
});

app.post("/user-update", (req, res) => {
  const userId = req.body.id;

  ClientManager?.broadcastEval(`
        if(bus.userSettings.get('${userId}') && !bus.usersPendingUpdate.includes('${userId}'))
        {
            bus.usersPendingUpdate.push('${userId}');
        }
        `);

  log(`Queued Update For User ${userId}`);

  res.send({ result: "recieved" });
});

app.listen(port, () => {
  log(`Umeko HTTP Server listening at ${process.env.CLUSTER_API}/`);
});

export { };
