import { test, expect, type Page } from "@playwright/test";

// Flujos clave en navegador real (RF-01/05/06/07). El pago completo con
// Stripe Checkout queda fuera (ver REFLEXION-FINAL §deuda saldada).

async function loginAs(page: Page, email: string) {
  await page.goto("/login");
  await page.getByRole("textbox", { name: "Email" }).fill(email);
  await page.getByRole("button", { name: "Enviarme el enlace" }).click();
  // En dev el magic link aparece como botón en la propia página
  await page.getByRole("link", { name: /entrar ahora/i }).click();
  await expect(page.getByRole("link", { name: "Salir" }).or(page.getByRole("button", { name: "Salir" }))).toBeVisible();
}

test("la portada muestra el hero y los sorteos en venta", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Elige tu número");
  await expect(page.getByText("Sorteos en venta")).toBeVisible();
});

test("RF-05: login con magic link de un solo uso", async ({ page }) => {
  await loginAs(page, `e2e-login-${Date.now()}@example.com`);
  await expect(page.getByRole("link", { name: "Mis boletos" })).toBeVisible();
});

test("RF-06: el perfil valida el IBAN y lo guarda", async ({ page }) => {
  await loginAs(page, `e2e-iban-${Date.now()}@example.com`);
  await page.goto("/profile");
  const input = page.getByRole("textbox", { name: /IBAN/i });
  await input.fill("ES0000000000000000000000");
  await page.getByRole("button", { name: "Guardar cuenta" }).click();
  await expect(page.getByText(/IBAN no es válido/i)).toBeVisible();
  await input.fill("ES91 2100 0418 4502 0005 1332");
  await page.getByRole("button", { name: "Guardar cuenta" }).click();
  await expect(page.getByText("Cuenta guardada.")).toBeVisible();
});

test("RF-07: la rejilla permite elegir un número libre", async ({ page, request }) => {
  const res = await request.get("/api/lotteries");
  const { lotteries } = await res.json();
  const open = lotteries.find((l: { status: string }) => l.status === "open");
  test.skip(!open, "no hay loterías abiertas en la BD");

  await loginAs(page, `e2e-grid-${Date.now()}@example.com`);
  await page.goto(`/lottery/${open._id}`);
  await expect(page.getByText(/vendidos/i).first()).toBeVisible();
  // Elegir el primer número libre (botón habilitado de la rejilla)
  const freeNumber = page
    .locator("button", { hasText: /^\d+$/ })
    .and(page.locator(":not([disabled])"))
    .first();
  await freeNumber.click();
  await expect(page.getByRole("button", { name: /^Comprar el \d+/ })).toBeEnabled();
});

test("RF-01: un usuario normal no accede a /admin; el admin sí", async ({ browser }) => {
  // Usuario normal: /admin lo expulsa a la portada
  const userCtx = await browser.newContext();
  const userPage = await userCtx.newPage();
  await loginAs(userPage, `e2e-user-${Date.now()}@example.com`);
  await userPage.goto("/admin");
  await expect(userPage.getByRole("heading", { level: 1 })).toContainText("Elige tu número");
  await expect(userPage.getByRole("link", { name: "Admin" })).toHaveCount(0);
  await userCtx.close();

  // Admin: ve el panel completo (y no tiene "Mis boletos")
  const adminCtx = await browser.newContext();
  const adminPage = await adminCtx.newPage();
  await loginAs(adminPage, "admin@lottery.dev");
  await expect(adminPage.getByRole("link", { name: "Admin" })).toBeVisible();
  await expect(adminPage.getByRole("link", { name: "Mis boletos" })).toHaveCount(0);
  await adminPage.goto("/admin");
  await expect(adminPage.getByRole("heading", { name: "Administración" })).toBeVisible();
  await expect(adminPage.getByText("Nueva lotería")).toBeVisible();
  await adminCtx.close();
});
