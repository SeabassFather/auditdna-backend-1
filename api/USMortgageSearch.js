import React, { useState } from 'react';
import { DollarSign, Home, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react';
import { searchMortgages } from '../api/mortgagesearchapi';

export default function USMortgageSearch() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    propertyAddress: '',
    propertyType: 'single-family',
    occupancy: 'primary',
    loanPurpose: 'purchase',
    purchasePrice: '',
    estimatedValue: '',
    creditScore: '740',
    dti: '',
    income: '',
    assets: '',
    loanAmount: '',
    loanType: 'conventional',
    downPayment: '',
    closeDate: '',
    lockPreference: 'no-preference'
  });

  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showResults, setShowResults] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Auto-calculate LTV
    if (name === 'purchasePrice' || name === 'loanAmount') {
      const price = name === 'purchasePrice' ? parseFloat(value) : parseFloat(formData.purchasePrice);
      const loan = name === 'loanAmount' ? parseFloat(value) : parseFloat(formData.loanAmount);
      if (price && loan) {
        const ltv = ((loan / price) * 100).toFixed(2);
        document.getElementById('ltv-display').textContent = `Computed LTV: ${ltv}%`;
      }
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setShowResults(false);

    try {
      // Build the payload matching your backend API expectations
      const payload = {
        borrower: {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          creditScore: parseInt(formData.creditScore),
          income: parseFloat(formData.income) || 0,
          assets: parseFloat(formData.assets) || 0,
          dti: parseFloat(formData.dti) || 0
        },
        property: {
          address: formData.propertyAddress,
          type: formData.propertyType,
          occupancy: formData.occupancy,
          purchasePrice: parseFloat(formData.purchasePrice) || 0,
          estimatedValue: parseFloat(formData.estimatedValue) || 0
        },
        loan: {
          purpose: formData.loanPurpose,
          amount: parseFloat(formData.loanAmount) || 0,
          type: formData.loanType,
          downPayment: parseFloat(formData.downPayment) || 0,
          ltv: formData.purchasePrice ? 
            ((parseFloat(formData.loanAmount) / parseFloat(formData.purchasePrice)) * 100).toFixed(2) : 0,
          closeDate: formData.closeDate,
          lockPreference: formData.lockPreference
        },
        timestamp: new Date().toISOString()
      };

      // Call the real API
      const response = await searchMortgages(payload);
      
      if (response && response.lenders) {
        setResults(response.lenders);
        setShowResults(true);
      } else {
        setError('No matching lenders found. Please adjust your criteria.');
      }
    } catch (err) {
      console.error('Mortgage search error:', err);
      setError(err.message || 'Failed to search lenders. Please check your backend API connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 via-teal-600 to-blue-600 rounded-lg shadow-2xl p-8 text-white">
        <div className="flex items-center gap-4 mb-4">
          <Home className="w-12 h-12" />
          <div>
            <h1 className="text-4xl font-bold">US Mortgage Loan Search Engine</h1>
            <p className="text-xl">Real-Time Lender Matching • Professional Service</p>
          </div>
        </div>
        <p className="text-lg opacity-90">Connect with verified lenders instantly - Conventional, FHA, VA, USDA, Jumbo</p>
      </div>

      {/* Search Form */}
      <div className="bg-white rounded-lg shadow-lg p-8 border-2 border-gray-200">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
          <TrendingUp className="w-7 h-7 text-green-600" />
          Loan Search Criteria
        </h2>
        
        <form onSubmit={handleSearch} className="space-y-6">
          {/* Borrower Information */}
          <div className="grid grid-cols-3 gap-6">
            <div>
              <label className="block font-bold mb-2 text-gray-700">Borrower Name *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-lg focus:border-green-500 focus:outline-none"
                placeholder="John Doe"
              />
            </div>
            <div>
              <label className="block font-bold mb-2 text-gray-700">Email *</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-lg focus:border-green-500 focus:outline-none"
                placeholder="john@example.com"
              />
            </div>
            <div>
              <label className="block font-bold mb-2 text-gray-700">Phone *</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                required
                className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-lg focus:border-green-500 focus:outline-none"
                placeholder="(555) 123-4567"
              />
            </div>
          </div>

          {/* Property Information */}
          <div className="grid grid-cols-2 gap-6">
            <div className="col-span-2">
              <label className="block font-bold mb-2 text-gray-700">Property Address *</label>
              <input
                type="text"
                name="propertyAddress"
                value={formData.propertyAddress}
                onChange={handleChange}
                required
                className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-lg focus:border-green-500 focus:outline-none"
                placeholder="123 Main St, City, State, ZIP"
              />
            </div>
            <div>
              <label className="block font-bold mb-2 text-gray-700">Property Type *</label>
              <select
                name="propertyType"
                value={formData.propertyType}
                onChange={handleChange}
                className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-lg focus:border-green-500 focus:outline-none"
              >
                <option value="single-family">Single Family Residence</option>
                <option value="condo">Condominium</option>
                <option value="townhome">Townhome</option>
                <option value="multi-family">Multi-Family (2-4 units)</option>
                <option value="manufactured">Manufactured Home</option>
              </select>
            </div>
            <div>
              <label className="block font-bold mb-2 text-gray-700">Occupancy *</label>
              <select
                name="occupancy"
                value={formData.occupancy}
                onChange={handleChange}
                className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-lg focus:border-green-500 focus:outline-none"
              >
                <option value="primary">Primary Residence</option>
                <option value="second">Second Home</option>
                <option value="investment">Investment Property</option>
              </select>
            </div>
          </div>

          {/* Loan Details */}
          <div className="grid grid-cols-3 gap-6">
            <div>
              <label className="block font-bold mb-2 text-gray-700">Loan Purpose *</label>
              <select
                name="loanPurpose"
                value={formData.loanPurpose}
                onChange={handleChange}
                className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-lg focus:border-green-500 focus:outline-none"
              >
                <option value="purchase">Purchase</option>
                <option value="refinance">Rate & Term Refinance</option>
                <option value="cashout">Cash-Out Refinance</option>
              </select>
            </div>
            <div>
              <label className="block font-bold mb-2 text-gray-700">Loan Type *</label>
              <select
                name="loanType"
                value={formData.loanType}
                onChange={handleChange}
                className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-lg focus:border-green-500 focus:outline-none"
              >
                <option value="conventional">Conventional</option>
                <option value="fha">FHA</option>
                <option value="va">VA</option>
                <option value="usda">USDA</option>
                <option value="jumbo">Jumbo</option>
              </select>
            </div>
            <div>
              <label className="block font-bold mb-2 text-gray-700">Credit Score *</label>
              <select
                name="creditScore"
                value={formData.creditScore}
                onChange={handleChange}
                className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-lg focus:border-green-500 focus:outline-none"
              >
                <option value="800">Excellent (740+)</option>
                <option value="720">Good (700-739)</option>
                <option value="680">Fair (660-699)</option>
                <option value="640">Below Average (620-659)</option>
                <option value="600">Poor (580-619)</option>
              </select>
            </div>
          </div>

          {/* Financial Details */}
          <div className="grid grid-cols-3 gap-6">
            <div>
              <label className="block font-bold mb-2 text-gray-700">Purchase Price / Est. Value *</label>
              <input
                type="number"
                name="purchasePrice"
                value={formData.purchasePrice}
                onChange={handleChange}
                required
                className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-lg focus:border-green-500 focus:outline-none"
                placeholder="500000"
              />
            </div>
            <div>
              <label className="block font-bold mb-2 text-gray-700">Loan Amount *</label>
              <input
                type="number"
                name="loanAmount"
                value={formData.loanAmount}
                onChange={handleChange}
                required
                className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-lg focus:border-green-500 focus:outline-none"
                placeholder="400000"
              />
            </div>
            <div>
              <label className="block font-bold mb-2 text-gray-700">Down Payment</label>
              <input
                type="number"
                name="downPayment"
                value={formData.downPayment}
                onChange={handleChange}
                className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-lg focus:border-green-500 focus:outline-none"
                placeholder="100000"
              />
            </div>
            <div>
              <label className="block font-bold mb-2 text-gray-700">Annual Income</label>
              <input
                type="number"
                name="income"
                value={formData.income}
                onChange={handleChange}
                className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-lg focus:border-green-500 focus:outline-none"
                placeholder="100000"
              />
            </div>
            <div>
              <label className="block font-bold mb-2 text-gray-700">Assets</label>
              <input
                type="number"
                name="assets"
                value={formData.assets}
                onChange={handleChange}
                className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-lg focus:border-green-500 focus:outline-none"
                placeholder="50000"
              />
            </div>
            <div>
              <label className="block font-bold mb-2 text-gray-700">DTI %</label>
              <input
                type="number"
                name="dti"
                value={formData.dti}
                onChange={handleChange}
                step="0.1"
                className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-lg focus:border-green-500 focus:outline-none"
                placeholder="43"
              />
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
            <span id="ltv-display" className="text-xl font-bold text-blue-700">Computed LTV: 0%</span>
            <span className="text-sm text-gray-600">LTV = (Loan Amount / Purchase Price) × 100</span>
          </div>

          {/* Additional Options */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block font-bold mb-2 text-gray-700">Target Close Date</label>
              <input
                type="date"
                name="closeDate"
                value={formData.closeDate}
                onChange={handleChange}
                className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-lg focus:border-green-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-bold mb-2 text-gray-700">Rate Lock Preference</label>
              <select
                name="lockPreference"
                value={formData.lockPreference}
                onChange={handleChange}
                className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-lg focus:border-green-500 focus:outline-none"
              >
                <option value="no-preference">No Preference</option>
                <option value="30-day">30-Day Lock</option>
                <option value="45-day">45-Day Lock</option>
                <option value="60-day">60-Day Lock</option>
              </select>
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border-2 border-red-300 rounded-lg flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-red-600" />
              <p className="text-red-700 font-semibold">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white py-4 rounded-lg font-bold text-xl flex items-center justify-center gap-3 shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <DollarSign className="w-6 h-6" />
            {loading ? 'Searching Lenders...' : 'Find Matching Lenders'}
          </button>
        </form>
      </div>

      {/* Results */}
      {showResults && results.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-8 border-2 border-gray-200">
          <div className="flex items-center gap-3 mb-6 p-4 bg-green-50 border-2 border-green-300 rounded-lg">
            <CheckCircle className="w-6 h-6 text-green-600" />
            <p className="text-lg font-semibold text-gray-800">
              Found {results.length} matching lender{results.length > 1 ? 's' : ''} for your criteria
            </p>
          </div>

          <h3 className="text-2xl font-bold mb-6">Available Loan Options</h3>
          
          <div className="space-y-4">
            {results.map((lender, index) => (
              <div key={lender.id || index} className="border-2 border-gray-200 rounded-lg p-6 hover:border-green-400 transition-all">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="text-xl font-bold text-gray-800">{lender.name || `Lender Option ${index + 1}`}</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      {lender.loanType || formData.loanType.toUpperCase()} • {lender.term || '30'}-Year Fixed
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Estimated Rate</p>
                    <p className="text-3xl font-bold text-green-600">{lender.rate || lender.estimatedRate}%</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <p className="text-sm text-gray-600">Monthly Payment</p>
                    <p className="text-xl font-bold text-gray-800">${lender.monthlyPayment || 'N/A'}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <p className="text-sm text-gray-600">APR</p>
                    <p className="text-xl font-bold text-gray-800">{lender.apr || lender.rate}%</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <p className="text-sm text-gray-600">Closing Costs</p>
                    <p className="text-xl font-bold text-gray-800">${lender.closingCosts || 'TBD'}</p>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <p className="text-xs text-gray-500">
                    *Rate subject to approval. Final rate determined by full underwriting review.
                  </p>
                </div>

                <div className="mt-4 flex gap-3">
                  <button className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-bold transition-all">
                    Select This Lender
                  </button>
                  <button className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-3 rounded-lg font-bold transition-all">
                    Request Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showResults && results.length === 0 && (
        <div className="bg-white rounded-lg shadow-lg p-12 text-center border-2 border-gray-200">
          <AlertCircle className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-2xl font-bold text-gray-700 mb-2">No Matching Lenders Found</h3>
          <p className="text-gray-600 text-lg">Please adjust your search criteria and try again.</p>
        </div>
      )}

      {/* Footer */}
      <div className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg shadow-lg p-8 border-2 border-gray-300">
        <div className="text-center space-y-3">
          <h3 className="text-2xl font-bold text-gray-800">Licensed Mortgage Professional</h3>
          <p className="text-xl font-bold text-gray-800">Saul Garcia</p>
          <p className="text-lg font-semibold text-gray-700">NMLS License #337526</p>
          <p className="text-lg font-bold text-blue-700">Everwise Home Loans & Realty</p>
          <p className="text-base font-semibold text-gray-700">Company NMLS #1739012 | DRE #02067255</p>
          <p className="text-sm text-gray-600">15615 Alton Pkwy, Suite 450, Irvine, CA 92618</p>
          <p className="text-sm text-gray-600">Phone: 1-844-853-9300</p>
        </div>
      </div>
    </div>
  );
}