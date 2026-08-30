"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeHttpBaseUrl = normalizeHttpBaseUrl;
const CONTROL_CHARACTER = /[\u0000-\u001f\u007f]/;
/**
 * Validate and normalize a credential-free HTTP(S) base URL before it is used
 * as an adapter request target. This validates syntax only; it does not assert
 * that the endpoint is local, trusted, or reachable.
 */
function normalizeHttpBaseUrl(value, label = 'endpoint') {
    if (typeof value !== 'string' || value.trim() === '') {
        throw new TypeError(`${label} must be a non-empty HTTP(S) URL`);
    }
    const candidate = value.trim();
    if (CONTROL_CHARACTER.test(candidate)) {
        throw new TypeError(`${label} must not contain control characters`);
    }
    let parsed;
    try {
        parsed = new URL(candidate);
    }
    catch {
        throw new TypeError(`${label} must be a valid absolute HTTP(S) URL`);
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        throw new TypeError(`${label} must use http: or https:`);
    }
    if (!parsed.hostname) {
        throw new TypeError(`${label} must include a hostname`);
    }
    if (parsed.username || parsed.password) {
        throw new TypeError(`${label} must not embed credentials`);
    }
    if (parsed.search || parsed.hash) {
        throw new TypeError(`${label} must not include a query string or fragment`);
    }
    parsed.pathname = parsed.pathname.replace(/\/+$/, '') || '/';
    return parsed.toString().replace(/\/$/, '');
}
//# sourceMappingURL=http-url.js.map