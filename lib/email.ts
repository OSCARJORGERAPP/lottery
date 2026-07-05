// Magic link por email: en dev se imprime en la consola del servidor (sin
// dependencias); en producción se envía con Resend si hay RESEND_API_KEY.
export async function sendMagicLink(email: string, url: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log(`\n🔗 Magic link para ${email}:\n   ${url}\n`);
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM ?? "Lottery <onboarding@resend.dev>",
      to: [email],
      subject: "Tu enlace para entrar en Lottery",
      html: `<p>Entra en Lottery con este enlace (caduca en 15 minutos y es de un solo uso):</p><p><a href="${url}">Iniciar sesión</a></p>`,
    }),
  });
  if (!res.ok) {
    throw new Error(`Resend respondió ${res.status}: ${await res.text()}`);
  }
}
