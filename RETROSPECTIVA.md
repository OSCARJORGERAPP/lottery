# RETROSPECTIVA — bitácora problema → causa → solución

Entradas por incidente, en orden cronológico. Complementa las
"lecciones heredadas" de ecommerce/bonos/videocapture recogidas en AGENTS.md §CI.

## 2026-07-05 — Docker Mongo duplicado en dev

- **Problema**: `docker run mongo:7` falló con `Bind for 0.0.0.0:27017 failed:
  port is already allocated`, dejando un contenedor `lottery-mongo` a medias.
- **Causa**: en esta máquina ya corre el **MongoDB nativo de Windows** en
  127.0.0.1:27017 (misma lección que en ecommerce); lanzar otro mongod en Docker
  duplica la instancia.
- **Solución**: usar siempre el mongod nativo en desarrollo (documentado en
  AGENTS.md §Servicios locales); Docker solo en CI/producción. El contenedor
  huérfano se eliminó con `docker rm lottery-mongo`.

## 2026-07-05 — Magic link invisible: stdout del dev server tragado por un pipe

- **Problema**: el magic link (que en dev se imprime en consola) no aparecía en
  el log del servidor; imposible completar el login.
- **Causa**: el server se lanzó como `npm run dev | head -50`; al cerrar `head`
  el pipe, la salida quedó bufferizada/perdida aunque el proceso siguió vivo.
  Al relanzar, el puerto 3000 seguía ocupado por el proceso zombi.
- **Solución**: matar el proceso que escuchaba en el puerto
  (`Get-NetTCPConnection -LocalPort 3000` → `Stop-Process`) y relanzar
  `npm run dev` **sin pipes**. Regla: nunca encadenar `head`/`tail` a un
  servidor de larga vida; leer su fichero de log.

## 2026-07-05 — ESLint `react-hooks/purity`: `Date.now()` en el render

- **Problema**: `next lint` falló con "Cannot call impure function during
  render" en la tabla del admin (`l.endDate.getTime() <= Date.now()`).
- **Causa**: las reglas de React 19 prohíben funciones impuras dentro del
  render, también en Server Components.
- **Solución**: extraer la comparación a un helper de la capa de lógica
  (`hasEnded(endDate)` en `lib/lottery-logic.ts`), que además queda cubierto
  por tests. Patrón: cualquier decisión dependiente del reloj vive en
  `lottery-logic.ts`, no en los componentes.

## 2026-07-05 — Pago completado pero boleto sin asignar (webhook ausente en dev)

- **Problema**: el usuario compró el nº 48, Stripe cobró, pero el boleto no
  aparecía ni en la rejilla ni en "Mis boletos". Al seguir libre el número, se
  volvió a comprar y hubo un segundo cargo.
- **Causa**: el único camino que asignaba boletos era el webhook
  `checkout.session.completed`, y en local no había `stripe listen` corriendo
  (Stripe no puede alcanzar localhost sin él). Stripe CLI ni siquiera estaba
  instalada.
- **Solución**: (1) script `scripts/reconcile-payments.ts` que recorre las
  sesiones pagadas de Stripe e inserta los boletos que falten (idempotente);
  recuperó el boleto y detectó el cargo duplicado, que se reembolsó. (2) La
  `success_url` ahora lleva `session_id={CHECKOUT_SESSION_ID}` y la página del
  sorteo confirma el pago contra Stripe al volver del checkout
  (`lib/tickets.ts::assignTicketBySessionId`), así el boleto se asigna al
  instante sin depender del webhook en dev. El webhook sigue siendo el camino
  canónico en producción; ambos comparten la misma función idempotente con
  reembolso automático de duplicados.

## Plantilla para nuevas entradas

```markdown
## AAAA-MM-DD — Título corto

- **Problema**: qué se observó.
- **Causa**: raíz real, no el síntoma.
- **Solución**: qué se hizo y qué regla queda para el futuro.
```
