import { chromium } from 'playwright'
import { mkdir } from 'node:fs/promises'

const outDir = '/opt/cursor/artifacts'
await mkdir(outDir, { recursive: true })

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } })
const email = `pico.tocks.${Date.now()}@gmail.com`

await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' })
await page.getByPlaceholder('Tu nombre').fill('Pico Demo')
await page.getByPlaceholder('tu@correo.com').fill(email)
await page.getByPlaceholder('Mínimo 6 caracteres').fill('demo1234')
await page.getByRole('button', { name: /Crear cuenta/i }).click()

await page.getByPlaceholder('Ej. Electro Norte').waitFor({ timeout: 15000 })
await page.getByPlaceholder('Ej. Electro Norte').fill('Electro Norte')
await page.getByRole('button', { name: /Crear negocio/i }).click()

await page.getByRole('heading', { name: 'Caja' }).waitFor({ timeout: 15000 })
await page.screenshot({ path: `${outDir}/tocks-ux-caja.png`, fullPage: true })

await page.getByRole('link', { name: /Inventario/i }).click()
await page.getByRole('heading', { name: 'Inventario' }).waitFor()
await page.getByRole('button', { name: /Nuevo producto/i }).click()
await page.getByRole('button', { name: /Guardar producto/i }).waitFor()

await page.getByPlaceholder('Ej. Resistencia 10k').fill('Resistencia 10k')
await page.getByPlaceholder('Opcional: detalles del producto').fill('Pack 10 unidades')
await page.getByPlaceholder('0.50').fill('0.05')
await page.getByPlaceholder('1.25').fill('0.25')
await page.locator('.field').filter({ hasText: /Stock · Sede principal/ }).locator('input').fill('50')
await page.getByRole('button', { name: /Guardar producto/i }).click()

await page.getByText('Resistencia 10k').waitFor({ timeout: 15000 })
await page.screenshot({ path: `${outDir}/tocks-ux-inventory.png`, fullPage: true })

await page.getByRole('link', { name: /Caja/i }).click()
await page.getByRole('heading', { name: 'Caja' }).waitFor()
await page.getByRole('button', { name: /Resistencia 10k/ }).click()
await page.getByRole('button', { name: /Resistencia 10k/ }).click()
await page.getByPlaceholder('Opcional').fill('Cliente Demo')
await page.getByRole('button', { name: /^Cobrar$/i }).click()
await page.getByText(/Venta FAC-/i).waitFor({ timeout: 15000 })
await page.screenshot({ path: `${outDir}/tocks-ux-pos.png`, fullPage: true })

await page.getByRole('link', { name: /Ventas/i }).click()
await page.getByText('FAC-').waitFor({ timeout: 15000 })
await page.screenshot({ path: `${outDir}/tocks-ux-sales.png`, fullPage: true })

await page.getByRole('link', { name: /Estadísticas/i }).click()
await page.getByText('Ingresos').waitFor()
await page.screenshot({ path: `${outDir}/tocks-ux-stats.png`, fullPage: true })

console.log(
  JSON.stringify(
    {
      ok: true,
      email,
      artifacts: [
        'tocks-ux-caja.png',
        'tocks-ux-inventory.png',
        'tocks-ux-pos.png',
        'tocks-ux-sales.png',
        'tocks-ux-stats.png',
      ],
    },
    null,
    2,
  ),
)

await browser.close()
