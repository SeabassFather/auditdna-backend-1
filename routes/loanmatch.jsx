import React, { useState } from 'react';
import axios from 'axios';

const LoanMatch = () => {
  const [formData, setFormData] = useState({
    creditScore: '',
    income: '',
    dti: '',
    ltv: ''
  });

  const [matchedLenders, setMatchedLenders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMatchedLenders([]);
    setLoading(true);
    setError('');

    try {
      const res = await axios.post('https://auditdna-backend.onrender.com/api/loan-match', {
        creditScore: parseInt(formData.creditScore),
        income: parseInt(formData.income),
        dti: parseFloat(formData.dti),
        ltv: parseFloat(formData.ltv),
      });
      setMatchedLenders(res.data.matched);
    } catch (err) {
      setError('Something went wrong while matching lenders.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto bg-white rounded shadow">
      <h1 className="text-2xl font-bold mb-4">Lender Match Tool</h1>
      <p className="mb-4 text-gray-700">Find lenders that may match your financial profile.</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {['creditScore', 'income', 'dti', 'ltv'].map((field) => (
          <div key={field}>
            <label className="block text-sm font-medium capitalize">{field}</label>
            <input
              type="number"
              name={field}
              value={formData[field]}
              onChange={handleChange}
              required
              className="mt-1 block w-full border border-gray-300 rounded px-3 py-2"
            />
          </div>
        ))}

        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
        >
          {loading ? 'Matching...' : 'Find Matches'}
        </button>
      </form>

      {error && <p className="text-red-600 mt-4">{error}</p>}

      {matchedLenders.length > 0 && (
        <div className="mt-6">
          <h2 className="text-xl font-semibold mb-2">Matched Lenders</h2>
          <ul className="list-disc list-inside">
            {matchedLenders.map((lender, idx) => (
              <li key={idx}>
                {lender.name} – Max LTV: {lender.maxLTV}%, Min Score: {lender.minCreditScore}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default LoanMatch;
