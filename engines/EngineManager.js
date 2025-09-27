const fs = require('fs');
const path = require('path');

// Import all engine services
const USDAService = require('./usda_pricing/services/USDAService');

// Load configuration
const operationalPlaybook = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../config/operational_playbook.json'), 'utf8')
);
const auditReports = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../config/audit_reports.json'), 'utf8')
);

class EngineManager {
    constructor() {
        this.engines = new Map();
        this.config = operationalPlaybook;
        this.reportTemplates = auditReports.report_templates;
        this.initializeEngines();
    }

    initializeEngines() {
        // Initialize USDA Pricing Engine
        this.engines.set('usda_pricing', new USDAService());
        
        // Initialize other engines with basic functionality
        this.initializeBasicEngine('water_tech', {
            name: 'Water Tech Upload/Analysis',
            capabilities: ['water_quality_analysis', 'contamination_detection', 'compliance_validation', 'reporting'],
            data_types: ['water_samples', 'test_results', 'compliance_reports', 'environmental_data']
        });

        this.initializeBasicEngine('global_compliance', {
            name: 'Global Compliance & Ethics',
            capabilities: ['compliance_monitoring', 'ethics_validation', 'regulatory_tracking', 'audit_trail'],
            data_types: ['compliance_documents', 'regulatory_updates', 'ethics_reports', 'audit_logs']
        });

        this.initializeBasicEngine('search_meta', {
            name: 'Search Engines (Meta-layer)',
            capabilities: ['cross_engine_search', 'data_aggregation', 'intelligent_routing', 'unified_results'],
            data_types: ['search_queries', 'aggregated_results', 'engine_metadata', 'search_analytics']
        });

        this.initializeBasicEngine('mortgage_realestate', {
            name: 'Mortgage & Real Estate',
            capabilities: ['property_valuation', 'mortgage_analysis', 'risk_assessment', 'market_trends'],
            data_types: ['property_data', 'mortgage_applications', 'market_valuations', 'risk_profiles']
        });

        this.initializeBasicEngine('factoring', {
            name: 'Factoring',
            capabilities: ['invoice_analysis', 'credit_assessment', 'risk_evaluation', 'cash_flow_analysis'],
            data_types: ['invoices', 'credit_reports', 'payment_histories', 'cash_flow_data']
        });

        this.initializeBasicEngine('compliance', {
            name: 'Compliance',
            capabilities: ['regulatory_monitoring', 'compliance_tracking', 'violation_detection', 'remediation_planning'],
            data_types: ['compliance_documents', 'regulatory_requirements', 'violation_reports', 'remediation_plans']
        });

        console.log(`✅ Initialized ${this.engines.size} AuditDNA engines`);
    }

