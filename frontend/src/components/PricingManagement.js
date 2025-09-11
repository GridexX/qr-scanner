import React, { useState, useEffect } from 'react';
import { adminApi } from '../services/adminApi';

const PricingManagement = () => {
  const [pricingTiers, setPricingTiers] = useState([]);
  const [qrCodeTypes, setQRCodeTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingTier, setEditingTier] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    monthlyPrice: 0,
    isActive: true,
    features: {
      maxQRCodes: 0,
      maxScansPerMonth: 0,
      maxExpirationDays: 30,
      allowLifetimeQR: false,
      allowDynamicQR: false,
      customBranding: false,
      analytics: 'basic',
      support: 'community'
    },
    costs: {
      additionalQRCode: 0,
      additionalScan: 0,
      extendExpiration: 0,
      lifetimeQRUpgrade: 0
    },
    defaultQRSettings: {
      expirationDays: 7,
      isDynamic: false,
      isLifetime: false
    }
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [tiersResponse, typesResponse] = await Promise.all([
        adminApi.getPricingTiers(),
        adminApi.getQRCodeTypes()
      ]);
      setPricingTiers(tiersResponse.data);
      setQRCodeTypes(typesResponse.data);
    } catch (err) {
      setError('Failed to fetch pricing data');
      console.error('Error fetching pricing data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTier = () => {
    setEditingTier(null);
    setFormData({
      name: '',
      description: '',
      monthlyPrice: 0,
      isActive: true,
      features: {
        maxQRCodes: 0,
        maxScansPerMonth: 0,
        maxExpirationDays: 30,
        allowLifetimeQR: false,
        allowDynamicQR: false,
        customBranding: false,
        analytics: 'basic',
        support: 'community'
      },
      costs: {
        additionalQRCode: 0,
        additionalScan: 0,
        extendExpiration: 0,
        lifetimeQRUpgrade: 0
      },
      defaultQRSettings: {
        expirationDays: 7,
        isDynamic: false,
        isLifetime: false
      }
    });
    setShowCreateForm(true);
  };

  const handleEditTier = (tier) => {
    setEditingTier(tier);
    setFormData(tier);
    setShowCreateForm(true);
  };

  const handleSaveTier = async () => {
    try {
      const tierData = {
        ...formData,
        updatedAt: new Date().toISOString()
      };

      if (editingTier) {
        await adminApi.updatePricingTier(editingTier.id, tierData);
      } else {
        await adminApi.createPricingTier({
          ...tierData,
          id: Date.now(), // Mock ID generation
          createdAt: new Date().toISOString()
        });
      }
      
      await fetchData();
      setShowCreateForm(false);
      setEditingTier(null);
    } catch (err) {
      setError('Failed to save pricing tier');
      console.error('Error saving tier:', err);
    }
  };

  const handleDeleteTier = async (tierId) => {
    if (window.confirm('Are you sure you want to delete this pricing tier?')) {
      try {
        await adminApi.deletePricingTier(tierId);
        await fetchData();
      } catch (err) {
        setError('Failed to delete pricing tier');
        console.error('Error deleting tier:', err);
      }
    }
  };

  const formatPrice = (price) => {
    return price === 0 ? 'Free' : `$${price.toFixed(2)}`;
  };

  const formatFeatureValue = (value, type) => {
    if (value === -1) return 'Unlimited';
    if (type === 'days' && value === -1) return 'Never expires';
    return value.toString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Pricing Management</h1>
          <p className="text-gray-600 mt-1">Manage subscription tiers and pricing models</p>
        </div>
        <button
          onClick={handleCreateTier}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Create New Tier
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Pricing Tiers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {pricingTiers.map((tier) => (
          <div key={tier.id} className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{tier.name}</h3>
                  <p className="text-gray-600 text-sm mt-1">{tier.description}</p>
                </div>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  tier.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {tier.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>

              <div className="text-center mb-6">
                <div className="text-3xl font-bold text-gray-900">{formatPrice(tier.monthlyPrice)}</div>
                <div className="text-gray-600">{tier.monthlyPrice > 0 ? 'per month' : ''}</div>
              </div>

              {/* Features */}
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">QR Codes:</span>
                  <span className="font-medium">{formatFeatureValue(tier.features.maxQRCodes)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Monthly Scans:</span>
                  <span className="font-medium">{formatFeatureValue(tier.features.maxScansPerMonth)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Max Expiration:</span>
                  <span className="font-medium">
                    {tier.features.maxExpirationDays === -1 ? 'Unlimited' : `${tier.features.maxExpirationDays} days`}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Lifetime QR:</span>
                  <span className={`font-medium ${tier.features.allowLifetimeQR ? 'text-green-600' : 'text-red-600'}`}>
                    {tier.features.allowLifetimeQR ? '✓' : '✗'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Dynamic QR:</span>
                  <span className={`font-medium ${tier.features.allowDynamicQR ? 'text-green-600' : 'text-red-600'}`}>
                    {tier.features.allowDynamicQR ? '✓' : '✗'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Analytics:</span>
                  <span className="font-medium capitalize">{tier.features.analytics}</span>
                </div>
              </div>

              {/* Overage Costs */}
              <div className="border-t pt-4 mb-6">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Overage Costs</h4>
                <div className="space-y-2 text-xs text-gray-600">
                  <div className="flex justify-between">
                    <span>Extra QR Code:</span>
                    <span>${tier.costs.additionalQRCode}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Extra Scan:</span>
                    <span>${tier.costs.additionalScan}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Lifetime Upgrade:</span>
                    <span>${tier.costs.lifetimeQRUpgrade}</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex space-x-2">
                <button
                  onClick={() => handleEditTier(tier)}
                  className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDeleteTier(tier.id)}
                  className="flex-1 px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create/Edit Form Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white max-h-screen overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-gray-900">
                {editingTier ? 'Edit Pricing Tier' : 'Create New Pricing Tier'}
              </h3>
              <button
                onClick={() => setShowCreateForm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <span className="text-2xl">&times;</span>
              </button>
            </div>

            <div className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Monthly Price ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.monthlyPrice}
                    onChange={(e) => setFormData({...formData, monthlyPrice: parseFloat(e.target.value) || 0})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Features */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-4">Features & Limits</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Max QR Codes (-1 for unlimited)</label>
                    <input
                      type="number"
                      value={formData.features.maxQRCodes}
                      onChange={(e) => setFormData({
                        ...formData, 
                        features: {...formData.features, maxQRCodes: parseInt(e.target.value) || 0}
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Max Monthly Scans (-1 for unlimited)</label>
                    <input
                      type="number"
                      value={formData.features.maxScansPerMonth}
                      onChange={(e) => setFormData({
                        ...formData, 
                        features: {...formData.features, maxScansPerMonth: parseInt(e.target.value) || 0}
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Max Expiration Days (-1 for unlimited)</label>
                    <input
                      type="number"
                      value={formData.features.maxExpirationDays}
                      onChange={(e) => setFormData({
                        ...formData, 
                        features: {...formData.features, maxExpirationDays: parseInt(e.target.value) || 0}
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Analytics Level</label>
                    <select
                      value={formData.features.analytics}
                      onChange={(e) => setFormData({
                        ...formData, 
                        features: {...formData.features, analytics: e.target.value}
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="basic">Basic</option>
                      <option value="standard">Standard</option>
                      <option value="advanced">Advanced</option>
                      <option value="enterprise">Enterprise</option>
                    </select>
                  </div>
                </div>

                {/* Feature Toggles */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.features.allowLifetimeQR}
                      onChange={(e) => setFormData({
                        ...formData, 
                        features: {...formData.features, allowLifetimeQR: e.target.checked}
                      })}
                      className="mr-2"
                    />
                    <span className="text-sm">Allow Lifetime QR</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.features.allowDynamicQR}
                      onChange={(e) => setFormData({
                        ...formData, 
                        features: {...formData.features, allowDynamicQR: e.target.checked}
                      })}
                      className="mr-2"
                    />
                    <span className="text-sm">Allow Dynamic QR</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.features.customBranding}
                      onChange={(e) => setFormData({
                        ...formData, 
                        features: {...formData.features, customBranding: e.target.checked}
                      })}
                      className="mr-2"
                    />
                    <span className="text-sm">Custom Branding</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
                      className="mr-2"
                    />
                    <span className="text-sm">Active</span>
                  </label>
                </div>
              </div>

              {/* Overage Costs */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-4">Overage Costs ($)</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Additional QR Code</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.costs.additionalQRCode}
                      onChange={(e) => setFormData({
                        ...formData, 
                        costs: {...formData.costs, additionalQRCode: parseFloat(e.target.value) || 0}
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Additional Scan</label>
                    <input
                      type="number"
                      min="0"
                      step="0.001"
                      value={formData.costs.additionalScan}
                      onChange={(e) => setFormData({
                        ...formData, 
                        costs: {...formData.costs, additionalScan: parseFloat(e.target.value) || 0}
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Extend Expiration</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.costs.extendExpiration}
                      onChange={(e) => setFormData({
                        ...formData, 
                        costs: {...formData.costs, extendExpiration: parseFloat(e.target.value) || 0}
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Lifetime QR Upgrade</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.costs.lifetimeQRUpgrade}
                      onChange={(e) => setFormData({
                        ...formData, 
                        costs: {...formData.costs, lifetimeQRUpgrade: parseFloat(e.target.value) || 0}
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end mt-8 space-x-3">
              <button
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTier}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                {editingTier ? 'Update Tier' : 'Create Tier'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PricingManagement;
