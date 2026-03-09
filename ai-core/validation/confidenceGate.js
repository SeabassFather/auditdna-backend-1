module.exports = function confidenceGate(score) {
  return score >= 0.75;
};
