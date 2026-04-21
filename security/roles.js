const ROLES = { ADMIN: 'admin', USER: 'user', INVESTIGATOR: 'investigator' };
const SCOPES = { AUDIT_READ: 'audit:read', AUDIT_WRITE: 'audit:write' };
const ROLE_SCOPES = { admin: ['audit:read', 'audit:write'], user: ['audit:read'] };
module.exports = { ROLES, SCOPES, ROLE_SCOPES };

