const requireInvestigator = (req, res, next) => { next(); };
const requireAdmin = (req, res, next) => { next(); };
const requireScope = (scope) => { return (req, res, next) => { next(); }; };
module.exports = { requireInvestigator, requireAdmin, requireScope };

