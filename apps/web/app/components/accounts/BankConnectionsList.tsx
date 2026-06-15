import { css } from "@repo/ui/styled-system/css";
import type { FC } from "react";
import {
  FaCheckCircle,
  FaExclamationTriangle,
  FaSyncAlt,
  FaTrashAlt,
  FaUniversity,
} from "react-icons/fa";
import { useFetcher } from "react-router";
import FLPButton from "~/components/core/buttons/FLPButton";
import FLPHeading from "~/components/core/typography/FLPHeading";
import FLPText from "~/components/core/typography/FLPText";
import ConnectBankWizard from "~/components/dialogs/connectBankWizard/ConnectBankWizard";

interface BankConnection {
  id: string;
  institutionId: string;
  institutionName: string;
  status: "connected" | "disconnected" | "error";
  lastSyncedAt: string;
  createdAt: string;
}

interface BankConnectionsListProps {
  connections: BankConnection[];
}

const INSTITUTION_COLORS: { [key: string]: string } = {
  monzo: "#ff4f5e",
  hsbc: "#db0011",
  barclays: "#00aeef",
  chase: "#112e51",
  revolut: "#111118",
  fidelity: "#008a00",
  vanguard: "#a8201a",
};

const BankConnectionsList: FC<BankConnectionsListProps> = ({ connections = [] }) => {
  const fetcher = useFetcher();

  const handleSync = (connectionId: string) => {
    fetcher.submit({ intent: "syncConnection", connectionId }, { method: "POST" });
  };

  const handleDisconnect = (connectionId: string) => {
    if (
      confirm(
        "Are you sure you want to disconnect this bank account? All synced accounts and transactions will be removed.",
      )
    ) {
      fetcher.submit({ intent: "disconnectConnection", connectionId }, { method: "POST" });
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (_e) {
      return "Never";
    }
  };

  // Styles
  const containerStyle = css({
    display: "flex",
    flexDirection: "column",
    gap: "24px",
    marginTop: "16px",
  });

  const listStyle = css({
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  });

  const rowStyle = css({
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "20px",
    borderRadius: "lg",
    backgroundColor: "card",
    border: "1px solid",
    borderColor: "border",
    boxShadow: "xs",
    flexWrap: { base: "wrap", sm: "nowrap" },
    gap: "16px",
  });

  const infoColStyle = css({
    display: "flex",
    alignItems: "center",
    gap: "16px",
  });

  const logoStyle = (color: string) =>
    css({
      width: "48px",
      height: "48px",
      borderRadius: "full",
      backgroundColor: color,
      color: "white",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontWeight: "bold",
      fontSize: "lg",
      flexShrink: 0,
    });

  const statusBadgeStyle = (status: string) => {
    let bg = "rgba(16, 185, 129, 0.1)";
    let color = "#10b981";
    if (status === "error") {
      bg = "rgba(239, 68, 68, 0.1)";
      color = "#ef4444";
    }
    return css({
      display: "inline-flex",
      alignItems: "center",
      gap: "4px",
      fontSize: "10px",
      fontWeight: "bold",
      padding: "2px 8px",
      borderRadius: "full",
      backgroundColor: bg,
      color: color,
      textTransform: "uppercase",
      marginTop: "4px",
    });
  };

  const actionGroupStyle = css({
    display: "flex",
    gap: "12px",
    width: { base: "100%", sm: "auto" },
    justifyContent: { base: "flex-end", sm: "flex-start" },
  });

  const emptyCardStyle = css({
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "64px 24px",
    borderRadius: "lg",
    border: "2px dashed",
    borderColor: "border",
    textAlign: "center",
    backgroundColor: "surface",
    gap: "16px",
  });

  const emptyIconStyle = css({
    fontSize: "48px",
    color: "gray.300",
  });

  return (
    <div className={containerStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <FLPHeading as="h2" size="md">
            Synced Bank Connections
          </FLPHeading>
          <FLPText color="text.muted" fontSize="sm">
            Manage your connected bank credentials and balance feeds.
          </FLPText>
        </div>
        <ConnectBankWizard onSuccess={() => {}} />
      </div>

      {connections.length > 0 ? (
        <div className={listStyle}>
          {connections.map((conn) => {
            const isSyncing =
              fetcher.state !== "idle" &&
              fetcher.formData?.get("intent") === "syncConnection" &&
              fetcher.formData?.get("connectionId") === conn.id;

            return (
              <div key={conn.id} className={rowStyle}>
                <div className={infoColStyle}>
                  <div className={logoStyle(INSTITUTION_COLORS[conn.institutionId] || "#64748b")}>
                    {conn.institutionName.charAt(0)}
                  </div>
                  <div>
                    <FLPText fontWeight="bold" fontSize="md">
                      {conn.institutionName}
                    </FLPText>
                    <FLPText color="text.muted" fontSize="xs">
                      Last synced: {formatDate(conn.lastSyncedAt)}
                    </FLPText>
                    <div>
                      <span className={statusBadgeStyle(conn.status)}>
                        {conn.status === "connected" ? (
                          <>
                            <FaCheckCircle size={10} /> Synced
                          </>
                        ) : (
                          <>
                            <FaExclamationTriangle size={10} /> Error
                          </>
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                <div className={actionGroupStyle}>
                  <FLPButton
                    disabled={isSyncing}
                    onClick={() => handleSync(conn.id)}
                    variant="outline"
                    size="sm"
                  >
                    <FaSyncAlt
                      className={
                        isSyncing ? css({ animation: "spin 1s linear infinite" }) : undefined
                      }
                      style={{ marginRight: "6px" }}
                    />
                    {isSyncing ? "Syncing..." : "Sync Now"}
                  </FLPButton>
                  <FLPButton
                    onClick={() => handleDisconnect(conn.id)}
                    variant="destructive"
                    size="sm"
                  >
                    <FaTrashAlt style={{ marginRight: "6px" }} />
                    Disconnect
                  </FLPButton>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className={emptyCardStyle}>
          <FaUniversity className={emptyIconStyle} />
          <div>
            <FLPHeading as="h3" size="md">
              No Connected Banks
            </FLPHeading>
            <FLPText
              color="text.muted"
              fontSize="sm"
              style={{
                marginTop: "4px",
                maxWidth: "400px",
                marginLeft: "auto",
                marginRight: "auto",
              }}
            >
              Connect your banks to automatically pull in balances and transactions for checking,
              savings, mortgages, credit cards, and investments.
            </FLPText>
          </div>
          <div style={{ marginTop: "8px" }}>
            <ConnectBankWizard onSuccess={() => {}} />
          </div>
        </div>
      )}
    </div>
  );
};

export default BankConnectionsList;
