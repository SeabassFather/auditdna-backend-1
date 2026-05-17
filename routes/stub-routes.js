// stub-routes.js — placeholder 200 responses for unmounted endpoints
// Prevents dashboard tile 404s while real routes are built
const router = require('express').Router();

router.get('/live-feed',        (req,res) => res.json({feeds:[],total:0}));
router.get('/active-campaigns', (req,res) => res.json({campaigns:[],total:0}));
router.get('/usda/price-intel', (req,res) => res.json({data:[],markets:[]}));
router.get('/field-reps',       (req,res) => res.json({reps:[],total:0}));
router.get('/escrow/engine',    (req,res) => res.json({status:'ok',deals:[]}));
router.get('/sourcing',         (req,res) => res.json({results:[],total:0}));
router.get('/manifest',         (req,res) => res.json({manifests:[],total:0}));
router.get('/admin/dashboard',  (req,res) => res.json({metrics:{},status:'ok'}));

module.exports = router;
