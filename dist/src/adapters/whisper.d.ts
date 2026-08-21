/**
 * Whisper Adapter (Default Port: 8080)
 * Connects directly to local Whisper / faster-whisper / whisper.cpp servers for $0 local audio transcription
 */
import { AdapterHealth, AdapterType } from './base.js';
export interface WhisperTranscriptionResult {
    text: string;
    language?: string;
    durationSeconds?: number;
    latencyMs: number;
    segments?: Array<{
        start: number;
        end: number;
        text: string;
    }>;
}
export interface WhisperOptions {
    endpoint?: string;
    language?: string;
    temperature?: number;
    model?: string;
}
export declare class WhisperAdapter {
    readonly type: AdapterType;
    readonly defaultEndpoint = "http://127.0.0.1:8080";
    endpoint: string;
    constructor(options?: {
        endpoint?: string;
    });
    checkHealth(): Promise<AdapterHealth>;
    transcribe(audioData: Uint8Array | Buffer | Blob, options?: WhisperOptions): Promise<WhisperTranscriptionResult>;
}
//# sourceMappingURL=whisper.d.ts.map