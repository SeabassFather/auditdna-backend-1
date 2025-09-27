const BaseEngine = require('../../base/BaseEngine');
const USDAData = require('../models/USDAData');

class USDAService extends BaseEngine {
    constructor() {
        const config = {
            capabilities: ['pricing_analysis', 'risk_assessment', 'compliance_check', 'historical_data'],
            data_types: ['commodity_prices', 'market_data', 'historical_trends', 'risk_factors']
        };
        super('usda_pricing', config);
    }

    async performSearch(query, filters, options) {
        const searchQuery = {};
        
        if (query) {
            searchQuery.$or = [
                { commodity: new RegExp(query, 'i') },
                { location: new RegExp(query, 'i') }
            ];
        }

        // Apply filters
        if (filters.commodity) {
            searchQuery.commodity = filters.commodity;
        }
        if (filters.location) {
            searchQuery.location = filters.location;
        }
        if (filters.dateFrom && filters.dateTo) {
            searchQuery.marketDate = {
                $gte: new Date(filters.dateFrom),
                $lte: new Date(filters.dateTo)
            };
        }
        if (filters.priceMin || filters.priceMax) {
            searchQuery.price = {};
            if (filters.priceMin) searchQuery.price.$gte = parseFloat(filters.priceMin);
            if (filters.priceMax) searchQuery.price.$lte = parseFloat(filters.priceMax);
        }

        const { page = 1, limit = 10, sortBy = 'marketDate', sortOrder = 'desc' } = options;
        const skip = (page - 1) * limit;
        const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

        return await USDAData.find(searchQuery)
            .sort(sort)
            .skip(skip)
            .limit(limit)
            .lean();
    }

    async getSearchCount(query, filters) {
        const searchQuery = {};
        
        if (query) {
            searchQuery.$or = [
                { commodity: new RegExp(query, 'i') },
                { location: new RegExp(query, 'i') }
            ];
        }

        // Apply same filters as search
        if (filters.commodity) searchQuery.commodity = filters.commodity;
        if (filters.location) searchQuery.location = filters.location;
        if (filters.dateFrom && filters.dateTo) {
            searchQuery.marketDate = {
                $gte: new Date(filters.dateFrom),
                $lte: new Date(filters.dateTo)
            };
        }

        return await USDAData.countDocuments(searchQuery);
    }

    async saveUploadRecord(uploadRecord) {
        // For USDA engine, save to a specific uploads collection
        const Upload = require('../models/USDAUpload');
        const upload = new Upload(uploadRecord);
        return await upload.save();
    }

    async saveReport(report) {
        // For USDA engine, save to a specific reports collection
        const Report = require('../models/USDAReport');
        const reportDoc = new Report(report);
        return await reportDoc.save();
    }

    async saveAuditLog(auditLog) {
        // For USDA engine, save to a specific audit collection
        const AuditLog = require('../models/USDAAuditLog');
        const log = new AuditLog(auditLog);
        return await log.save();
    }

    async performComplianceValidation(data, rules) {
        const results = [];
        
        // Example compliance rules for USDA data
        const defaultRules = [
            { name: 'price_range_check', min: 0, max: 1000 },
            { name: 'date_validity', maxAge: 365 },
            { name: 'location_verification', requiredFields: ['location'] },
            { name: 'commodity_classification', validCommodities: ['corn', 'wheat', 'soybeans', 'rice'] }
        ];

        const applicableRules = rules.length > 0 ? rules : defaultRules;

        for (const rule of applicableRules) {
            let status = 'passed';
            let message = `Rule ${rule.name} passed`;

            switch (rule.name) {
                case 'price_range_check':
                    if (data.price < rule.min || data.price > rule.max) {
                        status = 'failed';
                        message = `Price ${data.price} outside valid range ${rule.min}-${rule.max}`;
                    }
                    break;
                case 'date_validity':
                    const daysDiff = (new Date() - new Date(data.marketDate)) / (1000 * 60 * 60 * 24);
                    if (daysDiff > rule.maxAge) {
                        status = 'failed';
                        message = `Data is ${Math.floor(daysDiff)} days old, exceeds maximum of ${rule.maxAge} days`;
                    }
                    break;
                case 'location_verification':
                    if (!data.location || data.location.trim() === '') {
                        status = 'failed';
                        message = 'Location is required but not provided';
                    }
                    break;
                case 'commodity_classification':
                    if (!rule.validCommodities.includes(data.commodity?.toLowerCase())) {
                        status = 'failed';
                        message = `Commodity ${data.commodity} not in valid list: ${rule.validCommodities.join(', ')}`;
                    }
                    break;
            }

            results.push({
                rule: rule.name,
                status,
                message,
                timestamp: new Date()
            });
        }

        return results;
    }

