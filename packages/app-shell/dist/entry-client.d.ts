import type React from "react";
export interface ClientEntryConfig {
    App: React.ComponentType;
    providers?: React.ComponentType<{
        children: React.ReactNode;
    }>[];
}
export declare function createClientEntry(config: ClientEntryConfig): void;
//# sourceMappingURL=entry-client.d.ts.map