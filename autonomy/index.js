// Autonomy bootstrap - called once from server.js on boot
const registry = require('./agent-registry');
const agents = require('./agents');

function boot(pgPool) {
  registry.init(pgPool);
  for (const agent of agents) registry.register(agent);
  registry.start().catch(e => console.error('[AUTONOMY] start failed:', e.message));
  return registry;
}

module.exports = { boot, registry };
