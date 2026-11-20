// Test rrjedhjeje: çdo ekran duhet të renderojë pa hedhur gabim (pa telefon, pa rrjet).
import React from "react";
import { act, create } from "react-test-renderer";
import { setRows } from "./stub-supabase-client.js";

const mods = [
  ["Plots", () => (require("../../src/Plots").default)],
];

import Plots, { PlotForm } from "../../src/Plots";
import Dashboard from "../../src/Dashboard";
import Trace from "../../src/Trace";
import Reports from "../../src/Reports";
import Import from "../../src/Import";
import Assistant from "../../src/Assistant";
import Profile from "../../src/Profile";
import Users from "../../src/Users";
import Hub from "../../src/Hub";
import Login from "../../src/Login";
import ResetPassword from "../../src/auth/Reset";
import Start from "../../src/Start";
import PlotDetail from "../../src/PlotDetail";
import Tasks from "../../src/Tasks";
import Observations from "../../src/Observations";
import Cultivations from "../../src/Cultivations";
import Inputs from "../../src/Inputs";

const up = () => {};
const CASES = [
  ["Plots (bosh)", <Plots cid={2} role="admin" onNew={up} onOpen={up} />],
  ["Plots (me të dhëna)", <Plots cid={2} role="admin" onNew={up} onOpen={up} />],
  ["PlotForm", <PlotForm cid={2} onDone={up} />],
  ["Dashboard", <Dashboard cid={2} role="admin" onGo={up} />],
  ["Trace", <Trace cid={2} />],
  ["Reports", <Reports cid={2} />],
  ["Import", <Import cid={2} onGo={up} />],
  ["Assistant", <Assistant cid={2} onGo={up} />],
  ["Profile", <Profile role="admin" />],
  ["Users", <Users cid={2} me="u1" />],
  ["Hub", <Hub role="admin" onGo={up} />],
  ["Login", <Login onRecovery={up} />],
  ["ResetPassword", <ResetPassword email="a@b.al" onDone={up} onCancel={up} />],
  ["Start", <Start cid={2} role="admin" onGo={up} onForm={up} onImport={up} />],
  ["PlotDetail", <PlotDetail cid={2} plotId={1} onGo={up} onBack={up} />],
  ["Tasks", <Tasks cid={2} role="admin" onNew={up} />],
  ["Observations", <Observations cid={2} role="admin" onNew={up} />],
  ["Cultivations", <Cultivations cid={2} role="admin" onNew={up} />],
  ["Inputs", <Inputs cid={2} role="admin" onNew={up} />],
];

const PLOT_ROWS = [{
  plot_id: 1, company_id: 2, name: "Parcela te ura", code: "K01", zone_id: 1, farmer_id: 3,
  area_ha: 1.5, lat: 41.32, lng: 19.44, growing: "field", ownership: "owned", status: "active",
  farmer: "Ilir Koçi", cultivations: 2, tasks_open: 1, observations_open: 0, inputs_cost: 25000,
}];

let pass = 0, fail = 0;
const origError = console.error;
const reactErrors = [];
console.error = (...a) => { reactErrors.push(a.map(String).join(" ")); };
process.on("unhandledRejection", (e) => { reactErrors.push("unhandledRejection: " + (e?.message || e)); });

const run = async () => {
  for (const [name, el] of CASES) {
    setRows((t) => (name.startsWith("Plots") && t === "plot_summary" ? (name.includes("me të dhëna") ? PLOT_ROWS : []) : []));
    try {
      let r;
      await act(async () => {
        r = create(el);
        await new Promise((res) => setTimeout(res, 0));
      });
      await act(async () => { r.unmount(); });
      const fatal = reactErrors.filter((m) => /not a function|undefined is not|Cannot read|is not defined|Invalid/.test(m));
      if (fatal.length) { fail++; console.log(`✗ ${name}\n   ${fatal[0].slice(0, 300)}`); }
      else { pass++; console.log(`✓ ${name}`); }
    } catch (e) {
      fail++;
      console.log(`✗ ${name}\n   ${String(e && e.message || e).slice(0, 300)}`);
    }
    reactErrors.length = 0;
  }
  console.error = origError;
  console.log(`\n${pass} ekrane renderuan, ${fail} dështuan`);
  if (fail) process.exit(1);
};
run();
