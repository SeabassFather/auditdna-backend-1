// 🏢 AUDITDNA ENTERPRISE FEATURES & MULTI-TENANCY
// Advanced enterprise-level features with white-labeling and multi-tenant architecture

const express = require('express');
const mongoose = require('mongoose');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const sharp = require('sharp');
const aws = require('aws-sdk');

// 🏢 MULTI-TENANT ARCHITECTURE
class MultiTenantManager {
    constructor() {
        this.tenantConfigs = new Map();
        this.tenantDatabases = new Map();
        this.setupTenantMiddleware();
    }

    // 🔄 TENANT MIDDLEWARE
    setupTenantMiddleware() {
        return async (req, res, next) => {
            try {
                // Extract tenant from subdomain or header
                const tenantId = this.extractTenantId(req);
                
                if (!tenantId) {
                    return res.status(400).json({
                        success: false,
                        error: 'Tenant identification required'
                    });
                }

                // Get tenant configuration
                const tenantConfig = await this.getTenantConfig(tenantId);
                if (!tenantConfig || !tenantConfig.active) {
                    return res.status(404).json({
                        success: false,
                        error: 'Tenant not found or inactive'
                    });
                }

                // Attach tenant context to request
                req.tenant = {
                    id: tenantId,
                    config: tenantConfig,
                    database: await this.getTenantDatabase(tenantId)
                };

                next();
            } catch (error) {
                res.status(500).json({
                    success: false,
                    error: 'Tenant resolution failed'
                });
            }
        };
    }

    extractTenantId(req) {
        // Extract from subdomain (e.g., acme.auditdna.com)
        const subdomain = req.get('host')?.split('.')[0];
        if (subdomain && subdomain !== 'www' && subdomain !== 'api') {
            return subdomain;
        }

        // Extract from custom header
        const headerTenant = req.get('X-Tenant-ID');
        if (headerTenant) {
            return headerTenant;
        }

        // Extract from JWT token
        const token = req.get('Authorization')?.replace('Bearer ', '');
        if (token) {
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                return decoded.tenantId;
            } catch (error) {
                // Token invalid, continue without tenant from token
            }
        }

