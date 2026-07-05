// Métricas de PROMPT.md §5/§8 que dependen de MongoDB:
//  - tiempos y uso de índices (explain executionStats) de las queries clave
//  - test de concurrencia: N inserciones simultáneas del mismo número → 1 boleto
//  - tamaño medio por documento y por colección
// Uso: npx tsx scripts/metrics.ts
import { MongoClient, ObjectId } from "mongodb";

const uri = process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017";
const dbName = process.env.MONGO_DB ?? "lottery";

async function main() {
  const client = await new MongoClient(uri).connect();
  const db = client.db(dbName);

  console.log("== explain(executionStats) de las queries clave ==");
  const lottery = await db.collection("lotteries").findOne({});
  if (!lottery) throw new Error("BD vacía: ejecuta npm run seed");

  const q1 = await db
    .collection("tickets")
    .find({ lotteryId: lottery._id })
    .explain("executionStats");
  const s1 = q1.executionStats;
  console.log(
    `tickets por lotería: ${s1.executionTimeMillis} ms · ` +
      `plan ${q1.queryPlanner.winningPlan.inputStage?.indexName ?? q1.queryPlanner.winningPlan.stage} · ` +
      `${s1.totalDocsExamined} docs examinados / ${s1.nReturned} devueltos`
  );

  const q2 = await db
    .collection("lotteries")
    .find({ status: "open" })
    .sort({ endDate: 1 })
    .explain("executionStats");
  const s2 = q2.executionStats;
  console.log(
    `loterías abiertas ordenadas: ${s2.executionTimeMillis} ms · ` +
      `plan ${q2.queryPlanner.winningPlan.inputStage?.indexName ?? q2.queryPlanner.winningPlan.stage}`
  );

  console.log("\n== concurrencia: 100 inserciones simultáneas del mismo número ==");
  const testLotteryId = new ObjectId();
  const userId = new ObjectId();
  const t0 = Date.now();
  const results = await Promise.allSettled(
    Array.from({ length: 100 }, (_, i) =>
      db.collection("tickets").insertOne({
        lotteryId: testLotteryId,
        number: 1,
        userId,
        stripeSessionId: `metrics_${i}`,
        purchasedAt: new Date(),
      })
    )
  );
  const ok = results.filter((r) => r.status === "fulfilled").length;
  const dup = results.filter(
    (r) => r.status === "rejected" && (r.reason as { code?: number }).code === 11000
  ).length;
  console.log(
    `${ok} insertado / ${dup} rechazados por el índice unique · ${Date.now() - t0} ms total`
  );
  await db.collection("tickets").deleteMany({ lotteryId: testLotteryId });
  if (ok !== 1) throw new Error(`DOBLE VENTA: se insertaron ${ok} boletos`);

  console.log("\n== tamaños por colección ==");
  for (const name of ["users", "lotteries", "tickets", "payments"]) {
    const stats = await db.command({ collStats: name });
    console.log(
      `${name}: ${stats.count} docs · ${stats.avgObjSize ?? 0} B/doc · ` +
        `${(stats.size / 1024).toFixed(1)} KB datos · ${(stats.totalIndexSize / 1024).toFixed(1)} KB índices`
    );
  }

  await client.close();
  console.log("\n✅ Métricas completadas");
}

main().catch((e) => {
  console.error("❌", e.message);
  process.exit(1);
});
