import { Router } from "cloudworker-router";
import template from './template';

interface MyEnv {
	model: KVNamespace;
	DB: D1Database;
}

interface Context {
	env: Env;
	waitUntil(promise: Promise<any>): void;
}

const router = new Router<MyEnv>();


router.get('/', async (ctx: { env: MyEnv }) => {
	return template()
});

router.get('/list', async (ctx: { env: MyEnv }) => {
	const { results } = await ctx.env.DB.prepare(
		"SELECT * FROM Customers WHERE CompanyName = ?",
	)
		.bind("Bs Beverages")
		.all();
	return Response.json(results);
});

router.put("/insert", async (ctx: { env: MyEnv }) => {
	try {
		// 解析请求体中的 JSON 数据
		// @ts-ignore
		const data = await ctx.request.json();

		// 插入数据
		await ctx.env.DB.prepare(
			'INSERT INTO Customers (CompanyName, ContactName) VALUES (?, ?)'
		)
			.bind(data.CompanyName, data.ContactName)
			.run();

		// 查询最新的客户列表
		const { results } = await ctx.env.DB.prepare(
			"SELECT * FROM Customers"
		)
			.all();

		// 返回完整的客户列表
		return Response.json(results);
	} catch (error) {
		// 处理错误
		return new Response(JSON.stringify({ error: 'Failed to insert data' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}
});




router.post("/search", async (ctx: { env: MyEnv, request: Request }) => {
	try {
		// 解析请求体中的 JSON 数据
		const data = await ctx.request.json();

		// 获取查询参数
		// @ts-ignore
		const name = data.name;

		if (!name) {
			return new Response(JSON.stringify({ error: 'Name parameter is required' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		// 执行模糊查询，同时查询 CompanyName 和 ContactName
		const { results } = await ctx.env.DB.prepare(
			"SELECT * FROM Customers WHERE CompanyName LIKE ? OR ContactName LIKE ?"
		)
			.bind(`%${name}%`, `%${name}%`)
			.all();

		// 返回查询结果
		return Response.json(results);
	} catch (error) {
		// 处理错误
		return new Response(JSON.stringify({ error: 'Failed to perform search' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}
});

let count = 0
async function handleRequest(request:Request) {
	const upgradeHeader = request.headers.get('Upgrade');
	if (!upgradeHeader || upgradeHeader !== 'websocket') {
		return new Response('Expected Upgrade: websocket', { status: 426 });
	}

	const webSocketPair = new WebSocketPair();
	const [client, server] = Object.values(webSocketPair);

	server.accept();
	server.addEventListener("message", async ({ data }) => {
		if (data === "CLICK") {
			count += 1
			server.send(JSON.stringify({ count, tz: new Date() }))
		} else {
			// An unknown message came into the server. Send back an error message
			server.send(JSON.stringify({ error: "Unknown message received", tz: new Date() }))
		}
	})

	server.addEventListener("close", async evt => {
		// Handle when a client closes the WebSocket connection
		console.log(evt)
	})

	return new Response(null, {
		status: 101,
		webSocket: client,
	});
}

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		try {
			const url = new URL(request.url)
			switch (url.pathname) {
				case '/ws':
					return handleRequest(request)
				default:
					return router.handle(request, <MyEnv>env, ctx);
			}
		} catch (err) {
			// @ts-ignore
			return new Response(err.toString())
		}
	},
};
