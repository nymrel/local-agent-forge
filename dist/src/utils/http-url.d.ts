/**
 * Validate and normalize a credential-free HTTP(S) base URL before it is used
 * as an adapter request target. This validates syntax only; it does not assert
 * that the endpoint is local, trusted, or reachable.
 */
export declare function normalizeHttpBaseUrl(value: string, label?: string): string;
//# sourceMappingURL=http-url.d.ts.map