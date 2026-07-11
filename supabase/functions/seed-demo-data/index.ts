import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const PEOPLE = [
  { name: "Ava Williams", email: "ava@latticelabs.io", phone: "+1 415 220 1188", company: "Lattice Labs", avatar_color: "#d8e7ff" },
  { name: "Ravi Kumar", email: "ravi@harborco.com", phone: "+1 212 555 0142", company: "Harbor & Co.", avatar_color: "#ffe0c2" },
  { name: "Tori Lee", email: "tori@vercelink.com", phone: "+1 646 900 3321", company: "Vercelink", avatar_color: "#eadbff" },
  { name: "Noah Stein", email: "noah@horizon.ai", phone: "+1 305 771 0090", company: "Horizon AI", avatar_color: "#c9f0e3" },
  { name: "Maya Patel", email: "maya@nimbushealth.com", phone: "+1 617 400 8823", company: "Nimbus Health", avatar_color: "#ffe0ee" },
  { name: "Emma Morris", email: "emma@brightpath.co", phone: "+1 503 220 4412", company: "Brightpath", avatar_color: "#d9e8ff" },
  { name: "James Lee", email: "james@quantabase.io", phone: "+1 720 118 5510", company: "Quantabase", avatar_color: "#f9dfbe" },
  { name: "Aisha Rahman", email: "aisha@meridian.com", phone: "+1 312 664 2210", company: "Meridian Group", avatar_color: "#e0dcff" },
  { name: "Liam Johnson", email: "liam@atlascloud.io", phone: "+1 408 331 7788", company: "Atlas Cloud", avatar_color: "#cfeede" },
  { name: "Sofia Garcia", email: "sofia@northwind.co", phone: "+1 214 559 6612", company: "Northwind", avatar_color: "#ffd9d0" },
  { name: "Kenji Sato", email: "kenji@sakura.jp", phone: "+81 3 6712 0091", company: "Sakura Systems", avatar_color: "#d5e3ff" },
  { name: "Olivia Brown", email: "olivia@evergreen.com", phone: "+1 917 220 3345", company: "Evergreen", avatar_color: "#f4dcc9" }
];