        return null;
    }

    async getTenantConfig(tenantId) {
        if (this.tenantConfigs.has(tenantId)) {
            return this.tenantConfigs.get(tenantId);
        }

        const tenant = await Tenant.findOne({ tenantId, active: true });
        if (tenant) {
            this.tenantConfigs.set(tenantId, tenant);
            return tenant;
        }

        return null;
    }

    async getTenantDatabase(tenantId) {
        if (this.tenantDatabases.has(tenantId)) {
            return this.tenantDatabases.get(tenantId);
        }

        const dbName = `auditdna_${tenantId}`;
        const connection = mongoose.createConnection(
            `${process.env.MONGODB_URI}/${dbName}`
        );

        this.tenantDatabases.set(tenantId, connection);
        return connection;
    }

    // 🆕 CREATE NEW TENANT
    async createTenant(tenantData) {
        const tenantId = this.generateTenantId(tenantData.companyName);
        
        const tenant = new Tenant({
            tenantId,
            companyName: tenantData.companyName,
            domain: tenantData.domain || `${tenantId}.auditdna.com`,
            plan: tenantData.plan || 'enterprise',
            branding: {
                logo: tenantData.branding?.logo,
                primaryColor: tenantData.branding?.primaryColor || '#3B82F6',
                secondaryColor: tenantData.branding?.secondaryColor || '#10B981',
                companyName: tenantData.companyName,
                customCSS: tenantData.branding?.customCSS || ''
            },
            features: {
                whiteLabel: tenantData.features?.whiteLabel || true,
                customDomain: tenantData.features?.customDomain || true,
                sso: tenantData.features?.sso || true,
                advancedReporting: tenantData.features?.advancedReporting || true,
                apiAccess: tenantData.features?.apiAccess || true,
                customIntegrations: tenantData.features?.customIntegrations || true
            },
            limits: {
                maxUsers: tenantData.limits?.maxUsers || 1000,
                maxApplications: tenantData.limits?.maxApplications || 10000,
                maxAudits: tenantData.limits?.maxAudits || 5000,
                storageLimit: tenantData.limits?.storageLimit || 100 // GB
            },
            settings: {
                timezone: tenantData.settings?.timezone || 'UTC',
                currency: tenantData.settings?.currency || 'USD',
                language: tenantData.settings?.language || 'en',
                notifications: {
                    email: tenantData.settings?.notifications?.email || true,
                    sms: tenantData.settings?.notifications?.sms || false,
                    webhook: tenantData.settings?.notifications?.webhook || false
                }
            },
            billing: {
                plan: tenantData.plan || 'enterprise',
                billingCycle: tenantData.billing?.billingCycle || 'monthly',
                pricePerUser: tenantData.billing?.pricePerUser || 99,
                customPricing: tenantData.billing?.customPricing || false
            },
            active: true,
            createdAt: new Date()
        });

        await tenant.save();

        // Initialize tenant database
        await this.initializeTenantDatabase(tenantId);

        // Create default admin user
        await this.createTenantAdmin(tenantId, tenantData.adminUser);

        return {
            success: true,
            tenantId,
            domain: tenant.domain,
            adminLoginUrl: `https://${tenant.domain}/admin`
        };
    }

    async initializeTenantDatabase(tenantId) {
        const db = await this.getTenantDatabase(tenantId);
        
        // Create indexes for tenant-specific collections
        const collections = ['users', 'loanapplications', 'audits', 'lenders', 'documents'];
        
        for (const collectionName of collections) {
            const collection = db.collection(collectionName);
            
            // Create basic indexes
            await collection.createIndex({ createdAt: -1 });
            await collection.createIndex({ updatedAt: -1 });
            
            // Collection-specific indexes
            switch (collectionName) {
                case 'users':
                    await collection.createIndex({ email: 1 }, { unique: true });
                    await collection.createIndex({ userId: 1 }, { unique: true });
                    break;
                case 'loanapplications':
                    await collection.createIndex({ userId: 1, status: 1 });
                    await collection.createIndex({ applicationId: 1 }, { unique: true });
                    break;
                case 'audits':
                    await collection.createIndex({ userId: 1, auditType: 1 });
                    await collection.createIndex({ auditId: 1 }, { unique: true });
                    break;
            }
        }
    }

    generateTenantId(companyName) {
        return companyName
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '')
            .substring(0, 20) + '_' + crypto.randomBytes(4).toString('hex');
    }

    async createTenantAdmin(tenantId, adminData) {
        const db = await this.getTenantDatabase(tenantId);
        const bcrypt = require('bcryptjs');
        
        const adminUser = {
            userId: `admin_${crypto.randomUUID()}`,
            email: adminData.email,
            password: await bcrypt.hash(adminData.password, 12),
            role: 'tenant_admin',
            personalInfo: {
                firstName: adminData.firstName,
                lastName: adminData.lastName
            },
            permissions: [
                'manage_users',
                'manage_settings',
                'view_analytics',
                'manage_billing',
                'manage_integrations'
            ],
            active: true,
            createdAt: new Date()
        };

        await db.collection('users').insertOne(adminUser);
        return adminUser;
    }
}

// 🎨 WHITE-LABEL CUSTOMIZATION ENGINE
class WhiteLabelManager {
    constructor() {
        this.s3 = new aws.S3({
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            region: process.env.AWS_REGION
        });
    }

    async uploadBrandingAssets(tenantId, assets) {
        const uploadPromises = [];

        for (const [assetType, assetData] of Object.entries(assets)) {
            if (assetData && assetData.buffer) {
                uploadPromises.push(
                    this.uploadAsset(tenantId, assetType, assetData)
                );
            }
        }

        const results = await Promise.all(uploadPromises);
        return results.reduce((acc, result) => {
            acc[result.type] = result.url;
            return acc;
        }, {});
    }

