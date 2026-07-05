# AGENTS.md — Guía operativa de Lottery

> Especificación del producto: ver `PROMPT.md`. Este archivo es el "cómo".
> Estado: el scaffolding aún no existe; la primera tarea es crearlo con los
> scripts descritos aquí (este archivo es el contrato de comandos).

## 🚀 Instalación (paso a paso)

```bash
# 0. (Solo la primera vez) Scaffolding: Next.js + TypeScript + Tailwind
npx create-next-app@latest . --typescript --tailwind --app --eslint

# 1. Dependencias → genera/usa package-lock.json (en CI: npm ci)
npm install

# 2. Variables de entorno
cp .env.example .env.local
```

Variables de `.env.example` (las claves de Stripe test se copian de
`C:\Users\ojrap\ecommerce\.env.local` — nunca commitearlas):

```bash
MONGODB_URI=mongodb://localhost:27017/lottery
# El código también acepta las variables de la plataforma CI:
# MONGO_HOST / MONGO_PORT / MONGO_USER / MONGO_PASSWORD / MONGO_DB
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
AUTH_SECRET=...            # firma de sesiones y magic links
RESEND_API_KEY=...         # solo producción; en dev el magic link va a consola
APP_URL=http://localhost:3000
```

## 🗄️ Servicios locales

**MongoDB: usar el mongod NATIVO de Windows** (ya instalado, escucha en
`127.0.0.1:27017`). NO lanzar otro Mongo desde Docker en dev: duplica la
instancia y el bind del puerto 27017 falla (lección de ecommerce).

```bash
# Webhooks de Stripe en local (opcional en dev — requiere stripe CLI)
stripe listen --forward-to localhost:3000/api/stripe/webhook

# Si algún pago quedó sin boleto (webhook caído), reconciliar contra Stripe:
npx tsx scripts/reconcile-payments.ts
```

La asignación de boletos tiene dos caminos que comparten `lib/tickets.ts`
(idempotente, reembolsa duplicados): el webhook (canónico, producción) y la
vuelta del checkout con `session_id` (hace que dev funcione sin stripe CLI).

Email: no hace falta servicio local (ni Mailhog). En dev el magic link se
imprime en la consola del servidor; Resend solo se usa en producción.

Índices obligatorios (los crea el seed):
- `users.email` unique
- `tickets.lotteryId + number` **unique** (garantiza no doble venta, RF-07/§5)
- `lotteries.status + endDate`
- `payments.stripeSessionId` unique

Seed de datos (RF-11) para dev/test/demo:

```bash
npm run seed          # inserta admin, usuarios, loterías en varios estados, boletos + índices
npm run seed:reset    # limpia y re-siembra
```

## ▶️ Arranque del sistema

```bash
npm run dev                    # desarrollo → http://localhost:3000
npm run build && npm start     # producción (build standalone)
```

En dev, el magic link se imprime en la consola del servidor — no hace falta
proveedor de email para autenticarse.

## ✅ Tests

```bash
npm test              # suite Vitest completa (unit + integración)
npm run test:watch    # desarrollo
npm run test:cov      # cobertura
npm run test:e2e      # Playwright: flujos clave (login, compra, sorteo)
```

Política: cada RF de `PROMPT.md` §4 tiene ≥1 test. PR sin tests no se mergea.
Obligatorio un test de concurrencia que demuestre 0 doble venta de números (§5):
N compras simultáneas del mismo número → exactamente 1 boleto creado.

## 🧱 Estructura del proyecto

```
app/                  # rutas (App Router)
  api/                # API routes: auth, lotteries, tickets, stripe/webhook
  admin/              # panel del admin (crear/gestionar loterías)
  (public)/           # listado de loterías, compra, perfil
lib/                  # conexión Mongo, auth (magic link), stripe, sorteo
models/               # acceso a datos de users/lotteries/tickets/payments
scripts/seed.ts       # seed + índices
tests/                # Vitest (unit/integración) y e2e/ (Playwright)
```

## 🧭 Convenciones

- TypeScript estricto; validación de entrada en cada API route (zod o similar).
- El boleto solo se asigna tras confirmar el pago vía **webhook de Stripe**
  (verificado por firma) — nunca en el redirect de éxito.
- La ventana de compra (cierra 10 min antes de `endDate`) se valida **en el
  servidor**, no solo en la UI.
- Sorteo desierto → estado `deserted` y su premio se suma como
  `accumulatedPrize` a la siguiente lotería (RF-04).
- Commits convencionales (`feat:`, `fix:`, `docs:`...).

### CSS / Layout (Tailwind v4 — CSS Cascade Layers)

Tailwind v4 genera sus utilities dentro de `@layer utilities`. Todo CSS fuera de
un `@layer` tiene mayor prioridad en la cascada, sea cual sea su especificidad:
un reset global `* { margin: 0; padding: 0; }` **anula** `mx-auto` y rompe el centrado.

1. En `globals.css` usar **solo** `*, *::before, *::after { box-sizing: border-box; }`
   fuera de capas — el preflight de Tailwind ya resetea márgenes/paddings.
2. Centrado: contenedor exterior ancho completo + `<div>` interior centrado:
   ```tsx
   // ✅ Correcto
   <main>
     <div className="max-w-7xl mx-auto px-6 py-8">{children}</div>
   </main>
   ```
3. CSS personalizado que compita con utilities → envolverlo en `@layer utilities { ... }`.

