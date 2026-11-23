/**
 * Production Help Center captures.
 *
 * Opens a headed Chrome window with a persistent profile, waits for a person
 * to sign in with Google or Microsoft, then reuses that session. Does not
 * submit email-and-password credentials.
 *
 *   node scripts/capture-screenshots.mjs --base-url https://app.hello-envoy.com --manual-auth
 */
import { tmpdir } from 'node:os'
import { copyFile, mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

const LOGIN_TIMEOUT_MS = 12 * 60 * 1000

function appUrl(baseUrl, path) {
  return new URL(path, `${baseUrl}/`).toString()
}

function themedPath(path, scheme) {
  return scheme === 'dark' ? path.replace(/\.png$/, '-dark.png') : path
}

function weddingTab(page, name) {
  return page
    .locator(
      '[data-testid="planner-top-tabs"]:visible, [data-testid^="planner-mobile-tab-circles-"]:visible'
    )
    .getByRole('tab', { name, exact: true })
}

function contactsSubtab(page, name) {
  return page
    .locator('[data-testid="planner-contacts-subtabs"]:visible')
    .getByRole('tab', { name, exact: true })
}

async function clickWeddingTab(page, name) {
  const id = name.toLowerCase()
  const tabs = page.locator(`[role="tab"][data-tab="${id}"]`)
  await page.waitForFunction((tabId) => {
    return [...document.querySelectorAll(`[role="tab"][data-tab="${tabId}"]`)].some((el) => {
      const box = el.getBoundingClientRect()
      return box.width > 8 && box.height > 8
    })
  }, id)
  const count = await tabs.count()
  for (let i = 0; i < count; i += 1) {
    const box = await tabs.nth(i).boundingBox()
    if (box && box.width > 8 && box.height > 8) {
      await tabs.nth(i).click()
      return
    }
  }
  throw new Error(`No visible ${name} tab`)
}

async function clickContactsSubtab(page, name) {
  const scoped = contactsSubtab(page, name)
  if ((await scoped.count()) > 0) {
    await scoped.first().click()
    return
  }
  await page.getByRole('tab', { name, exact: true }).first().click()
}

async function capture(page, dest, options = {}) {
  await mkdir(dirname(dest), { recursive: true })
  if (options.beforeScreenshot) await options.beforeScreenshot(page)
  await page.screenshot({
    path: dest,
    fullPage: options.fullPage ?? false,
    ...(options.clip ? { clip: options.clip } : {}),
  })
  console.log(`✓ ${dest}`)
}

async function redact(page, identity) {
  await page.evaluate((identity) => {
    const emailRe = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi
    const phoneRe = /(?:\+?\d{1,2}[\s.-])?(?:\(?\d{3}\)?[\s.-])\d{3}[\s.-]\d{4}\b/g
    const fullName = (identity?.name || '').trim()

    const replaceText = (value) => {
      if (!value) return value
      let next = value
      if (fullName && fullName.length > 1) next = next.split(fullName).join('Demo User')
      next = next.replace(emailRe, 'name@example.com').replace(phoneRe, '(555) 010-0199')
      return next
    }

    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    const nodes = []
    let current
    while ((current = walker.nextNode())) nodes.push(current)
    for (const node of nodes) {
      const next = replaceText(node.nodeValue)
      if (next !== node.nodeValue) node.nodeValue = next
    }

    for (const el of document.querySelectorAll('input, textarea')) {
      if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) continue
      if (el.type === 'password' || el.type === 'file' || el.type === 'hidden') continue
      const next = replaceText(el.value)
      if (next !== el.value) el.value = next
    }

    document.querySelectorAll('h1, h2').forEach((el) => {
      const text = (el.textContent || '').trim()
      if (/^Jump back in,/i.test(text)) el.textContent = 'Jump back in, Demo'
    })

    document.querySelectorAll('.planner-acct-head b').forEach((el) => {
      el.textContent = 'Demo User'
    })
    document.querySelectorAll('.planner-acct-head span').forEach((el) => {
      el.textContent = 'demo@example.com'
    })
    document.querySelectorAll('.planner-profile-summary').forEach((el) => {
      el.setAttribute('title', 'Demo User · account menu')
    })
    document.querySelectorAll('[role="menuitem"]').forEach((el) => {
      if ((el.textContent || '').replace(/\s+/g, ' ').trim().startsWith('Admin')) el.remove()
    })

    document.querySelectorAll('[data-avatar-source]').forEach((el) => {
      el.querySelectorAll('img').forEach((img) => img.remove())
      el.textContent = 'DU'
    })
    document.querySelectorAll('small').forEach((el) => {
      const text = el.textContent || ''
      if (/\d/.test(text) && /\b(dr|drive|ln|lane|st|street|ave|avenue|rd|road|ct|court|way|blvd|pkwy|circle|cir)\b/i.test(text)) {
        el.textContent = 'Columbia, SC'
      }
    })
  }, identity)
}