    async uploadAsset(tenantId, assetType, assetData) {
        let processedBuffer = assetData.buffer;
        
        // Process images based on type
        if (assetType === 'logo') {
            processedBuffer = await sharp(assetData.buffer)
                .resize(200, 60, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
                .png()
                .toBuffer();
        } else if (assetType === 'favicon') {
            processedBuffer = await sharp(assetData.buffer)
                .resize(32, 32)
                .png()
                .toBuffer();
        } else if (assetType === 'loginBackground') {
            processedBuffer = await sharp(assetData.buffer)
                .resize(1920, 1080, { fit: 'cover' })
                .jpeg({ quality: 80 })
                .toBuffer();
        }

        const key = `tenants/${tenantId}/branding/${assetType}_${Date.now()}`;
        
        const uploadParams = {
            Bucket: process.env.AWS_S3_BUCKET,
            Key: key,
            Body: processedBuffer,
            ContentType: this.getContentType(assetType),
            ACL: 'public-read'
        };

        const result = await this.s3.upload(uploadParams).promise();
        
        return {
            type: assetType,
            url: result.Location
        };
    }

    getContentType(assetType) {
        switch (assetType) {
            case 'logo': 
            case 'favicon': 
                return 'image/png';
            case 'loginBackground':
                return 'image/jpeg';
            default:
                return 'application/octet-stream';
        }
    }

    async generateCustomCSS(tenantId, brandingConfig) {
        const css = `
            /* Custom branding for tenant: ${tenantId} */
            :root {
                --primary-color: ${brandingConfig.primaryColor || '#3B82F6'};
                --secondary-color: ${brandingConfig.secondaryColor || '#10B981'};
                --accent-color: ${brandingConfig.accentColor || '#F59E0B'};
                --logo-url: url('${brandingConfig.logoUrl || ''}');
                --login-bg-url: url('${brandingConfig.loginBackgroundUrl || ''}');
            }

            .navbar-brand img {
                content: var(--logo-url);
                max-height: 40px;
            }

            .btn-primary {
                background-color: var(--primary-color);
                border-color: var(--primary-color);
            }

            .btn-primary:hover {
                background-color: color-mix(in srgb, var(--primary-color) 85%, black);
                border-color: color-mix(in srgb, var(--primary-color) 85%, black);
            }

            .bg-primary {
                background-color: var(--primary-color) !important;
            }

            .text-primary {
                color: var(--primary-color) !important;
            }

            .login-container {
                background-image: var(--login-bg-url);
                background-size: cover;
                background-position: center;
            }

            .sidebar {
                background: linear-gradient(180deg, var(--primary-color) 0%, var(--secondary-color) 100%);
            }

            .progress-bar {
                background-color: var(--primary-color);
            }

            .badge-primary {
                background-color: var(--primary-color);
            }

            /* Custom animations */
            .fade-in {
                animation: fadeIn 0.5s ease-in;
            }

            @keyframes fadeIn {
                from { opacity: 0; transform: translateY(20px); }
                to { opacity: 1; transform: translateY(0); }
            }

            /* Responsive adjustments */
            @media (max-width: 768px) {
                .navbar-brand img {
                    max-height: 32px;
                }
            }

            ${brandingConfig.customCSS || ''}
        `;

        // Save CSS to S3
        const cssKey = `tenants/${tenantId}/styles/custom.css`;
        const uploadParams = {
            Bucket: process.env.AWS_S3_BUCKET,
            Key: cssKey,
            Body: css,
            ContentType: 'text/css',
            ACL: 'public-read'
        };

        const result = await this.s3.upload(uploadParams).promise();
        return result.Location;
    }

    async generateBrandedEmailTemplate(tenantId, templateType, brandingConfig) {
        const templates = {
            welcome: {
                subject: `Welcome to ${brandingConfig.companyName}`,
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <div style="background: ${brandingConfig.primaryColor}; padding: 20px; text-align: center;">
                            <img src="${brandingConfig.logoUrl}" alt="${brandingConfig.companyName}" style="max-height: 60px;">
                        </div>
                        <div style="padding: 30px; background: #f8f9fa;">
                            <h1 style="color: #333;">Welcome to ${brandingConfig.companyName}!</h1>
                            <p>Thank you for joining our financial services platform. We're excited to help you achieve your financial goals.</p>
                            <div style="text-align: center; margin: 30px 0;">
                                <a href="{{loginUrl}}" style="background: ${brandingConfig.primaryColor}; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                                    Get Started
                                </a>
                            </div>
                        </div>
                        <div style="background: #333; color: white; padding: 20px; text-align: center; font-size: 12px;">
                            © {{currentYear}} ${brandingConfig.companyName}. All rights reserved.
                        </div>
                    </div>
                `
            },
            loanApproved: {
                subject: `🎉 Your loan has been approved - ${brandingConfig.companyName}`,
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <div style="background: linear-gradient(135deg, ${brandingConfig.primaryColor} 0%, ${brandingConfig.secondaryColor} 100%); padding: 30px; text-align: center;">
                            <img src="${brandingConfig.logoUrl}" alt="${brandingConfig.companyName}" style="max-height: 60px; margin-bottom: 20px;">
                            <h1 style="color: white; margin: 0;">🎉 Congratulations!</h1>
                        </div>
                        <div style="padding: 30px; background: #f8f9fa;">
                            <h2 style="color: #333;">Your loan has been approved!</h2>
                            <p>Great news! Your loan application has been approved by our lending partner.</p>
                            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                                <p><strong>Loan Amount:</strong> ${{loanAmount}}</p>
                                <p><strong>Interest Rate:</strong> {{interestRate}}%</p>
                                <p><strong>Term:</strong> {{loanTerm}} months</p>
                                <p><strong>Lender:</strong> {{lenderName}}</p>
                            </div>
                            <div style="text-align: center; margin: 30px 0;">
                                <a href="{{dashboardUrl}}" style="background: ${brandingConfig.primaryColor}; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                                    View Details
                                </a>
                            </div>
                        </div>
                    </div>
                `
            }
        };

        return templates[templateType] || templates.welcome;
    }
}

// 🔗 SINGLE SIGN-ON (SSO) INTEGRATION
class SSOManager {
    constructor() {
        this.samlProviders = new Map();
        this.oidcProviders = new Map();
    }

