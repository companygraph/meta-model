export declare function fetchCore(tag: string, get?: Get): Promise<Map<string, string>>;
export type Get = (url: string) => Promise<{
    ok: boolean;
    status?: number;
    arrayBuffer(): Promise<ArrayBuffer>;
}>;
