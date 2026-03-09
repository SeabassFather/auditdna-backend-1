class ValidationEngine {
  async run(agentId, response) {
    if (!response || !response.output) {
      return { passed: false, reason: "Empty response" };
    }
    return { passed: true };
  }
}

module.exports = new ValidationEngine();
