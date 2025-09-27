const USDAService = require('../services/USDAService');
const multer = require('multer');

const usdaService = new USDAService();

// Configure multer for file uploads
const upload = multer({ dest: './uploads/usda/' });

class USDAController {
    // GET /api/engines/usda_pricing/search
    async search(req, res) {
        try {
            console.log('🔍 USDA Search request:', req.query);
            
            const { query, ...filters } = req.query;
            const options = {
                page: parseInt(req.query.page) || 1,
                limit: parseInt(req.query.limit) || 10,
                sortBy: req.query.sortBy || 'marketDate',
                sortOrder: req.query.sortOrder || 'desc'
            };

            // Log audit trail
            await usdaService.createAuditLog('search', {
                query,
                filters,
                ip: req.ip,
                userAgent: req.get('User-Agent')
            });

            const results = await usdaService.search(query, filters, options);
            
            res.json({
                success: true,
                engine: 'usda_pricing',
                ...results
            });
        } catch (error) {
            console.error('❌ USDA Search error:', error);
            res.status(500).json({
                success: false,
                error: error.message,
                engine: 'usda_pricing'
            });
        }
    }

    // POST /api/engines/usda_pricing/upload
    async upload(req, res) {
        try {
            console.log('📤 USDA Upload request:', req.file);
            
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    error: 'No file provided',
                    engine: 'usda_pricing'
                });
            }

            const metadata = {
                commodity: req.body.commodity,
                location: req.body.location,
                marketDate: req.body.marketDate,
                source: req.body.source || 'USDA',
                description: req.body.description
            };

            // Log audit trail
            await usdaService.createAuditLog('upload', {
                filename: req.file.originalname,
                size: req.file.size,
                metadata,
                ip: req.ip,
                userAgent: req.get('User-Agent')
            });

            const uploadResult = await usdaService.upload(req.file, metadata);
            
            res.json({
                success: true,
                engine: 'usda_pricing',
                upload: uploadResult
            });
        } catch (error) {
            console.error('❌ USDA Upload error:', error);
            res.status(500).json({
                success: false,
                error: error.message,
                engine: 'usda_pricing'
            });
        }
    }

    // POST /api/engines/usda_pricing/analyze
    async analyze(req, res) {
        try {
            console.log('📊 USDA Analyze request:', req.body);
            
            const { commodity, timeframe = '6months' } = req.body;
            
            if (!commodity) {
                return res.status(400).json({
                    success: false,
                    error: 'Commodity is required for analysis',
                    engine: 'usda_pricing'
                });
            }

            // Log audit trail
            await usdaService.createAuditLog('price_analysis', {
                commodity,
                timeframe,
                ip: req.ip,
                userAgent: req.get('User-Agent')
            });

            const analysis = await usdaService.analyzePriceTrends(commodity, timeframe);
            
            res.json({
                success: true,
                engine: 'usda_pricing',
                analysis
            });
        } catch (error) {
            console.error('❌ USDA Analysis error:', error);
            res.status(500).json({
                success: false,
                error: error.message,
                engine: 'usda_pricing'
            });
        }
    }

    // POST /api/engines/usda_pricing/report
    async generateReport(req, res) {
        try {
            console.log('📋 USDA Report request:', req.body);
            
            const { reportType, commodity, timeframe, options = {} } = req.body;
            
            if (!reportType) {
                return res.status(400).json({
                    success: false,
                    error: 'Report type is required',
                    engine: 'usda_pricing'
                });
            }

            // Generate analysis data for the report
            let reportData = {};
            if (commodity) {
                reportData = await usdaService.analyzePriceTrends(commodity, timeframe);
            }

            // Log audit trail
            await usdaService.createAuditLog('report_generate', {
                reportType,
                commodity,
                timeframe,
                ip: req.ip,
                userAgent: req.get('User-Agent')
            });

            const report = await usdaService.generateReport(reportType, reportData, options);
            
            res.json({
                success: true,
                engine: 'usda_pricing',
                report
            });
        } catch (error) {
            console.error('❌ USDA Report error:', error);
            res.status(500).json({
                success: false,
                error: error.message,
                engine: 'usda_pricing'
            });
        }
    }

    // POST /api/engines/usda_pricing/validate
    async validateCompliance(req, res) {
        try {
            console.log('✅ USDA Compliance validation request:', req.body);
            
            const { data, rules = [] } = req.body;
            
            if (!data) {
                return res.status(400).json({
                    success: false,
                    error: 'Data is required for compliance validation',
                    engine: 'usda_pricing'
                });
            }

            // Log audit trail
            await usdaService.createAuditLog('compliance_check', {
                data,
                rules: rules.map(r => r.name),
                ip: req.ip,
                userAgent: req.get('User-Agent')
            });

            const validation = await usdaService.validateCompliance(data, rules);
            
            res.json({
                success: true,
                engine: 'usda_pricing',
                validation
            });
        } catch (error) {
            console.error('❌ USDA Compliance validation error:', error);
            res.status(500).json({
                success: false,
                error: error.message,
                engine: 'usda_pricing'
            });
        }
    }

    // GET /api/engines/usda_pricing/demo
    async getDemoData(req, res) {
        try {
            console.log('🎭 USDA Demo data request');
            
            const demoData = usdaService.getDemoData();
            
            res.json({
                success: true,
                engine: 'usda_pricing',
                demo: demoData
            });
        } catch (error) {
            console.error('❌ USDA Demo data error:', error);
            res.status(500).json({
                success: false,
                error: error.message,
                engine: 'usda_pricing'
            });
        }
    }
}

module.exports = { USDAController, upload };