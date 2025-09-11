import React, { useState, useEffect } from 'react';
import { adminApi } from '../services/adminApi';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [pricingTiers, setPricingTiers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [userQRCodes, setUserQRCodes] = useState([]);
  const [editingSubscription, setEditingSubscription] = useState(null);
  const [showSubscriptionForm, setShowSubscriptionForm] = useState(false);

  const [subscriptionForm, setSubscriptionForm] = useState({
    userId: null,
    pricingTierId: null,
    customPricing: null,
    appliedCampaigns: [],
    isActive: true,
    startDate: '',
    endDate: null,
    billingCycle: 'monthly'
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [usersResponse, subscriptionsResponse, tiersResponse] = await Promise.all([
        adminApi.getUsers(),
        adminApi.getUserSubscriptions(),
        adminApi.getPricingTiers()
      ]);
      setUsers(usersResponse.data);
      setSubscriptions(subscriptionsResponse.data);
      setPricingTiers(tiersResponse.data);
    } catch (err) {
      setError('Failed to fetch user data');
      console.error('Error fetching user data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserQRCodes = async (userId) => {
    try {
      const response = await adminApi.getUserQRCodes(userId);
      setUserQRCodes(response.data);
    } catch (err) {
      console.error('Error fetching user QR codes:', err);
    }
  };

  const handleUserSelect = (user) => {
    setSelectedUser(user);
    fetchUserQRCodes(user.id);
  };

  const handleImpersonate = async (userId) => {
    try {
      const response = await adminApi.impersonateUser(userId);
      if (response.data.success) {
        alert(`Impersonating user ${userId}. Token: ${response.data.token}`);
      }
    } catch (err) {
      console.error('Error impersonating user:', err);
    }
  };

  const handleCreateSubscription = (userId) => {
    setEditingSubscription(null);
    setSubscriptionForm({
      userId: userId,
      pricingTierId: null,
      customPricing: null,
      appliedCampaigns: [],
      isActive: true,
      startDate: new Date().toISOString().split('T')[0],
      endDate: null,
      billingCycle: 'monthly'
    });
    setShowSubscriptionForm(true);
  };

  const handleEditSubscription = (subscription) => {
    setEditingSubscription(subscription);
    setSubscriptionForm({
      ...subscription,
      startDate: subscription.startDate.split('T')[0],
      endDate: subscription.endDate ? subscription.endDate.split('T')[0] : null
    });
    setShowSubscriptionForm(true);
  };

  const handleSaveSubscription = async () => {
    try {
      const subscriptionData = {
        ...subscriptionForm,
        startDate: new Date(subscriptionForm.startDate).toISOString(),
        endDate: subscriptionForm.endDate ? new Date(subscriptionForm.endDate).toISOString() : null,
        updatedAt: new Date().toISOString()
      };

      if (editingSubscription) {
        await adminApi.updateUserSubscription(editingSubscription.id, subscriptionData);
      } else {
        await adminApi.createUserSubscription({
          ...subscriptionData,
          id: Date.now(),
          createdAt: new Date().toISOString()
        });
      }
      
      await fetchData();
      setShowSubscriptionForm(false);
      setEditingSubscription(null);
    } catch (err) {
      setError('Failed to save subscription');
      console.error('Error saving subscription:', err);
    }
  };

  const getUserSubscription = (userId) => {
    return subscriptions.find(sub => sub.userId === userId && sub.isActive);
  };

  const getTierName = (tierId) => {
    const tier = pricingTiers.find(t => t.id === tierId);
    return tier ? tier.name : 'Unknown';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatRelativeTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays} days ago`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
    return `${Math.floor(diffInDays / 30)} months ago`;
  };

  // Prepare chart data
  const userStatusData = [
    { name: 'Active', value: users.filter(u => u.isActive).length },
    { name: 'Inactive', value: users.filter(u => !u.isActive).length }
  ];

  const subscriptionData = pricingTiers.map(tier => ({
    name: tier.name,
    users: subscriptions.filter(sub => sub.pricingTierId === tier.id && sub.isActive).length
  }));

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
          <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600 mt-1">Manage users and their subscriptions</p>
        </div>
        <button
          onClick={fetchData}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Refresh Data
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
          <h3 className="text-lg font-medium text-gray-900 mb-4">User Status Distribution</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={userStatusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {userStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Subscription Distribution</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={subscriptionData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="users" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Users Overview</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Subscription
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  QR Codes
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => {
                const subscription = getUserSubscription(user.id);
                return (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                          <span className="text-sm font-medium text-gray-700">
                            {user.username.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{user.username}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                          <div className="text-xs text-gray-400">
                            Joined {formatRelativeTime(user.createdAt)}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {subscription ? (
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {getTierName(subscription.pricingTierId)}
                          </div>
                          <div className="text-sm text-gray-500">
                            {subscription.billingCycle} billing
                          </div>
                          {subscription.customPricing && (
                            <div className="text-xs text-blue-600">
                              Custom: ${subscription.customPricing.monthlyPrice}/month
                            </div>
                          )}
                          {subscription.appliedCampaigns.length > 0 && (
                            <div className="text-xs text-green-600">
                              {subscription.appliedCampaigns.length} campaign(s) applied
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500">No subscription</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        user.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {user.qrCodes?.length || 0} codes
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button
                        onClick={() => handleUserSelect(user)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        View Details
                      </button>
                      {subscription ? (
                        <button
                          onClick={() => handleEditSubscription(subscription)}
                          className="text-green-600 hover:text-green-900"
                        >
                          Edit Subscription
                        </button>
                      ) : (
                        <button
                          onClick={() => handleCreateSubscription(user.id)}
                          className="text-purple-600 hover:text-purple-900"
                        >
                          Add Subscription
                        </button>
                      )}
                      <button
                        onClick={() => handleImpersonate(user.id)}
                        className="text-yellow-600 hover:text-yellow-900"
                      >
                        Impersonate
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Detail Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white max-h-screen overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-gray-900">
                User Details: {selectedUser.username}
              </h3>
              <button
                onClick={() => setSelectedUser(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <span className="text-2xl">&times;</span>
              </button>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <p className="text-sm text-gray-900">{selectedUser.email}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <p className={`text-sm ${selectedUser.isActive ? 'text-green-600' : 'text-red-600'}`}>
                    {selectedUser.isActive ? 'Active' : 'Inactive'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Join Date</label>
                  <p className="text-sm text-gray-900">{formatDate(selectedUser.createdAt)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Last Login</label>
                  <p className="text-sm text-gray-900">
                    {selectedUser.lastLoginAt ? formatDate(selectedUser.lastLoginAt) : 'Never'}
                  </p>
                </div>
              </div>

              <div>
                <h4 className="text-md font-medium text-gray-900 mb-3">QR Codes ({userQRCodes.length})</h4>
                {userQRCodes.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                            URL
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                            Scans
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                            Created
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                            Last Scan
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {userQRCodes.map((qr) => (
                          <tr key={qr.id}>
                            <td className="px-3 py-2 text-sm text-gray-900 max-w-xs truncate">
                              {qr.url}
                            </td>
                            <td className="px-3 py-2 text-sm text-gray-500">
                              {qr.scanCount}
                            </td>
                            <td className="px-3 py-2 text-sm text-gray-500">
                              {formatRelativeTime(qr.createdAt)}
                            </td>
                            <td className="px-3 py-2 text-sm text-gray-500">
                              {qr.lastScannedAt ? formatRelativeTime(qr.lastScannedAt) : 'Never'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">No QR codes found for this user.</p>
                )}
              </div>
            </div>

            <div className="flex justify-end mt-6 space-x-3">
              <button
                onClick={() => handleImpersonate(selectedUser.id)}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
              >
                Impersonate User
              </button>
              <button
                onClick={() => setSelectedUser(null)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Subscription Form Modal */}
      {showSubscriptionForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white max-h-screen overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-gray-900">
                {editingSubscription ? 'Edit Subscription' : 'Create New Subscription'}
              </h3>
              <button
                onClick={() => setShowSubscriptionForm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <span className="text-2xl">&times;</span>
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Pricing Tier</label>
                  <select
                    value={subscriptionForm.pricingTierId || ''}
                    onChange={(e) => setSubscriptionForm({
                      ...subscriptionForm, 
                      pricingTierId: parseInt(e.target.value) || null
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select a pricing tier</option>
                    {pricingTiers.map(tier => (
                      <option key={tier.id} value={tier.id}>
                        {tier.name} - ${tier.monthlyPrice}/month
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Billing Cycle</label>
                  <select
                    value={subscriptionForm.billingCycle}
                    onChange={(e) => setSubscriptionForm({...subscriptionForm, billingCycle: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                  <input
                    type="date"
                    value={subscriptionForm.startDate}
                    onChange={(e) => setSubscriptionForm({...subscriptionForm, startDate: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">End Date (Optional)</label>
                  <input
                    type="date"
                    value={subscriptionForm.endDate || ''}
                    onChange={(e) => setSubscriptionForm({...subscriptionForm, endDate: e.target.value || null})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={subscriptionForm.isActive}
                    onChange={(e) => setSubscriptionForm({...subscriptionForm, isActive: e.target.checked})}
                    className="mr-2"
                  />
                  <span className="text-sm">Active</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end mt-6 space-x-3">
              <button
                onClick={() => setShowSubscriptionForm(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSubscription}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                {editingSubscription ? 'Update Subscription' : 'Create Subscription'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
