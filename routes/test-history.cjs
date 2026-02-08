// ================================================================
// TEST HISTORY ROUTES - REST API ENDPOINTS
// ================================================================
// Date: 2025-11-20 05:06:43 UTC
// Author: SeabassFather (Saul Garcia)
// Endpoints: 9 REST API endpoints for test history management
// ================================================================

const express = require('express');
const router = express.Router();
const TestHistory = require('../models/TestHistory.cjs');
const Notification = require('../models/Notification.cjs');
const Client = require('../models/Client.cjs');

// ================================================================
// 1. GET ALL TEST HISTORY
// ================================================================
router.get('/', async (req, res) => {
  try {
    const { client, result, status, productName, lotNumber } = req.query;
    let query = {};
    
    if (client) query.client = client;
    if (result) query.result = result;
    if (status) query.status = status;
    if (productName) query.productName = { $regex: productName, $options: 'i' };
    if (lotNumber) query.lotNumber = { $regex: lotNumber, $options: 'i' };
    
    const tests = await TestHistory.find(query)
      .populate('client', 'companyName contactName email')
      .sort({ testDate: -1 });
    
    res.json({ success: true, count: tests.length, data: tests });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ================================================================
// 2. GET SINGLE TEST BY ID
// ================================================================
router.get('/:id', async (req, res) => {
  try {
    const test = await TestHistory.findById(req.params.id)
      .populate('client', 'companyName contactName email phone');
    
    if (!test) {
      return res.status(404).json({ success: false, error: 'Test not found' });
    }
    
    res.json({ success: true, data: test });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ================================================================
// 3. GET TESTS BY CLIENT ID
// ================================================================
router.get('/client/:clientId', async (req, res) => {
  try {
    const tests = await TestHistory.find({ client: req.params.clientId })
      .sort({ testDate: -1 });
    
    res.json({ success: true, count: tests.length, data: tests });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ================================================================
// 4. CREATE NEW TEST
// ================================================================
router.post('/', async (req, res) => {
  try {
    const newTest = new TestHistory(req.body);
    await newTest.save();
    
    // Add test to client's test history
    await Client.findByIdAndUpdate(
      newTest.client,
      { $push: { testHistory: newTest._id } }
    );
    
    // Create notification for client
    const notification = new Notification({
      recipient: { type: 'Client', id: newTest.client },
      title: 'New Test Scheduled',
      message: `Test scheduled for ${newTest.productName} - Lot #${newTest.lotNumber}`,
      type: 'Test Result',
      priority: 'Medium',
      relatedTest: newTest._id,
      deliveryMethod: 'Email'
    });
    await notification.save();
    
    res.status(201).json({ success: true, data: newTest });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// ================================================================
// 5. UPDATE TEST
// ================================================================
router.put('/:id', async (req, res) => {
  try {
    const test = await TestHistory.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!test) {
      return res.status(404).json({ success: false, error: 'Test not found' });
    }
    
    res.json({ success: true, data: test });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// ================================================================
// 6. UPDATE TEST RESULT
// ================================================================
router.patch('/:id/result', async (req, res) => {
  try {
    const { result, resultDetails } = req.body;
    
    if (!['Pass', 'Fail', 'Pending', 'Conditional'].includes(result)) {
      return res.status(400).json({ success: false, error: 'Invalid result' });
    }
    
    const test = await TestHistory.findByIdAndUpdate(
      req.params.id,
      { 
        result, 
        resultDetails, 
        status: 'Completed',
        alertSent: false
      },
      { new: true }
    ).populate('client');
    
    if (!test) {
      return res.status(404).json({ success: false, error: 'Test not found' });
    }
    
    // Create notification for test result
    const priority = result === 'Fail' ? 'Urgent' : result === 'Conditional' ? 'High' : 'Medium';
    
    const notification = new Notification({
      recipient: { type: 'Client', id: test.client._id },
      title: `Test Result: ${result}`,
      message: `Test results for ${test.productName} - Lot #${test.lotNumber}: ${result}`,
      type: 'Test Result',
      priority,
      relatedTest: test._id,
      relatedClient: test.client._id,
      deliveryMethod: 'All'
    });
    await notification.save();
    
    test.alertSent = true;
    test.alertSentDate = Date.now();
    await test.save();
    
    res.json({ success: true, data: test });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// ================================================================
// 7. DELETE TEST
// ================================================================
router.delete('/:id', async (req, res) => {
  try {
    const test = await TestHistory.findByIdAndDelete(req.params.id);
    
    if (!test) {
      return res.status(404).json({ success: false, error: 'Test not found' });
    }
    
    // Remove from client's test history
    await Client.findByIdAndUpdate(
      test.client,
      { $pull: { testHistory: test._id } }
    );
    
    res.json({ success: true, data: {}, message: 'Test deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ================================================================
// 8. GET TEST STATISTICS
// ================================================================
router.get('/stats/summary', async (req, res) => {
  try {
    const totalTests = await TestHistory.countDocuments();
    const passedTests = await TestHistory.countDocuments({ result: 'Pass' });
    const failedTests = await TestHistory.countDocuments({ result: 'Fail' });
    const pendingTests = await TestHistory.countDocuments({ result: 'Pending' });
    
    const byProduct = await TestHistory.aggregate([
      { $group: { _id: '$productName', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
    
    const byTestType = await TestHistory.aggregate([
      { $group: { _id: '$testType', count: { $sum: 1 } } }
    ]);
    
    res.json({
      success: true,
      data: {
        total: totalTests,
        passed: passedTests,
        failed: failedTests,
        pending: pendingTests,
        passRate: totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(2) : 0,
        topProducts: byProduct,
        byTestType
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ================================================================
// 9. SEARCH TESTS BY LOT NUMBER
// ================================================================
router.get('/search/lot/:lotNumber', async (req, res) => {
  try {
    const tests = await TestHistory.find({ 
      lotNumber: { $regex: req.params.lotNumber, $options: 'i' } 
    })
    .populate('client', 'companyName contactName email')
    .sort({ testDate: -1 });
    
    res.json({ success: true, count: tests.length, data: tests });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;