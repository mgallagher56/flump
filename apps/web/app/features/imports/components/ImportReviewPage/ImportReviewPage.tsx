import {
  Button,
  ConfirmDialog,
  EmptyState,
  InlineAlert,
  KpiCard,
  KpiStrip,
  PageHeader,
  StatusBadge,
} from "@repo/ui";
import { type FC, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import {
  COMMIT_ERROR,
  commitButtonLabel,
  EXPIRED_BODY,
  EXPIRED_TITLE,
  expiryLine,
  formatDate,
  PREVIEW_ERROR,
  planSentence,
  REVERT_ERROR,
  reviewDescription,
  STATUS_LABEL,
  STATUS_TONE,
  savedSentence,
  UNDO_CONFIRM,
  undoneSentence,
} from "../../importCopy";
import {
  type AccountMap,
  commitPlan,
  daysLeft,
  type ExistingAccount,
  type ImportBatch,
  type ImportPreview,
  initialAccountMap,
  monthRange,
  overwriteKeys,
} from "../../importModel";
import type { ImportActions } from "../../useImportActions";
import { AccountMappingPanel } from "../AccountMappingPanel";
import { ImportDiffTable } from "../ImportDiffTable";
import { actionsRow, commitBar, commitSummary, page, statusLine } from "./ImportReviewPage.styles";

export interface ImportReviewPageProps {
  batch: ImportBatch;
  /** The dry run for the initial account map; null when the batch is no longer open. */
  initialPreview: ImportPreview | null;
  existingAccounts: readonly ExistingAccount[];
  actions: ImportActions;
  now?: Date;
}

const BACK_LINK = (
  <Button asChild variant="secondary">
    <Link to="/app/imports">All imports</Link>
  </Button>
);

/**
 * The review, commit and undo flow for a staged import (E17 re-plan PR E). Nothing is written
 * until the user confirms; the commit and the undo run under the web session. Flagged rows (a
 * value already saved in Flump) stay as they are unless ticked.
 */
export const ImportReviewPage: FC<ImportReviewPageProps> = ({
  batch: loadedBatch,
  initialPreview,
  existingAccounts,
  actions,
  now,
}) => {
  const [batch, setBatch] = useState<ImportBatch>(loadedBatch);
  const [preview, setPreview] = useState<ImportPreview | null>(initialPreview);
  const [map, setMap] = useState<AccountMap>(() =>
    initialPreview ? initialAccountMap(initialPreview.accounts) : {},
  );
  const [ticked, setTicked] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [committing, setCommitting] = useState(false);
  const [undoOpen, setUndoOpen] = useState(false);
  const [undoing, setUndoing] = useState(false);
  const [undoError, setUndoError] = useState<string | null>(null);
  const firstMap = useRef(true);
  const actionsRef = useRef(actions);
  actionsRef.current = actions;

  useEffect(() => setBatch(loadedBatch), [loadedBatch]);

  // Re-run the dry run whenever the account map changes (not on first render: the loader ran it).
  useEffect(() => {
    if (firstMap.current) {
      firstMap.current = false;
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    actionsRef.current
      .preview(map, controller.signal)
      .then((next) => {
        setPreview(next);
        const flagged = new Set(next.rows.filter((r) => r.needsTick).map((r) => r.key));
        setTicked((prev) => new Set([...prev].filter((k) => flagged.has(k))));
      })
      .catch(() => {
        if (!controller.signal.aborted) setError(PREVIEW_ERROR);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [map]);

  const plan = useMemo(
    () => (preview ? commitPlan(preview.rows, ticked) : null),
    [preview, ticked],
  );

  const onCommit = async () => {
    if (!preview) return;
    setCommitting(true);
    setError(null);
    try {
      setBatch(await actions.commit(map, overwriteKeys(preview.rows, ticked)));
    } catch {
      setError(COMMIT_ERROR);
    } finally {
      setCommitting(false);
    }
  };

  const onUndo = async () => {
    setUndoing(true);
    setUndoError(null);
    try {
      setBatch(await actions.revert());
      setUndoOpen(false);
    } catch {
      setUndoError(REVERT_ERROR);
    } finally {
      setUndoing(false);
    }
  };

  const badge = (
    <StatusBadge variant={STATUS_TONE[batch.status]}>{STATUS_LABEL[batch.status]}</StatusBadge>
  );

  if (batch.status === "expired" || (batch.status === "staged" && !preview)) {
    return (
      <div className={page()} data-testid="import-review" id="import-review">
        <PageHeader badge={badge} title="Review import" />
        <EmptyState
          action={BACK_LINK}
          description={EXPIRED_BODY}
          id="import-expired"
          title={EXPIRED_TITLE}
        />
      </div>
    );
  }

  if (batch.status === "committed" || batch.status === "reverted") {
    const reverted = batch.status === "reverted";
    return (
      <div className={page()} data-testid="import-review" id="import-review">
        <PageHeader
          actions={BACK_LINK}
          badge={badge}
          description={
            reverted && batch.revertedAt
              ? `Undone on ${formatDate(batch.revertedAt)}.`
              : batch.committedAt
                ? `Saved on ${formatDate(batch.committedAt)}.`
                : undefined
          }
          title={reverted ? "Import undone" : "Import saved"}
        />
        <KpiStrip
          items={[
            <KpiCard key="new" label="New balances" value={String(batch.counts.new ?? 0)} />,
            <KpiCard key="ow" label="Replaced" value={String(batch.counts.overwrite ?? 0)} />,
            <KpiCard key="un" label="Unchanged" value={String(batch.counts.unchanged ?? 0)} />,
            <KpiCard
              key="sk"
              label="Kept as they were"
              value={String(batch.counts.skipped ?? 0)}
            />,
          ]}
        />
        <p className={statusLine()} id="import-result">
          {reverted && batch.revert ? undoneSentence(batch.revert) : savedSentence(batch.counts)}
        </p>
        {reverted ? null : (
          <div className={actionsRow()}>
            <Button asChild>
              <Link to="/app/accounts/history">View net worth history</Link>
            </Button>
            <Button
              data-testid="import-undo"
              id="import-undo"
              onClick={() => setUndoOpen(true)}
              type="button"
              variant="secondary"
            >
              Undo import
            </Button>
          </div>
        )}
        <ConfirmDialog
          cancelLabel="Keep import"
          confirmLabel="Undo import"
          description={UNDO_CONFIRM}
          error={undoError}
          id="import-undo-dialog"
          onConfirm={onUndo}
          onOpenChange={setUndoOpen}
          open={undoOpen}
          pending={undoing}
          pendingLabel="Undoing…"
          title="Undo this import?"
        />
      </div>
    );
  }

  // Staged, with a preview.
  const p = preview as ImportPreview;
  const writes = plan ? plan.new + plan.overwrite : 0;
  return (
    <div className={page()} data-testid="import-review" id="import-review">
      <PageHeader
        actions={BACK_LINK}
        badge={badge}
        description={reviewDescription(p.rows.length, p.accounts.length, monthRange(p.rows))}
        title="Review import"
      />
      <p className={statusLine()}>{expiryLine(daysLeft(p.expiresAt, now))}</p>

      {plan ? (
        <KpiStrip
          items={[
            <KpiCard key="new" label="New balances" value={String(plan.new)} />,
            <KpiCard key="ow" label="Replaced" value={String(plan.overwrite)} />,
            <KpiCard key="un" label="Unchanged" value={String(plan.unchanged)} />,
            <KpiCard key="kept" label="Kept as they are" value={String(plan.kept)} />,
          ]}
        />
      ) : null}

      {p.totals.errors > 0 ? (
        <InlineAlert tone="info">
          {`${p.totals.errors} staged ${p.totals.errors === 1 ? "row was" : "rows were"} not valid (for example a future month) and will not be saved.`}
        </InlineAlert>
      ) : null}

      <AccountMappingPanel
        accounts={p.accounts}
        disabled={committing}
        existing={existingAccounts}
        map={map}
        onChange={(ref, id) => setMap((m) => ({ ...m, [ref]: id }))}
      />

      <ImportDiffTable
        accounts={p.accounts}
        disabled={committing || loading}
        onToggle={(key, checked) =>
          setTicked((prev) => {
            const next = new Set(prev);
            if (checked) next.add(key);
            else next.delete(key);
            return next;
          })
        }
        rows={p.rows}
        ticked={ticked}
      />

      {error ? (
        <InlineAlert data-testid="import-error" id="import-error" tone="danger">
          {error}
        </InlineAlert>
      ) : null}

      <div className={commitBar()}>
        <p
          aria-live="polite"
          className={commitSummary()}
          data-testid="import-plan"
          id="import-plan"
        >
          {loading ? "Updating changes…" : plan ? planSentence(plan) : null}
        </p>
        <Button
          data-testid="import-commit"
          id="import-commit"
          disabled={loading || committing || writes === 0}
          onClick={onCommit}
          type="button"
        >
          {committing ? "Saving…" : commitButtonLabel(writes)}
        </Button>
      </div>
    </div>
  );
};

export default ImportReviewPage;
