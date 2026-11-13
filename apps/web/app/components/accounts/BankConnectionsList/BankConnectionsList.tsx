import { Button, Card, EmptyState, Icon, StatusBadge } from "@repo/ui";
import { CircleAlert, CircleCheck, Landmark, RefreshCw, Trash2 } from "lucide-react";
import { type FC, useState } from "react";
import { useFetcher, useRevalidator } from "react-router";
import ConnectBankWizard from "~/components/dialogs/connectBankWizard/ConnectBankWizard";
import { ConfirmDialog } from "~/features/feedback/components/ConfirmDialog";
import { useFetcherOutcome } from "~/features/feedback/hooks/useFetcherOutcome";
import {
  connectionActions,
  connectionAvatar,
  connectionInfo,
  connectionList,
  connectionMeta,
  connectionName,
  connectionRow,
  connectionText,
  listDescription,
  listHeader,
  listItem,
  listRoot,
  listTitle,
  spinning,
} from "./BankConnectionsList.styles";

interface BankConnection {
  id: string;
  institutionId: string;
  institutionName: string;
  status: "connected" | "disconnected" | "error";
  lastSyncedAt: string;
  createdAt: string;
}

export interface BankConnectionsListProps {
  connections: BankConnection[];
  /** Bank connection is owner-only (E19 D3-B); without this the connect entry points are hidden. */
  canConnect?: boolean;
}

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "Never";
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const BankConnectionsList: FC<BankConnectionsListProps> = ({
  connections = [],
  canConnect = false,
}) => {
  const fetcher = useFetcher();
  const [disconnectTarget, setDisconnectTarget] = useState<BankConnection | null>(null);
  const disconnectOutcome = useFetcherOutcome(fetcher, {
    onSuccess: () => setDisconnectTarget(null),
  });
  const revalidator = useRevalidator();

  const handleSync = (connectionId: string) => {
    fetcher.submit({ intent: "syncConnection", connectionId }, { method: "POST" });
  };

  const handleConfirmDisconnect = () => {
    if (!disconnectTarget) return;
    disconnectOutcome.begin();
    fetcher.submit(
      { intent: "disconnectConnection", connectionId: disconnectTarget.id },
      { method: "POST" },
    );
  };

  // Nothing to manage and nothing the user may connect: leave the section out entirely.
  if (!canConnect && connections.length === 0) return null;

  return (
    <section aria-labelledby="bank-connections-heading" className={listRoot()}>
      <div className={listHeader()}>
        <div>
          <h2 className={listTitle()} id="bank-connections-heading">
            Synced bank connections
          </h2>
          <p className={listDescription()}>
            Manage your connected bank credentials and balance feeds.
          </p>
        </div>
        {canConnect && connections.length > 0 && (
          <ConnectBankWizard onSuccess={() => revalidator.revalidate()} />
        )}
      </div>

      <ConfirmDialog
        open={disconnectTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDisconnectTarget(null);
            disconnectOutcome.dismiss();
          }
        }}
        pending={disconnectOutcome.pending}
        error={disconnectOutcome.error}
        title={`Disconnect ${disconnectTarget?.institutionName ?? "this bank"}?`}
        description="Synced accounts and transactions from this bank will be removed."
        confirmLabel="Disconnect"
        tone="danger"
        onConfirm={handleConfirmDisconnect}
      />

      {connections.length > 0 ? (
        <ul className={connectionList()}>
          {connections.map((conn) => {
            const isSyncing =
              fetcher.state !== "idle" &&
              fetcher.formData?.get("intent") === "syncConnection" &&
              fetcher.formData?.get("connectionId") === conn.id;

            return (
              <li key={conn.id} className={listItem()}>
                <Card className={connectionRow()}>
                  <div className={connectionInfo()}>
                    <span aria-hidden="true" className={connectionAvatar()}>
                      {conn.institutionName.charAt(0)}
                    </span>
                    <div className={connectionText()}>
                      <p className={connectionName()}>{conn.institutionName}</p>
                      <p className={connectionMeta()}>
                        Last synced: {formatDate(conn.lastSyncedAt)}
                      </p>
                      <StatusBadge
                        size="sm"
                        variant={
                          conn.status === "connected"
                            ? "positive"
                            : conn.status === "disconnected"
                              ? "warning"
                              : "danger"
                        }
                      >
                        {conn.status === "connected" ? (
                          <>
                            <Icon icon={CircleCheck} size="sm" /> Synced
                          </>
                        ) : (
                          <>
                            <Icon icon={CircleAlert} size="sm" />{" "}
                            {conn.status === "disconnected" ? "Disconnected" : "Error"}
                          </>
                        )}
                      </StatusBadge>
                    </div>
                  </div>

                  <div className={connectionActions()}>
                    <Button
                      aria-label={`Sync ${conn.institutionName}`}
                      disabled={isSyncing}
                      size="sm"
                      variant="outline"
                      onClick={() => handleSync(conn.id)}
                    >
                      <span className={isSyncing ? spinning() : undefined}>
                        <Icon icon={RefreshCw} size="sm" />
                      </span>
                      {isSyncing ? "Syncing" : "Sync now"}
                    </Button>
                    <Button
                      aria-label={`Disconnect ${conn.institutionName}`}
                      size="sm"
                      variant="destructive"
                      onClick={() => setDisconnectTarget(conn)}
                    >
                      <Icon icon={Trash2} size="sm" />
                      Disconnect
                    </Button>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      ) : (
        <Card padding="none">
          <EmptyState
            action={
              canConnect ? (
                <ConnectBankWizard onSuccess={() => revalidator.revalidate()} />
              ) : undefined
            }
            description="Connect your banks to pull in balances for current, savings, mortgage, credit card and investment accounts."
            headingLevel="h3"
            icon={<Icon icon={Landmark} size="lg" />}
            title="No connected banks"
          />
        </Card>
      )}
    </section>
  );
};

export default BankConnectionsList;
