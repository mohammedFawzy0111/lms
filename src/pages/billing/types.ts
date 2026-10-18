export interface Invoice {
  id: string;
  invoice_no: string;
  request_id: string;
  request_no: string;
  patient_name: string;
  patient_no: string;
  subtotal: number;
  discount_type: string;
  discount_value: number;
  tax_percent: number;
  additional_fees: number;
  total: number;
  amount_paid: number;
  balance: number;
  status: string;
  notes: string | null;
  created_at: string;
}

export interface InvoiceLineItem {
  test_code: string;
  test_name: string;
  price: number;
}

export interface Payment {
  id: string;
  receipt_no: string;
  amount: number;
  method: string;
  reference_note: string | null;
  received_by_name: string | null;
  paid_at: string;
}

export interface InvoiceDetail {
  invoice: Invoice;
  line_items: InvoiceLineItem[];
  payments: Payment[];
}

/** Adjustment inputs kept as strings so the user can type "1." or clear the box. */
export interface AdjustmentDraft {
  discountType: string;
  discountValue: string;
  taxPercent: string;
  additionalFees: string;
}
