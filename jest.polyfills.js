const { TextEncoder, TextDecoder } = require('util');

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// jsdom provides no web streams; undici needs them at require time.
const { ReadableStream, WritableStream, TransformStream } = require('node:stream/web');
const { MessagePort, MessageChannel } = require('node:worker_threads');

global.ReadableStream ??= ReadableStream;
global.WritableStream ??= WritableStream;
global.TransformStream ??= TransformStream;
global.MessagePort ??= MessagePort;
global.MessageChannel ??= MessageChannel;
global.structuredClone ??= (value) => JSON.parse(JSON.stringify(value));

const { Request, Response, Headers, fetch } = require('undici');

global.Request = Request;
global.Response = Response;
global.Headers = Headers;
global.fetch = fetch;

// Set dummy env vars to satisfy import-time checks in lib/db.ts
process.env.MONGODB_URI = 'mongodb://localhost:27017/chickenloop-test-initial';
process.env.JWT_SECRET = 'test-jwt-secret';
