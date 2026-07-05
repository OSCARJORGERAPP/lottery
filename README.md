# Lottery 🎟️

Sistema de lotería online con premio único: el administrador crea sorteos, los
usuarios entran con **magic link**, compran un número pagando con **Stripe** y,
al llegar la fecha, se sortea un número ganador cuyo premio se paga por
**transferencia bancaria** al IBAN del perfil. Si el número ganador no se
vendió, el premio **se acumula como bote** para la siguiente lotería.

> Especificación completa: [PROMPT.md](PROMPT.md) · Guía operativa: [AGENTS.md](AGENTS.md) · Arranque en 5 min: [QUICKSTART.md](QUICKSTART.md)

## Stack

Next.js (App Router, full-stack) · Tailwind CSS v4 · MongoDB · Stripe Checkout ·
magic link (consola en dev / Resend en prod) · Vitest.

## Instalación y arranque

```bash
npm install
cp .env.example .env.local   # rellenar claves de Stripe
npm run seed                 # datos de ejemplo + índices (Mongo en 127.0.0.1:27017)
npm run dev                  # http://localhost:3000
```

En desarrollo el magic link de login aparece como botón en la propia página
(y también en la consola del servidor). Admin por defecto: `admin@lottery.dev`
(variable `ADMIN_EMAIL`).

## Arquitectura

```mermaid
flowchart LR
  U[Usuario / Navegador] -->|HTTP| APP[Next.js<br/>páginas + API routes]
  ADM[Admin] -->|HTTP /admin| APP
  APP -->|driver| DB[(MongoDB<br/>users · lotteries · tickets<br/>payments · config.pot)]
  APP -->|Checkout Session| STRIPE[Stripe]
  STRIPE -->|webhook firmado<br/>checkout.session.completed| APP
  APP -->|magic link| EMAIL[Consola dev /<br/>Resend prod]

  style APP fill:#4a90e2,color:#fff
  style DB fill:#50c878,color:#fff
  style STRIPE fill:#635bff,color:#fff
  style EMAIL fill:#ffa500,color:#000
```

Flujo de compra (RF-07): el usuario elige un número libre en la rejilla → la API
valida ventana de compra y disponibilidad → Stripe Checkout → el **webhook**
(firma verificada) inserta el boleto. El índice unique `{lotteryId, number}` es
la barrera final contra la doble venta: si salta, el pago se reembolsa.

Flujo del sorteo (RF-09/RF-04): pasada la fecha final, aparece el botón
**Sortear** en el panel de admin. El número ganador no se introduce a mano: se
genera con `crypto.randomInt` al pulsarlo. Número vendido → estado `drawn`, la
tabla muestra email e IBAN del ganador, el admin hace la transferencia y pulsa
"Marcar premio pagado" (→ `paid`). Número sin vender → estado `deserted` y el
premio total pasa al bote (`config.pot`), que absorbe automáticamente la
próxima lotería creada.

## Roles

| Rol | Cómo se obtiene | Qué ve/hace |
|---|---|---|
| Usuario | Login con cualquier email (magic link) | Compra números, guarda su IBAN, consulta "Mis boletos" |
| Admin | Login con el email de `ADMIN_EMAIL` | Menú **Admin**: crear loterías, sortear, marcar premio pagado. No compra boletos (sin "Mis boletos") |

Estados de una lotería: `open` (en venta) → `drawn` (sorteada, pago pendiente) →
`paid` (premio transferido), o `open` → `deserted` (número ganador sin vender,
premio al bote). Guía paso a paso: [QUICKSTART.md](QUICKSTART.md).

## Secuencias de operación

### Jugador

```mermaid
sequenceDiagram
  actor J as Jugador
  participant APP as Next.js
  participant S as Stripe
  participant DB as MongoDB

  J->>APP: Entrar (email)
  APP-->>J: Magic link (email / botón en dev)
  J->>APP: Abre el enlace → sesión iniciada
  J->>APP: Guarda su IBAN (Mis boletos)
  J->>APP: Elige número libre en la rejilla
  APP->>APP: Valida ventana (>10 min) y disponibilidad
  APP->>S: Crea Checkout Session
  J->>S: Paga (4242 4242 4242 4242 en test)
  S-->>APP: Webhook firmado / vuelta con session_id
  APP->>DB: Inserta boleto (índice unique = sin doble venta)
  APP-->>J: Número en ámbar en la rejilla y en "Mis boletos"
  Note over J,APP: Si su número sale ganador,<br/>recibe el premio por transferencia al IBAN
```

### Administrador

```mermaid
sequenceDiagram
  actor A as Admin
  participant APP as Next.js (/admin)
  participant DB as MongoDB

  A->>APP: Entrar con el email de ADMIN_EMAIL
  A->>APP: Crear lotería (nombre, fecha, premio, precio, nº de números)
  APP->>DB: Guarda la lotería + absorbe el bote pendiente
  Note over APP: Venta abierta hasta 10 min antes de la fecha
  A->>APP: Pulsa "Sortear" (visible al pasar la fecha)
  APP->>APP: Genera número ganador (crypto.randomInt)
  alt Número vendido
    APP->>DB: Estado drawn + ganador (email e IBAN en la tabla)
    A->>A: Hace la transferencia bancaria al ganador
    A->>APP: Pulsa "Marcar premio pagado" → estado paid
  else Número sin vender
    APP->>DB: Estado deserted + premio total al bote (config.pot)
    Note over APP,DB: La próxima lotería creada suma el bote a su premio
  end
```

## Tests

```bash
npm test          # 19 tests unitarios: ventana de compra, IBAN mod-97, bote, validaciones
npm run test:cov  # cobertura
```

Política: cada RF tiene ≥1 test (ver PROMPT.md §4). E2E con Playwright: pendiente.

## Métricas

Objetivos en PROMPT.md §5 (API p95 < 300 ms, Mongo p95 < 50 ms, ≥100 usuarios
concurrentes, 0 doble venta). Cómo medir: AGENTS.md §Métricas
(`npx autocannon`, `explain("executionStats")`).

| Métrica | Objetivo | Medido |
|---|---|---|
| Latencia p95 `GET /api/lotteries` | < 300 ms | <!-- TODO --> |
| Query tickets por lotería (índice) | < 50 ms | <!-- TODO --> |
| Concurrencia sin doble venta | 100 usuarios | <!-- TODO --> |

## Deployment

Guía y restricciones del CI de la academia: [AGENTS.md](AGENTS.md) §Deployment y §CI.
Repos: [GitHub](https://github.com/OSCARJORGERAPP/lottery) ·
[GitLab](https://gitlab.codecrypto.academy/ojrapp/lottery) (siempre sincronizados).
