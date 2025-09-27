const express = require('express');
const { body, query, validationResult } = require('express-validator');
const multer = require('multer');
const EngineManager = require('../engines/EngineManager');

const router = express.Router();
const engineManager = new EngineManager();

// Configure multer for file uploads
const upload = multer({ dest: './uploads/engines/' });

// Validation middleware
const validateRequest = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            errors: errors.array()
        });
    }
    next();
};

// Engine parameter validation middleware
const validateEngine = (req, res, next) => {
    const { engineName } = req.params;
    const engine = engineManager.getEngine(engineName);
    
    if (!engine) {
        return res.status(404).json({
            success: false,
            error: `Engine '${engineName}' not found`,
            availableEngines: engineManager.getAllEngines()
        });
    }
    
    req.engine = engine;
    req.engineName = engineName;
    next();
};

// GET /api/engines - List all available engines
router.get('/', (req, res) => {
    try {
        const status = engineManager.getSystemStatus();
        res.json({
            success: true,
            ...status
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// GET /api/engines/demo - Get demo data for all engines
router.get('/demo', (req, res) => {
    try {
        const demoData = engineManager.getDemoData();
        res.json({
            success: true,
            demo: demoData
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// GET /api/engines/search - Search across all engines
router.get('/search', [
    query('query').optional().isString().trim(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 })
], validateRequest, async (req, res) => {
    try {
        const { query, ...filters } = req.query;
        const options = {
            page: parseInt(req.query.page) || 1,
            limit: parseInt(req.query.limit) || 10
        };

        const results = await engineManager.searchAllEngines(query, filters, options);
        
        res.json({
            success: true,
            ...results
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// GET /api/engines/:engineName - Get specific engine info
router.get('/:engineName', validateEngine, (req, res) => {
    try {
        const config = engineManager.getEngineConfig(req.engineName);
        const demoData = req.engine.getDemoData();
        
        res.json({
            success: true,
            engine: req.engineName,
            config,
            demo: demoData
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            engine: req.engineName
        });
    }
});

// GET /api/engines/:engineName/search - Search specific engine
router.get('/:engineName/search', validateEngine, [
    query('query').optional().isString().trim(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('sortBy').optional().isString().trim(),
    query('sortOrder').optional().isIn(['asc', 'desc'])
], validateRequest, async (req, res) => {
    try {
        const { query, ...filters } = req.query;
        const options = {
            page: parseInt(req.query.page) || 1,
            limit: parseInt(req.query.limit) || 10,
            sortBy: req.query.sortBy || 'createdAt',
            sortOrder: req.query.sortOrder || 'desc'
        };

        const results = await req.engine.search(query, filters, options);
        
        res.json({
            success: true,
            engine: req.engineName,
            ...results
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            engine: req.engineName
        });
    }
});

// POST /api/engines/:engineName/upload - Upload to specific engine
router.post('/:engineName/upload', validateEngine, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No file provided',
                engine: req.engineName
            });
        }

        const metadata = {
            ...req.body,
            uploadedBy: req.body.userId || 'anonymous',
            engineName: req.engineName,
            uploadDate: new Date()
        };

        const uploadResult = await req.engine.upload(req.file, metadata);
        
        res.json({
            success: true,
            engine: req.engineName,
            upload: uploadResult
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            engine: req.engineName
        });
    }
});

// POST /api/engines/:engineName/report - Generate report for specific engine
router.post('/:engineName/report', validateEngine, [
    body('reportType').isString().notEmpty().withMessage('Report type is required'),
    body('data').optional().isObject(),
    body('options').optional().isObject()
], validateRequest, async (req, res) => {
    try {
        const { reportType, data = {}, options = {} } = req.body;
        
        const report = await req.engine.generateReport(reportType, data, options);
        
        res.json({
            success: true,
            engine: req.engineName,
            report
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            engine: req.engineName
        });
    }
});

// POST /api/engines/:engineName/validate - Validate compliance for specific engine
router.post('/:engineName/validate', validateEngine, [
    body('data').isObject().withMessage('Data object is required'),
    body('rules').optional().isArray()
], validateRequest, async (req, res) => {
    try {
        const { data, rules = [] } = req.body;
        
        const validation = await req.engine.validateCompliance(data, rules);
        
        res.json({
            success: true,
            engine: req.engineName,
            validation
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            engine: req.engineName
        });
    }
});

// GET /api/engines/:engineName/demo - Get demo data for specific engine
router.get('/:engineName/demo', validateEngine, (req, res) => {
    try {
        const demoData = req.engine.getDemoData();
        
        res.json({
            success: true,
            engine: req.engineName,
            demo: demoData
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            engine: req.engineName
        });
    }
});

module.exports = router;