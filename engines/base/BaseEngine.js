const mongoose = require('mongoose');

/**
 * Base Engine Class - Provides common functionality for all AuditDNA engines
 */
class BaseEngine {
    constructor(engineName, config) {
        this.engineName = engineName;
        this.config = config;
        this.capabilities = config.capabilities || [];
        this.dataTypes = config.data_types || [];
    }

    /**
     * Standard search functionality
     */
    async search(query, filters = {}, options = {}) {
        const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = options;
        
        return {
            engine: this.engineName,
            query,
            filters,
            results: await this.performSearch(query, filters, options),
            pagination: {
                page,
                limit,
                total: await this.getSearchCount(query, filters)
            },
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Standard upload functionality
     */
    async upload(fileData, metadata = {}) {
        const uploadRecord = {
            engine: this.engineName,
            filename: fileData.filename,
            originalName: fileData.originalname,
            mimetype: fileData.mimetype,
            size: fileData.size,
            path: fileData.path,
            metadata,
            uploadedAt: new Date(),
            status: 'uploaded'
        };

        return await this.saveUploadRecord(uploadRecord);
    }

    /**
     * Standard reporting functionality
     */
    async generateReport(reportType, data, options = {}) {
        const reportId = `${this.engineName.toUpperCase()}-${Date.now()}`;
        
        const report = {
            reportId,
            engine: this.engineName,
            type: reportType,
            data,
            generatedAt: new Date(),
            status: 'completed',
            options
        };

        await this.saveReport(report);
        return report;
    }

    /**
     * Standard audit trail functionality
     */
    async createAuditLog(action, data, userId = null) {
        const auditLog = {
            engine: this.engineName,
            action,
            data,
            userId,
            timestamp: new Date(),
            ip: data.ip || null,
            userAgent: data.userAgent || null
        };

        return await this.saveAuditLog(auditLog);
    }

    /**
     * Standard compliance validation
     */
    async validateCompliance(data, rules = []) {
        const validation = {
            engine: this.engineName,
            data,
            rules,
            results: [],
            overallStatus: 'pending',
            validatedAt: new Date()
        };

        // Perform validation logic
        validation.results = await this.performComplianceValidation(data, rules);
        validation.overallStatus = validation.results.every(r => r.status === 'passed') ? 'compliant' : 'non-compliant';

        return validation;
    }

    // Abstract methods to be implemented by specific engines
    async performSearch(query, filters, options) {
        throw new Error(`performSearch must be implemented by ${this.engineName} engine`);
    }

    async getSearchCount(query, filters) {
        throw new Error(`getSearchCount must be implemented by ${this.engineName} engine`);
    }

    async saveUploadRecord(uploadRecord) {
        throw new Error(`saveUploadRecord must be implemented by ${this.engineName} engine`);
    }

    async saveReport(report) {
        throw new Error(`saveReport must be implemented by ${this.engineName} engine`);
    }

    async saveAuditLog(auditLog) {
        throw new Error(`saveAuditLog must be implemented by ${this.engineName} engine`);
    }

    async performComplianceValidation(data, rules) {
        throw new Error(`performComplianceValidation must be implemented by ${this.engineName} engine`);
    }

    /**
     * Get demo data for UI integration
     */
    getDemoData() {
        return {
            engine: this.engineName,
            sampleSearchResults: this.getSampleSearchResults(),
            sampleUploadData: this.getSampleUploadData(),
            sampleReports: this.getSampleReports(),
            capabilities: this.capabilities,
            dataTypes: this.dataTypes
        };
    }

    getSampleSearchResults() {
        return [
            { id: 1, title: `Sample ${this.engineName} result 1`, score: 0.95 },
            { id: 2, title: `Sample ${this.engineName} result 2`, score: 0.87 },
            { id: 3, title: `Sample ${this.engineName} result 3`, score: 0.76 }
        ];
    }

    getSampleUploadData() {
        return {
            filename: `sample_${this.engineName}_upload.pdf`,
            size: 2048576,
            type: 'application/pdf',
            status: 'processed'
        };
    }

    getSampleReports() {
        return [
            {
                id: `${this.engineName}-report-1`,
                title: `${this.engineName} Analysis Report`,
                date: new Date().toISOString(),
                status: 'completed'
            }
        ];
    }
}

module.exports = BaseEngine;