async function settleMotion(page) {
  await page.evaluate(() => {
    for (const animation of document.getAnimations?.() ?? []) {
      try {
        animation.finish()
      } catch {
        // Some animations cannot finish early.
      }
    }
  })
  await page.waitForTimeout(250)
}

async function shot(page, dest, identity, options = {}) {
  await settleMotion(page)
  await redact(page, identity)
  await capture(page, dest, options)
}

async function gotoApp(page, url) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {})
}

async function applyScheme(page, baseUrl, scheme) {
  await page.emulateMedia({ colorScheme: scheme })
  const onApp = page.url().startsWith(baseUrl)
  if (!onApp) await gotoApp(page, appUrl(baseUrl, '/dashboard'))
  await page.evaluate((mode) => {
    localStorage.setItem('color-mode', mode)
    document.documentElement.classList.remove('dark', 'light')
    document.documentElement.classList.add(mode)
  }, scheme)
}

function signedIn(url) {
  try {
    const path = new URL(url).pathname
    return path !== '/login' && path !== '/register' && !path.startsWith('/auth') && path !== '/'
  } catch {
    return false
  }
}

async function waitForSignIn(page, baseUrl) {
  const started = Date.now()
  console.log('\nSign in with the non-customer test account in the Chrome window.')
  console.log('Use Continue with Google or Continue with Microsoft. Waiting for Dashboard...\n')
  while (Date.now() - started < LOGIN_TIMEOUT_MS) {
    const url = page.url()
    const menu = page.getByRole('button', { name: 'Account menu' }).first()
    const onApp = signedIn(url) && (await menu.isVisible().catch(() => false))
    if (onApp) {
      console.log('Signed in. Reusing this session for the signed-in captures.')
      return
    }
    if (!url.includes('hello-envoy.com') && !url.includes('accounts.google') && !url.includes('login.microsoftonline') && !url.includes('login.live')) {
      // Stay on whatever provider page the person is using.
    }
    await page.waitForTimeout(1500)
  }
  throw new Error('Timed out waiting for a signed-in Envoy session')
}

async function learnIdentity(page) {
  const menu = page.getByRole('button', { name: 'Account menu' }).first()
  await menu.click()
  const pop = page.getByRole('menu').first()
  await pop.waitFor()
  const name = (await pop.locator('.planner-acct-head b').innerText().catch(() => '')).trim()
  const email = (await pop.locator('.planner-acct-head span').innerText().catch(() => '')).trim()
  await page.keyboard.press('Escape')
  await pop.waitFor({ state: 'hidden' }).catch(() => {})
  console.log(`Account label length ${name.length}, email present ${Boolean(email)}`)
  return { name, email }
}

