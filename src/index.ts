import { createServer } from 'http';
import * as h3 from 'h3';
//import * as accepts from 'accepts';

async function main() {
	const app = h3.createApp();
	const router = h3.createRouter();

	app.use(h3.eventHandler(async event => {
		console.log(`Request ${event.req.url}`);
	}));

	router.get('/get', h3.eventHandler(async event => {
		h3.setResponseHeader(event, 'Cache-Control', 'private, max-age=0, must-revalidate');

		//#region Auth
		let authed: boolean | null = null;
		let authedBy: string | null = null;

		// Cookie: auth=ok|ng
		const cookieAuth = h3.getCookie(event, 'auth');

		// authorization: bearer ok|ng 
		const authorization = h3.getHeader(event, 'authorization');
		const m = authorization?.match(/^bearer\s+(.*)/i);
		const authorizationBearer = m?.[1];

		// x-auth: ok|ng
		const xauth = h3.getHeader(event, 'x-auth');

		h3.appendResponseHeader(event, 'Vary', 'authorization');

		// check
		if (cookieAuth?.includes('ok')) {
			authed = true;
			authedBy = 'cookie';
		} else if (cookieAuth?.includes('ng')) {
			authed = false;
			authedBy = 'cookie';
		} else if (authorizationBearer?.includes('ok')) {
			authed = true;
			authedBy = 'authorization';
		} else if (authorizationBearer?.includes('ng')) {
			authed = false;
			authedBy = 'authorization';
		} else if (xauth?.includes('ok')) {
			authed = true;
			authedBy = 'xauth';
		} else if (xauth?.includes('ng')) {
			authed = false;
			authedBy = 'xauth';
		}

		// ng
		if (authed === false) {
			throw h3.createError({ statusCode: 401 });
		}

		// ok
		if (authed === null) {
			h3.setResponseHeader(event, 'Cache-Control', 'public, max-age=10');
		}
		//#endregion Auth

		return {
			authed, authedBy,
			headers: h3.getRequestHeaders(event),
		};
	}));

	app.use(router);

	// listen
	const server = createServer(h3.toNodeListener(app));
	server.listen(process.env.PORT || 3336);
}

main().then(() => {
	console.log('done');
})
