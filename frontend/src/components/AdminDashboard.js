import React, { useState, useEffect } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar
} from 'recharts';
import { adminApi } from '../services/adminApi';
import UserManagement from './UserManagement';
import PricingManagement from './PricingManagement';
import CampaignManagement from './CampaignManagement';

const AdminDashboard = () => {
  const [activeView, setActiveView] = useState('dashboard');
  const [users, setUsers] = useState([]);
  const [adminStats, setAdminStats] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userQRCodes, setUserQRCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      const [usersResponse, statsResponse] = await Promise.all([
        adminApi.getUsers(),
        adminApi.getAdminStats()
      ]);
      
      setUsers(usersResponse.data);
      setAdminStats(statsResponse.data);
    } catch (err) {
      setError('Failed to fetch admin data');
      console.error('Error fetching admin data:', err);
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
        // In a real app, you would set this token and redirect to the main app
        alert(`Impersonating user ${userId}. Token: ${response.data.token}`);
        // You could also call your auth context to switch users
        // auth.impersonate(response.data.token, response.data.user);
      }
    } catch (err) {
      console.error('Error impersonating user:', err);
      alert('Failed to impersonate user');
    }
  };

  const getActivityStatus = (user) => {
    const lastLogin = new Date(user.lastLoginAt);
    const daysSinceLogin = (new Date() - lastLogin) / (1000 * 60 * 60 * 24);
    
    if (daysSinceLogin > 30) return { status: 'inactive', color: 'text-red-600', text: 'Inactive' };
    if (daysSinceLogin > 7) return { status: 'warning', color: 'text-yellow-600', text: 'Low Activity' };
    return { status: 'active', color: 'text-green-600', text: 'Active' };
  };

  const getUsagePercentage = (current, max) => {
    return Math.round((current / max) * 100);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        {error}
      </div>
    );
  }

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  // Prepare data for charts
  const userActivityData = users.map(user => ({
    name: user.username,
    scansThisWeek: user.stats.scansThisWeek,
    scansLastWeek: user.stats.scansLastWeek
  }));

  const quotaUsageData = users.map(user => ({
    name: user.username,
    qrUsage: getUsagePercentage(user.quota.currentQRCodes, user.quota.maxQRCodes),
    scanUsage: getUsagePercentage(user.quota.currentMonthScans, user.quota.maxScansPerMonth)
  }));

  const userStatusData = [
    { name: 'Active', value: users.filter(u => u.isActive).length },
    { name: 'Inactive', value: users.filter(u => !u.isActive).length }
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <button
          onClick={fetchAdminData}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Refresh Data
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveView('dashboard')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeView === 'dashboard'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveView('users')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeView === 'users'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            User Management
          </button>
          <button
            onClick={() => setActiveView('pricing')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeView === 'pricing'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Pricing Management
          </button>
          <button
            onClick={() => setActiveView('campaigns')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeView === 'campaigns'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Campaign Management
          </button>
        </nav>
      </div>

      {/* Content Based on Active View */}
      {activeView === 'users' && <UserManagement />}
      {activeView === 'pricing' && <PricingManagement />}
      {activeView === 'campaigns' && <CampaignManagement />}
      
      {activeView === 'dashboard' && (
        <>
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

      {/* Global Stats Cards */}
      {adminStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <span className="text-2xl">👥</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-2xl font-bold text-gray-900">{adminStats.totalUsers}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <span className="text-2xl">📈</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active This Week</p>
                <p className="text-2xl font-bold text-gray-900">{adminStats.activeUsersThisWeek}</p>
                <p className="text-xs text-green-600">
                  {adminStats.activeUsersThisWeek > adminStats.activeUsersLastWeek ? '+' : ''}
                  {((adminStats.activeUsersThisWeek - adminStats.activeUsersLastWeek) / adminStats.activeUsersLastWeek * 100).toFixed(1)}%
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <span className="text-2xl">📱</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total QR Codes</p>
                <p className="text-2xl font-bold text-gray-900">{adminStats.totalQRCodes}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <span className="text-2xl">👁</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Usage Growth</p>
                <p className="text-2xl font-bold text-gray-900">{adminStats.usageGrowth}%</p>
                <p className="text-xs text-gray-500">vs last week</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Activity Chart */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Weekly Scan Activity</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={userActivityData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="scansThisWeek" fill="#3B82F6" name="This Week" />
                <Bar dataKey="scansLastWeek" fill="#94A3B8" name="Last Week" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* User Status Pie Chart */}
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
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">User Management</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  QR Quota
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Scan Quota
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Login
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => {
                const activity = getActivityStatus(user);
                const qrUsage = getUsagePercentage(user.quota.currentQRCodes, user.quota.maxQRCodes);
                const scanUsage = getUsagePercentage(user.quota.currentMonthScans, user.quota.maxScansPerMonth);

                return (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                            <span className="text-sm font-medium text-gray-700">
                              {user.username.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{user.username}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                          <div className="text-xs text-gray-400">
                            Joined {formatDate(user.createdAt)}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        activity.status === 'active' ? 'bg-green-100 text-green-800' :
                        activity.status === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {activity.text}
                      </span>
                      <div className="text-xs text-gray-500 mt-1">
                        {user.stats.totalScans} total scans
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {user.quota.currentQRCodes}/{user.quota.maxQRCodes}
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                        <div 
                          className={`h-2 rounded-full ${
                            qrUsage > 90 ? 'bg-red-500' : qrUsage > 70 ? 'bg-yellow-500' : 'bg-green-500'
                          }`}
                          style={{ width: `${qrUsage}%` }}
                        ></div>
                      </div>
                      <div className="text-xs text-gray-500">{qrUsage}% used</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {user.quota.currentMonthScans.toLocaleString()}/{user.quota.maxScansPerMonth.toLocaleString()}
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                        <div 
                          className={`h-2 rounded-full ${
                            scanUsage > 90 ? 'bg-red-500' : scanUsage > 70 ? 'bg-yellow-500' : 'bg-green-500'
                          }`}
                          style={{ width: `${scanUsage}%` }}
                        ></div>
                      </div>
                      <div className="text-xs text-gray-500">{scanUsage}% used</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>{formatRelativeTime(user.lastLoginAt)}</div>
                      <div className="text-xs text-gray-500">
                        {formatDate(user.lastLoginAt)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button
                        onClick={() => handleUserSelect(user)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        View Details
                      </button>
                      <button
                        onClick={() => handleImpersonate(user.id)}
                        className="text-purple-600 hover:text-purple-900"
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
        </>
      )}

      {/* User Detail Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
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
            
            <div className="space-y-4">
              {/* User Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 p-3 rounded-lg">
                  <div className="text-xs text-blue-600">Total QR Codes</div>
                  <div className="text-lg font-bold text-blue-900">{selectedUser.stats.totalQRCodes}</div>
                </div>
                <div className="bg-green-50 p-3 rounded-lg">
                  <div className="text-xs text-green-600">Total Scans</div>
                  <div className="text-lg font-bold text-green-900">{selectedUser.stats.totalScans.toLocaleString()}</div>
                </div>
                <div className="bg-purple-50 p-3 rounded-lg">
                  <div className="text-xs text-purple-600">Avg Scans/QR</div>
                  <div className="text-lg font-bold text-purple-900">{selectedUser.stats.avgScansPerQR}</div>
                </div>
                <div className="bg-yellow-50 p-3 rounded-lg">
                  <div className="text-xs text-yellow-600">Login Count</div>
                  <div className="text-lg font-bold text-yellow-900">{selectedUser.stats.loginCount}</div>
                </div>
              </div>

              {/* User QR Codes */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-2">QR Codes</h4>
                {userQRCodes.length > 0 ? (
                  <div className="max-h-64 overflow-y-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Scans</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Last Scanned</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {userQRCodes.map((qr) => (
                          <tr key={qr.id}>
                            <td className="px-3 py-2 text-sm text-gray-900">{qr.title}</td>
                            <td className="px-3 py-2 text-sm text-gray-900">{qr.totalScans}</td>
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
    </div>
  );
};

export default AdminDashboard;