async function chooseWedding(page, baseUrl) {
  await gotoApp(page, appUrl(baseUrl, '/dashboard'))
  const hrefs = await page.locator('a[href*="/projects/"]').evaluateAll((els) =>
    els.map((el) => el.getAttribute('href')).filter(Boolean)
  )
  const uuids = []
  for (const href of hrefs) {
    const match = href.match(/\/projects\/([0-9a-f-]{36})/i)
    if (match && !uuids.includes(match[1])) uuids.push(match[1])
  }
  if (!uuids.length) throw new Error('No wedding on this account')

  let best = null
  for (const uuid of uuids.slice(0, 8)) {
    await gotoApp(page, appUrl(baseUrl, `/projects/${uuid}`))
    await clickWeddingTab(page, 'Contacts')
    await clickContactsSubtab(page, 'All')
    await page.getByRole('heading', { name: 'Contacts', exact: true }).waitFor()
    const allText = await page.locator('[data-testid="project-overview-content"]').innerText().catch(() => '')
    const hasContacts = /@/.test(allText) || /Detach|Contact details needed/i.test(allText)
    await clickContactsSubtab(page, 'Inbox')
    const inbox = page.locator('[data-testid="project-outreach-content"]:visible')
    await inbox.waitFor()
    // Inbox renders "No threads yet" before the sync response. Poll until a
    // draft row appears, or the empty state stays empty.
    let hasDraft = false
    for (let attempt = 0; attempt < 16; attempt += 1) {
      hasDraft = (await inbox.getByText(/\bDraft\b/).count()) > 0
      const rows = await inbox.getByTestId('outreach-vendor-row').count()
      const empty = await inbox.getByText('No threads yet').isVisible().catch(() => false)
      if (hasDraft) break
      if (empty && rows === 0 && attempt >= 4) break
      await page.waitForTimeout(500)
    }
    const score = (hasContacts ? 2 : 0) + (hasDraft ? 3 : 0)
    console.log(`Wedding ${uuid.slice(0, 8)} contacts=${hasContacts} draft=${hasDraft}`)
    if (!best || score > best.score) best = { uuid, score, hasContacts, hasDraft }
    if (hasContacts && hasDraft) break
  }
  console.log(`Using wedding ${best.uuid.slice(0, 8)}`)
  return best
}

async function openAskEnvoy(page) {
  const composer = page.getByPlaceholder('Type your message...')
  if (await composer.isVisible().catch(() => false)) return
  const mobileLauncher = page.getByTestId('mobile-ask-envoy')
  if (await mobileLauncher.isVisible().catch(() => false)) await mobileLauncher.click()
  else await page.getByTestId('ask-envoy-launcher').click()
  await composer.waitFor()
}

async function openNewProjectWizard(page, baseUrl) {
  await gotoApp(page, appUrl(baseUrl, '/dashboard'))
  await page.evaluate(() => localStorage.removeItem('new-project-draft'))
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: '+ New project' }).click()
  await page.getByRole('heading', { name: 'Essentials' }).waitFor()
  await page.getByPlaceholder('Enter project title').fill('Our Charleston Wedding')
  await page.getByPlaceholder('Describe your project...').fill(
    'Garden ceremony and candlelit reception for 120 guests this June'
  )
  await page.locator('#create-location').fill('29401')
  const option = page.getByRole('option').first()
  if (await option.isVisible().catch(() => false)) {
    await option.click().catch(() => {})
  }
}

async function closeWizard(page) {
  const cancel = page.getByRole('button', { name: 'Cancel', exact: true })
  if (await cancel.isVisible().catch(() => false)) await cancel.click()
  await page.evaluate(() => localStorage.removeItem('new-project-draft'))
}

