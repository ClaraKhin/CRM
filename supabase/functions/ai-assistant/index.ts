import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { query, userId } = await req.json();
    if (!query || !userId) {
      return jsonResponse({ error: "Missing query or userId" }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const lower = query.toLowerCase();
    const responses: string[] = [];

    // ─── Pipeline / Deals ───
    if (matches(lower, ["deal", "pipeline", "revenue", "forecast", "opportunity", "won", "lost", "stage"])) {
      const { data: deals } = await supabase.from("deals").select("*").eq("user_id", userId);
      const all = deals ?? [];
      if (all.length === 0) {
        responses.push("You don't have any deals in your pipeline yet. Create one from the Pipeline page.");
      } else {
        const won = all.filter((d: any) => d.stage === "Won");
        const lost = all.filter((d: any) => d.stage === "Lost");
        const open = all.filter((d: any) => d.stage !== "Won" && d.stage !== "Lost");
        const wonValue = won.reduce((s: number, d: any) => s + (d.value ?? 0), 0);
        const openValue = open.reduce((s: number, d: any) => s + (d.value ?? 0), 0);
        const weighted = open.reduce((s: number, d: any) => s + (d.value ?? 0) * (d.probability ?? 0) / 100, 0);
        const byStage: Record<string, number> = {};
        open.forEach((d: any) => { byStage[d.stage] = (byStage[d.stage] ?? 0) + 1; });

        if (matches(lower, ["forecast", "project", "q2", "q3", "q4", "q1", "revenue"])) {
          responses.push(
            `Revenue Forecast:\n• Won: ${formatMoney(wonValue)} (${won.length} deals)\n` +
            `• Open pipeline: ${formatMoney(openValue)} (${open.length} deals)\n` +
            `• Weighted pipeline: ${formatMoney(Math.round(weighted))}\n` +
            `• Total projected: ${formatMoney(Math.round(wonValue + weighted))}\n` +
            (lost.length > 0 ? `• Lost: ${formatMoney(lost.reduce((s: number, d: any) => s + (d.value ?? 0), 0))} (${lost.length} deals)` : "")
          );
        } else if (matches(lower, ["at risk", "risk", "overdue", "stale", "closing"])) {
          const now = Date.now();
          const atRisk = open.filter((d: any) => {
            if (!d.close_date) return false;
            const days = (new Date(d.close_date).getTime() - now) / 86400000;
            return days <= 7;
          });
          if (atRisk.length === 0) {
            responses.push("No deals are currently at risk. Your pipeline looks healthy!");
          } else {
            responses.push(`${atRisk.length} deal${atRisk.length > 1 ? "s are" : " is"} approaching their close date:\n` +
              atRisk.map((d: any) => `• ${d.title} — ${formatMoney(d.value)} (${d.stage}, ${d.probability}% — closes ${d.close_date})`).join("\n"));
          }
        } else {
          let summary = `Pipeline Summary:\n• Total deals: ${all.length}\n• Open: ${open.length} (${formatMoney(openValue)})\n• Won: ${won.length} (${formatMoney(wonValue)})\n• Lost: ${lost.length}`;
          if (Object.keys(byStage).length > 0) {
            summary += "\n\nOpen deals by stage:\n" + Object.entries(byStage).map(([stage, count]) => `• ${stage}: ${count}`).join("\n");
          }
          const top5 = open.sort((a: any, b: any) => (b.value ?? 0) - (a.value ?? 0)).slice(0, 5);
          if (top5.length > 0) {
            summary += "\n\nTop open deals:\n" + top5.map((d: any) => `• ${d.title} — ${formatMoney(d.value)} (${d.stage}, ${d.probability}%)`).join("\n");
          }
          responses.push(summary);
        }
      }
    }

    // ─── Leads ───
    if (matches(lower, ["lead", "prospect", "score", "scoring"])) {
      const { data: leads } = await supabase.from("leads").select("*, people(*)").eq("user_id", userId);
      const all = leads ?? [];
      if (all.length === 0) {
        responses.push("No leads found yet. Add leads from the Leads page to start tracking prospects.");
      } else {
        const byStatus: Record<string, number> = {};
        all.forEach((l: any) => { byStatus[l.status] = (byStatus[l.status] ?? 0) + 1; });
        const hot = all.filter((l: any) => l.score >= 70);
        let summary = `Leads Overview:\n• Total leads: ${all.length}`;
        if (Object.keys(byStatus).length > 0) {
          summary += "\n• By status:\n" + Object.entries(byStatus).map(([s, c]) => `  - ${s}: ${c}`).join("\n");
        }
        if (hot.length > 0) {
          summary += `\n• Hot leads (score ≥ 70): ${hot.length}\n` + hot.slice(0, 5).map((l: any) => `  - ${l.people?.full_name ?? l.name ?? "Unknown"} (score: ${l.score}, ${l.status})`).join("\n");
        }
        responses.push(summary);
      }
    }

    // ─── Customers ───
    if (matches(lower, ["customer", "account", "client", "ltv", "lifetime"])) {
      const { data: customers } = await supabase.from("customers").select("*, people(*)").eq("user_id", userId);
      const all = customers ?? [];
      if (all.length === 0) {
        responses.push("No customers found. Convert leads to customers from the Leads or Pipeline page.");
      } else {
        const totalLtv = all.reduce((s: number, c: any) => s + (c.lifetime_value ?? 0), 0);
        const active = all.filter((c: any) => c.status === "Active");
        const top5 = all.sort((a: any, b: any) => (b.lifetime_value ?? 0) - (a.lifetime_value ?? 0)).slice(0, 5);
        responses.push(
          `Customers Overview:\n• Total: ${all.length}\n• Active: ${active.length}\n• Total LTV: ${formatMoney(totalLtv)}\n\nTop customers by LTV:\n` +
          top5.map((c: any) => `• ${c.people?.company ?? c.people?.full_name ?? "Unknown"} — ${formatMoney(c.lifetime_value ?? 0)} (${c.status})`).join("\n")
        );
      }
    }

    // ─── Invoices ───
    if (matches(lower, ["invoice", "payment", "overdue", "paid", "billing", "outstanding"])) {
      const { data: invoices } = await supabase.from("invoices").select("*").eq("user_id", userId);
      const all = invoices ?? [];
      if (all.length === 0) {
        responses.push("No invoices found. Create invoices from the Invoices page.");
      } else {
        const today = new Date().toISOString().split("T")[0];
        const paid = all.filter((i: any) => i.status === "Paid");
        const overdue = all.filter((i: any) => i.status !== "Paid" && i.due_date < today);
        const outstanding = all.filter((i: any) => i.status !== "Paid");
        const paidAmount = paid.reduce((s: number, i: any) => s + (i.amount ?? 0), 0);
        const outstandingAmount = outstanding.reduce((s: number, i: any) => s + (i.amount ?? 0), 0);
        let summary = `Invoices Overview:\n• Total: ${all.length}\n• Paid: ${paid.length} (${formatMoney(paidAmount)})\n• Outstanding: ${outstanding.length} (${formatMoney(outstandingAmount)})`;
        if (overdue.length > 0) {
          const overdueAmount = overdue.reduce((s: number, i: any) => s + (i.amount ?? 0), 0);
          summary += `\n• Overdue: ${overdue.length} (${formatMoney(overdueAmount)})\n\nOverdue invoices:\n` +
            overdue.map((i: any) => `• ${i.number} — ${formatMoney(i.amount)} (due: ${i.due_date})`).join("\n");
        }
        responses.push(summary);
      }
    }

    // ─── Tasks ───
    if (matches(lower, ["task", "todo", "to-do", "overdue task", "pending", "assign"])) {
      const { data: tasks } = await supabase.from("tasks").select("*").eq("user_id", userId);
      const all = tasks ?? [];
      if (all.length === 0) {
        responses.push("No tasks found. Create tasks from the Tasks page.");
      } else {
        const done = all.filter((t: any) => t.done);
        const pending = all.filter((t: any) => !t.done);
        const today = new Date().toDateString();
        const overdueTasks = pending.filter((t: any) => t.due_date && new Date(t.due_date) < new Date(today));
        const byPriority: Record<string, number> = {};
        pending.forEach((t: any) => { byPriority[t.priority] = (byPriority[t.priority] ?? 0) + 1; });
        let summary = `Tasks Overview:\n• Total: ${all.length}\n• Completed: ${done.length}\n• Pending: ${pending.length}`;
        if (overdueTasks.length > 0) summary += `\n• Overdue: ${overdueTasks.length}`;
        if (Object.keys(byPriority).length > 0) {
          summary += "\n\nPending by priority:\n" + Object.entries(byPriority).map(([p, c]) => `• ${p}: ${c}`).join("\n");
        }
        const upcoming = pending.filter((t: any) => t.due_date).sort((a: any, b: any) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()).slice(0, 5);
        if (upcoming.length > 0) {
          summary += "\n\nUpcoming tasks:\n" + upcoming.map((t: any) => `• ${t.title} — due ${t.due_date} (${t.priority})`).join("\n");
        }
        responses.push(summary);
      }
    }

    // ─── Meetings / Events ───
    if (matches(lower, ["meeting", "calendar", "event", "schedule", "today", "upcoming"])) {
      const today = new Date().toISOString().split("T")[0];
      const { data: events } = await supabase.from("events").select("*").eq("user_id", userId).gte("event_date", today).order("event_date", { ascending: true }).limit(10);
      const all = events ?? [];
      if (all.length === 0) {
        responses.push("You have no upcoming meetings. Schedule one from the Calendar page.");
      } else {
        responses.push(`Upcoming meetings (${all.length}):\n` +
          all.map((e: any) => `• ${e.title} — ${e.event_date} at ${e.time ?? "TBD"}${e.location ? ` (${e.location})` : ""}`).join("\n"));
      }
    }

    // ─── Activities ───
    if (matches(lower, ["activity", "activities", "recent", "log", "email", "call", "note"])) {
      const { data: activities } = await supabase.from("activities").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(10);
      const all = activities ?? [];
      if (all.length === 0) {
        responses.push("No recent activities logged.");
      } else {
        responses.push(`Recent activities (${all.length}):\n` +
          all.map((a: any) => `• [${a.type}] ${a.subject ?? a.description ?? "No title"} — ${new Date(a.created_at).toLocaleDateString()}`).join("\n"));
      }
    }

    // ─── Quotes ───
    if (matches(lower, ["quote", "quotation", "proposal", "estimate"])) {
      const { data: quotes } = await supabase.from("quotes").select("*").eq("user_id", userId);
      const all = quotes ?? [];
      if (all.length === 0) {
        responses.push("No quotes found. Create quotes from the Quotes page.");
      } else {
        const byStatus: Record<string, number> = {};
        all.forEach((q: any) => { byStatus[q.status] = (byStatus[q.status] ?? 0) + 1; });
        const totalValue = all.reduce((s: number, q: any) => s + (q.amount ?? 0), 0);
        responses.push(`Quotes Overview:\n• Total: ${all.length}\n• Total value: ${formatMoney(totalValue)}\n• By status:\n` +
          Object.entries(byStatus).map(([s, c]) => `  - ${s}: ${c}`).join("\n"));
      }
    }

    // ─── Documents ───
    if (matches(lower, ["document", "file", "upload", "attachment"])) {
      const { data: docs } = await supabase.from("documents").select("*").eq("user_id", userId);
      const all = docs ?? [];
      if (all.length === 0) {
        responses.push("No documents uploaded yet. Upload files from the Documents page.");
      } else {
        const totalSize = all.reduce((s: number, d: any) => s + (d.file_size ?? 0), 0);
        responses.push(`Documents Overview:\n• Total files: ${all.length}\n• Total size: ${formatSize(totalSize)}\n\nRecent files:\n` +
          all.slice(0, 5).map((d: any) => `• ${d.name} (${d.entity_type}, ${formatSize(d.file_size)}) — ${new Date(d.created_at).toLocaleDateString()}`).join("\n"));
      }
    }

    // ─── Dashboard summary ───
    if (responses.length === 0 || matches(lower, ["summary", "overview", "dashboard", "how am i doing", "report", "status", "everything"])) {
      responses.length = 0; // clear partial matches for full summary
      const [deals, leads, customers, invoices, tasks] = await Promise.all([
        supabase.from("deals").select("*").eq("user_id", userId),
        supabase.from("leads").select("*").eq("user_id", userId),
        supabase.from("customers").select("*").eq("user_id", userId),
        supabase.from("invoices").select("*").eq("user_id", userId),
        supabase.from("tasks").select("*").eq("user_id", userId),
      ]);

      const d = deals.data ?? [];
      const l = leads.data ?? [];
      const c = customers.data ?? [];
      const inv = invoices.data ?? [];
      const t = tasks.data ?? [];

      const wonValue = d.filter((x: any) => x.stage === "Won").reduce((s: number, x: any) => s + (x.value ?? 0), 0);
      const openValue = d.filter((x: any) => x.stage !== "Won" && x.stage !== "Lost").reduce((s: number, x: any) => s + (x.value ?? 0), 0);
      const outstandingInv = inv.filter((x: any) => x.status !== "Paid").reduce((s: number, x: any) => s + (x.amount ?? 0), 0);
      const pendingTasks = t.filter((x: any) => !x.done).length;
      const hotLeads = l.filter((x: any) => (x.score ?? 0) >= 70).length;
      const activeCustomers = c.filter((x: any) => x.status === "Active").length;

      responses.push(
        `CRM Dashboard Summary:\n\n` +
        `Pipeline:\n• ${d.length} deals (${formatMoney(openValue)} open, ${formatMoney(wonValue)} won)\n\n` +
        `Leads: ${l.length} total (${hotLeads} hot)\n` +
        `Customers: ${c.length} total (${activeCustomers} active)\n\n` +
        `Invoices: ${formatMoney(outstandingInv)} outstanding across ${inv.filter((x: any) => x.status !== "Paid").length} unpaid\n\n` +
        `Tasks: ${pendingTasks} pending out of ${t.length} total`
      );
    }

    const answer = responses.length > 0 ? responses.join("\n\n---\n\n") : "I can help you with your CRM data! Try asking about:\n• Your pipeline and deals\n• Leads and their scores\n• Customers and LTV\n• Invoices and overdue payments\n• Tasks and upcoming deadlines\n• Meetings and calendar\n• Recent activities\n• Quotes\n• Documents\n\nJust ask a question like \"How is my pipeline doing?\" or \"Show me overdue invoices.\"";

    return jsonResponse({ answer, toolsUsed: extractTools(lower) }, 200);
  } catch (err: any) {
    return jsonResponse({ error: err.message, answer: "Sorry, I encountered an error processing your request. Please try again." }, 500);
  }
});

function matches(text: string, keywords: string[]): boolean {
  return keywords.some((k) => text.includes(k));
}

function formatMoney(n: number): string {
  return "$" + (n ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / 1048576).toFixed(1)}MB`;
}

function extractTools(lower: string): string[] {
  const tools: string[] = [];
  if (matches(lower, ["deal", "pipeline", "revenue", "forecast"])) tools.push("CRM Database");
  if (matches(lower, ["lead", "prospect", "score"])) tools.push("CRM Database");
  if (matches(lower, ["customer", "client", "account"])) tools.push("CRM Database");
  if (matches(lower, ["invoice", "payment", "billing"])) tools.push("CRM Database");
  if (matches(lower, ["task", "todo", "pending"])) tools.push("CRM Database");
  if (matches(lower, ["meeting", "calendar", "event", "schedule"])) tools.push("Google Calendar");
  if (matches(lower, ["activity", "email", "call", "note"])) tools.push("Activity Log");
  if (matches(lower, ["quote", "proposal"])) tools.push("CRM Database");
  if (matches(lower, ["document", "file", "upload"])) tools.push("Storage");
  return tools.length > 0 ? tools : ["CRM Database"];
}

function jsonResponse(data: any, status: number): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