## 📊 Métricas (cómo recolectarlas)

- Latencias: `npx autocannon -c 50 -d 10 http://localhost:3000/api/lotteries`
  contra el **build de producción** (`npm run build && npm start`), nunca el
  dev server. Objetivos en `PROMPT.md` §5.
- BD, concurrencia y tamaños: `npx tsx scripts/metrics.ts` — explain de las
  queries clave, test de estrés de doble venta (100 inserciones simultáneas
  del mismo número) y bytes por documento/colección.
- Resultados medidos: README §Métricas (2026-07-05, todo dentro de objetivo).

## 🌐 Deployment público

Plataforma (decidida, como en bonos/ecommerce): **Google Cloud Run + MongoDB
Atlas M0 + Resend** — coste 0 € en free tiers.

Aprovisionamiento (una sola vez):

1. **Atlas M0**: crear cluster → obtener `MONGODB_URI` (usuario de BD y
   allowlist de red que cubra Cloud Run: `0.0.0.0/0` en el tier gratuito).
   Ejecutar el seed o al menos `ensureIndexes` contra Atlas una vez.
2. **Resend**: cuenta gratuita → `RESEND_API_KEY` y dominio/remitente
   verificado para `EMAIL_FROM` (con la key presente, los magic links se envían
   por email en lugar de imprimirse en consola).
3. **Stripe**: webhook endpoint en el dashboard apuntando a
   `https://<dominio>/api/stripe/webhook` (evento `checkout.session.completed`)
   → obtener el `STRIPE_WEBHOOK_SECRET` de producción.
4. **GCP**: proyecto con Cloud Run y Secret Manager habilitados; cargar como
   secretos todas las variables de `.env.example` con valores de producción.
   `APP_URL` = dominio público (los magic links y las URLs de Stripe la usan).

```bash
npm run build                  # comprobación local previa (standalone)

gcloud run deploy lottery --source . --region europe-west1 \
  --allow-unauthenticated \
  --set-secrets=MONGODB_URI=lottery-mongodb-uri:latest,AUTH_SECRET=lottery-auth:latest,STRIPE_SECRET_KEY=lottery-stripe-sk:latest,STRIPE_WEBHOOK_SECRET=lottery-stripe-whsec:latest,RESEND_API_KEY=lottery-resend:latest \
  --set-env-vars=APP_URL=https://<dominio>,ADMIN_EMAIL=<email-admin>,MONGO_DB=lottery

# Verificación post-deployment
curl https://<dominio>/api/health        # {"ok":true,"db":"up"}
# + smoke test: login por magic link y compra con tarjeta de test

# Rollback: consola de Cloud Run → Revisions → redirigir tráfico a la revision
# anterior (instantáneo). Alternativa: git revert <commit> && git push, y re-deploy.
```

### ⚠️ CI en gitlab.codecrypto.academy — OBLIGATORIO leer antes de tocar `.gitlab-ci.yml`

Restricciones reales de la infraestructura de la academia (ya sufridas y
resueltas en bonos/videocapture/ecommerce):

1. Pipeline basado en los templates compartidos `internos/templates-cicd`
   (opt-in): `provision-mongo.yml` + `build-deploy.yml`.
2. **Único runner operativo**: `cloudrun-ephemeral` (tag `cloudrun`), executor
   **shell** — ignora `image:` (no hay Alpine ni `apk`). Solo funciona el job
   `build` (usa `buildah`), que requiere **Dockerfile multi-stage standalone** y
   `output: "standalone"` en `next.config.ts`. Jobs sin tag `cloudrun` se quedan
   en `pending` para siempre.
3. **`wake_cloudrun_runners` / `provision_*` / `deploy` desactivados con
   `rules: when: never`** — con `allow_failure: true` el pipeline queda "passed
   with warnings", no verde limpio.
4. **No cachear `node_modules/` y a la vez pasarlo como artifacts**: cuelga los
   jobs. Cachear solo `.npm/`. `timeout:` explícito por job (build 15m, lint/test 10m).
5. El código acepta `MONGODB_URI` local **y** las variables de plataforma
   (`MONGO_HOST`/`MONGO_PORT`/`MONGO_USER`/`MONGO_PASSWORD`/`MONGO_DB`).
6. Síntoma "no runners online" → no es bug del repo: escalar al admin pidiendo
   `docker system prune -f` + reinicio del runner, citando el precedente
   `video`/`videocapture`.

## 📦 Repositorios y sincronización

| Repositorio | URL |
|---|---|
| GitHub | `https://github.com/OSCARJORGERAPP/lottery` |
| GitLab | `https://gitlab.codecrypto.academy/ojrapp/lottery` |

Subir solo cuando: pipeline CI verde limpio, tests al 100%, build sin errores y
entregables de `PROMPT.md` §7 completos. **Todo push a main se replica en AMBOS
remotes** (la fuente de verdad es el local).

## 📒 Documentación viva (obligación del agente)

Tras cada cambio relevante:
- Si cambia instalación/arranque → actualizar `README.md` y `QUICKSTART.md`.
- Cada problema encontrado → entrada **problema → causa → solución** en `RETROSPECTIVA.md`.
- Si cambia el alcance o el stack → re-sincronizar `PROMPT.md` (y su manifiesto §7)
  con la skill `spec-docs`.
- Al cerrar el proyecto → completar `REFLEXION-FINAL.md`.
