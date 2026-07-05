# Lottery — Especificación

## 1. Objetivo

Sistema de lotería online donde un administrador crea loterías con un premio único
y los usuarios compran boletos numerados pagando con Stripe; al llegar la fecha del
sorteo se elige un número ganador y el premio se paga por transferencia bancaria.

## 2. Alcance

- **Incluido (MVP)**:
  - Administración de loterías (solo admin): crear lotería con nombre, fecha final,
    premio, precio del boleto y cantidad de números.
  - Varias loterías activas simultáneamente.
  - Tipo de lotería: **un único premio al número ganador**.
  - Autenticación de usuarios por **magic link**.
  - Perfil de usuario con **cuenta bancaria** (IBAN) para recibir el premio.
  - Compra de boletos vía **Stripe** al precio definido por el admin.
  - Ventana de compra: cierra **10 minutos antes del sorteo**.
  - Sorteo y designación del ganador; pago del premio por **transferencia bancaria**.
  - Persistencia en **MongoDB** con **seed de datos**.
  - Bote acumulado: si el número ganador no fue vendido, el premio se acumula a
    la siguiente lotería.
- **Fuera de alcance (por ahora)**:
  - Loterías con múltiples premios.
  - Ejecución automática de la transferencia bancaria (se registra como acción del
    admin; la integración con banca es `TODO`).
  - Apps móviles nativas.
  - <!-- TODO: confirmar otras exclusiones con el product owner -->

## 3. Stack tecnológico

| Capa | Elección | Justificación |
|---|---|---|
| Base de datos | **MongoDB** | Requisito del PROMPT original |
| Pagos | **Stripe** (Checkout + webhooks) | Requisito del PROMPT original |
| Auth | **Magic link** (email sin contraseña) | Requisito del PROMPT original |
| Backend + Frontend | **Next.js** (App Router, API routes) + **Tailwind CSS** | Full-stack en un solo artefacto; compatible con el CI de la academia (build standalone) |
| Email (magic link) | **Consola en dev / Resend en prod** | Sin dependencias en desarrollo; envío real solo en producción |
| Tests | **Vitest** (unit/integración) + **Playwright** (e2e) | Rápido con TS/ESM; e2e para flujos clave (compra, sorteo) |

> Los comandos operativos derivados de este stack están en `AGENTS.md`.
> `TODO`: el scaffolding (package.json) aún no existe; crearlo es la primera tarea.

## 4. Requisitos funcionales

Cada RF debe tener ≥1 test automatizado (ver política en `AGENTS.md`).

| ID | Requisito | Criterio de aceptación |
|---|---|---|
| RF-01 | Solo el **admin** puede crear loterías | Un usuario no-admin recibe 403 al intentar crear/editar loterías |
| RF-02 | El admin define lotería con **nombre, fecha final, premio, precio del boleto y número de números** | La lotería creada persiste esos 5 campos y valida: fecha futura, precio > 0, números ≥ 1 |
| RF-03 | Pueden existir **varias loterías activas a la vez** | El listado muestra N loterías abiertas simultáneamente y se puede comprar en cualquiera |
| RF-04 | Tipo de lotería: **premio único al número ganador** | Al sortear se selecciona exactamente 1 número ganador; si el número no fue vendido, el sorteo queda desierto y el premio **se acumula (bote)** sumándose al premio de la siguiente lotería |
| RF-05 | Autenticación por **magic link** | El usuario introduce su email, recibe un enlace de un solo uso con expiración y queda autenticado al abrirlo |
| RF-06 | Perfil de usuario con **cuenta bancaria** | El usuario puede guardar/editar su IBAN; se valida el formato; es requisito para cobrar el premio |
| RF-07 | Compra de boleto con **Stripe** al precio definido | El pago se procesa por Stripe; el boleto solo se asigna tras confirmación del pago (webhook); un número no puede venderse dos veces |
| RF-08 | Compra permitida hasta **10 minutos antes** de la fecha final | Un intento de compra dentro de los últimos 10 minutos es rechazado con mensaje claro |
| RF-09 | Sorteo al llegar la fecha final | Se elige el número ganador de forma aleatoria y auditable; la lotería pasa a estado "sorteada" |
| RF-10 | El premio se paga por **transferencia a la cuenta bancaria del ganador** | El sistema registra el ganador, su IBAN y el estado del pago (pendiente/pagado) |
| RF-11 | **Seed de datos** | Un comando puebla la BD con admin, usuarios, loterías en varios estados y boletos de ejemplo |

## 5. Requisitos no funcionales (medibles)

Objetivos iniciales propuestos; ajustar cuando exista el sistema (`TODO`: validar con carga real).

- Latencia API p95 < **300 ms** en endpoints clave (listar loterías, comprar boleto).
- Tiempo de respuesta de MongoDB p95 < **50 ms** por operación clave (con índices de §6).
- Concurrencia: ≥ **100 usuarios simultáneos** comprando sin degradación > 20% ni doble venta de un mismo número.
- Consistencia: **0 números duplicados vendidos** bajo concurrencia (test de estrés obligatorio).
- Tamaño estimado: boleto < **1 KB**; lotería con 10 000 boletos < **10 MB** por colección.
- Disponibilidad objetivo: **99,5%**; RPO ≤ 24 h (backup diario de MongoDB), RTO ≤ 4 h.
- Seguridad: magic links de un solo uso con expiración ≤ 15 min; secretos solo por variables de entorno; webhooks de Stripe verificados por firma.

