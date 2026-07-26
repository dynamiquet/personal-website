/*
  Dev-only shared JSON stores for posts + discussions.

  GET/PUT /api/posts        → data/posts.json
  GET/PUT /api/discussions  → data/discussions.json

  Every browser/profile hitting the same Vite server shares the same data.
*/

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { SEED_POSTS } from './data/seed.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function emptyDiscussions() {
  return {
    version: 1,
    inlineThreads: {},
    comments: {},
    reactions: {},
  }
}

function defaultPosts() {
  return structuredClone(SEED_POSTS)
}

function ensureFile(filePath, fallback) {
  const dir = path.dirname(filePath)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, `${JSON.stringify(fallback(), null, 2)}\n`, 'utf8')
  }
}

function readJson(filePath, fallback) {
  ensureFile(filePath, fallback)
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'))
  } catch {
    return fallback()
  }
}

function writeJson(filePath, payload, fallback) {
  ensureFile(filePath, fallback)
  const body = payload == null ? fallback() : payload
  fs.writeFileSync(filePath, `${JSON.stringify(body, null, 2)}\n`, 'utf8')
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', chunk => chunks.push(chunk))
    req.on('end', () => {
      try {
        const text = Buffer.concat(chunks).toString('utf8')
        resolve(text ? JSON.parse(text) : null)
      } catch (err) {
        reject(err)
      }
    })
    req.on('error', reject)
  })
}

function sendJson(res, status, body) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Cache-Control', 'no-store')
  res.end(JSON.stringify(body))
}

function normalizeDiscussions(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw) || raw.version !== 1) {
    return emptyDiscussions()
  }
  return raw
}

function normalizePosts(raw) {
  return Array.isArray(raw) ? raw : defaultPosts()
}

function mountJsonApi(middlewares, { urlPath, filePath, fallback, normalize }) {
  middlewares.use(async (req, res, next) => {
    const url = req.url?.split('?')[0]
    if (url !== urlPath) {
      next()
      return
    }

    if (req.method === 'GET') {
      sendJson(res, 200, normalize(readJson(filePath, fallback)))
      return
    }

    if (req.method === 'PUT') {
      try {
        const body = await readBody(req)
        writeJson(filePath, normalize(body), fallback)
        sendJson(res, 200, normalize(readJson(filePath, fallback)))
      } catch {
        sendJson(res, 400, { error: 'invalid_json' })
      }
      return
    }

    res.statusCode = 405
    res.setHeader('Allow', 'GET, PUT')
    res.end('Method Not Allowed')
  })
}

export function localDevApiPlugin(options = {}) {
  const postsFile = options.postsFile || path.join(__dirname, 'data', 'posts.json')
  const discussionsFile = options.discussionsFile
    || path.join(__dirname, 'data', 'discussions.json')

  function mount(middlewares) {
    mountJsonApi(middlewares, {
      urlPath: '/api/posts',
      filePath: postsFile,
      fallback: defaultPosts,
      normalize: normalizePosts,
    })
    mountJsonApi(middlewares, {
      urlPath: '/api/discussions',
      filePath: discussionsFile,
      fallback: emptyDiscussions,
      normalize: normalizeDiscussions,
    })
  }

  return {
    name: 'local-dev-api',
    configureServer(server) {
      mount(server.middlewares)
    },
    configurePreviewServer(server) {
      mount(server.middlewares)
    },
  }
}

/** @deprecated use localDevApiPlugin */
export function discussionsApiPlugin(options = {}) {
  return localDevApiPlugin({
    discussionsFile: options.filePath,
  })
}
