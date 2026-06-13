import type React from "react";
export interface ServerEntryConfig {
    App: React.ComponentType;
    providers?: React.ComponentType<{
        children: React.ReactNode;
    }>[];
}
export interface RenderResult {
    html: string;
    helmet: any;
}
export declare function createServerEntry(config: ServerEntryConfig): (url: string) => RenderResult;
//# sourceMappingURL=entry-server.d.ts.map