    async configureSAML(tenantId, samlConfig) {
        const saml = require('passport-saml');
        
        const strategy = new saml.Strategy({
            entryPoint: samlConfig.entryPoint,
            issuer: samlConfig.issuer,
            callbackUrl: `https://${tenantId}.auditdna.com/auth/saml/callback`,
            cert: samlConfig.certificate,
            identifierFormat: samlConfig.identifierFormat || 'urn:oasis:names:tc:SAML:2.0:nameid-format:emailAddress'
        }, async (profile, done) => {
            try {
                // Find or create user based on SAML profile
                const user = await this.findOrCreateSSOUser(tenantId, profile, 'saml');
                return done(null, user);
            } catch (error) {
                return done(error);
            }
        });

        this.samlProviders.set(tenantId, strategy);
        return strategy;
    }

    async configureOIDC(tenantId, oidcConfig) {
        const { Strategy: OIDCStrategy } = require('passport-openidconnect');
        
        const strategy = new OIDCStrategy({
            issuer: oidcConfig.issuer,
            clientID: oidcConfig.clientId,
            clientSecret: oidcConfig.clientSecret,
            authorizationURL: oidcConfig.authorizationURL,
            tokenURL: oidcConfig.tokenURL,
            userInfoURL: oidcConfig.userInfoURL,
            callbackURL: `https://${tenantId}.auditdna.com/auth/oidc/callback`,
            scope: oidcConfig.scope || 'openid profile email'
        }, async (issuer, profile, done) => {
            try {
                const user = await this.findOrCreateSSOUser(tenantId, profile, 'oidc');
                return done(null, user);
            } catch (error) {
                return done(error);
            }
        });

        this.oidcProviders.set(tenantId, strategy);
        return strategy;
    }

    async findOrCreateSSOUser(tenantId, profile, provider) {
        const tenantDb = await this.getTenantDatabase(tenantId);
        const Users = tenantDb.model('User', UserSchema);

        let user = await Users.findOne({ 
            $or: [
                { email: profile.email },
                { [`ssoIdentities.${provider}.id`]: profile.id }
            ]
        });

        if (!user) {
            // Create new SSO user
            user = new Users({
                userId: crypto.randomUUID(),
                email: profile.email,
                role: 'consumer',
                personalInfo: {
                    firstName: profile.name?.givenName || profile.displayName?.split(' ')[0],
                    lastName: profile.name?.familyName || profile.displayName?.split(' ')[1]
                },
                ssoIdentities: {
                    [provider]: {
                        id: profile.id,
                        provider: provider,
                        connectedAt: new Date()
                    }
                },
                authMethod: 'sso',
                active: true,
                createdAt: new Date()
            });

            await user.save();
        } else if (!user.ssoIdentities?.[provider]) {
            // Link SSO identity to existing user
            user.ssoIdentities = user.ssoIdentities || {};
            user.ssoIdentities[provider] = {
                id: profile.id,
                provider: provider,
                connectedAt: new Date()
            };
            await user.save();
        }

        return user;
    }

