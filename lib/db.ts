import { Db, MongoClient } from "mongodb";

// Cliente lazy: nunca conectar ni validar env vars en el top-level del módulo
// (next build evalúa los módulos y el runner de CI no tiene MongoDB — ver
// AGENTS.md §CI). En dev, el singleton vive en globalThis para sobrevivir al
// hot-reload.
const globalForMongo = globalThis as unknown as {
  _mongoClientPromise?: Promise<MongoClient>;
};

function buildUri(): string {
  if (process.env.MONGODB_URI) return process.env.MONGODB_URI;
  // Variables que inyecta la plataforma de la academia en runtime
  const { MONGO_HOST, MONGO_PORT, MONGO_USER, MONGO_PASSWORD } = process.env;
  if (MONGO_HOST) {
    const auth = MONGO_USER
      ? `${encodeURIComponent(MONGO_USER)}:${encodeURIComponent(MONGO_PASSWORD ?? "")}@`
      : "";
    return `mongodb://${auth}${MONGO_HOST}:${MONGO_PORT ?? "27017"}`;
  }
  throw new Error("MONGODB_URI (o MONGO_HOST/MONGO_PORT/...) no configurado");
}

export function getClientPromise(): Promise<MongoClient> {
  if (!globalForMongo._mongoClientPromise) {
    globalForMongo._mongoClientPromise = new MongoClient(buildUri()).connect();
  }
  return globalForMongo._mongoClientPromise;
}

export async function getDb(): Promise<Db> {
  const client = await getClientPromise();
  return client.db(process.env.MONGO_DB ?? "lottery");
}
