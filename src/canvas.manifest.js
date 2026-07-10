export const manifest = {
  screens: {
    scr_gk91ca: { name: "Dashboard", route: "/", position: { "x": 0, "y": 0 }, isDefaultRow: true },
    scr_ytcz5k: { name: "Leads", route: "/leads", position: { "x": 160, "y": 1820 } },
    scr_o43ltx: { name: "Pipeline", route: "/pipeline", position: { "x": 1560, "y": 1820 } },
    scr_8tfvch: { name: "Customers", route: "/customers", position: { "x": 160, "y": 3800 } },
    scr_8bluzm: { name: "Products", route: "/products", position: { "x": 1560, "y": 3800 } },
    scr_cnn7iu: { name: "Quotes", route: "/quotes", position: { "x": 2960, "y": 1820 } },
    scr_fp58w5: { name: "Invoices", route: "/invoices", position: { "x": 4360, "y": 1820 } },
    scr_vuazma: { name: "Tasks", route: "/tasks", position: { "x": 160, "y": 5780 } },
    scr_axc4c7: { name: "Calendar", route: "/calendar", position: { "x": 1560, "y": 5780 } },
    scr_4sbw0b: { name: "Reports", route: "/reports", position: { "x": 160, "y": 7760 } },
    scr_7gup6d: { name: "AI Assistant", route: "/assistant", position: { "x": 1560, "y": 7760 } },
    scr_em88yv: { name: "Automation", route: "/automation", position: { "x": 2960, "y": 7760 } },
    scr_4s1nqi: { name: "Settings", route: "/settings", position: { "x": 1400, "y": 0 }, isDefaultRow: true }
  },
  sections: {
    sec_vg46t8: { name: "Sales Pipeline", x: 0, y: 1600, width: 5720, height: 1180 },
    sec_43unaq: { name: "Core Data", x: 0, y: 3580, width: 2920, height: 1180 },
    sec_jbdxf1: { name: "Productivity", x: 0, y: 5560, width: 2920, height: 1180 },
    sec_ctro2y: { name: "Intelligence", x: 0, y: 7540, width: 4320, height: 1180 }
  },
  layers: [
  { kind: "screen", id: "scr_gk91ca" },
  { kind: "screen", id: "scr_4s1nqi" },
  { kind: "section", id: "sec_vg46t8", children: [
    { kind: "screen", id: "scr_ytcz5k" },
    { kind: "screen", id: "scr_o43ltx" },
    { kind: "screen", id: "scr_cnn7iu" },
    { kind: "screen", id: "scr_fp58w5" }]
  },
  { kind: "section", id: "sec_43unaq", children: [
    { kind: "screen", id: "scr_8tfvch" },
    { kind: "screen", id: "scr_8bluzm" }]
  },
  { kind: "section", id: "sec_jbdxf1", children: [
    { kind: "screen", id: "scr_vuazma" },
    { kind: "screen", id: "scr_axc4c7" }]
  },
  { kind: "section", id: "sec_ctro2y", children: [
    { kind: "screen", id: "scr_4sbw0b" },
    { kind: "screen", id: "scr_7gup6d" },
    { kind: "screen", id: "scr_em88yv" }]
  }]

};