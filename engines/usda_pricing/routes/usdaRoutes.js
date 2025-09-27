const express = require('express');
const { body, query, validationResult } = require('express-validator');
const { USDAController, upload } = require('../controllers/USDAController');

const router = express.Router();
const usdaController = new USDAController();

// Validation middleware
const validateRequest = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            errors: errors.array(),
            engine: 'usda_pricing'
        });
    }
    next();
};

// GET /api/engines/usda_pricing/search
router.get('/search', [
    query('query').optional().isString().trim(),
    query('commodity').optional().isString().trim(),
    query('location').optional().isString().trim(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('sortBy').optional().isIn(['marketDate', 'price', 'commodity', 'location']),
    query('sortOrder').optional().isIn(['asc', 'desc'])
], validateRequest, (req, res) => {
    usdaController.search(req, res);
});

// POST /api/engines/usda_pricing/upload
router.post('/upload', upload.single('file'), [
    body('commodity').optional().isString().trim(),
    body('location').optional().isString().trim(),
    body('marketDate').optional().isISO8601(),
    body('source').optional().isString().trim(),
    body('description').optional().isString().trim()
], validateRequest, (req, res) => {
    usdaController.upload(req, res);
});

// POST /api/engines/usda_pricing/analyze
router.post('/analyze', [
    body('commodity').isString().notEmpty().withMessage('Commodity is required'),
    body('timeframe').optional().isIn(['1month', '3months', '6months', '1year'])
], validateRequest, (req, res) => {
    usdaController.analyze(req, res);
});

// POST /api/engines/usda_pricing/report
router.post('/report', [
    body('reportType').isIn(['price_analysis', 'risk_assessment', 'compliance_check', 'market_trends'])
        .withMessage('Invalid report type'),
    body('commodity').optional().isString().trim(),
    body('timeframe').optional().isIn(['1month', '3months', '6months', '1year']),
    body('options').optional().isObject()
], validateRequest, (req, res) => {
    usdaController.generateReport(req, res);
});

// POST /api/engines/usda_pricing/validate
router.post('/validate', [
    body('data').isObject().withMessage('Data object is required'),
    body('rules').optional().isArray()
], validateRequest, (req, res) => {
    usdaController.validateCompliance(req, res);
});

// GET /api/engines/usda_pricing/demo
router.get('/demo', (req, res) => {
    usdaController.getDemoData(req, res);
});

module.exports = router;