const OWNERS = [
  { id: "o1", name: "Renee Walker", color: "#ffdccb" },
  { id: "o2", name: "Marcus Chen", color: "#d8e7ff" },
  { id: "o3", name: "Priya Nair", color: "#eadbff" },
  { id: "o4", name: "Diego Alvarez", color: "#c9f0e3" }
];

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? Deno.env.get("VITE_SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ error: "Missing server config" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });

    // Get the demo user
    const { data: { users } } = await admin.auth.admin.listUsers();
    const demoUser = users.find((u) => u.email === "demo@1cngcrm.com");
    if (!demoUser) {
      return new Response(JSON.stringify({ error: "Demo user not found. Sign in first." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userId = demoUser.id;

    // Check if already seeded
    const { count } = await admin.from("people").select("*", { count: "exact", head: true }).eq("user_id", userId);
    if (count && count > 0) {
      return new Response(JSON.stringify({ ok: true, message: "Already seeded", count }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Insert people
    const peopleRows = PEOPLE.map((p) => ({ ...p, user_id: userId }));
    const { data: insertedPeople, error: peopleErr } = await admin.from("people").insert(peopleRows).select();
    if (peopleErr) {
      return new Response(JSON.stringify({ error: peopleErr.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const personIds = (insertedPeople ?? []).map((p) => p.id);

    // Insert customers
    const customerData = [
      { personIdx: 7, status: "VIP", industry: "Consulting", website: "meridian.com", tags: ["Enterprise", "Renewal"], lifetime_value: 184000, address: "Chicago, IL" },
      { personIdx: 0, status: "Customer", industry: "Software", website: "latticelabs.io", tags: ["SaaS"], lifetime_value: 62000, address: "San Francisco, CA" },
      { personIdx: 1, status: "Prospect", industry: "Logistics", website: "harborco.com", tags: ["Expansion"], lifetime_value: 24200, address: "New York, NY" },
      { personIdx: 4, status: "Customer", industry: "Healthcare", website: "nimbushealth.com", tags: ["Priority"], lifetime_value: 91000, address: "Boston, MA" },
      { personIdx: 9, status: "Inactive", industry: "Retail", website: "northwind.co", tags: ["Churned"], lifetime_value: 12500, address: "Dallas, TX" },
      { personIdx: 10, status: "Lead", industry: "Manufacturing", website: "sakura.jp", tags: ["International"], lifetime_value: 33400, address: "Tokyo, JP" }
    ];
    const customerRows = customerData.map((c) => ({
      user_id: userId,
      person_id: personIds[c.personIdx],
      status: c.status,
      industry: c.industry,
      website: c.website,
      tags: c.tags,
      lifetime_value: c.lifetime_value,
      address: c.address
    }));
    await admin.from("customers").insert(customerRows);

    // Insert leads
    const leadData = [
      { personIdx: 0, source: "Website", score: 92, status: "Qualified", ownerIdx: 0, value: 18500 },
      { personIdx: 1, source: "Referral", score: 84, status: "Contacted", ownerIdx: 1, value: 24200 },
      { personIdx: 2, source: "Google Ads", score: 71, status: "New", ownerIdx: 2, value: 16800 },
      { personIdx: 3, source: "Event", score: 88, status: "Qualified", ownerIdx: 0, value: 21600 },
      { personIdx: 4, source: "Facebook", score: 65, status: "Contacted", ownerIdx: 3, value: 27100 },
      { personIdx: 5, source: "Website", score: 47, status: "Unqualified", ownerIdx: 1, value: 9800 },
      { personIdx: 8, source: "Walk-in", score: 79, status: "New", ownerIdx: 2, value: 14300 },
      { personIdx: 10, source: "Manual", score: 90, status: "Qualified", ownerIdx: 0, value: 33400 }
    ];
    const leadRows = leadData.map((l) => ({
      user_id: userId,
      person_id: personIds[l.personIdx],
      source: l.source,
      score: l.score,
      ai_score: Math.min(100, l.score + Math.floor(Math.random() * 10 - 3)),
      status: l.status,
      owner_id: OWNERS[l.ownerIdx].id,
      owner_name: OWNERS[l.ownerIdx].name,
      value: l.value,
      follow_up_date: new Date(Date.now() + (Math.floor(Math.random() * 7) + 1) * 86400000).toISOString().split("T")[0]
    }));
    await admin.from("leads").insert(leadRows);

    // Insert deals
    const dealData = [
      { personIdx: 8, title: "Atlas Cloud platform", value: 14300, stage: "New", probability: 20, ownerIdx: 2, closeDate: "2024-08-01" },
      { personIdx: 5, title: "Brightpath rollout", value: 9800, stage: "Contacted", probability: 30, ownerIdx: 1, closeDate: "2024-07-28" },
      { personIdx: 0, title: "Lattice enterprise", value: 18500, stage: "Qualified", probability: 55, ownerIdx: 0, closeDate: "2024-07-20" },
      { personIdx: 1, title: "Harbor expansion", value: 24200, stage: "Qualified", probability: 50, ownerIdx: 1, closeDate: "2024-07-22" },
      { personIdx: 10, title: "Sakura integration", value: 33400, stage: "Meeting", probability: 60, ownerIdx: 0, closeDate: "2024-07-18" },
      { personIdx: 2, title: "Vercelink annual", value: 16800, stage: "Proposal", probability: 70, ownerIdx: 2, closeDate: "2024-07-15" },
      { personIdx: 3, title: "Horizon AI suite", value: 21600, stage: "Proposal", probability: 68, ownerIdx: 0, closeDate: "2024-07-16" },
      { personIdx: 4, title: "Nimbus Health deal", value: 27100, stage: "Negotiation", probability: 82, ownerIdx: 3, closeDate: "2024-07-12" },
      { personIdx: 7, title: "Meridian upgrade", value: 41200, stage: "Won", probability: 100, ownerIdx: 1, closeDate: "2024-06-30" },
      { personIdx: 9, title: "Northwind renewal", value: 12500, stage: "Lost", probability: 0, ownerIdx: 3, closeDate: "2024-06-25" }
    ];
    const dealRows = dealData.map((d) => ({
      user_id: userId,
      person_id: personIds[d.personIdx],
      title: d.title,
      value: d.value,
      stage: d.stage,
      probability: d.probability,
      owner_id: OWNERS[d.ownerIdx].id,
      owner_name: OWNERS[d.ownerIdx].name,
      close_date: d.closeDate
    }));
    await admin.from("deals").insert(dealRows);

    // Insert tasks
    const taskData = [
      { title: "Follow up with Maya Patel", priority: "High", dueDate: "Today", ownerIdx: 3, done: false, ct: 3, cd: 1 },
      { title: "Send Horizon AI proposal v2", priority: "High", dueDate: "Today", ownerIdx: 0, done: false, ct: 4, cd: 3 },
      { title: "Prep Sakura integration demo", priority: "Medium", dueDate: "Tomorrow", ownerIdx: 0, done: false, ct: 5, cd: 2 },
      { title: "Review Northwind churn notes", priority: "Low", dueDate: "Jun 20", ownerIdx: 1, done: true, ct: 2, cd: 2 },
      { title: "Confirm Lattice renewal terms", priority: "Medium", dueDate: "Jun 21", ownerIdx: 0, done: false, ct: 3, cd: 0 },
      { title: "Update Meridian account plan", priority: "Low", dueDate: "Jun 24", ownerIdx: 1, done: false, ct: 4, cd: 1 }
    ];
    const today = new Date();
    const taskRows = taskData.map((t, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() + (i < 2 ? 0 : i < 4 ? 1 : i));
      return {
        user_id: userId,
        title: t.title,
        priority: t.priority,
        status: t.done ? "Done" : "Pending",
        done: t.done,
        due_date: d.toISOString().split("T")[0],
        owner_id: OWNERS[t.ownerIdx].id,
        owner_name: OWNERS[t.ownerIdx].name,
        checklist_total: t.ct,
        checklist_done: t.cd
      };
    });
    await admin.from("tasks").insert(taskRows);

    // Insert products
    const productData = [
      { name: "Growth Suite", category: "Platform", price: 4900, stock: 999, variants: 3, status: "In stock" },
      { name: "Sales Copilot AI", category: "Add-on", price: 1200, stock: 999, variants: 2, status: "In stock" },
      { name: "Analytics Pro", category: "Add-on", price: 890, stock: 14, variants: 1, status: "Low stock" },
      { name: "Onboarding Package", category: "Service", price: 3500, stock: 0, variants: 1, status: "Out of stock" },
      { name: "Enterprise Seat", category: "License", price: 320, stock: 240, variants: 4, status: "In stock" },
      { name: "API Gateway", category: "Platform", price: 1600, stock: 42, variants: 2, status: "In stock" }
    ];
    const productRows = productData.map((p) => ({ ...p, user_id: userId }));
    await admin.from("products").insert(productRows);

    // Insert quotes
    const quoteData = [
      { personIdx: 0, number: "QT-1042", amount: 18500, status: "Sent", version: 2, items: 4 },
      { personIdx: 3, number: "QT-1041", amount: 21600, status: "Approved", version: 1, items: 3 },
      { personIdx: 2, number: "QT-1040", amount: 16800, status: "Draft", version: 1, items: 2 },
      { personIdx: 4, number: "QT-1039", amount: 27100, status: "Sent", version: 3, items: 5 },
      { personIdx: 1, number: "QT-1038", amount: 24200, status: "Rejected", version: 2, items: 3 }
    ];
    const quoteRows = quoteData.map((q) => ({
      user_id: userId,
      person_id: personIds[q.personIdx],
      number: q.number,
      amount: q.amount,
      tax: Math.round(q.amount * 0.08),
      status: q.status,
      version: q.version,
      items: q.items
    }));
    await admin.from("quotes").insert(quoteRows);

    // Insert invoices
    const invoiceData = [
      { personIdx: 7, number: "INV-2201", amount: 41200, tax: 3296, discount: 1000, status: "Paid", dueDate: "2024-06-30" },
      { personIdx: 0, number: "INV-2202", amount: 18500, tax: 1480, discount: 0, status: "Pending", dueDate: "2024-07-20" },
      { personIdx: 4, number: "INV-2203", amount: 27100, tax: 2168, discount: 500, status: "Overdue", dueDate: "2024-06-18" },
      { personIdx: 3, number: "INV-2204", amount: 21600, tax: 1728, discount: 0, status: "Draft", dueDate: "2024-07-25" },
      { personIdx: 1, number: "INV-2205", amount: 24200, tax: 1936, discount: 200, status: "Pending", dueDate: "2024-07-15" }
    ];
    const invoiceRows = invoiceData.map((i) => ({
      user_id: userId,
      person_id: personIds[i.personIdx],
      number: i.number,
      amount: i.amount,
      tax: i.tax,
      discount: i.discount,
      status: i.status,
      due_date: i.dueDate
    }));
    await admin.from("invoices").insert(invoiceRows);

    // Insert events
    const eventData = [
      { title: "Sakura demo", day: 18, type: "Meeting", time: "10:00", sync: "Google" },
      { title: "Maya Patel call", day: 18, type: "Call", time: "14:00", sync: "Outlook" },
      { title: "Team standup", day: 19, type: "Meeting", time: "09:00", sync: "Google" },
      { title: "Horizon review", day: 20, type: "Meeting", time: "11:30", sync: null },
      { title: "Product webinar", day: 24, type: "Event", time: "16:00", sync: "Google" },
      { title: "Harbor follow-up", day: 26, type: "Call", time: "13:00", sync: "Outlook" }
    ];
    const eventRows = eventData.map((e) => ({
      user_id: userId,
      title: e.title,
      type: e.type,
      event_date: `2024-06-${String(e.day).padStart(2, "0")}`,
      time: e.time,
      sync: e.sync
    }));
    await admin.from("events").insert(eventRows);

    // Insert automations
    const automationData = [
      { name: "Auto-assign new leads", trigger: "New lead created", action: "Assign to round-robin rep", enabled: true, runs: 342 },
      { name: "Follow-up reminder", trigger: "No activity for 48h", action: "Create task + notify owner", enabled: true, runs: 128 },
      { name: "Welcome email sequence", trigger: "Lead qualified", action: "Send 3-email sequence", enabled: false, runs: 61 },
      { name: "Deal escalation", trigger: "Deal > $30k in negotiation", action: "Notify sales manager", enabled: true, runs: 24 },
      { name: "Invoice overdue alert", trigger: "Invoice past due date", action: "Slack finance channel", enabled: true, runs: 17 }
    ];
    const automationRows = automationData.map((a) => ({ ...a, user_id: userId }));
    await admin.from("automations").insert(automationRows);

    // Insert MCP servers
    const mcpData = [
      { name: "Gmail", category: "Email", connected: true },
      { name: "Google Calendar", category: "Calendar", connected: true },
      { name: "Slack", category: "Messaging", connected: true },
      { name: "Stripe", category: "Payments", connected: true },
      { name: "PostgreSQL", category: "Database", connected: false },
      { name: "Microsoft Outlook", category: "Email", connected: false },
      { name: "Google Drive", category: "Storage", connected: true },
      { name: "HubSpot", category: "CRM", connected: false }
    ];
    const mcpRows = mcpData.map((m) => ({ ...m, user_id: userId }));
    await admin.from("mcp_servers").insert(mcpRows);

    // Insert activities
    const activityData = [
      { personIdx: 7, type: "Note", subject: "Renewal quote sent", description: "Sent Q2 renewal quote for Meridian" },
      { personIdx: 0, type: "Email", subject: "Welcome email", description: "Sent welcome email to Ava at Lattice Labs" },
      { personIdx: 4, type: "Call", subject: "Discovery call", description: "30-min discovery call with Maya Patel" },
      { personIdx: 3, type: "Meeting", subject: "Product demo", description: "Demoed Horizon AI suite to Noah" },
      { personIdx: 10, type: "WhatsApp", subject: "Quick check-in", description: "WhatsApp message from Kenji about integration timeline" },
      { personIdx: 1, type: "SMS", subject: "Meeting confirmation", description: "SMS reminder sent to Ravi for Tuesday meeting" }
    ];
    const activityRows = activityData.map((a) => ({
      user_id: userId,
      person_id: personIds[a.personIdx],
      type: a.type,
      subject: a.subject,
      description: a.description
    }));
    await admin.from("activities").insert(activityRows);

    // Insert notifications
    const notifData = [
      { title: "Maya Patel call in 1 hour", type: "reminder", body: "Discovery call with Nimbus Health at 2:00 PM" },
      { title: "Invoice INV-2203 is overdue", type: "alert", body: "$27,100 outstanding from Nimbus Health" },
      { title: "New lead from Website", type: "info", body: "Ava Williams submitted a contact form" },
      { title: "Deal moved to Negotiation", type: "success", body: "Nimbus Health deal is now in negotiation" }
    ];
    const notifRows = notifData.map((n) => ({ ...n, user_id: userId }));
    await admin.from("notifications").insert(notifRows);

    return new Response(JSON.stringify({ ok: true, message: "Seed data inserted", people: insertedPeople?.length ?? 0 }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
