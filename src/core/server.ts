import cors from 'cors';
import express from 'express';
import compression from 'compression';

const app = express();

const port = process.argv.includes('--debug') ? 9003 : 9005;

app.use(compression());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cors());

app.get('/', (req, res) => {
	res.send({ recieved_at: Date.now() });
});

app.get('/ping', async (req, res) => {
	const data = await bus.cluster?.broadcastEval(function (cluster) {
		return cluster.guilds.cache.size;
	});

	const guildsCount = data?.reduce(function (previous, current) {
		return previous + current;
	});

	res.send({ id: 'umeko', guilds: guildsCount });
});

// app.post('/u/guilds', (req, res) => {
// 	const guildId = req.body.data;
// 	console.info('UPDATE RECIEVED', req.body);
// 	if (guildId) {
// 		ClusterManager?.broadcastEval(`
//     bus?.database.addPendingGuilds(['${guildId}'])
//     `);

// 		console.info(`Queued Update For Guild ${guildId}`);
// 	}

// 	res.send({ result: 'recieved' });
// });

// app.post('/u/users', (req, res) => {
// 	const userId = req.body.data;
// 	if (userId) {
// 		ClusterManager?.broadcastEval(`
//         bus?.database.addPendingUsers(['${userId}'])
//         `);

// 		console.info(`Queued Update For User ${userId}`);
// 	}

// 	res.send({ result: 'recieved' });
// });

app.listen(port, () => {
	console.info(`Umeko HTTP Server listening at ${process.env.CLUSTER_API}/`);
});

export {};
