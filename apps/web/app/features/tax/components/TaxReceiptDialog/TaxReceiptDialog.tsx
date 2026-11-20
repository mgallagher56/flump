import type { TaxRecord } from "@flump/finance-engine";
import { Button, Dialog, Icon } from "@repo/ui";
import { FileText } from "lucide-react";
import { type FC, useEffect, useState } from "react";
import {
  body,
  empty,
  fileName,
  fileRow,
  footer,
  image,
  preview,
  tile,
} from "./TaxReceiptDialog.styles";

export interface TaxReceiptDialogProps {
  /** The record whose receipt to show, or null when closed. */
  record: TaxRecord | null;
  onClose: () => void;
}

const receiptUrl = (id: string) => `/app/tax/receipts/${encodeURIComponent(id)}`;

/**
 * Shows a stored receipt in one frame: an image as a preview, a PDF (or an image that cannot be
 * shown) as a file tile. Under the frame, the file's name and one action: open the image in a new
 * tab, or download the PDF. Removing a receipt is done in the record's own dialog.
 */
export const TaxReceiptDialog: FC<TaxReceiptDialogProps> = ({ record, onClose }) => {
  const isPdf = record?.receiptMimeType?.includes("pdf") ?? false;
  const [failed, setFailed] = useState(false);
  const recordId = record?.id;
  // A new record gets a fresh try at its preview.
  useEffect(() => {
    if (recordId !== undefined) setFailed(false);
  }, [recordId]);
  const filename = record?.receiptFilename || (isPdf ? "receipt.pdf" : "receipt");

  return (
    <Dialog
      open={record !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      size="md"
      title={record ? `Receipt for ${record.name}` : "Receipt"}
      id="tax-receipt-dialog"
    >
      <div className={body()}>
        {record?.hasReceipt ? (
          <>
            <div className={preview()}>
              {isPdf || failed ? (
                <span className={tile()}>
                  <Icon icon={FileText} size="lg" />
                  {isPdf ? "PDF document" : "No preview for this file"}
                </span>
              ) : (
                <img
                  alt={`Receipt for ${record.name}`}
                  className={image()}
                  src={receiptUrl(record.id)}
                  onError={() => setFailed(true)}
                />
              )}
            </div>
            <div className={fileRow()}>
              <span className={fileName()}>{filename}</span>
              <Button asChild size="sm" variant="outline">
                {isPdf ? (
                  <a download={filename} href={receiptUrl(record.id)}>
                    Download PDF
                  </a>
                ) : (
                  <a href={receiptUrl(record.id)} rel="noopener noreferrer" target="_blank">
                    Open
                  </a>
                )}
              </Button>
            </div>
          </>
        ) : (
          <p className={empty()}>No receipt is saved for this record.</p>
        )}
        <div className={footer()}>
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Dialog>
  );
};
