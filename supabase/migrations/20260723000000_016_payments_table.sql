/*
  Payments table — tracks individual payment transactions linked to invoices.
  Each payment references an invoice and a person (customer contact).
*/

-- ============================================================
-- payments
-- ============================================================
CREATE TABLE IF NOT EXISTS public.payments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invoice_id  uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  person_id   uuid REFERENCES public.people(id) ON DELETE SET NULL,
  amount      numeric NOT NULL DEFAULT 0,
  method      text NOT NULL DEFAULT 'Bank Transfer'
              CHECK (method IN ('Credit Card','Bank Transfer','PayPal','Wire Transfer','Cash','Other')),
  status      text NOT NULL DEFAULT 'pending'
              CHECK (status IN ('completed','pending','failed','refunded')),
  reference   text,
  notes       text,
  paid_at     timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS policies
-- ============================================================
CREATE POLICY "payments_select" ON public.payments
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "payments_insert" ON public.payments
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "payments_update" ON public.payments
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "payments_delete" ON public.payments
  FOR DELETE USING (user_id = auth.uid());

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS payments_user_idx ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS payments_invoice_idx ON public.payments(invoice_id);
CREATE INDEX IF NOT EXISTS payments_person_idx ON public.payments(person_id);
CREATE INDEX IF NOT EXISTS payments_status_idx ON public.payments(status);

-- ============================================================
-- Auto-update trigger for updated_at
-- ============================================================
CREATE TRIGGER touch_payments
  BEFORE UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_updated_at();
