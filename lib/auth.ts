import { createHash, randomBytes } from "crypto";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { ObjectId } from "mongodb";
import { getDb } from "./db";
import { sendMagicLink } from "./email";
import type { MagicLink, SessionUser, User } from "./types";

const SESSION_COOKIE = "session";
const SESSION_DAYS = 7;
export const MAGIC_LINK_TTL_MS = 15 * 60 * 1000; // un solo uso, expira en 15 min (§5)

function secret(): Uint8Array {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET no configurado");
  return new TextEncoder().encode(s);
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Crea (si no existe) el usuario y le envía un magic link. Devuelve la URL. */
export async function requestMagicLink(email: string): Promise<string> {
  const normalized = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    throw new Error("Email no válido");
  }
  const db = await getDb();
  // El ADMIN_EMAIL siempre es admin; al resto no se le toca el flag al re-loguear
  const isAdmin = normalized === (process.env.ADMIN_EMAIL ?? "").toLowerCase();
  await db.collection<User>("users").updateOne(
    { email: normalized },
    isAdmin
      ? {
          $set: { isAdmin: true },
          $setOnInsert: { email: normalized, createdAt: new Date() },
        }
      : {
          $setOnInsert: { email: normalized, isAdmin: false, createdAt: new Date() },
        },
    { upsert: true }
  );

  const token = randomBytes(32).toString("hex");
  await db.collection<MagicLink>("magic_links").insertOne({
    tokenHash: hashToken(token),
    email: normalized,
    expiresAt: new Date(Date.now() + MAGIC_LINK_TTL_MS),
    createdAt: new Date(),
  });
  const url = `${process.env.APP_URL ?? "http://localhost:3000"}/api/auth/verify?token=${token}`;
  await sendMagicLink(normalized, url);
  return url;
}

/** Verifica un magic link (un solo uso) y devuelve el usuario, o null. */
export async function consumeMagicLink(token: string): Promise<User | null> {
  const db = await getDb();
  // findOneAndUpdate atómico: marca usado y verifica expiración en una operación
  const link = await db.collection<MagicLink>("magic_links").findOneAndUpdate(
    { tokenHash: hashToken(token), usedAt: { $exists: false }, expiresAt: { $gt: new Date() } },
    { $set: { usedAt: new Date() } }
  );
  if (!link) return null;
  return db.collection<User>("users").findOne({ email: link.email });
}

export async function createSession(user: User): Promise<void> {
  const jwt = await new SignJWT({ email: user.email, isAdmin: user.isAdmin })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(user._id))
    .setExpirationTime(`${SESSION_DAYS}d`)
    .setIssuedAt()
    .sign(secret());
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, jwt, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
    path: "/",
  });
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const jwt = cookieStore.get(SESSION_COOKIE)?.value;
  if (!jwt) return null;
  try {
    const { payload } = await jwtVerify(jwt, secret());
    return {
      userId: payload.sub as string,
      email: payload.email as string,
      isAdmin: payload.isAdmin === true,
    };
  } catch {
    return null;
  }
}

export async function requireUser(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) throw new AuthError(401, "Necesitas iniciar sesión");
  return session;
}

export async function requireAdmin(): Promise<SessionUser> {
  const session = await requireUser();
  if (!session.isAdmin) throw new AuthError(403, "Solo el administrador puede hacer esto");
  return session;
}

export class AuthError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
  }
}

export function sessionUserId(session: SessionUser): ObjectId {
  return new ObjectId(session.userId);
}
