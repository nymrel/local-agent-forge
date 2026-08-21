"use strict";
/**
 * @nymrel/local-forge
 * Zero-cloud local GPU orchestrator, dynamic model router, and MCP server for agentic workflows.
 * Copyright (c) 2026 Nymrel / JalenBuilds LLC
 */
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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runCli = void 0;
__exportStar(require("./adapters/index.js"), exports);
__exportStar(require("./router/index.js"), exports);
__exportStar(require("./economics/index.js"), exports);
__exportStar(require("./mcp/index.js"), exports);
var cli_js_1 = require("./cli.js");
Object.defineProperty(exports, "runCli", { enumerable: true, get: function () { return cli_js_1.runCli; } });
//# sourceMappingURL=index.js.map