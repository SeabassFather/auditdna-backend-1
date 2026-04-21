const fs = require("fs");
const path = require("path");

const logPath = path.join(__dirname, "../../../logs/ai-decisions.log");

class DecisionLog {
  record(entry) {
    const line = JSON.stringify(entry) + "\n";
    fs.appendFileSync(logPath, line);
  }
}

module.exports = new DecisionLog();

