import React, { useState, useEffect, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Link } from 'react-router-dom';
import api from '../services/api';

const Dashboard = () => {
  const [overview, setOverview] = useState(null);
  const [rawTimeSeriesData, setRawTimeSeriesData] = useState([]); // Store raw data
  const [timeSeriesData, setTimeSeriesData] = useState([]);
  const [topQRCodes, setTopQRCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('7');
  const [viewType, setViewType] = useState('daily'); // daily or cumulative

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [overviewRes, timeSeriesRes, qrCodesRes] = await Promise.all([
        api.get('/api/analytics/overview'),
        api.get(`/api/analytics/timeseries?days=${timeRange}`),
        api.get('/api/qr')
      ]);
      
      setOverview(overviewRes.data);
      
      // Store raw data and process it
      const rawData = timeSeriesRes.data || [];
      setRawTimeSeriesData(rawData);
      const processedData = processTimeSeriesData(rawData, parseInt(timeRange));
      setTimeSeriesData(processedData);
      
      // Sort QR codes by total scans and calculate real growth
      const sortedQRCodes = await Promise.all(
        (qrCodesRes.data || [])
          .sort((a, b) => (b.total_scans || 0) - (a.total_scans || 0))
          .slice(0, 5)
          .map(async (qr) => {
            const growth = await calculateRealGrowth(qr.id);
            return {
              ...qr,
              growth
            };
          })
      );
      
      setTopQRCodes(sortedQRCodes);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setTimeSeriesData([]);
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  const processTimeSeriesData = (data, days) => {
    const today = new Date();
    const result = [];
    
    // Generate date range - keep your startDate logic
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - days + 1);
    
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      
      const dateStr = date.toISOString().split('T')[0];
      const existingData = data.find(d => d.date === dateStr);
      
      result.push({
        date: dateStr,
        scans: existingData ? existingData.scans : 0,
        formattedDate: date.toLocaleDateString()
      });
    }
    
    return result;
  };

  const applyViewType = (data) => {
    if (viewType === 'cumulative') {
      let cumulative = 0;
      return data.map(item => ({
        ...item,
        scans: cumulative += item.scans
      }));
    }
    return data;
  };

  const calculateRealGrowth = async (qrId) => {
    try {
      // Get analytics for this specific QR code
      const response = await api.get(`/api/analytics/qr/${qrId}`);
      const timeSeriesData = response.data.time_series || [];
      
      // Calculate scans for this week vs last week
      const today = new Date();
      const thisWeekStart = new Date(today);
      thisWeekStart.setDate(today.getDate() - 6); // Last 7 days including today
      
      const lastWeekStart = new Date(thisWeekStart);
      lastWeekStart.setDate(thisWeekStart.getDate() - 7);
      const lastWeekEnd = new Date(thisWeekStart);
      lastWeekEnd.setDate(thisWeekStart.getDate() - 1);
      
      // Count scans for this week
      const thisWeekScans = timeSeriesData
        .filter(d => {
          const date = new Date(d.date);
          return date >= thisWeekStart && date <= today;
        })
        .reduce((sum, d) => sum + d.scans, 0);
      
      // Count scans for last week
      const lastWeekScans = timeSeriesData
        .filter(d => {
          const date = new Date(d.date);
          return date >= lastWeekStart && date <= lastWeekEnd;
        })
        .reduce((sum, d) => sum + d.scans, 0);
      
      // Calculate growth percentage
      if (lastWeekScans === 0) {
        return thisWeekScans > 0 ? 100 : 0;
      }
      
      return Math.round(((thisWeekScans - lastWeekScans) / lastWeekScans) * 100);
    } catch (error) {
      console.error(`Error calculating growth for QR ${qrId}:`, error);
      return 0;
    }
  };

  useEffect(() => {
    fetchData();
  }, [timeRange, fetchData]);

  useEffect(() => {
    // Reprocess data when view type changes, using raw data
    if (rawTimeSeriesData.length > 0) {
      const processedData = processTimeSeriesData(rawTimeSeriesData, parseInt(timeRange));
      const finalData = applyViewType(processedData);
      setTimeSeriesData(finalData);
    }
  }, [viewType, rawTimeSeriesData, timeRange]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const stats = [
    {
      name: 'Total QR Codes',
      value: overview?.total_qr_codes || 0,
      icon: '📱',
      color: 'bg-blue-500'
    },
    {
      name: 'Total Scans',
      value: overview?.total_scans || 0,
      icon: '👁',
      color: 'bg-green-500'
    },
    {
      name: 'Scans Today',
      value: overview?.scans_today || 0,
      icon: '📅',
      color: 'bg-yellow-500'
    },
    {
      name: 'Scans This Week',
      value: overview?.scans_this_week || 0,
      icon: '📊',
      color: 'bg-purple-500'
    },
  ];

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900" style={{fontFamily: "Permanent Marker"}}>Dashboard</h1>
        <p className="mt-2 text-gray-600">Overview of your QR code performance</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {stats.map((stat) => (
          <div key={stat.name} className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className={`${stat.color} rounded-md p-3 text-white text-xl`}>
                    {stat.icon}
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      {stat.name}
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stat.value.toLocaleString()}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Top Scanned QR Codes */}
      <div className="bg-white shadow rounded-lg mb-8">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Top Scanned QR Codes</h3>
          {topQRCodes.length > 0 ? (
            <div className="space-y-3">
              {topQRCodes.map((qr, index) => (
                <div key={qr.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-blue-100 text-blue-800 text-sm font-medium">
                        {index + 1}
                      </span>
                    </div>
                    <div>
                      <Link 
                        to={`/qr-codes/${qr.id}`}
                        className="text-sm font-medium text-gray-900 hover:text-blue-600"
                      >
                        {qr.title}
                      </Link>
                      <p className="text-xs text-gray-500 truncate max-w-xs">
                        {qr.target_url}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900">
                      {(qr.total_scans || 0).toLocaleString()} scans
                    </div>
                    <div className={`text-xs ${qr.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {qr.growth >= 0 ? '+' : ''}{qr.growth}% this week
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-gray-500">
              No QR codes found
            </div>
          )}
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 space-y-2 sm:space-y-0">
            <h3 className="text-lg font-medium text-gray-900">Scan Analytics</h3>
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
              {/* View Type Buttons */}
              <div className="inline-flex rounded-md shadow-sm" role="group">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    setViewType('daily');
                  }}
                  className={`px-4 py-2 text-sm font-medium border border-gray-300 rounded-l-md focus:z-10 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    viewType === 'daily'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Daily
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    setViewType('cumulative');
                  }}
                  className={`px-4 py-2 text-sm font-medium border-t border-b border-r border-gray-300 rounded-r-md focus:z-10 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    viewType === 'cumulative'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Cumulative
                </button>
              </div>
              
              {/* Time Range Dropdown */}
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="block w-full sm:w-32 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              >
                <option value="7">Last 7 days</option>
                <option value="14">Last 14 days</option>
                <option value="30">Last 30 days</option>
                <option value="90">Last 90 days</option>
              </select>
            </div>
          </div>
          
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timeSeriesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    if (parseInt(timeRange) <= 14) {
                      return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
                    } else {
                      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    }
                  }}
                />
                <YAxis 
                  tick={{ fontSize: 12 }} 
                  allowDecimals={false}
                />
                <Tooltip
                  labelFormatter={(value) => new Date(value).toLocaleDateString()}
                  formatter={(value) => [value, viewType === 'cumulative' ? 'Total Scans' : 'Scans']}
                />
                <Line 
                  type="monotone" 
                  dataKey="scans" 
                  stroke="var(--color-blue)" 
                  strokeWidth={2}
                  dot={{ fill: 'var(--color-blue)', strokeWidth: 2, r: 2 }}
                  activeDot={{ r: 1 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
