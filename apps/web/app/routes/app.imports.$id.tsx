import type { ReactElement } from "react";
import { data, type LoaderFunctionArgs, type MetaFunction, useLoaderData } from "react-router";
import { ImportReviewPage } from "~/features/imports/components/ImportReviewPage";
import { loadImportReview } from "~/features/imports/loadImportReview.server";
import { useImportActions } from "~/features/imports/useImportActions";

export const meta: MetaFunction = () => [{ title: "Review import | Flump" }];

/**
 * The review page a staged import's `reviewUrl` points at (E17 re-plan PR E). The loader reads
 * the batch and a dry run; commit and undo run from the browser under the web session.
 */
export const loader = async (args: LoaderFunctionArgs) => data(await loadImportReview(args));

const ImportReview = (): ReactElement => {
  const { batch, initialPreview, existingAccounts } = useLoaderData<typeof loader>();
  const actions = useImportActions(batch.batchId);
  return (
    <ImportReviewPage
      actions={actions}
      batch={batch}
      existingAccounts={existingAccounts}
      initialPreview={initialPreview}
      key={batch.batchId}
    />
  );
};
export default ImportReview;

export { RouteErrorBoundary as ErrorBoundary } from "~/features/feedback/components/RouteErrorBoundary";
