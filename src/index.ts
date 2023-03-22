import { createServer } from 'http';
import * as h3 from 'h3';
//import * as accepts from 'accepts';

async function main() {
	const app = h3.createApp();
	const router = h3.createRouter();

	app.use(h3.eventHandler(async event => {
		console.log(`Request ${event.node.req.url}`);
	}));

	router.get('/none', h3.eventHandler(async event => {
		return {
			headers: h3.getRequestHeaders(event),
		};
	}));

	router.get('/get', h3.eventHandler(async event => {
		h3.setResponseHeader(event, 'Cache-Control', 'private, max-age=0, must-revalidate');
		const query = h3.getQuery(event);

		//#region Auth
		let authed: boolean | null = null;
		let authedBy: string | null = null;

		// /get?type=cookie => Cookie: auth=ok|ng
		if (query.type === 'cookie') {
			h3.appendResponseHeader(event, 'Vary', 'cookie');

			const cookieAuth = h3.getCookie(event, 'auth');

			if (cookieAuth?.includes('ok')) {
				authed = true;
				authedBy = 'cookie';
			} else if (cookieAuth?.includes('ng')) {
				authed = false;
				authedBy = 'cookie';
			}
		}

		// /get?type=auth => authorization: bearer ok|ng 
		if (query.type === 'auth') {
			h3.appendResponseHeader(event, 'Vary', 'authorization');

			const authorization = h3.getHeader(event, 'authorization');
			const m = authorization?.match(/^bearer\s+(.*)/i);
			const authorizationBearer = m?.[1];

			if (authorizationBearer?.includes('ok')) {
				authed = true;
				authedBy = 'authorization';
			} else if (authorizationBearer?.includes('ng')) {
				authed = false;
				authedBy = 'authorization';
			}
		}

		// x-auth: ok|ng
		/*
		const xauth = h3.getHeader(event, 'x-auth');

		if (xauth) {
			if (xauth?.includes('ok')) {
				authed = true;
				authedBy = 'xauth';
			} else if (xauth?.includes('ng')) {
				authed = false;
				authedBy = 'xauth';
			}
		}
		*/

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

	router.post('/post', h3.eventHandler(async event => {
		h3.setResponseHeader(event, 'Cache-Control', 'private, max-age=0, must-revalidate');

		return {
			headers: h3.getRequestHeaders(event),
		};
	}));

	router.post('/setcookie', h3.eventHandler(async event => {
		h3.setResponseHeader(event, 'Cache-Control', 'private, max-age=0, must-revalidate');
		h3.setCookie(event, 'key', new Date().getTime().toString(), {
			path: '/',
		});

		return {
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