    generateSSOInitiationURL(tenantId, provider, returnUrl) {
        const baseUrl = `https://${tenantId}.auditdna.com`;
        return `${baseUrl}/auth/${provider}/login?returnUrl=${encodeURIComponent(returnUrl)}`;
    }
}

// 📊 ENTERPRISE ANALYTICS & REPORTING
class EnterpriseAnalytics {
    constructor() {
        this.reportTemplates = new Map();
        this.scheduledReports = new Map();
    }

    async generateExecutiveReport(tenantId, dateRange) {
        const tenantDb = await this.getTenantDatabase(tenantId);
        
        const metrics = await this.calculateExecutiveMetrics(tenantDb, dateRange);
        
        const report = {
            reportId: crypto.randomUUID(),
            tenantId,
            reportType: 'executive_summary',
            dateRange,
            generatedAt: new Date(),
            metrics: {
                overview: {
                    totalRevenue: metrics.totalRevenue,
                    totalApplications: metrics.totalApplications,
                    approvalRate: metrics.approvalRate,
                    averageProcessingTime: metrics.averageProcessingTime,
                    customerSatisfaction: metrics.customerSatisfaction
                },
                growth: {
                    revenueGrowth: metrics.revenueGrowth,
                    userGrowth: metrics.userGrowth,
                    applicationGrowth: metrics.applicationGrowth
                },
                performance: {
                    topPerformingProducts: metrics.topPerformingProducts,
                    conversionRates: metrics.conversionRates,
                    churnRate: metrics.churnRate
                },
                compliance: {
                    complianceScore: metrics.complianceScore,
                    auditResults: metrics.auditResults,
                    riskAssessment: metrics.riskAssessment
                }
            },
            insights: await this.generateInsights(metrics),
            recommendations: await this.generateRecommendations(metrics)
        };

        // Generate PDF report
        const pdfBuffer = await this.generatePDFReport(report);
        const reportUrl = await this.uploadReport(tenantId, report.reportId, pdfBuffer);
        
        report.pdfUrl = reportUrl;
        
        // Store report metadata
        await this.storeReportMetadata(tenantDb, report);
        
        return report;
    }

    async calculateExecutiveMetrics(tenantDb, dateRange) {
        const startDate = new Date(dateRange.start);
        const endDate = new Date(dateRange.end);
        const previousStartDate = new Date(startDate.getTime() - (endDate.getTime() - startDate.getTime()));

        // Revenue metrics
        const currentRevenue = await this.calculateRevenue(tenantDb, startDate, endDate);
        const previousRevenue = await this.calculateRevenue(tenantDb, previousStartDate, startDate);
        const revenueGrowth = ((currentRevenue - previousRevenue) / previousRevenue) * 100;

        // Application metrics
        const totalApplications = await tenantDb.collection('loanapplications')
            .countDocuments({ createdAt: { $gte: startDate, $lte: endDate } });
        
        const approvedApplications = await tenantDb.collection('loanapplications')
            .countDocuments({ 
                createdAt: { $gte: startDate, $lte: endDate },
                status: 'approved'
            });

        const approvalRate = (approvedApplications / totalApplications) * 100;

        // Processing time metrics
        const processingTimes = await tenantDb.collection('loanapplications')
            .aggregate([
                {
                    $match: {
                        createdAt: { $gte: startDate, $lte: endDate },
                        status: 'approved',
                        approvedAt: { $exists: true }
                    }
                },
                {
                    $project: {
                        processingTime: { $subtract: ['$approvedAt', '$createdAt'] }
                    }
                },
                {
                    $group: {
                        _id: null,
                        avgProcessingTime: { $avg: '$processingTime' }
                    }
                }
            ]);

        const averageProcessingTime = processingTimes[0]?.avgProcessingTime || 0;

        return {
            totalRevenue: currentRevenue,
            revenueGrowth,
            totalApplications,
            approvalRate,
            averageProcessingTime: Math.round(averageProcessingTime / (1000 * 60 * 60 * 24)), // Convert to days
            customerSatisfaction: await this.calculateCustomerSatisfaction(tenantDb, startDate, endDate),
            userGrowth: await this.calculateUserGrowth(tenantDb, startDate, endDate),
            applicationGrowth: await this.calculateApplicationGrowth(tenantDb, startDate, endDate),
            topPerformingProducts: await this.getTopPerformingProducts(tenantDb, startDate, endDate),
            conversionRates: await this.calculateConversionRates(tenantDb, startDate, endDate),
            churnRate: await this.calculateChurnRate(tenantDb, startDate, endDate),
            complianceScore: await this.calculateComplianceScore(tenantDb, startDate, endDate),
            auditResults: await this.getAuditResults(tenantDb, startDate, endDate),
            riskAssessment: await this.generateRiskAssessment(tenantDb, startDate, endDate)
        };
    }

