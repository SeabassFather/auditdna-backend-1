const attachUser=(req,res,next)=>{req.user=req.session?.user||null;next()};
const requireAuth=(req,res,next)=>{if(req.session?.user||req.headers['x-api-key'])return next();res.status(401).json({error:'Auth required'})};
const requireAdmin=(req,res,next)=>{const r=req.session?.user?.role;if(r==='owner'||r==='admin')return next();res.status(403).json({error:'Admin required'})};
const requireOwner=(req,res,next)=>{if(req.session?.user?.role==='owner')return next();res.status(403).json({error:'Owner required'})};
module.exports={attachUser,requireAuth,requireAdmin,requireOwner};