// Simple log server to receive frontend debug POSTs and print them to stdout.
const http = require('http')

const PORT = process.env.DEBUG_LOG_PORT ? Number(process.env.DEBUG_LOG_PORT) : 4001

const server = http.createServer((req, res) => {
  // Add permissive CORS headers so browser clients can POST logs
  const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }

  if (req.method === 'OPTIONS') {
    // Preflight request
    res.writeHead(204, CORS_HEADERS)
    res.end()
    return
  }

  if (req.method === 'POST' && req.url === '/log') {
    // Ensure response includes CORS headers
    let body = ''
    req.on('data', (chunk) => (body += chunk))
    req.on('end', () => {
      try {
        const payload = JSON.parse(body)
        const ts = new Date(payload.ts || Date.now()).toISOString()
        const level = payload.level || 'log'
        const args = payload.args || []
        console.log(`[FRONTEND][${level.toUpperCase()}][${ts}]`, ...args)
      } catch (e) {
        console.log('[FRONTEND][LOG] malformed payload', body)
      }
      res.writeHead(204, CORS_HEADERS)
      res.end()
    })
    return
  }

  res.writeHead(404, CORS_HEADERS)
  res.end('Not found')
})

server.listen(PORT, () => {
  console.log(`Frontend log server listening on http://localhost:${PORT}/log`)
})

process.on('SIGINT', () => {
  console.log('Shutting down log server')
  server.close(() => process.exit(0))
})
