import React, { useState, useEffect } from 'react';
import { adminApi } from '../services/adminApi';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';

const CampaignManagement = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [pricingTiers, setPricingTiers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingCampaign, setEditingCampaign] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'percentage_discount',
    value: 0,
    targetTier: null,
    isActive: true,
    startDate: '',
    endDate: '',
    applicableTiers: [],
    targetAudience: 'all',
    conditions: {
      minSubscriptionMonths: 0,
      minActivityMonths: 0,
      minScansPerMonth: 0,
      requiresEmailVerification: false,
      maxUsesPerUser: 1,
      totalMaxUses: -1
    }
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [campaignsResponse, tiersResponse] = await Promise.all([
        adminApi.getCampaigns(),
        adminApi.getPricingTiers()
      ]);
      setCampaigns(campaignsResponse.data);
      setPricingTiers(tiersResponse.data);
    } catch (err) {
      setError('Failed to fetch campaign data');
      console.error('Error fetching campaign data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCampaign = () => {
    setEditingCampaign(null);
    setFormData({
      name: '',
      description: '',
      type: 'percentage_discount',
      value: 0,
      targetTier: null,
      isActive: true,
      startDate: '',
      endDate: '',
      applicableTiers: [],
      targetAudience: 'all',
      conditions: {
        minSubscriptionMonths: 0,
        minActivityMonths: 0,
        minScansPerMonth: 0,
        requiresEmailVerification: false,
        maxUsesPerUser: 1,
        totalMaxUses: -1
      }
    });
    setShowCreateForm(true);
  };

  const handleEditCampaign = (campaign) => {
    setEditingCampaign(campaign);
    setFormData(campaign);
    setShowCreateForm(true);
  };

  const handleSaveCampaign = async () => {
    try {
      const campaignData = {
        ...formData,
        updatedAt: new Date().toISOString(),
        currentUses: editingCampaign ? editingCampaign.currentUses : 0
      };

      if (editingCampaign) {
        await adminApi.updateCampaign(editingCampaign.id, campaignData);
      } else {
        await adminApi.createCampaign({
          ...campaignData,
          id: Date.now(), // Mock ID generation
          createdAt: new Date().toISOString(),
          createdBy: 1 // Mock admin user ID
        });
      }
      
      await fetchData();
      setShowCreateForm(false);
      setEditingCampaign(null);
    } catch (err) {
      setError('Failed to save campaign');
      console.error('Error saving campaign:', err);
    }
  };

  const handleDeleteCampaign = async (campaignId) => {
    if (window.confirm('Are you sure you want to delete this campaign?')) {
      try {
        await adminApi.deleteCampaign(campaignId);
        await fetchData();
      } catch (err) {
        setError('Failed to delete campaign');
        console.error('Error deleting campaign:', err);
      }
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getCampaignStatus = (campaign) => {
    const now = new Date();
    const startDate = new Date(campaign.startDate);
    const endDate = new Date(campaign.endDate);

    if (!campaign.isActive) return { status: 'inactive', color: 'text-gray-600', bg: 'bg-gray-100' };
    if (now < startDate) return { status: 'scheduled', color: 'text-blue-600', bg: 'bg-blue-100' };
    if (now > endDate) return { status: 'expired', color: 'text-red-600', bg: 'bg-red-100' };
    return { status: 'active', color: 'text-green-600', bg: 'bg-green-100' };
  };

  const getCampaignTypeDisplay = (type) => {
    const types = {
      'percentage_discount': 'Percentage Discount',
      'fixed_discount': 'Fixed Amount Discount',
      'tier_upgrade': 'Tier Upgrade',
      'loyalty_discount': 'Loyalty Discount',
      'free_trial': 'Free Trial Extension'
    };
    return types[type] || type;
  };

  const getTierName = (tierId) => {
    const tier = pricingTiers.find(t => t.id === tierId);
    return tier ? tier.name : 'Unknown';
  };

  // Prepare chart data
  const campaignUsageData = campaigns.map(campaign => ({
    name: campaign.name,
    uses: campaign.currentUses,
    maxUses: campaign.conditions.totalMaxUses === -1 ? campaign.currentUses + 100 : campaign.conditions.totalMaxUses
  }));

  const campaignTypeData = campaigns.reduce((acc, campaign) => {
    const type = getCampaignTypeDisplay(campaign.type);
    const existing = acc.find(item => item.name === type);
    if (existing) {
      existing.value += 1;
    } else {
      acc.push({ name: type, value: 1 });
    }
    return acc;
  }, []);

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

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
          <h1 className="text-3xl font-bold text-gray-900">Campaign Management</h1>
          <p className="text-gray-600 mt-1">Create and manage promotional campaigns</p>
        </div>
        <button
          onClick={handleCreateCampaign}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Create New Campaign
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Campaign Usage</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={campaignUsageData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="uses" fill="#3B82F6" name="Current Uses" />
                <Bar dataKey="maxUses" fill="#E5E7EB" name="Max Uses" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Campaign Types</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={campaignTypeData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {campaignTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Campaigns Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Active Campaigns</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Campaign
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type & Value
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Duration
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Usage
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {campaigns.map((campaign) => {
                const status = getCampaignStatus(campaign);
                const usagePercentage = campaign.conditions.totalMaxUses > 0 
                  ? (campaign.currentUses / campaign.conditions.totalMaxUses) * 100 
                  : 0;

                return (
                  <tr key={campaign.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{campaign.name}</div>
                        <div className="text-sm text-gray-500">{campaign.description}</div>
                        <div className="text-xs text-gray-400 mt-1">
                          Target: {campaign.targetAudience.replace('_', ' ')}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {getCampaignTypeDisplay(campaign.type)}
                      </div>
                      <div className="text-sm text-gray-500">
                        {campaign.type === 'percentage_discount' && `${campaign.value}% off`}
                        {campaign.type === 'fixed_discount' && `$${campaign.value} off`}
                        {campaign.type === 'tier_upgrade' && `Upgrade to ${getTierName(campaign.targetTier)}`}
                        {campaign.type === 'loyalty_discount' && `${campaign.value}% loyalty discount`}
                      </div>
                      {campaign.applicableTiers.length > 0 && (
                        <div className="text-xs text-gray-400">
                          Applies to: {campaign.applicableTiers.map(getTierName).join(', ')}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${status.bg} ${status.color}`}>
                        {status.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>{formatDate(campaign.startDate)}</div>
                      <div className="text-gray-500">to {formatDate(campaign.endDate)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {campaign.currentUses} / {campaign.conditions.totalMaxUses === -1 ? '∞' : campaign.conditions.totalMaxUses}
                      </div>
                      {campaign.conditions.totalMaxUses > 0 && (
                        <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                          <div 
                            className={`h-2 rounded-full ${
                              usagePercentage > 90 ? 'bg-red-500' : usagePercentage > 70 ? 'bg-yellow-500' : 'bg-green-500'
                            }`}
                            style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                          ></div>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button
                        onClick={() => handleEditCampaign(campaign)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteCampaign(campaign.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create/Edit Form Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white max-h-screen overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-gray-900">
                {editingCampaign ? 'Edit Campaign' : 'Create New Campaign'}
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Campaign Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Campaign Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({...formData, type: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="percentage_discount">Percentage Discount</option>
                    <option value="fixed_discount">Fixed Amount Discount</option>
                    <option value="tier_upgrade">Tier Upgrade</option>
                    <option value="loyalty_discount">Loyalty Discount</option>
                    <option value="free_trial">Free Trial Extension</option>
                  </select>
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

              {/* Campaign Value */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(formData.type === 'percentage_discount' || formData.type === 'fixed_discount' || formData.type === 'loyalty_discount') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {formData.type === 'percentage_discount' || formData.type === 'loyalty_discount' ? 'Discount Percentage' : 'Discount Amount ($)'}
                    </label>
                    <input
                      type="number"
                      min="0"
                      max={formData.type === 'percentage_discount' || formData.type === 'loyalty_discount' ? "100" : undefined}
                      step={formData.type === 'fixed_discount' ? "0.01" : "1"}
                      value={formData.value}
                      onChange={(e) => setFormData({...formData, value: parseFloat(e.target.value) || 0})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}

                {formData.type === 'tier_upgrade' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Target Tier</label>
                    <select
                      value={formData.targetTier || ''}
                      onChange={(e) => setFormData({...formData, targetTier: parseInt(e.target.value) || null})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select a tier</option>
                      {pricingTiers.map(tier => (
                        <option key={tier.id} value={tier.id}>{tier.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Target Audience</label>
                  <select
                    value={formData.targetAudience}
                    onChange={(e) => setFormData({...formData, targetAudience: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Users</option>
                    <option value="new_users">New Users</option>
                    <option value="loyal_users">Loyal Users</option>
                    <option value="inactive_users">Inactive Users</option>
                    <option value="students">Students</option>
                  </select>
                </div>
              </div>

              {/* Date Range */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                  <input
                    type="datetime-local"
                    value={formData.startDate ? new Date(formData.startDate).toISOString().slice(0, 16) : ''}
                    onChange={(e) => setFormData({...formData, startDate: e.target.value ? new Date(e.target.value).toISOString() : ''})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                  <input
                    type="datetime-local"
                    value={formData.endDate ? new Date(formData.endDate).toISOString().slice(0, 16) : ''}
                    onChange={(e) => setFormData({...formData, endDate: e.target.value ? new Date(e.target.value).toISOString() : ''})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Applicable Tiers */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Applicable Pricing Tiers</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {pricingTiers.map(tier => (
                    <label key={tier.id} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.applicableTiers.includes(tier.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({
                              ...formData, 
                              applicableTiers: [...formData.applicableTiers, tier.id]
                            });
                          } else {
                            setFormData({
                              ...formData, 
                              applicableTiers: formData.applicableTiers.filter(id => id !== tier.id)
                            });
                          }
                        }}
                        className="mr-2"
                      />
                      <span className="text-sm">{tier.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Conditions */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-4">Campaign Conditions</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Min Subscription Months</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.conditions.minSubscriptionMonths}
                      onChange={(e) => setFormData({
                        ...formData, 
                        conditions: {...formData.conditions, minSubscriptionMonths: parseInt(e.target.value) || 0}
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Max Uses Per User</label>
                    <input
                      type="number"
                      min="-1"
                      value={formData.conditions.maxUsesPerUser}
                      onChange={(e) => setFormData({
                        ...formData, 
                        conditions: {...formData.conditions, maxUsesPerUser: parseInt(e.target.value) || 0}
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Total Max Uses (-1 for unlimited)</label>
                    <input
                      type="number"
                      min="-1"
                      value={formData.conditions.totalMaxUses}
                      onChange={(e) => setFormData({
                        ...formData, 
                        conditions: {...formData.conditions, totalMaxUses: parseInt(e.target.value) || 0}
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex items-center">
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
                onClick={handleSaveCampaign}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                {editingCampaign ? 'Update Campaign' : 'Create Campaign'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CampaignManagement;
