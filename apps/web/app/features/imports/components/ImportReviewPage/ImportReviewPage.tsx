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
  formatCount,
  formatDate,
  invalidRowsLine,
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
  const resultRef = useRef<HTMLParagraphElement>(null);
  const movedByAction = useRef(false);
  const actionsRef = useRef(actions);
  actionsRef.current = actions;

  useEffect(() => setBatch(loadedBatch), [loadedBatch]);

  // After commit or undo the triggering button is gone: move focus to the outcome line.
  useEffect(() => {
    if (movedByAction.current && (batch.status === "committed" || batch.status === "reverted")) {
      movedByAction.current = false;
      resultRef.current?.focus();
    }
  }, [batch.status]);

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
      const done = await actions.commit(map, overwriteKeys(preview.rows, ticked));
      movedByAction.current = true;
      setBatch(done);
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
      const done = await actions.revert();
      movedByAction.current = true;
      setUndoOpen(false);
      setBatch(done);
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
          title={reverted ? "Import undone" : "Import saved"}
        />
        {reverted && batch.revertedAt ? (
          <p className={statusLine()}>Undone on {formatDate(batch.revertedAt)}.</p>
        ) : batch.committedAt ? (
          <p className={statusLine()}>Saved on {formatDate(batch.committedAt)}.</p>
        ) : null}
        <KpiStrip
          items={[
            <KpiCard key="new" label="New balances" value={formatCount(batch.counts.new ?? 0)} />,
            <KpiCard key="ow" label="Replaced" value={formatCount(batch.counts.overwrite ?? 0)} />,
            <KpiCard key="un" label="Unchanged" value={formatCount(batch.counts.unchanged ?? 0)} />,
            <KpiCard key="sk" label="Skipped" value={formatCount(batch.counts.skipped ?? 0)} />,
          ]}
        />
        <p className={statusLine()} id="import-result" ref={resultRef} role="status" tabIndex={-1}>
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
          cancelLabel="Cancel"
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
            <KpiCard key="new" label="New balances" value={formatCount(plan.new)} />,
            <KpiCard key="ow" label="Replaced" value={formatCount(plan.overwrite)} />,
            <KpiCard key="un" label="Unchanged" value={formatCount(plan.unchanged)} />,
            <KpiCard key="kept" label="Skipped" value={formatCount(plan.kept)} />,
          ]}
        />
      ) : null}

      {p.totals.errors > 0 ? (
        <InlineAlert tone="info">{invalidRowsLine(p.totals.errors)}</InlineAlert>
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