async function openDraft(page, baseUrl, uuid) {
  await gotoApp(page, appUrl(baseUrl, `/projects/${uuid}`))
  await clickWeddingTab(page, 'Contacts')
  await clickContactsSubtab(page, 'Inbox')
  const inbox = page.locator('[data-testid="project-outreach-content"]:visible')
  await inbox.waitFor()
  const vendors = inbox.getByTestId('outreach-vendor-row')
  await vendors.first().waitFor({ timeout: 20000 })
  const count = await vendors.count()
  for (let i = 0; i < count; i += 1) {
    const vendor = vendors.nth(i)
    const label = ((await vendor.innerText()) || '').toLowerCase()
    if (!label.includes('draft')) continue
    if ((await vendor.getAttribute('aria-expanded')) !== 'true') await vendor.click()
    const threads = inbox.getByTestId('outreach-thread-row')
    await threads.first().waitFor({ timeout: 10000 })
    const threadCount = await threads.count()
    for (let t = 0; t < threadCount; t += 1) {
      const thread = threads.nth(t)
      const text = ((await thread.innerText()) || '').toLowerCase()
      if (threadCount > 1 && !text.includes('draft')) continue
      await thread.click()
      await page.locator('#draft-subject').waitFor({ timeout: 15000 })
      return
    }
  }
  throw new Error('No outreach draft on this wedding')
}

async function clipFrom(page, locator, width, height, scroll = true) {
  if (scroll) await locator.scrollIntoViewIfNeeded()
  const box = await locator.boundingBox()
  if (!box) throw new Error('Capture target is not visible')
  const viewport = page.viewportSize() || { width: 1280, height: 900 }
  const clipWidth = Math.min(width, Math.floor(box.width), viewport.width)
  const clipHeight = Math.min(height, Math.floor(box.height), viewport.height)
  let x = Math.max(0, box.x)
  let y = Math.max(0, box.y)
  if (x + clipWidth > viewport.width) x = Math.max(0, viewport.width - clipWidth)
  if (y + clipHeight > viewport.height) y = Math.max(0, viewport.height - clipHeight)
  return { x, y, width: clipWidth, height: clipHeight }
}

async function capturePublic(chromium, { root, baseUrl, schemes, pathFilter }) {
  const failures = []
  const shots = [
    {
      path: 'images/getting-started/landing-intake.png',
      run: async (page) => {
        await gotoApp(page, appUrl(baseUrl, '/'))
        await page.getByLabel('What are you planning?').fill(
          'Outdoor garden wedding for 120 guests in Charleston this June — ceremony, florist, catering, and photography'
        )
        await page.getByLabel(/ZIP or postal code/i).fill('29401')
        const search = page.getByRole('button', { name: 'Search', exact: true })
        await search.waitFor()
        const box = await search.boundingBox()
        if (box) {
          const height = Math.ceil(box.y + box.height + 4)
          if (height > 900) await page.setViewportSize({ width: 1280, height })
        }
      },
    },
    {
      path: 'images/getting-started/registration-form.png',
      run: async (page) => {
        await page.setViewportSize({ width: 1280, height: 900 })
        await gotoApp(page, appUrl(baseUrl, '/register'))
        await page.getByRole('heading', { name: /create your account/i }).waitFor()
      },
    },
    {
      path: 'images/getting-started/search-results-badges.png',
      fullPage: true,
      run: async (page) => {
        await page.setViewportSize({ width: 1280, height: 900 })
        await gotoApp(page, appUrl(baseUrl, '/'))
        await page.getByLabel('What are you planning?').fill(
          'Outdoor garden wedding for 120 guests in Charleston this June — ceremony, florist, catering, and photography'
        )
        await page.getByLabel(/ZIP or postal code/i).fill('29401')
        await page.getByRole('button', { name: 'Search', exact: true }).click()
        await page.getByText('Contacts for your project').waitFor({ timeout: 90000 })
        const readyOnly = page.getByLabel(/Only show contacts ready for outreach/i)
        if (await readyOnly.isChecked().catch(() => false)) {
          await readyOnly.uncheck()
          await page.getByText(/Florist|Flower Store|Cater/i).first().waitFor({ timeout: 20000 })
        }
        const badge = page.getByText(/Onboarded to Envoy|Unverified listing/i).first()
        if (await badge.isVisible().catch(() => false)) await badge.scrollIntoViewIfNeeded()
      },
    },
  ]

  for (const scheme of schemes) {
    const browser = await chromium.launch({ headless: true, channel: 'chrome' })
    const context = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      colorScheme: scheme,
    })
    await context.addInitScript((mode) => {
      localStorage.setItem('color-mode', mode)
    }, scheme)
    const page = await context.newPage()
    console.log(`\nPublic ${scheme} captures...`)
    for (const item of shots) {
      if (pathFilter && !item.path.includes(pathFilter)) continue
      const dest = join(root, themedPath(item.path, scheme))
      try {
        await page.setViewportSize({ width: 1280, height: 900 })
        await item.run(page)
        await shot(page, dest, null, { fullPage: item.fullPage })
      } catch (err) {
        failures.push({ path: themedPath(item.path, scheme), error: err.message })
        console.warn(`✗ ${themedPath(item.path, scheme)}: ${err.message}`)
      }
    }
    await browser.close()
  }
  return failures
}