## 6. Modelo de datos (MongoDB)

Colecciones previstas (esquema orientativo, `TODO`: refinar al implementar):

- **users**: `{ email, isAdmin, bankAccount (IBAN), createdAt }`
  - Índices: `email` (unique).
- **lotteries**: `{ name, endDate, prize, accumulatedPrize?, ticketPrice, totalNumbers, status: open|drawn|deserted|paid, winningNumber?, winnerId? }`
  - Si queda `deserted` (número ganador no vendido), su premio se suma como
    `accumulatedPrize` a la siguiente lotería.
  - Índices: `status + endDate`.
- **tickets**: `{ lotteryId, number, userId, paymentId, purchasedAt }`
  - Índices: `lotteryId + number` (**unique** — garantiza no doble venta).
- **payments** (o embebido en tickets): `{ stripeSessionId, status, amount }`
  - Índices: `stripeSessionId` (unique).

## 7. Entregables documentales (OBLIGATORIOS)

Manifiesto — fuente de verdad del estado del proyecto (estado real a fecha de hoy):

| Entregable | Propósito | Estado |
|---|---|---|
| `PROMPT.md` | Especificación del producto (este documento) | ✅ |
| `AGENTS.md` | Guía operativa para agentes/devs | ✅ |
| `README.md` | Visión general, instalación, arranque, arquitectura resumida | ✅ |
| `QUICKSTART.md` | De cero a corriendo en < 5 min | ✅ |
| `RETROSPECTIVA.md` | Bitácora problema → causa → solución | ✅ 3 incidentes |
| `REFLEXION-FINAL.md` | Cierre: logros, decisiones, deuda técnica, aprendizajes | ✅ |
| Tests automatizados | ≥1 por RF; unitarios + integración + e2e clave | ✅ 19 unit + 5 e2e Playwright en verde |
| Seed de datos | Datos de ejemplo para dev/test/demo (RF-11) | ✅ |
| `.env.example` | Plantilla de variables de entorno (Mongo, Stripe, email) | ✅ |
| Lockfile | Dependencias bloqueadas, commiteado | ✅ |
| Pipeline CI (`.gitlab-ci.yml` + Dockerfile standalone) | Build en el runner de la academia | ✅ verde a la primera (2026-07-05) |
| Diagrama de arquitectura | En README (Mermaid): componentes y flujos | ✅ |
| Sección de métricas | Latencias, BD, tamaños, concurrencia (§5/§8) | ✅ medidas 2026-07-05, todas dentro de objetivo |
| Guía de deployment público | Reproducible, con secretos y rollback | ✅ (documentada; se decidió no ejecutar el deploy) |

## 8. Métricas y observabilidad

- **Qué se mide**: latencias p50/p95/p99 de endpoints clave, tiempos de query de
  MongoDB, throughput (req/s), tasa de error, usuarios concurrentes, tamaño de
  colecciones y su crecimiento, resultado de webhooks de Stripe.
- **Cómo**: `TODO` — definir al elegir stack (logging estructurado + endpoint
  `/health` + script de carga; comandos concretos en `AGENTS.md`).
- **Umbrales**: los de §5.

## 9. Deployment público

- Entorno objetivo: **Google Cloud Run** (región europe-west1) + **MongoDB
  Atlas M0** + **Resend** para email — coste 0 € en free tiers, mismo patrón
  que bonos/ecommerce.
- Dominio: el `*.run.app` que asigne Cloud Run (dominio propio: `TODO` opcional).
- Secretos por entorno (Secret Manager): `MONGODB_URI`, `AUTH_SECRET`,
  `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`;
  como env vars: `APP_URL`, `ADMIN_EMAIL`, `MONGO_DB`.
- Estrategia de actualización: revisions de Cloud Run (rolling con rollback
  instantáneo redirigiendo tráfico a la revision anterior).
- Backup/DR: snapshots de Atlas (RPO ≤ 24 h, RTO ≤ 4 h según §5).
- Verificación: endpoint `/api/health` (ping a MongoDB) + smoke test del login
  y una compra de test.
- Comandos y pasos concretos: en `AGENTS.md` §Deployment.

## 10. Criterios de aceptación del proyecto

- [ ] Todos los entregables del manifiesto (§7) presentes y completos.
- [ ] Todos los RF (§4) implementados, cada uno con ≥1 test; suite al 100% en verde.
- [ ] Test de concurrencia demuestra 0 doble venta de números (§5).
- [ ] Pipeline CI en verde (install → lint → test → build → deploy).
- [ ] Seed funcional (`RF-11`) y `.env.example` actualizado.
- [ ] Deployment público operativo con health check verificado.
- [ ] Repos GitHub y GitLab sincronizados (ver `AGENTS.md`).
