import { chromium } from 'playwright'
import { mkdir } from 'node:fs/promises'

const outDir = '/opt/cursor/artifacts'
await mkdir(outDir, { recursive: true })

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } })
const email = `pico+${Date.now()}@demo.tocks`

await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' })
await page.getByPlaceholder('Tu nombre').fill('Pico Demo')
await page.getByPlaceholder('tu@correo.com').fill(email)
await page.getByPlaceholder('••••••••').fill('demo1234')
await page.getByRole('button', { name: /Crear cuenta/i }).click()

await page.getByPlaceholder('Ej. Electro Norte').waitFor({ timeout: 10000 })
await page.getByPlaceholder('Ej. Electro Norte').fill('Electro Norte')
await page.getByRole('button', { name: /Crear tienda/i }).click()

await page.getByRole('heading', { name: 'Inventario' }).waitFor({ timeout: 10000 })
await page.screenshot({ path: `${outDir}/tocks-inventory-empty.png`, fullPage: true })

await page.getByRole('button', { name: 'Agregar producto' }).click()
await page.getByRole('button', { name: 'Guardar producto' }).waitFor()

const fields = page.locator('.field')
await fields.filter({ hasText: 'Nombre' }).locator('input').fill('Resistencia 10k')
await fields.filter({ hasText: 'Descripción' }).locator('textarea').fill('Pack 10 unidades')
await fields.filter({ hasText: /^Costo$/ }).locator('input').fill('0.05')
await fields.filter({ hasText: /^Precio$/ }).locator('input').fill('0.25')
await fields.filter({ hasText: /Stock · Sede principal/ }).locator('input').fill('50')
await fields.filter({ hasText: /Stock · Sede 2/ }).locator('input').fill('20')
await page.getByRole('button', { name: 'Guardar producto' }).click()

await page.getByText('Resistencia 10k').waitFor({ timeout: 10000 })
await page.screenshot({ path: `${outDir}/tocks-inventory-product.png`, fullPage: true })

await page.getByRole('link', { name: 'Caja' }).click()
await page.getByRole('heading', { name: 'Caja' }).waitFor()
await page.getByRole('button', { name: /Resistencia 10k/ }).click()
await page.getByRole('button', { name: /Resistencia 10k/ }).click()
await page.locator('.field').filter({ hasText: 'Cliente' }).locator('input').fill('Cliente Demo')
await page.getByRole('button', { name: 'Confirmar venta' }).click()
await page.getByText(/Venta FAC-/i).waitFor({ timeout: 10000 })
await page.screenshot({ path: `${outDir}/tocks-pos-sold.png`, fullPage: true })

await page.getByRole('link', { name: 'Ventas' }).click()
await page.getByText('FAC-').waitFor({ timeout: 10000 })
await page.screenshot({ path: `${outDir}/tocks-sales.png`, fullPage: true })

await page.getByRole('link', { name: 'Estadísticas' }).click()
await page.getByText('Ingresos').waitFor()
await page.screenshot({ path: `${outDir}/tocks-stats.png`, fullPage: true })

console.log(JSON.stringify({ ok: true, email, artifacts: [
  'tocks-inventory-empty.png',
  'tocks-inventory-product.png',
  'tocks-pos-sold.png',
  'tocks-sales.png',
  'tocks-stats.png',
] }, null, 2))

await browser.close()