    async scheduleReport(tenantId, reportConfig) {
        const cron = require('node-cron');
        
        const task = cron.schedule(reportConfig.schedule, async () => {
            try {
                const report = await this.generateExecutiveReport(
                    tenantId, 
                    reportConfig.dateRange
                );
                
                // Send to configured recipients
                await this.distributeReport(tenantId, report, reportConfig.recipients);
                
                console.log(`Scheduled report generated for tenant ${tenantId}: ${report.reportId}`);
            } catch (error) {
                console.error(`Scheduled report failed for tenant ${tenantId}:`, error);
            }
        }, {
            scheduled: true,
            timezone: reportConfig.timezone || 'UTC'
        });

        this.scheduledReports.set(`${tenantId}_${reportConfig.name}`, {
            task,
            config: reportConfig,
            tenantId
        });

        return {
            success: true,
            scheduleId: `${tenantId}_${reportConfig.name}`,
            nextRun: task.getStatus().toString()
        };
    }

    async generateInsights(metrics) {
        const insights = [];

        // Revenue insights
        if (metrics.revenueGrowth > 20) {
            insights.push({
                type: 'positive',
                category: 'revenue',
                title: 'Strong Revenue Growth',
                description: `Revenue has grown by ${metrics.revenueGrowth.toFixed(1)}% compared to the previous period, indicating strong business performance.`
            });
        } else if (metrics.revenueGrowth < -5) {
            insights.push({
                type: 'warning',
                category: 'revenue',
                title: 'Revenue Decline',
                description: `Revenue has decreased by ${Math.abs(metrics.revenueGrowth).toFixed(1)}% compared to the previous period. Consider reviewing pricing and acquisition strategies.`
            });
        }

        // Approval rate insights
        if (metrics.approvalRate > 80) {
            insights.push({
                type: 'positive',
                category: 'operations',
                title: 'High Approval Rate',
                description: `Your approval rate of ${metrics.approvalRate.toFixed(1)}% is excellent, indicating strong underwriting processes.`
            });
        } else if (metrics.approvalRate < 60) {
            insights.push({
                type: 'warning',
                category: 'operations',
                title: 'Low Approval Rate',
                description: `Your approval rate of ${metrics.approvalRate.toFixed(1)}% may indicate overly strict criteria or quality issues with applications.`
            });
        }

        // Processing time insights
        if (metrics.averageProcessingTime > 14) {
            insights.push({
                type: 'actionable',
                category: 'efficiency',
                title: 'Long Processing Times',
                description: `Average processing time of ${metrics.averageProcessingTime} days is longer than industry standard. Consider process optimization.`
            });
        }

        return insights;
    }

    async generateRecommendations(metrics) {
        const recommendations = [];

        // Performance recommendations
        if (metrics.approvalRate < 70) {
            recommendations.push({
                priority: 'high',
                category: 'operations',
                title: 'Optimize Approval Process',
                description: 'Review and adjust approval criteria to improve approval rates while maintaining risk standards.',
                estimatedImpact: 'Could increase revenue by 15-25%',
                timeframe: '2-4 weeks'
            });
        }

        // Efficiency recommendations
        if (metrics.averageProcessingTime > 10) {
            recommendations.push({
                priority: 'medium',
                category: 'efficiency',
                title: 'Automate Document Processing',
                description: 'Implement advanced AI document processing to reduce manual review time.',
                estimatedImpact: 'Could reduce processing time by 40-60%',
                timeframe: '1-2 months'
            });
        }

        // Growth recommendations
        if (metrics.userGrowth < 10) {
            recommendations.push({
                priority: 'medium',
                category: 'growth',
                title: 'Enhance Marketing Strategy',
                description: 'Consider expanding digital marketing efforts and referral programs.',
                estimatedImpact: 'Could increase user acquisition by 30-50%',
                timeframe: '1-3 months'
            });
        }

        return recommendations;
    }

