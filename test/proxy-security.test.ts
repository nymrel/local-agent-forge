import assert from 'node:assert/strict';
import * as http from 'node:http';
import type { AddressInfo } from 'node:net';
import { after, before, describe, test } from 'node:test';
import { createHttpProxyServer, DEFAULT_PROXY_HOST } from '../src/cli.js';

interface ProxyResponse {
  body: string;
  headers: http.IncomingHttpHeaders;
  statusCode: number;
}

function sendRequest(
  port: number,
  body: string | Buffer,
  headers: http.OutgoingHttpHeaders = {}
): Promise<ProxyResponse> {
  return new Promise((resolve, reject) => {
    const request = http.request(
      {
        host: DEFAULT_PROXY_HOST,
        method: 'POST',
        path: '/route',
        port,
        headers: {
          'Content-Length': Buffer.byteLength(body),
          'Content-Type': 'application/json',
          ...headers
        }
      },
      (response) => {
        const chunks: Buffer[] = [];
        response.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
        response.on('end', () => {
          resolve({
            body: Buffer.concat(chunks).toString('utf8'),
            headers: response.headers,
            statusCode: response.statusCode ?? 0
          });
        });
      }
    );
    request.on('error', reject);
    request.end(body);
  });
}

describe('loopback proxy security boundary', () => {
  const server = createHttpProxyServer();
  let port = 0;

  before(async () => {
    await new Promise<void>((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, DEFAULT_PROXY_HOST, resolve);
    });
    const address = server.address() as AddressInfo;
    assert.equal(address.address, DEFAULT_PROXY_HOST);
    port = address.port;
  });

  after(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  });

  test('rejects invalid JSON without enabling browser cross-origin access', async () => {
    const response = await sendRequest(port, '{not-json');

    assert.equal(response.statusCode, 400);
    assert.deepEqual(JSON.parse(response.body), { error: 'Request body must contain valid JSON' });
    assert.equal(response.headers['access-control-allow-origin'], undefined);
    assert.equal(response.headers['cache-control'], 'no-store');
    assert.equal(response.headers['cross-origin-resource-policy'], 'same-origin');
    assert.equal(response.headers['x-content-type-options'], 'nosniff');
  });

  test('rejects request bodies larger than one MiB', async () => {
    const response = await sendRequest(port, Buffer.alloc(1_048_577, 0x61));

    assert.equal(response.statusCode, 413);
    assert.match(JSON.parse(response.body).error, /exceeds 1048576 bytes/);
  });

  test('rejects spoofed Host headers used by DNS rebinding', async () => {
    const response = await sendRequest(port, '{}', { Host: 'attacker.example' });
    const userInfoResponse = await sendRequest(port, '{}', { Host: `attacker@127.0.0.1:${port}` });

    assert.equal(response.statusCode, 421);
    assert.deepEqual(JSON.parse(response.body), { error: 'Request Host must match the loopback listener' });
    assert.equal(userInfoResponse.statusCode, 421);
  });

  test('rejects simple cross-site POST content types', async () => {
    const response = await sendRequest(port, '{}', { 'Content-Type': 'text/plain' });

    assert.equal(response.statusCode, 415);
    assert.deepEqual(JSON.parse(response.body), { error: 'Content-Type must be application/json' });
  });
});