async function captureSignedIn(page, { root, baseUrl, scheme, pathFilter, wedding, identity }) {
  const failures = []
  const uuid = wedding.uuid
  const shots = [
    {
      path: 'images/projects/dashboard-populated.png',
      run: async () => {
        await gotoApp(page, appUrl(baseUrl, '/dashboard'))
        await page.getByRole('heading', { name: /Jump back in/i }).waitFor()
      },
    },
    {
      path: 'images/projects/project-wizard.png',
      also: 'images/getting-started/project-wizard.png',
      run: async () => {
        await openNewProjectWizard(page, baseUrl)
      },
      after: async () => closeWizard(page),
    },
    {
      path: 'images/projects/project-overview.png',
      viewport: { width: 1280, height: 750 },
      run: async () => {
        await gotoApp(page, appUrl(baseUrl, `/projects/${uuid}`))
        await clickWeddingTab(page, 'Today')
        await page.getByTestId('project-today-stub').waitFor()
      },
    },
    {
      path: 'images/projects/project-chat.png',
      run: async () => {
        await gotoApp(page, appUrl(baseUrl, `/projects/${uuid}`))
        await openAskEnvoy(page)
      },
      after: async () => {
        const min = page.getByRole('button', { name: 'Minimize Ask Envoy' })
        if (await min.isVisible().catch(() => false)) await min.click()
      },
    },
    {
      path: 'images/projects/project-details.png',
      run: async () => {
        await gotoApp(page, appUrl(baseUrl, `/projects/${uuid}`))
        await clickWeddingTab(page, 'Project')
        await page.getByTestId('project-tab-stub').waitFor()
        await page.getByRole('button', { name: 'Edit project details' }).waitFor()
      },
    },
    {
      path: 'images/projects/contacts-all.png',
      run: async () => {
        await gotoApp(page, appUrl(baseUrl, `/projects/${uuid}`))
        await clickWeddingTab(page, 'Contacts')
        await clickContactsSubtab(page, 'All')
        await page.getByRole('heading', { name: 'Contacts', exact: true }).waitFor()
        await page.locator('[data-testid="project-overview-content"]').waitFor()
      },
    },
    {
      path: 'images/outreach/new-message.png',
      run: async () => {
        await openDraft(page, baseUrl, uuid)
      },
    },
    {
      path: 'images/outreach/attach-files.png',
      run: async () => {
        await openDraft(page, baseUrl, uuid)
        const fixture = join(tmpdir(), 'ceremony-timeline.txt')
        await writeFile(fixture, 'Ceremony at 5pm under the oaks, cocktail hour in the garden, dinner at 7.\n')
        const fileInput = page.locator('input[id^="draft-attachment-input-"]').first()
        await fileInput.waitFor({ state: 'attached' })
        await fileInput.setInputFiles(fixture)
        const chip = page.getByText('ceremony-timeline.txt').first()
        await chip.waitFor({ timeout: 20000 })
        await page.getByText(/· Ready/).first().waitFor({ timeout: 20000 })
        await chip.scrollIntoViewIfNeeded()
      },
      after: async () => {
        const remove = page.getByRole('button', { name: 'Remove ceremony-timeline.txt' })
        if (await remove.isVisible().catch(() => false)) {
          await remove.click()
          await page.getByText('ceremony-timeline.txt').first().waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {})
        }
      },
    },
    {
      path: 'images/account/account-settings.png',
      run: async () => {
        await gotoApp(page, appUrl(baseUrl, '/account'))
        await page.getByRole('heading', { name: 'Account', level: 1 }).waitFor()
      },
    },
    {
      path: 'images/account/email-connections.png',
      run: async () => {
        await gotoApp(page, appUrl(baseUrl, '/account#email-accounts'))
        const section = page.locator('#email-accounts')
        await section.waitFor()
        await section.scrollIntoViewIfNeeded()
      },
    },
    {
      path: 'images/account/data-privacy.png',
      viewport: { width: 1280, height: 1400 },
      clip: { width: 968, height: 900, scroll: false },
      run: async () => {
        await gotoApp(page, appUrl(baseUrl, '/account'))
        const section = page.locator('section').filter({ hasText: 'Data & Privacy' }).last()
        await section.waitFor()
        await section.evaluate((el) => el.scrollIntoView({ block: 'start' }))
        return section
      },
    },
    {
      path: 'images/account/default-location.png',
      clip: { width: 968, height: 900, scroll: false },
      run: async () => {
        await gotoApp(page, appUrl(baseUrl, '/account'))
        const section = page.locator('section').filter({ hasText: 'Default project location' }).last()
        await section.waitFor()
        await section.evaluate((el) => el.scrollIntoView({ block: 'start' }))
        return section
      },
    },
    {
      path: 'images/projects/contacts-page.png',
      clip: { width: 660, height: 560 },
      run: async () => {
        await gotoApp(page, appUrl(baseUrl, '/contacts'))
        const panel = page.locator('.planner-page .max-w-2xl').first()
        await panel.waitFor()
        await page.getByRole('heading', { name: 'Contacts', exact: true }).waitFor()
        return panel
      },
    },
    {
      path: 'images/projects/import-contacts-upload.png',
      clip: { width: 640, height: 290 },
      run: async () => {
        await gotoApp(page, appUrl(baseUrl, '/contacts'))
        await page.getByRole('button', { name: 'Import from file' }).click()
        const panel = page.getByRole('region', { name: 'Import contacts from a file' })
        await panel.waitFor()
        return panel
      },
      after: async () => {
        const close = page.getByRole('button', { name: 'Close', exact: true })
        if (await close.isVisible().catch(() => false)) await close.click()
      },
    },
    {
      path: 'images/projects/import-contacts-review.png',
      clip: { width: 640, height: 410 },
      run: async () => {
        await gotoApp(page, appUrl(baseUrl, '/contacts'))
        await page.getByRole('button', { name: 'Import from file' }).click()
        const panel = page.getByRole('region', { name: 'Import contacts from a file' })
        await panel.waitFor()
        const fixture = join(tmpdir(), 'envoy-demo-contacts.csv')
        await writeFile(
          fixture,
          'Vendor Name,Email,Phone,Website\nPetal & Stem,petal@example.com,(555) 010-0101,https://example.com\nHarbor Light Photo,harbor@example.com,(555) 010-0102,https://example.com\n'
        )
        await panel.locator('input[type="file"]').setInputFiles(fixture)
        await panel.getByText(/Found \d+ contacts in/i).waitFor({ timeout: 20000 })
        return panel
      },
      after: async () => {
        const close = page.getByRole('button', { name: 'Close', exact: true })
        if (await close.isVisible().catch(() => false)) await close.click()
      },
    },
    {
      path: 'images/projects/project-contacts-toolbar.png',
      clip: { width: 580, height: 260 },
      run: async () => {
        await gotoApp(page, appUrl(baseUrl, `/projects/${uuid}`))
        await clickWeddingTab(page, 'Contacts')
        await clickContactsSubtab(page, 'All')
        await page.getByRole('button', { name: 'Edit', exact: true }).click()
        await page.getByRole('button', { name: 'Done', exact: true }).waitFor()
        await page.getByRole('button', { name: 'Import from file' }).waitFor()
        return page.locator('[data-testid="project-overview-content"] section').first()
      },
    },
    {
      path: 'images/account/account-menu.png',
      run: async () => {
        await gotoApp(page, appUrl(baseUrl, '/dashboard'))
        await page.getByRole('button', { name: 'Account menu' }).first().click()
        const menu = page.getByRole('menu').first()
        await menu.waitFor()
        await page.getByRole('menuitem', { name: 'Settings' }).waitFor()
        await page.getByRole('menuitem', { name: 'Help Center' }).waitFor()
        await page.getByRole('menuitem', { name: 'Logout' }).waitFor()
        const feedback = page.getByRole('menuitem', { name: 'Give Feedback' })
        if (!(await feedback.isVisible().catch(() => false))) {
          console.warn('Account menu is open without Give Feedback')
        }
      },
      after: async () => {
        await page.keyboard.press('Escape')
      },
    },
    {
      path: 'images/projects/mobile-ask-envoy.png',
      viewport: { width: 390, height: 844 },
      run: async () => {
        await gotoApp(page, appUrl(baseUrl, `/projects/${uuid}`))
        await page.getByTestId('mobile-ask-envoy').click()
        await page.getByPlaceholder('Type your message...').waitFor()
        await page.waitForFunction(() => {
          const el = document.querySelector('.ask-envoy.is-workspace')
          if (!el) return false
          const rect = el.getBoundingClientRect()
          return rect.width >= window.innerWidth * 0.9 && rect.height >= window.innerHeight * 0.85
        })
        await page.getByRole('button', { name: 'Close Ask Envoy' }).waitFor()
      },
      after: async () => {
        const close = page.getByRole('button', { name: 'Close Ask Envoy' })
        if (await close.isVisible().catch(() => false)) await close.click()
      },
    },
    {
      path: 'images/projects/mobile-tabs.png',
      viewport: { width: 390, height: 844 },
      run: async () => {
        await gotoApp(page, appUrl(baseUrl, `/projects/${uuid}`))
        await page.waitForFunction(() => {
          const row = document.querySelector('.planner-mobile-tabs')
          return Boolean(row && row.getBoundingClientRect().height > 20)
        })
        await page.evaluate(() => {
          const tab = [...document.querySelectorAll('[role="tab"][data-tab="contacts"]')].find((el) => {
            const box = el.getBoundingClientRect()
            return box.width > 8 && box.height > 8
          })
          tab?.click()
        })
        await page.waitForTimeout(400)
      },
    },
    {
      path: 'images/getting-started/consent-preferences.png',
      optional: true,
      run: async () => {
        await gotoApp(page, appUrl(baseUrl, '/onboarding/consent'))
        await page.getByRole('heading', { name: 'Choose your data preferences' }).waitFor({ timeout: 8000 })
      },
    },
    {
      path: 'images/account/vendor-pending.png',
      optional: true,
      run: async () => {
        await gotoApp(page, appUrl(baseUrl, '/vendor/pending'))
        await page.getByRole('heading', { name: /on the list/i }).waitFor({ timeout: 8000 })
      },
    },
  ]

  for (const item of shots) {
    if (pathFilter && !item.path.includes(pathFilter) && !(item.also || '').includes(pathFilter)) continue
    const dest = join(root, themedPath(item.path, scheme))
    const viewport = item.viewport || { width: 1280, height: 900 }
    try {
      await page.setViewportSize(viewport)
      const target = await item.run()
      let clip
      if (item.clip) {
        if (!target) throw new Error(`Missing clip target for ${item.path}`)
        clip = await clipFrom(page, target, item.clip.width, item.clip.height, item.clip.scroll !== false)
      }
      await shot(page, dest, identity, { clip })
      if (item.also) {
        const alsoDest = join(root, themedPath(item.also, scheme))
        await copyFile(dest, alsoDest)
        console.log(`✓ ${alsoDest}`)
      }
    } catch (err) {
      const label = item.optional ? 'skipped' : 'failed'
      failures.push({ path: themedPath(item.path, scheme), error: err.message, optional: Boolean(item.optional) })
      console.warn(`✗ ${themedPath(item.path, scheme)} (${label}): ${err.message}`)
    } finally {
      if (item.after) await item.after().catch(() => {})
      await page.setViewportSize({ width: 1280, height: 900 })
    }
  }
  return failures
}