    // Helper methods for metric calculations
    async calculateRevenue(tenantDb, startDate, endDate) {
        const result = await tenantDb.collection('transactions')
            .aggregate([
                {
                    $match: {
                        createdAt: { $gte: startDate, $lte: endDate },
                        status: 'completed',
                        type: 'fee'
                    }
                },
                {
                    $group: {
                        _id: null,
                        totalRevenue: { $sum: '$amount' }
                    }
                }
            ]);
        
        return result[0]?.totalRevenue || 0;
    }

    async calculateCustomerSatisfaction(tenantDb, startDate, endDate) {
        // Mock implementation - would integrate with actual survey data
        return 4.2; // out of 5
    }

    async calculateUserGrowth(tenantDb, startDate, endDate) {
        // Mock implementation
        return 15.3; // percentage growth
    }

    async calculateApplicationGrowth(tenantDb, startDate, endDate) {
        // Mock implementation
        return 22.1; // percentage growth
    }

    async getTopPerformingProducts(tenantDb, startDate, endDate) {
        return [
            { product: 'Business Loans', revenue: 125000, applications: 45 },
            { product: 'SBA Loans', revenue: 98000, applications: 23 },
            { product: 'Equipment Financing', revenue: 67000, applications: 34 }
        ];
    }

    async calculateConversionRates(tenantDb, startDate, endDate) {
        return {
            leadToApplication: 0.24,
            applicationToApproval: 0.78,
            approvalToFunding: 0.92
        };
    }

    async calculateChurnRate(tenantDb, startDate, endDate) {
        return 3.2; // percentage
    }

    async calculateComplianceScore(tenantDb, startDate, endDate) {
        return 94.7; // percentage
    }

    async getAuditResults(tenantDb, startDate, endDate) {
        return {
            totalAudits: 234,
            averageScore: 87.3,
            highRiskItems: 12,
            complianceViolations: 3
        };
    }

