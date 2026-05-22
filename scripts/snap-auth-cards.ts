/* Visual smoke — capture A15 hi-fi cards + Vue impl cards side by side. */
import { chromium } from '@playwright/test'

const OUT = '/tmp/c01-visual'

async function main(): Promise<void> {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

  await page.goto(
    'http://localhost:1420/dev/hifi/auth/Kova%20Hi-Fi%20A15%20Auth%20-%20Light.html',
  )
  await page.waitForLoadState('networkidle')
  await page
    .locator('[data-screen-label="01 Signup"] .auth-card')
    .first()
    .screenshot({ path: `${OUT}/a15-01-signup.png` })
  await page
    .locator('[data-screen-label="02 Login"] .auth-card')
    .first()
    .screenshot({ path: `${OUT}/a15-02-login.png` })
  await page
    .locator('[data-screen-label="04 OTP entry"] .auth-card')
    .first()
    .screenshot({ path: `${OUT}/a15-04-otp.png` })

  await page.goto('http://localhost:1420/signup')
  await page.waitForTimeout(2000)
  await page
    .locator('section')
    .first()
    .screenshot({ path: `${OUT}/vue-signup.png` })

  await page.goto('http://localhost:1420/login')
  await page.waitForTimeout(2000)
  await page
    .locator('section')
    .first()
    .screenshot({ path: `${OUT}/vue-login.png` })

  await browser.close()
  console.log('captured')
}

void main()
