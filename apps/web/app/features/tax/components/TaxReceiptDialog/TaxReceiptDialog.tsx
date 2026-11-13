import type { TaxRecord } from "@flump/finance-engine";
import { Button, Dialog, Icon } from "@repo/ui";
import { FileText } from "lucide-react";
import type { FC } from "react";
import { body, empty, fileName, footer, image, pdfBox } from "./TaxReceiptDialog.styles";

export interface TaxReceiptDialogProps {
  /** The record whose receipt to show, or null when closed. */
  record: TaxRecord | null;
  onClose: () => void;
}

const receiptUrl = (id: string) => `/app/tax/receipts/${encodeURIComponent(id)}`;

/** Shows a stored receipt: images inline, PDFs as a download. */
export const TaxReceiptDialog: FC<TaxReceiptDialogProps> = ({ record, onClose }) => {
  const isPdf = record?.receiptMimeType?.includes("pdf");
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
          isPdf ? (
            <div className={pdfBox()}>
              <Icon icon={FileText} size="lg" />
              <span className={fileName()}>{record.receiptFilename}</span>
              <span>PDF document</span>
              <Button asChild size="sm">
                <a download={record.receiptFilename || "receipt.pdf"} href={receiptUrl(record.id)}>
                  Download PDF
                </a>
              </Button>
            </div>
          ) : (
            <>
              <img
                alt={`Receipt for ${record.name}`}
                className={image()}
                src={receiptUrl(record.id)}
              />
              <span className={fileName()}>{record.receiptFilename}</span>
            </>
          )
        ) : (
          <p className={empty()}>There is no receipt stored for this record.</p>
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

export default TaxReceiptDialog;