    // USDA-specific methods
    async analyzePriceTrends(commodity, timeframe = '6months') {
        const endDate = new Date();
        const startDate = new Date();
        
        switch (timeframe) {
            case '1month':
                startDate.setMonth(endDate.getMonth() - 1);
                break;
            case '3months':
                startDate.setMonth(endDate.getMonth() - 3);
                break;
            case '6months':
                startDate.setMonth(endDate.getMonth() - 6);
                break;
            case '1year':
                startDate.setFullYear(endDate.getFullYear() - 1);
                break;
        }

        const data = await USDAData.find({
            commodity: commodity,
            marketDate: { $gte: startDate, $lte: endDate }
        }).sort({ marketDate: 1 });

        if (data.length === 0) {
            return {
                commodity,
                timeframe,
                trend: 'no_data',
                analysis: 'Insufficient data for analysis'
            };
        }

        const prices = data.map(d => d.price);
        const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        const volatility = this.calculateVolatility(prices);

        // Simple trend analysis
        const firstPrice = prices[0];
        const lastPrice = prices[prices.length - 1];
        const trendDirection = lastPrice > firstPrice ? 'upward' : 'downward';
        const trendStrength = Math.abs((lastPrice - firstPrice) / firstPrice) * 100;

        return {
            commodity,
            timeframe,
            trend: trendDirection,
            trendStrength: `${trendStrength.toFixed(2)}%`,
            analysis: {
                avgPrice: avgPrice.toFixed(2),
                minPrice: minPrice.toFixed(2),
                maxPrice: maxPrice.toFixed(2),
                volatility: volatility.toFixed(2),
                dataPoints: data.length
            }
        };
    }

    calculateVolatility(prices) {
        if (prices.length < 2) return 0;
        
        const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
        const variance = prices.reduce((acc, price) => acc + Math.pow(price - mean, 2), 0) / prices.length;
        return Math.sqrt(variance);
    }

    getSampleSearchResults() {
        return [
            {
                id: '1',
                commodity: 'Corn',
                price: 4.85,
                priceUnit: 'USD/bushel',
                location: 'Chicago, IL',
                marketDate: '2024-01-15',
                complianceStatus: 'compliant',
                score: 0.95
            },
            {
                id: '2',
                commodity: 'Wheat',
                price: 6.42,
                priceUnit: 'USD/bushel',
                location: 'Kansas City, MO',
                marketDate: '2024-01-15',
                complianceStatus: 'compliant',
                score: 0.89
            },
            {
                id: '3',
                commodity: 'Soybeans',
                price: 12.33,
                priceUnit: 'USD/bushel',
                location: 'Minneapolis, MN',
                marketDate: '2024-01-15',
                complianceStatus: 'pending',
                score: 0.82
            }
        ];
    }

    getSampleReports() {
        return [
            {
                id: 'USDA-2024-001',
                title: 'Corn Price Analysis - January 2024',
                type: 'price_analysis',
                date: new Date().toISOString(),
                status: 'completed',
                metrics: {
                    price_volatility: 15.2,
                    market_risk_score: 7.3,
                    compliance_status: 'compliant',
                    forecast_accuracy: 87.5
                }
            }
        ];
    }
}

module.exports = USDAService;