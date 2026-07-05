# 🎬 Guion del video de entrega — 5:00 min

> Tres secuencias: **funcionamiento** (0:00–2:30), **código** (2:30–4:00) y
> **reflexión final** (4:00–5:00). Tiempos orientativos; ensayar con cronómetro.

## Preparación (antes de grabar)

```bash
# MongoDB: servicio nativo de Windows ya corriendo (no hace falta Docker)
npm run seed:reset        # estado demo limpio
npm run dev               # http://localhost:3000
```

- Tener creada una lotería con **fecha ya pasada y números vendidos** para poder
  sortear en vivo, y otra **desierta previa** para que haya bote pendiente
  (el seed ya deja una desierta con 250 € en el bote).
- Pestañas abiertas en este orden: ① http://localhost:3000 · ② VS Code ·
  ③ terminal · ④ GitLab (pipelines del repo).
- A mano: admin `admin@lottery.dev` · tarjeta de test `4242 4242 4242 4242`.
- **Empezar deslogueado.**

---

## SECUENCIA 1 — Funcionamiento (0:00 – 2:30)

### 0:00–0:15 · Presentación (pestaña ①, home con el hero)
> "Este es un **sistema de lotería online** con premio único: el admin crea
> sorteos, los jugadores compran un número pagando con **Stripe**, el sorteo
> elige un ganador con azar criptográfico y el premio se paga por
> **transferencia bancaria**. Si el número ganador no se vendió, el premio
> **se acumula como bote** para la siguiente lotería."

### 0:15–0:35 · Portada (RF-03)
- Señalar el hero, las tarjetas con **premio en ámbar**, cuenta atrás en vivo,
  barra de vendidos, y el histórico (una pagada, una desierta con su bote).
> "Puede haber **varias loterías activas a la vez**. Cada tarjeta muestra el
> premio total — incluido el bote heredado —, el precio del boleto y cuándo
> **cierra la venta: 10 minutos antes del sorteo**, validado en servidor."

### 0:35–1:00 · Login con magic link (RF-05) y perfil (RF-06)
- Pulsar "Entrar", escribir un email → botón "Modo desarrollo: entrar ahora →".
- Ir a "Mis boletos" → guardar el **IBAN** (probar uno inválido primero: error).
> "Autenticación **sin contraseñas**: magic link de un solo uso que caduca en
> 15 minutos, firmado y guardado hasheado. El perfil pide la **cuenta bancaria**
> con validación IBAN completa — checksum mod-97 —, porque ahí se paga el premio."

### 1:00–1:40 · Comprar un número (RF-07/08)
- Entrar a un sorteo en venta: la **rejilla de números** (vendidos tachados).
- Elegir un número libre → "Comprar el NN por X €" → Stripe Checkout →
  tarjeta `4242 4242 4242 4242` → pagar.
- De vuelta: banner "Pago confirmado" y el número **en ámbar**; verlo también
  en "Mis boletos".
> "El boleto **no se asigna al pagar**, sino cuando el servidor confirma la
> sesión contra Stripe — por **webhook con firma verificada** o al volver del
> checkout, ambos sobre la **misma función idempotente**. La doble venta es
> imposible: hay un **índice unique** por lotería y número, y si un pago llega
> tarde a un número ya vendido, se **reembolsa automáticamente**."

### 1:40–2:30 · Panel de administración (RF-01/02/09/10 y RF-04)
- Salir → entrar como `admin@lottery.dev` → menú **Admin** (señalar que el
  admin no tiene "Mis boletos").
- Señalar el aviso de **bote pendiente**; crear una lotería → el bote se
  absorbe como premio acumulado.
- En la tabla, una lotería con fecha pasada: pulsar **Sortear** → confirmar.
  - Si sale vendido: estado "Sorteada", **email e IBAN del ganador** en la
    tabla → "Marcar premio pagado".
  - Si sale desierta: estado "Desierta" y el premio va al bote.
> "Solo el admin crea loterías — cualquier otro recibe un 403. El número
> ganador **no se introduce a mano**: lo genera `crypto.randomInt` al pulsar
> Sortear. Con ganador, la tabla me da su IBAN para hacer la transferencia y
> registro el pago; desierta, el premio total pasa al **bote** que absorberá
> la próxima lotería."

---

## SECUENCIA 2 — Código (2:30 – 4:00)

### 2:30–2:50 · Definición y stack (VS Code: `README.md`)
- Mostrar el README con el diagrama de arquitectura.
> "**Qué es**: el ciclo completo de una lotería — crear, vender, sortear,
> pagar, acumular. **Stack**: Next.js 16 full-stack con App Router y
> TypeScript, Tailwind 4, **MongoDB con driver nativo** sin ORM, magic link
> con `jose`, **Stripe Checkout + webhooks**. La especificación vive en
> `PROMPT.md` (el qué) y `AGENTS.md` (el cómo), con **11 requisitos
> funcionales**, cada uno con su criterio de aceptación."

### 2:50–3:15 · Arquitectura y flujo de pago (README: diagramas Mermaid)
- Zoom al diagrama y a las **secuencias de operación** (jugador y admin).
> "La decisión central es el flujo de compra: la API valida ventana y
> disponibilidad, Stripe cobra, y la asignación vive en **una única función
> idempotente** — `lib/tickets.ts` — invocada por los dos caminos: webhook
> firmado (canónico) y vuelta del checkout con `session_id` (hace que dev
> funcione sin Stripe CLI). La barrera final es el **índice unique
> {lotteryId, number}**: si salta, reembolso automático. Dinero **siempre en
> céntimos enteros**, de la BD a Stripe."