    async generateRiskAssessment(tenantDb, startDate, endDate) {
        return {
            overallRisk: 'medium',
            riskFactors: [
                'Increased loan amounts in high-risk sectors',
                'Slight increase in default rates',
                'Regulatory changes pending'
            ],
            mitigation: [
                'Enhanced due diligence for large loans',
                'Updated risk scoring models',
                'Compliance team expansion'
            ]
        };
    }
}

// 🏢 TENANT SCHEMA
const TenantSchema = new mongoose.Schema({
    tenantId: { type: String, unique: true, required: true },
    companyName: { type: String, required: true },
    domain: { type: String, unique: true, required: true },
    customDomain: String,
    plan: { 
        type: String, 
        enum: ['starter', 'professional', 'enterprise', 'custom'],
        default: 'professional'
    },
    
    branding: {
        logoUrl: String,
        faviconUrl: String,
        primaryColor: { type: String, default: '#3B82F6' },
        secondaryColor: { type: String, default: '#10B981' },
        accentColor: { type: String, default: '#F59E0B' },
        customCSS: String,
        customCSSUrl: String,
        loginBackgroundUrl: String,
        companyName: String,
        tagline: String
    },

    features: {
        whiteLabel: { type: Boolean, default: true },
        customDomain: { type: Boolean, default: false },
        sso: { type: Boolean, default: false },
        advancedReporting: { type: Boolean, default: true },
        apiAccess: { type: Boolean, default: true },
        customIntegrations: { type: Boolean, default: false },
        auditTrail: { type: Boolean, default: true },
        multiCurrency: { type: Boolean, default: false },
        advancedSecurity: { type: Boolean, default: true }
    },

    limits: {
        maxUsers: { type: Number, default: 100 },
        maxApplications: { type: Number, default: 1000 },
        maxAudits: { type: Number, default: 500 },
        storageLimit: { type: Number, default: 10 }, // GB
        apiCallsPerMonth: { type: Number, default: 10000 }
    },

    settings: {
        timezone: { type: String, default: 'UTC' },
        currency: { type: String, default: 'USD' },
        language: { type: String, default: 'en' },
        dateFormat: { type: String, default: 'MM/DD/YYYY' },
        notifications: {
            email: { type: Boolean, default: true },
            sms: { type: Boolean, default: false },
            webhook: { type: Boolean, default: false },
            pushNotifications: { type: Boolean, default: true }
        },
        security: {
            passwordPolicy: {
                minLength: { type: Number, default: 8 },
                requireSpecialChars: { type: Boolean, default: true },
                requireNumbers: { type: Boolean, default: true },
                requireUppercase: { type: Boolean, default: true }
            },
            sessionTimeout: { type: Number, default: 3600 }, // seconds
            mfaRequired: { type: Boolean, default: false },
            ipWhitelist: [String]
        }
    },

    billing: {
        plan: String,
        billingCycle: { type: String, enum: ['monthly', 'yearly'], default: 'monthly' },
        pricePerUser: Number,
        customPricing: { type: Boolean, default: false },
        billingContact: {
            name: String,
            email: String,
            phone: String
        },
        paymentMethod: String,
        nextBillingDate: Date,
        lastPaymentDate: Date
    },

    integrations: {
        sso: {
            saml: {
                enabled: { type: Boolean, default: false },
                entryPoint: String,
                issuer: String,
                certificate: String,
                identifierFormat: String
            },
            oidc: {
                enabled: { type: Boolean, default: false },
                issuer: String,
                clientId: String,
                clientSecret: String,
                authorizationURL: String,
                tokenURL: String,
                userInfoURL: String,
                scope: String
            }
        },
        webhooks: [{
            name: String,
            url: String,
            events: [String],
            secret: String,
            active: { type: Boolean, default: true }
        }]
    },

    contact: {
        primaryContact: {
            name: String,
            email: String,
            phone: String,
            role: String
        },
        technicalContact: {
            name: String,
            email: String,
            phone: String
        },
        billingContact: {
            name: String,
            email: String,
            phone: String
        }
    },

    active: { type: Boolean, default: true },
    suspended: { type: Boolean, default: false },
    suspensionReason: String,
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// 🚀 ENTERPRISE API ROUTES
const setupEnterpriseRoutes = (app) => {
    const multiTenantManager = new MultiTenantManager();
    const whiteLabelManager = new WhiteLabelManager();
    const ssoManager = new SSOManager();
    const enterpriseAnalytics = new EnterpriseAnalytics();

    // Apply tenant middleware to all enterprise routes
    app.use('/api/enterprise', multiTenantManager.setupTenantMiddleware());

    // Tenant management routes
    app.post('/api/enterprise/tenants', async (req, res) => {
        try {
            const result = await multiTenantManager.createTenant(req.body);
            res.json(result);
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // White-label customization routes
    app.post('/api/enterprise/branding/upload', async (req, res) => {
        try {
            const assetUrls = await whiteLabelManager.uploadBrandingAssets(
                req.tenant.id,
                req.files
            );
            res.json({ success: true, assetUrls });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // SSO configuration routes
    app.post('/api/enterprise/sso/saml', async (req, res) => {
        try {
            await ssoManager.configureSAML(req.tenant.id, req.body);
            res.json({ success: true, message: 'SAML SSO configured successfully' });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // Enterprise analytics routes
    app.post('/api/enterprise/reports/executive', async (req, res) => {
        try {
            const report = await enterpriseAnalytics.generateExecutiveReport(
                req.tenant.id,
                req.body.dateRange
            );
            res.json({ success: true, report });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    app.post('/api/enterprise/reports/schedule', async (req, res) => {
        try {
            const result = await enterpriseAnalytics.scheduleReport(
                req.tenant.id,
                req.body
            );
            res.json(result);
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });
};

module.exports = {
    MultiTenantManager,
    WhiteLabelManager,
    SSOManager,
    EnterpriseAnalytics,
    TenantSchema,
    setupEnterpriseRoutes
};