import { Router } from 'worktop';
import * as Cache from 'worktop/cache';
import { uid as toUID } from 'worktop/utils';
import { read, write } from 'worktop/kv';
import type { KV } from 'worktop/kv';

declare var DATA: KV.Namespace;

interface Message {
	id: string;
	text: string;
	// ...
}

// Initialize
const API = new Router();


API.add('GET', '/messages/:id', async (req: { params: { id: any; }; }, res: { setHeader: (arg0: string, arg1: string) => void; send: (arg0: number, arg1: any) => void; }) => {
	// Pre-parsed `req.params` object
	const key = `messages::${req.params.id}`;

	// Assumes JSON (can override)
	const message = await read<Message>(DATA, key);

	// Alter response headers directly
	res.setHeader('Cache-Control', 'public, max-age=60');

	// Smart `res.send()` helper
	// ~> automatically stringifies JSON objects
	// ~> auto-sets `Content-Type` & `Content-Length` headers
	res.send(200, message);
});


API.add('POST', '/messages', async (req: { body: () => any; extend: (arg0: Promise<Response>) => void; }, res: { send: (arg0: number, arg1: string) => void; }) => {
	try {
		// Smart `req.body` helper
		// ~> parses JSON header as JSON
		// ~> parses form-like header as FormData, ...etc
		// @ts-ignore
		var input = await req.body<Message>();
	} catch (err) {
		return res.send(400, 'Error parsing request body');
	}

	if (!input || !input.text.trim()) {
		return res.send(422, { text: 'required' });
	}

	const value: Message = {
		id: toUID(16),
		text: input.text.trim(),
		// ...
	};

	// Assumes JSON (can override)
	const key = `messages::${value.id}`;
	const success = await write<Message>(DATA, key, value);
	//    ^ boolean

	// Alias for `event.waitUntil`
	// ~> queues background task (does NOT delay response)
	req.extend(
		fetch('https://.../logs', {
			method: 'POST',
			headers: { 'content-type': 'application/json '},
			body: JSON.stringify({ success, value })
		})
	);

	if (success) res.send(201, value);
	else res.send(500, 'Error creating record');
});


API.add('GET', '/alive', (req: any, res: { end: (number: number, p: { text: string }) => void; }) => {
	res.send(200, { text: 'required' }); // Node.js-like `res.end`
});


// Attach "fetch" event handler
// ~> use `Cache` for request-matching, when permitted
// ~> store Response in `Cache`, when permitted
Cache.listen(API.run);
