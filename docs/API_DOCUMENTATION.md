# AuditDNA Backend API Documentation

## Overview

The AuditDNA Backend provides RESTful APIs for all core AuditDNA engines, enabling comprehensive audit workflows, evidence uploads, compliance validation, and reporting across multiple domains.

## Base URL
```
http://localhost:3002/api
```

## Authentication
Currently, no authentication is required. All endpoints are publicly accessible.

## Core Engines

The following engines are available:

1. **USDA Pricing Engine** (`usda_pricing`)
2. **Water Tech Upload/Analysis** (`water_tech`)
3. **Global Compliance & Ethics** (`global_compliance`)
4. **Search Engines (Meta-layer)** (`search_meta`)
5. **Mortgage & Real Estate** (`mortgage_realestate`)
6. **Factoring** (`factoring`)
7. **Compliance** (`compliance`)

## API Endpoints

### System Endpoints

#### Get All Engines
```http
GET /api/engines
```

**Response:**
```json
{
  "success": true,
  "totalEngines": 7,
  "engines": {
    "usda_pricing": {
      "name": "USDA Pricing Engine",
      "capabilities": ["pricing_analysis", "risk_assessment", "compliance_check", "historical_data"],
      "dataTypes": ["commodity_prices", "market_data", "historical_trends", "risk_factors"],
      "status": "active"
    }
    // ... other engines
  },
  "capabilities": {
    "data_storage": "MongoDB with engine-specific collections",
    "audit_workflows": "Complete audit trail for all operations",
    "evidence_uploads": "Secure file upload with metadata tracking",
    "compliance_validation": "Automated compliance checks against regulations",
    "reporting": "PDF and JSON report generation",
    "search": "Full-text search with filtering and sorting",
    "demo_data": "Sample data for UI integration testing"
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

#### Get Demo Data for All Engines
```http
GET /api/engines/demo
```

#### Search Across All Engines
```http
GET /api/engines/search?query={search_term}&page={page}&limit={limit}
```

### Engine-Specific Endpoints

Each engine supports the following endpoints:

#### Get Engine Information
```http
GET /api/engines/{engine_name}
```

#### Search Engine Data
```http
GET /api/engines/{engine_name}/search?query={search_term}&page={page}&limit={limit}&sortBy={field}&sortOrder={asc|desc}
```

**Query Parameters:**
- `query` (optional): Search term
- `page` (optional): Page number (default: 1)
- `limit` (optional): Results per page (default: 10, max: 100)
- `sortBy` (optional): Field to sort by
- `sortOrder` (optional): Sort direction (asc/desc)
- Additional filters vary by engine

**Example Response:**
```json
{
  "success": true,
  "engine": "water_tech",
  "query": "contamination",
  "filters": {},
  "results": [
    {
      "id": "1",
      "name": "Water Sample #1",
      "value": 2.5,
      "unit": "ppm",
      "location": "Lake Michigan, IL",
      "testDate": "2024-01-15T10:00:00.000Z",
      "complianceStatus": "compliant",
      "score": 0.95
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 150
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

#### Upload Files
```http
POST /api/engines/{engine_name}/upload
Content-Type: multipart/form-data
```

**Form Data:**
- `file`: The file to upload (required)
- Additional metadata fields vary by engine

**Example Response:**
```json
{
  "success": true,
  "engine": "usda_pricing",
  "upload": {
    "id": "upload_123",
    "engine": "usda_pricing",
    "filename": "commodity_data.csv",
    "originalName": "USDA_Corn_Prices_2024.csv",
    "mimetype": "text/csv",
    "size": 51200,
    "status": "uploaded",
    "uploadedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

#### Generate Reports
```http
POST /api/engines/{engine_name}/report
Content-Type: application/json
```

**Request Body:**
```json
{
  "reportType": "price_analysis",
  "data": {
    "commodity": "corn",
    "timeframe": "6months"
  },
  "options": {
    "format": "json",
    "includeCharts": true
  }
}
```

**Response:**
```json
{
  "success": true,
  "engine": "usda_pricing",
  "report": {
    "reportId": "USDA_PRICING-1642248600000",
    "engine": "usda_pricing",
    "type": "price_analysis",
    "data": {
      "commodity": "corn",
      "timeframe": "6months",
      "analysis": { /* analysis results */ }
    },
    "generatedAt": "2024-01-15T10:30:00.000Z",
    "status": "completed"
  }
}
```

#### Validate Compliance
```http
POST /api/engines/{engine_name}/validate
Content-Type: application/json
```

**Request Body:**
```json
{
  "data": {
    "commodity": "corn",
    "price": 4.85,
    "location": "Chicago, IL",
    "marketDate": "2024-01-15"
  },
  "rules": [
    {
      "name": "price_range_check",
      "min": 0,
      "max": 100
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "engine": "usda_pricing",
  "validation": {
    "engine": "usda_pricing",
    "data": { /* input data */ },
    "results": [
      {
        "rule": "price_range_check",
        "status": "passed",
        "message": "Rule price_range_check passed",
        "timestamp": "2024-01-15T10:30:00.000Z"
      }
    ],
    "overallStatus": "compliant",
    "validatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

#### Get Demo Data for Specific Engine
```http
GET /api/engines/{engine_name}/demo
```

## Engine-Specific Features

### USDA Pricing Engine

**Additional Endpoints:**
```http
POST /api/engines/usda_pricing/analyze
```

**Request Body:**
```json
{
  "commodity": "corn",
  "timeframe": "6months"
}
```

**Supported Report Types:**
- `price_analysis`
- `risk_assessment`
- `compliance_check`
- `market_trends`

### Water Tech Engine

**Supported Data Types:**
- Water quality samples
- Contamination test results
- Environmental compliance reports

**Common Filters:**
- `location`: Filter by sample location
- `contaminant`: Filter by contaminant type
- `dateFrom`/`dateTo`: Filter by date range

### Global Compliance Engine

**Supported Data Types:**
- Compliance documents
- Regulatory updates
- Ethics reports
- Audit logs

### Search Meta Engine

**Special Features:**
- Cross-engine search capability
- Data aggregation across all engines
- Intelligent routing to appropriate engines

### Mortgage & Real Estate Engine

**Supported Data Types:**
- Property valuations
- Mortgage applications
- Market analysis data
- Risk profiles

### Factoring Engine

**Supported Data Types:**
- Invoice data
- Credit reports
- Payment histories
- Cash flow analysis

### Compliance Engine

**Supported Data Types:**
- Regulatory requirements
- Violation reports
- Remediation plans
- Compliance tracking data

## Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "Error message description",
  "engine": "engine_name",  // if applicable
  "errors": [  // for validation errors
    {
      "type": "field",
      "value": "invalid_value",
      "msg": "Validation error message",
      "path": "field_name",
      "location": "body"
    }
  ]
}
```

**Common HTTP Status Codes:**
- `200`: Success
- `400`: Bad Request (validation errors)
- `404`: Not Found (engine or resource not found)
- `500`: Internal Server Error

## Rate Limiting

Currently, no rate limiting is implemented. This should be added in production.

## CORS

CORS is not currently configured. Add CORS middleware in production to allow frontend access.

## Development

### Adding New Engines

1. Create engine directory structure under `engines/`
2. Implement models, services, controllers, and routes
3. Extend the `EngineManager` class
4. Add engine configuration to `operational_playbook.json`
5. Update server.js to mount new routes

### Testing

Use the demo endpoints to test integration:

```bash
# Test all engines
curl http://localhost:3002/api/engines

# Test specific engine
curl http://localhost:3002/api/engines/usda_pricing/demo

# Test search
curl "http://localhost:3002/api/engines/water_tech/search?query=contamination&limit=5"
```

## Next Steps for Production

1. Add authentication and authorization
2. Implement rate limiting
3. Add CORS configuration
4. Set up proper logging and monitoring
5. Add input sanitization and validation
6. Configure database indexes for performance
7. Add API documentation with Swagger/OpenAPI
8. Implement caching for frequently accessed data
9. Add WebSocket support for real-time updates
10. Set up automated testing and CI/CD