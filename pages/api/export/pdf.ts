import fs from "node:fs"
import path from "node:path"
import chromium from "@sparticuz/chromium"
import puppeteer from "puppeteer-core"
import type { Page } from "puppeteer-core"
import { buildResumeHtml } from "@/lib/export-html"
import { validateResumeData } from "@/lib/resume-utils"
import { apiHandler, allowMethods, requireSameOrigin, ApiError } from "@/lib/server/http"
import { getApiUser } from "@/lib/server/auth"
import { guestId, requestFingerprint, requestIpHash } from "@/lib/server/guest"
import { reserveExport, completeExport, failExport } from "@/lib/server/export-quota"
import { resumeSchema } from "@/lib/server/resume-schema"
import { readShare } from "@/lib/server/resumes"

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "8mb",
    },
  },
}

function findLocalChromePath() {
  const candidates = [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    `C:\\Users\\${process.env.USERNAME}\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe`,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium-browser",
    "/usr/bin/chromium",
  ]

  return candidates.find((candidate) => fs.existsSync(candidate))
}

let cachedEmbeddedFontStyle = ""

function getEmbeddedFontStyle() {
  if (cachedEmbeddedFontStyle) {
    return cachedEmbeddedFontStyle
  }

  const fontPath = path.join(process.cwd(), "public", "NotoSansSC-Medium.ttf")
  if (!fs.existsSync(fontPath)) {
    return ""
  }

  const fontBase64 = fs.readFileSync(fontPath).toString("base64")
  cachedEmbeddedFontStyle = `
    <style id="pdf-embedded-font">
      @font-face {
        font-family: "ResumeCJK";
        src: url(data:font/ttf;base64,${fontBase64}) format("truetype");
        font-style: normal;
        /* This is a static Medium font, not a variable font. Register one
           normal weight so Chromium synthesizes bold for strong/b text. */
        font-weight: 400;
      }

      html,
      body,
      body *:not(code):not(pre) {
        font-family: "ResumeCJK", "Noto Sans SC", "Microsoft YaHei", sans-serif !important;
      }

      code,
      pre,
      code *,
      pre * {
        font-family: "SFMono-Regular", Consolas, monospace !important;
      }
    </style>
  `

  return cachedEmbeddedFontStyle
}

function injectEmbeddedFont(html: string) {
  const embeddedFontStyle = getEmbeddedFontStyle()
  if (!embeddedFontStyle) {
    return html
  }

  if (html.includes("</head>")) {
    return html.replace("</head>", `${embeddedFontStyle}</head>`)
  }

  return `${embeddedFontStyle}${html}`
}

async function waitForPageAssets(page: Page) {
  await page.evaluate(async () => {
    const imageLoads = Array.from(document.images, (image) => {
      if (image.complete) {
        return Promise.resolve()
      }

      return new Promise<void>((resolve) => {
        const finalize = () => resolve()
        image.addEventListener("load", finalize, { once: true })
        image.addEventListener("error", finalize, { once: true })
      })
    })

    const fontsReady =
      "fonts" in document ? document.fonts.ready.catch(() => undefined) : Promise.resolve(undefined)

    await Promise.race([
      Promise.all([fontsReady, ...imageLoads]),
      new Promise<void>((resolve) => window.setTimeout(resolve, 10000)),
    ])
  })
}

export default apiHandler(async (req, res) => {
  allowMethods(req, res, ["POST"])
  requireSameOrigin(req)
  const user = await getApiUser(req, res)
  const actor = user ? { userId: user.id } : { guestId: guestId(req, res), fingerprintHash: requestFingerprint(req), ipHash: requestIpHash(req) }
  const shared = typeof req.body?.shareToken === "string" ? await readShare(req.body.shareToken) : undefined
  if (shared === null) throw new ApiError(404, "SHARE_NOT_FOUND", "分享不存在或已关闭。")
  const resumeData = resumeSchema.parse(shared ?? req.body?.resumeData)

  const validation = validateResumeData(resumeData)
  if (!validation.isValid) {
    return res.status(400).json({
      error: "Invalid resume data",
      details: validation.errors.join("; "),
    })
  }

  let browser: Awaited<ReturnType<typeof puppeteer.launch>> | null = null
  const reservation = await reserveExport(actor)

  try {
    const html = buildResumeHtml(resumeData)

    if (process.env.VERCEL === "1") {
      browser = await puppeteer.launch({
        args: [...chromium.args, "--disable-gpu"],
        defaultViewport: { width: 1440, height: 2048 },
        executablePath: await chromium.executablePath(),
        headless: true,
      })
    } else {
      const executablePath = findLocalChromePath()
      if (!executablePath) {
        throw new ApiError(503, "PDF_UNAVAILABLE", "PDF 服务暂不可用。此次未扣除额度。")
      }

      browser = await puppeteer.launch({
        executablePath,
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
      })
    }

    const page = await browser.newPage()
    await page.setJavaScriptEnabled(false)
    // Resume HTML is untrusted. Do not allow Chromium to reach internal services or the metadata endpoint.
    await page.setRequestInterception(true)
    page.on("request", (request) => {
      if (/^(data:|blob:|about:)/i.test(request.url())) void request.continue().catch(() => {})
      else void request.abort().catch(() => {})
    })
    await page.setViewport({ width: 1440, height: 2048, deviceScaleFactor: 1 })
    await page.setContent(injectEmbeddedFont(html), { waitUntil: "domcontentloaded", timeout: 45000 })
    await waitForPageAssets(page)

    const pdf = await page.pdf({
      timeout: 60000,
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      margin: {
        top: "0",
        right: "0",
        bottom: "0",
        left: "0",
      },
    })

    await completeExport(reservation)
    res.setHeader("Content-Type", "application/pdf")
    res.setHeader("Content-Disposition", "attachment; filename=resume.pdf")
    res.setHeader("Cache-Control", "no-store")
    return res.status(200).send(Buffer.from(pdf))
  } catch (error) {
    await failExport(reservation).catch(() => {})
    if (error instanceof ApiError) throw error
    throw new ApiError(503, "EXPORT_FAILED", "PDF 生成失败，请稍后重试。此次未扣除额度。")
  } finally {
    if (browser) {
      await browser.close().catch(() => {})
    }
  }
})
