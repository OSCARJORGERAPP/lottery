# REFLEXIÓN FINAL

## Qué se logró

Los **11 requisitos funcionales** de `PROMPT.md` §4 implementados y probados
sobre Next.js 16 full-stack + MongoDB + Stripe: administración de loterías
restringida al admin, varias loterías simultáneas, magic link sin contraseñas,
perfil con IBAN validado, compra por Stripe con ventana de cierre de 10 minutos
validada en servidor, sorteo con azar criptográfico, premio por transferencia
registrada por el admin, **bote acumulado** cuando el sorteo queda desierto, y
seed completo. El flujo se verificó de punta a punta con compras reales en modo
test — incluido un incidente de doble cobro real que el sistema acabó
resolviendo con reembolso automático (ver Aprendizajes).

## Decisiones de diseño y arquitectura

- **Una sola función de asignación de boletos, idempotente y con reembolso**
  (`lib/tickets.ts`), invocada por los dos caminos posibles: el webhook firmado
  de Stripe (canónico en producción) y la vuelta del checkout con `session_id`
  (hace que dev funcione sin Stripe CLI). El boleto se asigna exactamente una
  vez, llegue el evento por donde llegue; los reintentos no duplican nada.
- **El índice unique `{lotteryId, number}` como barrera final** contra la doble
  venta: la validación de disponibilidad en el checkout es cortesía de UX; la
  garantía real es de la base de datos, y si salta, el pago se reembolsa solo.
- **Lógica de negocio pura y separada del acceso a datos**
  (`lib/lottery-logic.ts`): ventana de compra, IBAN mod-97, premio total con
  bote, validaciones. Sin BD ni red — 19 tests que corren en un segundo y
  pasan en un runner de CI sin MongoDB.
- **El bote como documento único** (`config.pot`): acumular (sorteo desierto)
  y absorber (crear lotería) son dos operaciones atómicas con
  `findOneAndUpdate`, sin recorrer el histórico de loterías.
- **Dinero siempre en céntimos enteros**, de la BD a Stripe (misma unidad):
  ni una conversión con decimales en el flujo de dinero.
- **Clientes de Mongo y Stripe lazy** (lección heredada de ecommerce): `next
  build` evalúa los módulos y el runner de CI no tiene variables de entorno.
- **Tema oscuro con identidad propia**: base `zinc-950` compartida con
  ecommerce, pero acento ámbar/oro (el color del premio), todos los números en
  Geist Mono tabular y la **rejilla de números** como elemento firma.

## Deuda técnica

- La **transferencia al ganador es manual**: el admin la ejecuta en su banco y
  la registra con "Marcar premio pagado". Integrar una API bancaria (o Stripe
  Payouts) queda fuera del alcance académico.
- El **sorteo lo dispara el admin** con un botón cuando pasa la fecha; en
  producción sería un job programado (cron) que sortea solo.
- El **e2e del pago completo con Stripe Checkout** (rellenar la tarjeta de test
  en la página de Stripe) no está automatizado; los 5 e2e de Playwright cubren
  login, IBAN, rejilla y control de acceso, y el flujo de pago quedó verificado
  manualmente y por sus piezas (unitarios + test de concurrencia).

### Deuda saldada durante el cierre (2026-07-05)

- ~~e2e de Playwright~~ → **5 escenarios en verde** (`npm run test:e2e`):
  portada, magic link, validación y guardado de IBAN, rejilla con selección de
  número libre, y control de acceso a /admin (usuario expulsado, admin dentro).
  De regalo destaparon un hydration mismatch real en la cuenta atrás.
- ~~Prueba de carga y métricas sin medir~~ → medidas contra el build de
  producción y publicadas en el README: **p95 < 220 ms con 50–100 conexiones**
  (objetivo 300), queries por índice en **0–3 ms** (objetivo 50), y el test de
  estrés de doble venta: **100 inserciones simultáneas del mismo número → 1
  boleto, 99 rechazos del índice unique** (`scripts/metrics.ts`, reproducible).

## Aprendizajes

- **El más caro: un pago real sin webhook corriendo.** Stripe cobró, el boleto
  no se asignó y el número siguió apareciendo libre — se volvió a comprar y
  hubo doble cargo. La solución fue triple: verificación del pago al volver del
  checkout (doble vía), script de **reconciliación** contra Stripe
  (`scripts/reconcile-payments.ts`) que recuperó el boleto perdido, y reembolso
  automático del duplicado vía el índice unique. Moraleja: **nunca depender de
  un único canal asíncrono para un efecto de negocio crítico**.
- **La infraestructura local también es parte del sistema**: el MongoDB nativo
  de Windows ya ocupaba el puerto 27017 — lanzar otro en Docker duplica la
  instancia (lección que ya venía de ecommerce y volvió a aparecer). Y un
  `| head` encadenado al dev server se tragó el stdout donde se imprimía el
  magic link: los servidores de larga vida no se encadenan a pipes.
- **El método de retrospectivas se amortiza**: este proyecto arrancó con el CI
  de la academia, el patrón standalone, los clientes lazy y el Mongo local ya
  resueltos desde ecommerce/bonos/videocapture. Documentar cada incidente como
  problema → causa → solución convierte los errores en infraestructura.

## Qué haría distinto

- **Doble vía de confirmación de pago desde el día uno**: el incidente del
  webhook ausente en dev era previsible; el patrón success_url + webhook sobre
  una función idempotente debería ser el punto de partida, no la corrección.
- **Sorteo como job programado** desde el diseño, con el botón del admin como
  override manual — retrofitear un cron sobre un flujo manual es más caro.
- **e2e de Playwright del camino feliz desde la primera semana**: la
  verificación manual con curl del flujo completo se hizo tres veces; escrita
  como test se habría hecho sola.

En resumen: los 11 requisitos implementados, probados y documentados, con la
especificación como contrato y una retrospectiva más para el siguiente proyecto.
