"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const http = __importStar(require("node:http"));
const node_test_1 = require("node:test");
const cli_js_1 = require("../src/cli.js");
function sendRequest(port, body, headers = {}) {
    return new Promise((resolve, reject) => {
        const request = http.request({
            host: cli_js_1.DEFAULT_PROXY_HOST,
            method: 'POST',
            path: '/route',
            port,
            headers: {
                'Content-Length': Buffer.byteLength(body),
                'Content-Type': 'application/json',
                ...headers
            }
        }, (response) => {
            const chunks = [];
            response.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
            response.on('end', () => {
                resolve({
                    body: Buffer.concat(chunks).toString('utf8'),
                    headers: response.headers,
                    statusCode: response.statusCode ?? 0
                });
            });
        });
        request.on('error', reject);
        request.end(body);
    });
}
(0, node_test_1.describe)('loopback proxy security boundary', () => {
    const server = (0, cli_js_1.createHttpProxyServer)();
    let port = 0;
    (0, node_test_1.before)(async () => {
        await new Promise((resolve, reject) => {
            server.once('error', reject);
            server.listen(0, cli_js_1.DEFAULT_PROXY_HOST, resolve);
        });
        const address = server.address();
        strict_1.default.equal(address.address, cli_js_1.DEFAULT_PROXY_HOST);
        port = address.port;
    });
    (0, node_test_1.after)(async () => {
        await new Promise((resolve, reject) => {
            server.close((error) => (error ? reject(error) : resolve()));
        });
    });
    (0, node_test_1.test)('rejects invalid JSON without enabling browser cross-origin access', async () => {
        const response = await sendRequest(port, '{not-json');
        strict_1.default.equal(response.statusCode, 400);
        strict_1.default.deepEqual(JSON.parse(response.body), { error: 'Request body must contain valid JSON' });
        strict_1.default.equal(response.headers['access-control-allow-origin'], undefined);
        strict_1.default.equal(response.headers['cache-control'], 'no-store');
        strict_1.default.equal(response.headers['cross-origin-resource-policy'], 'same-origin');
        strict_1.default.equal(response.headers['x-content-type-options'], 'nosniff');
    });
    (0, node_test_1.test)('rejects request bodies larger than one MiB', async () => {
        const response = await sendRequest(port, Buffer.alloc(1_048_577, 0x61));
        strict_1.default.equal(response.statusCode, 413);
        strict_1.default.match(JSON.parse(response.body).error, /exceeds 1048576 bytes/);
    });
    (0, node_test_1.test)('rejects spoofed Host headers used by DNS rebinding', async () => {
        const response = await sendRequest(port, '{}', { Host: 'attacker.example' });
        const userInfoResponse = await sendRequest(port, '{}', { Host: `attacker@127.0.0.1:${port}` });
        strict_1.default.equal(response.statusCode, 421);
        strict_1.default.deepEqual(JSON.parse(response.body), { error: 'Request Host must match the loopback listener' });
        strict_1.default.equal(userInfoResponse.statusCode, 421);
    });
    (0, node_test_1.test)('rejects simple cross-site POST content types', async () => {
        const response = await sendRequest(port, '{}', { 'Content-Type': 'text/plain' });
        strict_1.default.equal(response.statusCode, 415);
        strict_1.default.deepEqual(JSON.parse(response.body), { error: 'Content-Type must be application/json' });
    });
});
//# sourceMappingURL=proxy-security.test.js.map