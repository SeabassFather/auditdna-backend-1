# AuditDNA Backend

A comprehensive backend system for AuditDNA platform supporting multiple audit engines with RESTful APIs, data storage, and compliance validation.

## Features

- **7 Core Audit Engines**: USDA Pricing, Water Tech, Global Compliance, Search Meta, Mortgage & Real Estate, Factoring, and Compliance
- **RESTful APIs**: Complete CRUD operations for all engines
- **Demo Data**: Ready-to-use sample data for UI integration
- **Audit Workflows**: Complete audit trail for all operations
- **File Uploads**: Secure file upload with metadata tracking
- **Compliance Validation**: Automated compliance checks
- **Report Generation**: JSON and PDF report capabilities
- **MongoDB Integration**: Engine-specific data collections
- **Cross-Engine Search**: Unified search across all engines

## Quick Start

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Set Environment Variables**
   ```bash
   # .env file
   PORT=3002
   MONGO_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret
   ```

3. **Start the Server**
   ```bash
   npm start
   ```

4. **Test the API**
   ```bash
   # Get all engines
   curl http://localhost:3002/api/engines
   
   # Get demo data
   curl http://localhost:3002/api/engines/demo
   
   # Search water tech engine
   curl "http://localhost:3002/api/engines/water_tech/search?query=contamination"
   ```

## API Documentation

See [API_DOCUMENTATION.md](./docs/API_DOCUMENTATION.md) for complete API reference.

## Core Engines

### 1. USDA Pricing Engine (`usda_pricing`)
- Agricultural commodity pricing analysis
- Risk assessment and market trends
- Historical data analysis
- Compliance validation

### 2. Water Tech Upload/Analysis (`water_tech`)
- Water quality testing and analysis
- Contamination detection
- Environmental compliance validation
- Sample tracking and reporting

### 3. Global Compliance & Ethics (`global_compliance`)
- International compliance monitoring
- Ethics validation and tracking
- Regulatory requirement management
- Audit trail maintenance

### 4. Search Engines Meta-layer (`search_meta`)
- Cross-engine search capabilities
- Data aggregation across all engines
- Intelligent routing and unified results
- Search analytics and insights

### 5. Mortgage & Real Estate (`mortgage_realestate`)
- Property valuation and analysis
- Mortgage risk assessment
- Market trend analysis
- Real estate compliance checking

### 6. Factoring (`factoring`)
- Invoice factoring analysis
- Credit assessment and risk evaluation
- Cash flow analysis and projections
- Payment history tracking

### 7. Compliance (`compliance`)
- General regulatory compliance monitoring
- Violation detection and tracking
- Remediation planning and progress
- Compliance score calculation

## Architecture

```
auditdna-backend/
├── config/                 # Configuration files
│   ├── operational_playbook.json
│   └── audit_reports.json
├── engines/               # Engine implementations
│   ├── base/             # Base engine class
│   ├── usda_pricing/     # USDA Pricing Engine
│   ├── water_tech/       # Water Tech Engine
│   ├── global_compliance/# Global Compliance Engine
│   ├── search_meta/      # Search Meta Engine
│   ├── mortgage_realestate/# Mortgage & Real Estate Engine
│   ├── factoring/        # Factoring Engine
│   ├── compliance/       # Compliance Engine
│   └── EngineManager.js  # Central engine coordinator
├── routes/               # API route definitions
├── controllers/          # Request handlers
├── models/              # Database models
├── docs/                # Documentation
└── server.js           # Main application entry point
```

## Available Endpoints

### System Endpoints
- `GET /api/engines` - List all engines
- `GET /api/engines/demo` - Get demo data for all engines
- `GET /api/engines/search` - Search across all engines

### Engine-Specific Endpoints
For each engine (`{engine_name}`):
- `GET /api/engines/{engine_name}` - Get engine info
- `GET /api/engines/{engine_name}/search` - Search engine data
- `POST /api/engines/{engine_name}/upload` - Upload files
- `POST /api/engines/{engine_name}/report` - Generate reports
- `POST /api/engines/{engine_name}/validate` - Validate compliance
- `GET /api/engines/{engine_name}/demo` - Get engine demo data

### USDA Pricing Engine Specific
- `POST /api/engines/usda_pricing/analyze` - Advanced price analysis

## Database Collections

Each engine uses MongoDB collections:
- `{engine}data` - Main data storage
- `{engine}uploads` - Upload tracking
- `{engine}reports` - Generated reports
- `{engine}auditlogs` - Audit trail

## Demo Data

All engines include demo data for immediate UI integration testing:
- Sample search results
- Mock upload data
- Example reports
- Compliance validation samples

## Development

### Adding New Engines

1. Create engine directory under `engines/`
2. Implement models, services, controllers
3. Extend `EngineManager` class
4. Add configuration to `operational_playbook.json`
5. Mount routes in `server.js`

### Testing

```bash
# Test individual engines
curl http://localhost:3002/api/engines/usda_pricing/demo
curl http://localhost:3002/api/engines/water_tech/demo
curl http://localhost:3002/api/engines/global_compliance/demo

# Test search functionality
curl "http://localhost:3002/api/engines/search?query=compliance"
curl "http://localhost:3002/api/engines/factoring/search?query=invoice"

# Test file upload (multipart/form-data)
curl -X POST -F "file=@sample.pdf" http://localhost:3002/api/engines/usda_pricing/upload

# Test report generation
curl -X POST -H "Content-Type: application/json" \
     -d '{"reportType":"price_analysis","data":{"commodity":"corn"}}' \
     http://localhost:3002/api/engines/usda_pricing/report
```

## Production Deployment

### Environment Variables
```bash
PORT=3002
MONGO_URI=mongodb://localhost:27017/auditdna
JWT_SECRET=your-super-secret-jwt-key
NODE_ENV=production
```

### Security Considerations
- Add authentication middleware
- Implement rate limiting
- Configure CORS properly
- Add input sanitization
- Set up HTTPS
- Configure MongoDB security

### Performance Optimization
- Add database indexes
- Implement caching layer
- Configure MongoDB connection pooling
- Add compression middleware
- Set up load balancing

## Contributing

1. Fork the repository
2. Create a feature branch
3. Implement changes with tests
4. Submit a pull request

## License

This project is licensed under the ISC License.