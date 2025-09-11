import axios from 'axios';

const MOCK_API_BASE_URL = 'http://localhost:3001';

const mockApi = axios.create({
  baseURL: MOCK_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const adminApi = {
  // === User Management ===
  getUsers: () => mockApi.get('/users'),
  getAdminStats: () => mockApi.get('/adminStats'),
  getUserQRCodes: (userId) => mockApi.get(`/userQRCodes?userId=${userId}`),
  getUserDetails: (userId) => mockApi.get(`/users/${userId}`),
  impersonateUser: (userId) => {
    return Promise.resolve({ 
      success: true, 
      token: `mock-impersonation-token-${userId}`,
      user: { id: userId }
    });
  },

  // === Pricing Management ===
  getPricingTiers: () => mockApi.get('/pricingTiers'),
  getPricingTier: (id) => mockApi.get(`/pricingTiers/${id}`),
  createPricingTier: (data) => mockApi.post('/pricingTiers', data),
  updatePricingTier: (id, data) => mockApi.put(`/pricingTiers/${id}`, data),
  deletePricingTier: (id) => mockApi.delete(`/pricingTiers/${id}`),

  // === Campaign Management ===
  getCampaigns: () => mockApi.get('/campaigns'),
  getCampaign: (id) => mockApi.get(`/campaigns/${id}`),
  createCampaign: (data) => mockApi.post('/campaigns', data),
  updateCampaign: (id, data) => mockApi.put(`/campaigns/${id}`, data),
  deleteCampaign: (id) => mockApi.delete(`/campaigns/${id}`),

  // === User Subscription Management ===
  getUserSubscriptions: () => mockApi.get('/userSubscriptions'),
  getUserSubscription: (userId) => mockApi.get(`/userSubscriptions?userId=${userId}`),
  updateUserSubscription: (id, data) => mockApi.put(`/userSubscriptions/${id}`, data),
  createUserSubscription: (data) => mockApi.post('/userSubscriptions', data),

  // === QR Code Types ===
  getQRCodeTypes: () => mockApi.get('/qrCodeTypes'),

  // === Billing ===
  getBillingEvents: () => mockApi.get('/billingEvents'),
  getBillingEventsByUser: (userId) => mockApi.get(`/billingEvents?userId=${userId}`),

  // === Analytics ===
  getRevenueAnalytics: () => {
    return Promise.resolve({
      data: {
        monthlyRevenue: 127.45,
        yearlyRevenue: 1549.40,
        averageRevenuePerUser: 42.48,
        conversionRate: 23.5,
        churnRate: 4.2
      }
    });
  }
};

export default mockApi;
