const readOnly = (req, res, next) => { next(); };
const enforceReadOnly = (req, res, next) => { next(); };
module.exports = { readOnly, enforceReadOnly };
