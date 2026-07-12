demo@1cngcrm.com / Demo1234!

Change and Update Feature  

Major CRM enhancement with deal pipeline, quotes, invoices, reports, API sync, and UI redesign

Database Migration (005) — Added new columns and tables:
- deals: customer_id, project_volume, sale_type, quotation_status, deal_type
- quotes: deal_id (link quotes to specific deals)
- invoices: deal_id (link invoices to deals)
- New api_sync_connections table for external API sync management
- New api_sync_logs table for sync operation audit trails
- RLS policies on all new tables

Pipeline (Deals) — Full enhancement with project volume, deal type, sale type, customer linkage, quotation status, and a "Generate Quote" button on each deal card that creates a quote from the deal with one click.

Quotes — Now deal-based: select a deal to auto-fill customer and amount. Generating a quote from a deal updates the deal's quotation status. Version tracking on edits.

Invoices — Full CRUD with deal linkage: select a deal to auto-fill customer and amount. Mark paid writes to payment history. Summary cards for outstanding/paid/overdue.

Reports — Full CRUD with saved reports: create, save, and delete report configurations. New "Project Volume by Deal Type" chart. Export to PDF/Excel/CSV.

Login & Signup — Redesigned with a split-panel layout: navy brand panel on the left with feature pills, testimonial, and decorative orbs; form panel on the right with enhanced validation, demo account button, and 2FA flow.

Settings — Enhanced with 8 tabs including a new API Sync tab: add/edit/delete sync connections (Google, Outlook, Slack, HubSpot, Salesforce, Zapier, custom APIs), run manual syncs, view sync logs, activate/deactivate connections. Billing tab removed.

Dashboard — Real data with sync button: loads deals, tasks, activities, customers from Supabase. Sync button refreshes all data with timestamp. Shows project volume metric, team momentum, and quick actions. Significantly expanded with 6 metric cards, Pipeline by Stage chart, Pending Deals card, Upcoming Deals card with countdown, Today's Tasks card, Invoice Alerts card, activity timeline, and floating deal detail modal.

Customers — Multi-project feature: customer detail drawer now shows a "Projects & Deals" section listing all deals linked to that customer, with deal type, sale type, value, project volume, and quotation status.

Pipeline — Floating detail modal: Single-click any deal card to open a floating modal with full deal details. Edit deal and Generate quote buttons inside the modal. Double-click opens the edit drawer.

Leads — Floating detail modal: Click any lead row to open a floating modal with full lead details. Edit lead and Qualify buttons inside the modal. Action menu clicks properly stop propagation.

Calendar — Full rewrite with floating modal + CRUD + drag-and-drop: Month/Week/Day views, click to create events, drag to reschedule, click to view details in modal.

Tasks — UI redesign with improved UX + CRUD: 4 stat cards, overdue alert banner, search/filter, floating detail modal with priority/status badges, checklist progress, and Mark Done/Edit/Delete buttons.

Quotes — Floating detail modal: Click any quote row to see a modal with status, linked deal, amount breakdown, customer info, version, notes, and Send/Edit/Delete buttons.

Products — Floating detail modal: Click any product card to see a modal with status, category, price, stock, variants, description, and Edit/Delete buttons.

Invoices — Floating detail modal: Click any invoice row to see a modal with status, linked deal, amount breakdown, customer info, due date, payment history, and Mark Paid/Edit/Delete buttons.