    initializeBasicEngine(engineName, config) {
        const BaseEngine = require('./base/BaseEngine');
        
        class BasicEngine extends BaseEngine {
            constructor() {
                super(engineName, config);
                this.mockData = this.generateMockData();
            }

            async performSearch(query, filters, options) {
                // Mock search implementation
                const { page = 1, limit = 10 } = options;
                const skip = (page - 1) * limit;
                
                let results = this.mockData.filter(item => {
                    if (query) {
                        return item.name.toLowerCase().includes(query.toLowerCase()) ||
                               item.location.toLowerCase().includes(query.toLowerCase());
                    }
                    return true;
                });

                if (filters.location) {
                    results = results.filter(item => item.location.toLowerCase().includes(filters.location.toLowerCase()));
                }

                return results.slice(skip, skip + limit);
            }

            async getSearchCount(query, filters) {
                let results = this.mockData;
                if (query) {
                    results = results.filter(item => 
                        item.name.toLowerCase().includes(query.toLowerCase()) ||
                        item.location.toLowerCase().includes(query.toLowerCase())
                    );
                }
                if (filters.location) {
                    results = results.filter(item => item.location.toLowerCase().includes(filters.location.toLowerCase()));
                }
                return results.length;
            }

            async saveUploadRecord(uploadRecord) {
                // Mock save - return the record with an ID
                return { ...uploadRecord, id: Date.now().toString() };
            }

            async saveReport(report) {
                // Mock save - return the report with an ID
                return { ...report, id: Date.now().toString() };
            }

            async saveAuditLog(auditLog) {
                // Mock save - return the log with an ID
                return { ...auditLog, id: Date.now().toString() };
            }

            async performComplianceValidation(data, rules) {
                // Mock compliance validation
                const results = [];
                const defaultRules = [
                    { name: 'data_completeness', required: ['name', 'value', 'location'] },
                    { name: 'value_range', min: 0, max: 1000 },
                    { name: 'date_validity', maxAge: 365 }
                ];

                const applicableRules = rules.length > 0 ? rules : defaultRules;

                for (const rule of applicableRules) {
                    let status = 'passed';
                    let message = `Rule ${rule.name} passed`;

                    switch (rule.name) {
                        case 'data_completeness':
                            const missing = rule.required.filter(field => !data[field]);
                            if (missing.length > 0) {
                                status = 'failed';
                                message = `Missing required fields: ${missing.join(', ')}`;
                            }
                            break;
                        case 'value_range':
                            if (data.value < rule.min || data.value > rule.max) {
                                status = 'failed';
                                message = `Value ${data.value} outside valid range ${rule.min}-${rule.max}`;
                            }
                            break;
                        case 'date_validity':
                            const daysDiff = (new Date() - new Date(data.testDate || data.date)) / (1000 * 60 * 60 * 24);
                            if (daysDiff > rule.maxAge) {
                                status = 'failed';
                                message = `Data is ${Math.floor(daysDiff)} days old, exceeds maximum of ${rule.maxAge} days`;
                            }
                            break;
                    }

                    results.push({ rule: rule.name, status, message, timestamp: new Date() });
                }

                return results;
            }

            generateMockData() {
                const locations = ['New York, NY', 'Los Angeles, CA', 'Chicago, IL', 'Houston, TX', 'Phoenix, AZ'];
                const data = [];
                
                for (let i = 1; i <= 50; i++) {
                    data.push({
                        id: i.toString(),
                        name: `${config.name} Sample ${i}`,
                        value: Math.random() * 100,
                        unit: this.getDefaultUnit(),
                        location: locations[Math.floor(Math.random() * locations.length)],
                        testDate: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000),
                        complianceStatus: ['compliant', 'non-compliant', 'pending'][Math.floor(Math.random() * 3)],
                        score: Math.random()
                    });
                }
                
                return data;
            }

            getDefaultUnit() {
                switch (engineName) {
                    case 'water_tech': return 'ppm';
                    case 'global_compliance': return 'score';
                    case 'search_meta': return 'relevance';
                    case 'mortgage_realestate': return 'USD';
                    case 'factoring': return 'USD';
                    case 'compliance': return 'score';
                    default: return 'units';
                }
            }

            getSampleSearchResults() {
                return this.mockData.slice(0, 3).map(item => ({
                    id: item.id,
                    title: item.name,
                    value: item.value,
                    unit: item.unit,
                    location: item.location,
                    date: item.testDate,
                    status: item.complianceStatus,
                    score: item.score
                }));
            }
        }

        this.engines.set(engineName, new BasicEngine());
    }

    getEngine(engineName) {
        return this.engines.get(engineName);
    }

    getAllEngines() {
        return Array.from(this.engines.keys());
    }

    getEngineConfig(engineName) {
        return this.config.engines[engineName];
    }

    async searchAllEngines(query, filters = {}, options = {}) {
        const results = {};
        
        for (const [engineName, engine] of this.engines) {
            try {
                results[engineName] = await engine.search(query, filters, options);
            } catch (error) {
                console.error(`Error searching ${engineName}:`, error.message);
                results[engineName] = {
                    engine: engineName,
                    error: error.message,
                    results: [],
                    pagination: { total: 0 }
                };
            }
        }
        
        return {
            query,
            engines: Object.keys(results),
            results,
            timestamp: new Date().toISOString()
        };
    }

    getSystemStatus() {
        const status = {
            totalEngines: this.engines.size,
            engines: {},
            capabilities: this.config.common_capabilities,
            timestamp: new Date().toISOString()
        };

        for (const [engineName, engine] of this.engines) {
            status.engines[engineName] = {
                name: this.config.engines[engineName]?.name || engineName,
                capabilities: engine.capabilities,
                dataTypes: engine.dataTypes,
                status: 'active'
            };
        }

        return status;
    }

    getDemoData() {
        const demoData = {};
        
        for (const [engineName, engine] of this.engines) {
            demoData[engineName] = engine.getDemoData();
        }
        
        return {
            engines: demoData,
            sampleReports: auditReports.demo_data.sample_reports,
            timestamp: new Date().toISOString()
        };
    }
}

module.exports = EngineManager;