import {Router} from "cloudworker-router"

interface MyEnv {
	model: KVNamespace;
}
const router = new Router<MyEnv>();

router.get('/', async (ctx: { env: MyEnv }) => {
	return new Response(await ctx.env.model.get('age'));
});

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		return router.handle(request, <MyEnv>env, ctx);
	},
};
