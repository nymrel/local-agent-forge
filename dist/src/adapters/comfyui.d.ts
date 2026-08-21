/**
 * ComfyUI Adapter (Default Port: 8188)
 * Connects directly to local ComfyUI graph execution engine for zero-cloud image and asset generation
 */
import { AdapterHealth, AdapterType } from './base.js';
export interface ComfyImageResult {
    promptId: string;
    images: Array<{
        filename: string;
        subfolder: string;
        type: string;
        url?: string;
        base64?: string;
    }>;
    durationMs: number;
    status: 'completed' | 'queued' | 'error';
    nodeCount: number;
}
export interface ComfyWorkflowOptions {
    prompt?: string;
    negativePrompt?: string;
    width?: number;
    height?: number;
    steps?: number;
    cfg?: number;
    samplerName?: string;
    scheduler?: string;
    checkpoint?: string;
    seed?: number;
    customWorkflow?: Record<string, any>;
}
export declare class ComfyUIAdapter {
    readonly type: AdapterType;
    readonly defaultEndpoint = "http://127.0.0.1:8188";
    endpoint: string;
    private clientId;
    constructor(options?: {
        endpoint?: string;
        clientId?: string;
    });
    checkHealth(): Promise<AdapterHealth>;
    buildDefaultTxt2ImgWorkflow(options: ComfyWorkflowOptions): Record<string, any>;
    queuePrompt(workflow: Record<string, any>): Promise<{
        prompt_id: string;
        number: number;
    }>;
    generateImage(options: ComfyWorkflowOptions): Promise<ComfyImageResult>;
}
//# sourceMappingURL=comfyui.d.ts.map