export async function runManualAuth({ chromium, root, baseUrl, args }) {
  const pathFilterIndex = args.indexOf('--path')
  const pathFilter = pathFilterIndex >= 0 ? args[pathFilterIndex + 1] : null
  const schemesArgIndex = args.indexOf('--scheme')
  const schemes = schemesArgIndex >= 0 ? [args[schemesArgIndex + 1]] : ['light', 'dark']
  const userDataIndex = args.indexOf('--user-data-dir')
  const userDataDir =
    userDataIndex >= 0 ? args[userDataIndex + 1] : join(root, '.playwright', 'envoy-profile')

  for (const scheme of schemes) {
    if (scheme !== 'light' && scheme !== 'dark') throw new Error(`Unknown --scheme ${scheme}`)
  }

  await mkdir(userDataDir, { recursive: true })

  let context
  try {
    context = await chromium.launchPersistentContext(userDataDir, {
      channel: 'chrome',
      headless: false,
      viewport: { width: 1280, height: 900 },
      colorScheme: 'light',
      ignoreDefaultArgs: ['--enable-automation'],
      args: ['--disable-blink-features=AutomationControlled', '--no-first-run', '--no-default-browser-check'],
    })
  } catch (err) {
    console.warn(`Installed Chrome was not available (${err.message}). Opening Playwright Chromium instead.`)
    context = await chromium.launchPersistentContext(userDataDir, {
      headless: false,
      viewport: { width: 1280, height: 900 },
      colorScheme: 'light',
    })
  }

  const page = context.pages()[0] || (await context.newPage())
  await gotoApp(page, appUrl(baseUrl, '/dashboard'))
  const signInPromise = waitForSignIn(page, baseUrl)
  const signedInOnly = args.includes('--signed-in-only')
  const publicPromise = signedInOnly
    ? Promise.resolve([])
    : capturePublic(chromium, { root, baseUrl, schemes, pathFilter }).catch((err) => {
        console.warn(`Public captures failed: ${err.message}`)
        return [{ path: 'public', error: err.message }]
      })

  const publicFailures = await publicPromise
  await signInPromise
  const identity = await learnIdentity(page)
  const wedding = await chooseWedding(page, baseUrl)

  const signedInFailures = []
  for (const scheme of schemes) {
    console.log(`\nSigned-in ${scheme} captures...`)
    await applyScheme(page, baseUrl, scheme)
    const failures = await captureSignedIn(page, {
      root,
      baseUrl,
      scheme,
      pathFilter,
      wedding,
      identity,
    })
    signedInFailures.push(...failures)
  }

  const darkLogoOk = await page
    .locator('.planner-rail-brand [data-brand="dark"]')
    .first()
    .evaluate((el) => getComputedStyle(el).display !== 'none')
    .catch(() => false)
  console.log(`Dark-mode wordmark visible: ${darkLogoOk}`)

  await context.close()

  const failures = [...publicFailures, ...signedInFailures]
  const required = failures.filter((item) => !item.optional)
  console.log('\nCapture summary')
  if (!failures.length) console.log('All requested shots were written.')
  for (const item of failures) console.log(`- ${item.path}: ${item.error}`)
  console.log('dashboard-empty was not captured. Production has no email-and-password sign-up for an empty account.')
  if (required.length) process.exitCode = 1
}
