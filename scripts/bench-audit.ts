/**
 * Bench Plan G.5: mede performance da query de audit_log com filtros típicos.
 *
 * Pré-requisitos:
 *   - .env.local com SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY (ou export inline)
 *   - Tabela audit_log existente, particionada (Plan A)
 *
 * Estratégia de isolamento (sem transação):
 *   - Cada execução gera bench_id = randomUUID()
 *   - Todas as 10k rows sintéticas levam metadata.bench_id = bench_id
 *   - finally apaga where metadata->>'bench_id' = bench_id
 *
 * Uso:
 *   npm run bench:audit
 *
 * Cleanup manual de execuções abortadas:
 *   delete from audit_log where metadata ? 'bench_id';
 */
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { performance } from "node:perf_hooks";

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const benchId = randomUUID();
const TOTAL = 10_000;
const BATCH = 1_000;
const EVENT_TYPES = [
  "app.created", "app.updated", "app.activated", "app.deactivated",
  "app.subscriptions_opened", "app.subscriptions_closed",
  "plan.created", "plan.updated", "plan.deactivated", "plan.stripe_synced",
  "subscription.assigned_manually", "subscription.canceled",
  "membership.granted", "membership.revoked",
];
const APP_SLUGS = ["case-predictor", "lead-pro", "admin", "id", "billing"];
const fakeUuid = () => randomUUID();

function generateBatch(start: number, count: number, actors: string[], targets: string[]) {
  const rows = [];
  for (let i = 0; i < count; i++) {
    const offsetDays = Math.floor(Math.random() * 90);
    const created = new Date(Date.now() - offsetDays * 86400_000 - Math.floor(Math.random() * 86400_000));
    rows.push({
      event_type: EVENT_TYPES[(start + i) % EVENT_TYPES.length],
      actor_user_id: actors[Math.floor(Math.random() * actors.length)],
      target_user_id: Math.random() < 0.6 ? targets[Math.floor(Math.random() * targets.length)] : null,
      app_slug: APP_SLUGS[Math.floor(Math.random() * APP_SLUGS.length)],
      org_id: null,
      metadata: { bench_id: benchId, idx: start + i, sample: "value" },
      ip_address: "192.168.1.1",
      user_agent: "bench-audit/1.0",
      created_at: created.toISOString(),
    });
  }
  return rows;
}

async function seed() {
  const actors = Array.from({ length: 50 }, fakeUuid);
  const targets = Array.from({ length: 100 }, fakeUuid);
  console.log(`Seeding ${TOTAL} rows with bench_id=${benchId}...`);
  for (let i = 0; i < TOTAL; i += BATCH) {
    const batch = generateBatch(i, BATCH, actors, targets);
    const { error } = await sb.from("audit_log").insert(batch);
    if (error) throw new Error(`seed batch ${i}: ${error.message}`);
  }
  return { actors, targets };
}

function baseQuery() {
  return sb
    .from("audit_log")
    .select("id, event_type, actor_user_id, target_user_id, app_slug, created_at")
    .eq("metadata->>bench_id", benchId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(50);
}

async function runQuery(name: string, build: () => ReturnType<typeof baseQuery>) {
  const samples: number[] = [];
  for (let i = 0; i < 5; i++) {
    const t0 = performance.now();
    const { error } = await build();
    if (error) throw new Error(`query ${name}: ${error.message}`);
    samples.push(performance.now() - t0);
  }
  samples.shift(); // descarta cold cache
  const p99 = Math.max(...samples);
  const avg = samples.reduce((s, x) => s + x, 0) / samples.length;
  console.log(`  ${name}: p99=${p99.toFixed(1)}ms  avg=${avg.toFixed(1)}ms  (${samples.map((s) => s.toFixed(1)).join(", ")})`);
  return { name, p99, avg };
}

async function main() {
  const { actors, targets } = await seed();

  const sevenDaysAgo = new Date(Date.now() - 7 * 86400_000).toISOString();
  const actor5 = actors.slice(0, 5);
  const target5 = targets.slice(0, 5);

  console.log("\nQueries:");
  const results = [
    await runQuery("no filter",                () => baseQuery()),
    await runQuery("event_type=plan.updated",  () => baseQuery().eq("event_type", "plan.updated")),
    await runQuery("actor in 5",               () => baseQuery().in("actor_user_id", actor5)),
    await runQuery("target in 5",              () => baseQuery().in("target_user_id", target5)),
    await runQuery("date last 7d",             () => baseQuery().gte("created_at", sevenDaysAgo)),
    await runQuery("combo event+app+7d",       () => baseQuery().eq("event_type", "plan.updated").eq("app_slug", "case-predictor").gte("created_at", sevenDaysAgo)),
  ];

  const failed = results.filter((r) => r.p99 > 100);
  if (failed.length > 0) {
    console.error(`\nFAIL: ${failed.length} queries above 100ms p99:`, failed.map((r) => r.name).join(", "));
    process.exitCode = 1;
  } else {
    console.log("\nPASS: all queries under 100ms p99.");
  }

  console.log("\nEXPLAIN ANALYZE: rode manualmente no Supabase SQL editor após o seed,");
  console.log("ou anexe output via psql. Exemplo de query a explainar:");
  console.log(`  EXPLAIN ANALYZE SELECT id, event_type, ... FROM audit_log`);
  console.log(`    WHERE metadata->>'bench_id' = '${benchId}'`);
  console.log(`    AND event_type = 'plan.updated'`);
  console.log(`    ORDER BY created_at DESC, id DESC LIMIT 50;`);
}

main()
  .catch((err) => {
    console.error("\nBench failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    console.log(`\nCleaning bench_id=${benchId}...`);
    const { error, count } = await sb
      .from("audit_log")
      .delete({ count: "exact" })
      .eq("metadata->>bench_id", benchId);
    if (error) console.error("Cleanup failed:", error.message);
    else console.log(`Deleted ${count ?? 0} rows.`);
  });