### 3:15–3:40 · Estructura (VS Code: árbol + `lib/`)
- Expandir `app/`: páginas públicas, `admin/`, y `api/` (auth, lotteries,
  checkout, stripe/webhook, profile).
- Expandir `lib/`: señalar `lottery-logic.ts` y `lotteries.ts`.
> "Las **reglas de negocio son funciones puras** en `lottery-logic.ts` —
> ventana de 10 minutos, IBAN mod-97, premio total con bote, validaciones — sin
> BD ni red, para testearlas sin infraestructura. El acceso a datos vive en
> `lotteries.ts`, incluido el sorteo con `crypto.randomInt` y el bote en la
> colección `config`. Lección heredada de ecommerce: los clientes de Mongo y
> Stripe son **lazy**, para que `next build` no falle en el runner de CI sin
> variables de entorno."

### 3:40–3:45 · Tests (terminal)
- Ejecutar `npm test` en vivo (~1 s).
> "**19 tests unitarios en verde**: la ventana de compra con sus bordes
> exactos, el checksum del IBAN, la acumulación del bote, y las validaciones
> de creación. Cada requisito funcional tiene al menos un test."

### 3:45–4:00 · CI y plan de despliegue (pestaña ④ · VS Code: `AGENTS.md` · terminal)
- Mostrar el pipeline verde en GitLab; en VS Code, scroll por
  `AGENTS.md` §Deployment (aprovisionamiento + comando `gcloud run deploy`);
  en el terminal: `curl localhost:3000/api/health` → `{"ok":true,"db":"up"}`.
> "Sincronizado en **GitHub y GitLab**; el pipeline construye con el
> **Dockerfile multi-stage standalone** en el runner — configuración heredada
> de tres proyectos anteriores, **verde a la primera**. El despliegue público
> está **documentado y listo para ejecutar**: **Cloud Run + MongoDB Atlas +
> Resend** a coste cero, secretos en Secret Manager, el webhook de Stripe al
> dominio público, y este **health check** que verifica la BD tras cada
> deploy — aquí respondiendo en local. El rollback sería instantáneo por
> revisions de Cloud Run."

---

## SECUENCIA 3 — Reflexión final (4:00 – 5:00)

*(VS Code: `REFLEXION-FINAL.md` abierto; ir haciendo scroll por sección)*

### 4:00–4:20 · Decisiones que funcionaron (§Decisiones)
> "Tres decisiones dieron el resultado esperado. **Una sola función de
> asignación, idempotente y con reembolso**, compartida por webhook y vuelta
> del checkout: el boleto se asigna exactamente una vez, llegue el evento por
> donde llegue. **Lógica pura separada del acceso a datos**: las reglas del
> negocio se prueban en milisegundos sin arrancar nada. Y el **bote como
> documento único** en `config`: acumular y absorber son dos operaciones
> atómicas, sin recorrer el histórico."

### 4:20–4:35 · Deuda técnica asumida (scroll a §Deuda técnica)
> "Deuda, dicha honestamente: la **transferencia al ganador es manual** — el
> admin la hace en su banco y la registra; integrarla con una API bancaria
> queda fuera del alcance. El **sorteo lo dispara el admin** con un botón; en
> producción sería un job programado. Y faltan los **e2e de Playwright** y la
> prueba de carga de 100 concurrentes que fija la especificación."

### 4:35–4:50 · Aprendizajes (scroll a §Aprendizajes)
> "El aprendizaje más caro del proyecto: **un pago real sin webhook corriendo**
> — Stripe cobró, el boleto no se asignó, y el número siguió en venta hasta
> producir un doble cobro. La solución fue triple: verificación al volver del
> checkout, un **script de reconciliación** contra Stripe, y el reembolso
> automático del duplicado. Y el método de siempre: cada incidente documentado
> como **problema-causa-solución** en la retrospectiva — este proyecto arrancó
> con el CI y el MongoDB local ya resueltos desde ecommerce."

### 4:50–5:00 · Qué haría distinto · cierre (scroll a §Qué haría distinto)
> "¿Qué haría distinto? La **doble vía de confirmación de pago desde el día
> uno** — el incidente del webhook era previsible —, y el sorteo como job
> programado en vez de botón. En resumen: los **11 requisitos** implementados,
> probados y documentados, con la especificación como contrato. Gracias."

---

## Chuleta de tiempos

| Marca | Escena |
|---|---|
| 0:00 | Presentación (hero) |
| 0:15 | Portada: tarjetas, bote, cuenta atrás |
| 0:35 | Magic link + IBAN |
| 1:00 | Compra: rejilla + Stripe + número en ámbar |
| 1:40 | Admin: crear (absorbe bote), sortear, pagar |
| 2:30 | Definición y stack |
| 2:50 | Arquitectura + flujo de pago idempotente |
| 3:15 | Estructura: lógica pura en lib/ |
| 3:40 | Tests en vivo |
| 3:45 | CI verde + plan de despliegue + health check |
| 4:00 | Reflexión: decisiones que funcionaron |
| 4:20 | Reflexión: deuda técnica |
| 4:35 | Reflexión: aprendizajes |
| 4:50 | Qué haría distinto · gracias |
