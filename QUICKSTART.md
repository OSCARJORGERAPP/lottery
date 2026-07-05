# QUICKSTART — de cero a corriendo en 5 minutos

Prerrequisitos: Node 20+, MongoDB corriendo en `127.0.0.1:27017`
(en Windows: el servicio nativo de MongoDB, **no** Docker — ver AGENTS.md).

```bash
# 1. Dependencias
npm install

# 2. Variables de entorno
cp .env.example .env.local
# → rellenar STRIPE_SECRET_KEY y NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY (claves de test)

# 3. Datos de ejemplo (4 usuarios, 4 loterías, 35 boletos, bote de 250 €)
npm run seed

# 4. Arrancar
npm run dev
```

Abre **http://localhost:3000**.

## Secuencia de operación del jugador

1. **Entrar**: pulsa "Entrar", escribe cualquier email → en desarrollo aparece
   el botón **"Modo desarrollo: entrar ahora →"** en la propia página (además,
   el enlace se imprime en la consola del servidor). En producción se envía por
   email. El enlace dura 15 min y es de un solo uso.
2. **Guardar el IBAN**: en "Mis boletos" → "Cuenta para recibir el premio".
   Sin IBAN el admin no puede transferirte el premio si ganas.
3. **Elegir sorteo**: en la portada, entra en un sorteo "En venta". La venta
   cierra 10 minutos antes de la fecha del sorteo (cuenta atrás visible).
4. **Comprar número**: pulsa un número libre de la rejilla (los tachados están
   vendidos) y paga con la tarjeta de test `4242 4242 4242 4242` (cualquier
   fecha futura y CVC). Al volver del pago, el servidor confirma la sesión
   contra Stripe y el boleto se asigna al momento — en dev no hace falta el
   webhook. En producción el webhook es el camino canónico:
   `stripe listen --forward-to localhost:3000/api/stripe/webhook`
   (poner el `whsec_...` en `STRIPE_WEBHOOK_SECRET`).
5. **Comprobar**: tu número queda en ámbar en la rejilla y aparece en
   "Mis boletos".
6. **Después del sorteo**: si tu número sale ganador lo verás con 🏆 en
   "Mis boletos" y en la página del sorteo; el premio llega por transferencia
   al IBAN guardado.

## Secuencia de operación del admin

### Entrar como administrador

1. Si estás dentro con otro usuario, pulsa **Salir**.
2. Pulsa **Entrar** y escribe el email de `ADMIN_EMAIL` (por defecto
   **`admin@lottery.dev`**; cámbialo en `.env.local` y reinicia si quieres usar
   tu correo — el flag de admin se aplica al hacer login).
3. Usa el botón **"Modo desarrollo: entrar ahora →"**.
4. Aparece el enlace **Admin** (ámbar) en la barra. El admin no compra boletos:
   su navegación es Sorteos · Admin · Salir.

### Ciclo de vida de una lotería (panel Admin)

1. **Crear**: nombre, fecha del sorteo (mínimo 10 min de ventana de compra),
   premio, precio del boleto y cantidad de números. Si hay bote pendiente de
   sorteos desiertos, se suma automáticamente al premio de la nueva lotería.
2. **Venta**: los usuarios compran números hasta 10 minutos antes de la fecha.
3. **Sortear**: cuando pasa la fecha, aparece el botón **Sortear** en la tabla.
   El número ganador **no se introduce a mano**: se genera con azar
   criptográfico (`crypto.randomInt`) al pulsar el botón.
   - Número vendido → estado "Sorteada — pago pendiente", con el email y el
     IBAN del ganador visibles en la tabla.
   - Número sin vender → estado "Desierta" y el premio total pasa al bote.
4. **Pagar**: haz la transferencia al IBAN del ganador y pulsa
   **"Marcar premio pagado"** → estado "Premio pagado".

## Tests

```bash
npm test
```

## Problemas típicos

| Síntoma | Solución |
|---|---|
| "No se puede conectar con la base de datos" | Arranca el servicio de MongoDB y ejecuta `npm run seed` |
| El boleto no aparece tras pagar | Recarga la página de la lotería; si persiste: `npx tsx scripts/reconcile-payments.ts` |
| El magic link caducó | Pide otro; duran 15 min y son de un solo uso |
| No veo el enlace en la consola | En dev no hace falta: sale como botón en la página de login |
