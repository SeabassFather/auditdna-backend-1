// SSE pub/sub broadcaster for /api/deals/stream
const clients = new Set();
let heartbeatTimer = null;

function registerClient(res, meta = {}) {
  const client = { res, meta, id: Date.now() + Math.random() };
  clients.add(client);
  if (!heartbeatTimer) heartbeatTimer = setInterval(heartbeat, 30000);
  return client;
}

function unregisterClient(client) {
  clients.delete(client);
  if (clients.size === 0 && heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
}

function broadcast(eventType, data) {
  const payload = JSON.stringify({ type: eventType, data, at: new Date().toISOString() });
  const chunk = `event: ${eventType}\ndata: ${payload}\n\n`;
  for (const c of clients) {
    try { c.res.write(chunk); } catch (e) { clients.delete(c); }
  }
}

function heartbeat() {
  const chunk = `: heartbeat ${Date.now()}\n\n`;
  for (const c of clients) {
    try { c.res.write(chunk); } catch (e) { clients.delete(c); }
  }
}

function clientCount() { return clients.size; }

module.exports = { registerClient, unregisterClient, broadcast, clientCount };
