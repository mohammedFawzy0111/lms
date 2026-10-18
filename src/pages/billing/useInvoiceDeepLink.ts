import { useEffect, useRef } from "react";
import { api, errMsg } from "../../lib/api";
import type { InvoiceDetail } from "./types";

/**
 * Handles `?request=<id>` coming from the Requests page: opens that request's
 * invoice, creating it first if it doesn't exist yet. Runs once per request id
 * (the ref also stops React StrictMode's double effect from creating two invoices).
 */
export function useInvoiceDeepLink(
  requestId: string | null,
  actorId: string | undefined,
  onOpen: (invoiceId: string) => void,
  onCreated: () => void,
  onError: (msg: string) => void,
) {
  const handled = useRef<string | null>(null);

  useEffect(() => {
    if (!requestId || !actorId || handled.current === requestId) return;
    handled.current = requestId;

    (async () => {
      try {
        const existing = await api<string | null>("cmd_get_invoice_by_request", { requestId });
        if (existing) return onOpen(existing);

        const created = await api<InvoiceDetail>("cmd_create_invoice", {
          actorId,
          invoice: {
            request_id: requestId,
            discount_type: "fixed",
            discount_value: 0,
            tax_percent: 0,
            additional_fees: 0,
            notes: null,
          },
        });
        onOpen(created.invoice.id);
        onCreated();
      } catch (e) {
        onError(errMsg(e));
      }
    })();
  }, [requestId, actorId, onOpen, onCreated, onError]);
}
