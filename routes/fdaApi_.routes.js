// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// FDA API INTEGRATION - COMPLETE WITH BULK DOWNLOAD
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// OpenFDA API - Food Safety, Enforcement, Recalls, Facility Registration
// Supports both real-time queries AND bulk data downloads
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

const express = require('express');
const router = express.Router();
const axios = require('axios');
const AdmZip = require('adm-zip');
const fs = require('fs');
const path = require('path');

// FDA API Configuration
const FDA_API_BASE = 'https://api.fda.gov';
const FDA_DOWNLOAD_BASE = 'https://download.open.fda.gov';

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// GET AVAILABLE DOWNLOAD FILES
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
router.get('/downloads', async (req, res) => {
  try {
    const response = await axios.get(`${FDA_DOWNLOAD_BASE}/food/enforcement/partitions.json`);
    
    res.json({
      success: true,
      meta: response.data.meta,
      results: response.data.results,
      partitions: response.data.results?.food?.enforcement?.partitions || [],
      total_records: response.data.results?.food?.enforcement?.total_records || 0,
      export_date: response.data.results?.food?.enforcement?.export_date
    });
  } catch (error) {
    console.error('[FDA API] Download list error:', error.message);
    res.status(500).json({ 
      success: false,
      error: 'Failed to get FDA download files',
      details: error.message
    });
  }
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// DOWNLOAD AND EXTRACT FDA BULK DATA
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
router.post('/download/:partition', async (req, res) => {
  try {
    const { partition } = req.params; // e.g., "2015q4"
    
    // Get available partitions first
    const partitionsRes = await axios.get(`${FDA_DOWNLOAD_BASE}/food/enforcement/partitions.json`);
    const partitions = partitionsRes.data.results?.food?.enforcement?.partitions || [];
    
    // Find the requested partition
    const targetPartition = partitions.find(p => 
      p.display_name.toLowerCase().includes(partition.toLowerCase())
    );
    
    if (!targetPartition) {
      return res.status(404).json({
        success: false,
        error: 'Partition not found',
        available: partitions.map(p => p.display_name)
      });
    }
    
    // Download the ZIP file
    const downloadUrl = targetPartition.file;
    const response = await axios.get(downloadUrl, { responseType: 'arraybuffer' });
    
    // Extract ZIP
    const zip = new AdmZip(response.data);
    const zipEntries = zip.getEntries();
    
    const extractedData = [];
    zipEntries.forEach(entry => {
      if (entry.entryName.endsWith('.json')) {
        const content = entry.getData().toString('utf8');
        const data = JSON.parse(content);
        extractedData.push(data);
      }
    });
    
    res.json({
      success: true,
      partition: targetPartition.display_name,
      size_mb: targetPartition.size_mb,
      records: targetPartition.records,
      downloaded_records: extractedData.length,
      data: extractedData
    });
    
  } catch (error) {
    console.error('[FDA API] Download error:', error.message);
    res.status(500).json({ 
      success: false,
      error: 'Failed to download FDA data',
      details: error.message
    });
  }
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// SEARCH FOOD ENFORCEMENT (RECALLS)
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
router.get('/enforcement/search', async (req, res) => {
  try {
    const { query, limit = 10, skip = 0 } = req.query;
    
    if (!query) {
      return res.status(400).json({ 
        success: false,
        error: 'Query parameter required' 
      });
    }
    
    const response = await axios.get(`${FDA_API_BASE}/food/enforcement.json`, {
      params: {
        search: query,
        limit: parseInt(limit),
        skip: parseInt(skip)
      }
    });
    
    res.json({
      success: true,
      query,
      total: response.data.meta?.results?.total || 0,
      limit: parseInt(limit),
      skip: parseInt(skip),
      results: response.data.results || []
    });
    
  } catch (error) {
    console.error('[FDA API] Enforcement search error:', error.message);
    res.status(500).json({ 
      success: false,
      error: 'FDA enforcement search failed',
      details: error.response?.data || error.message
    });
  }
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// SEARCH FOOD EVENTS (ADVERSE EVENTS)
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
router.get('/events/search', async (req, res) => {
  try {
    const { query, limit = 10 } = req.query;
    
    const response = await axios.get(`${FDA_API_BASE}/food/event.json`, {
      params: {
        search: query || '',
        limit: parseInt(limit)
      }
    });
    
    res.json({
      success: true,
      results: response.data.results || [],
      meta: response.data.meta
    });
    
  } catch (error) {
    console.error('[FDA API] Events search error:', error.message);
    res.status(500).json({ 
      success: false,
      error: 'FDA events search failed',
      details: error.message
    });
  }
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// VERIFY FACILITY BY NAME
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
router.get('/facility/search/:name', async (req, res) => {
  try {
    const { name } = req.params;
    
    // Search enforcement database for facility
    const response = await axios.get(`${FDA_API_BASE}/food/enforcement.json`, {
      params: {
        search: `recalling_firm:"${name}"`,
        limit: 100
      }
    });
    
    const results = response.data.results || [];
    
    res.json({
      success: true,
      facility_name: name,
      found: results.length > 0,
      enforcement_actions: results.length,
      results: results.map(r => ({
        status: r.status,
        classification: r.classification,
        product_description: r.product_description,
        reason_for_recall: r.reason_for_recall,
        recall_initiation_date: r.recall_initiation_date,
        state: r.state,
        city: r.city
      }))
    });
    
  } catch (error) {
    console.error('[FDA API] Facility search error:', error.message);
    res.status(500).json({ 
      success: false,
      error: 'FDA facility search failed',
      details: error.message
    });
  }
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// GET RECALLS BY PRODUCT TYPE
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
router.get('/recalls/:productType', async (req, res) => {
  try {
    const { productType } = req.params;
    const { limit = 20, classification } = req.query;
    
    let searchQuery = `product_description:"${productType}"`;
    if (classification) {
      searchQuery += `+AND+classification:"${classification}"`;
    }
    
    const response = await axios.get(`${FDA_API_BASE}/food/enforcement.json`, {
      params: {
        search: searchQuery,
        limit: parseInt(limit)
      }
    });
    
    res.json({
      success: true,
      product_type: productType,
      classification: classification || 'all',
      recalls: response.data.results || [],
      count: response.data.results?.length || 0
    });
    
  } catch (error) {
    console.error('[FDA API] Recalls search error:', error.message);
    res.status(500).json({ 
      success: false,
      error: 'FDA recalls search failed',
      details: error.message
    });
  }
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// CHECK GROWER/SUPPLIER FOOD SAFETY RECORD
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
router.post('/verify-grower', async (req, res) => {
  try {
    const { company_name, state, city } = req.body;
    
    if (!company_name) {
      return res.status(400).json({ 
        success: false,
        error: 'company_name required' 
      });
    }
    
    // Build search query
    let searchQuery = `recalling_firm:"${company_name}"`;
    if (state) searchQuery += `+AND+state:"${state}"`;
    if (city) searchQuery += `+AND+city:"${city}"`;
    
    const response = await axios.get(`${FDA_API_BASE}/food/enforcement.json`, {
      params: {
        search: searchQuery,
        limit: 100
      }
    });
    
    const results = response.data.results || [];
    
    // Calculate food safety score
    const class1Count = results.filter(r => r.classification === 'Class I').length;
    const class2Count = results.filter(r => r.classification === 'Class II').length;
    const class3Count = results.filter(r => r.classification === 'Class III').length;
    
    let safetyScore = 100;
    if (class1Count > 0) safetyScore -= (class1Count * 30);
    if (class2Count > 0) safetyScore -= (class2Count * 15);
    if (class3Count > 0) safetyScore -= (class3Count * 5);
    safetyScore = Math.max(0, safetyScore);
    
    let riskLevel = 'LOW';
    if (class1Count > 0 || safetyScore < 50) riskLevel = 'HIGH';
    else if (class2Count > 2 || safetyScore < 75) riskLevel = 'MEDIUM';
    
    res.json({
      success: true,
      company_name,
      state,
      city,
      total_enforcement_actions: results.length,
      classification_breakdown: {
        class_1: class1Count,
        class_2: class2Count,
        class_3: class3Count
      },
      food_safety_score: safetyScore,
      risk_level: riskLevel,
      verified: results.length === 0 ? 'CLEAN' : 'ISSUES_FOUND',
      enforcement_history: results.slice(0, 10).map(r => ({
        date: r.recall_initiation_date,
        classification: r.classification,
        product: r.product_description,
        reason: r.reason_for_recall
      }))
    });
    
  } catch (error) {
    console.error('[FDA API] Grower verification error:', error.message);
    res.status(500).json({ 
      success: false,
      error: 'FDA grower verification failed',
      details: error.message
    });
  }
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// TEST FDA API CONNECTION
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
router.get('/test', async (req, res) => {
  try {
    const response = await axios.get(`${FDA_API_BASE}/food/enforcement.json`, {
      params: { limit: 1 }
    });
    
    res.json({
      success: true,
      message: 'FDA API connection successful!',
      api_status: 'ONLINE',
      sample_data: response.data.results?.[0] || null,
      meta: response.data.meta
    });
  } catch (error) {
    console.error('[FDA API] Test failed:', error.message);
    res.status(500).json({ 
      success: false,
      error: 'FDA API test failed',
      details: error.message
    });
  }
});

module.exports = router;

