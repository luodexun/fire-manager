import {Router} from "cloudworker-router"

interface MyEnv {
	model: KVNamespace;
}
const router = new Router<MyEnv>();

router.get('/', async (ctx: { env: MyEnv }) => {
	console.log(await ctx.env.model.get('age'));
	return new Response("321");
});

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		return router.handle(request, <MyEnv>env, ctx);
	},
};
