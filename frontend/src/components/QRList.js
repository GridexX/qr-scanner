import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import api from '../services/api';

const QRList = () => {
  const [qrCodes, setQrCodes] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchQRCodesCallback = useCallback(async () => {
    try {
      const response = await api.get('/api/qr');
      const qrCodesWithAnalytics = await Promise.all(
        response.data.map(async (qr) => {
          try {
            const analyticsResponse = await api.get(`/api/analytics/qr/${qr.id}`);
            const weeklyData = generateWeeklyData(analyticsResponse.data.time_series || []);
            const weeklyGrowth = calculateWeeklyGrowth(weeklyData);
            return {
              ...qr,
              weeklyData,
              weeklyGrowth
            };
          } catch (error) {
            console.error(`Error fetching analytics for QR ${qr.id}:`, error);
            return {
              ...qr,
              weeklyData: generateEmptyWeeklyData(),
              weeklyGrowth: 0
            };
          }
        })
      );
      setQrCodes(qrCodesWithAnalytics);
    } catch (error) {
      console.error('Error fetching QR codes:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQRCodesCallback();
  }, [fetchQRCodesCallback]);


  const generateWeeklyData = (timeSeriesData) => {
    const today = new Date();
    const weekData = [];
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const existingData = timeSeriesData.find(d => d.date === dateStr);
      weekData.push({
        date: dateStr,
        scans: existingData ? existingData.scans : 0
      });
    }
    
    return weekData;
  };

  const generateEmptyWeeklyData = () => {
    const today = new Date();
    const weekData = [];
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      weekData.push({
        date: date.toISOString().split('T')[0],
        scans: 0
      });
    }
    
    return weekData;
  };

  const calculateWeeklyGrowth = (weeklyData) => {
    if (weeklyData.length < 7) return 0;
    
    const thisWeekTotal = weeklyData.slice(-7).reduce((sum, day) => sum + day.scans, 0);
    const lastWeekTotal = weeklyData.slice(-14, -7).reduce((sum, day) => sum + day.scans, 0);
    
    if (lastWeekTotal === 0) return thisWeekTotal > 0 ? 100 : 0;
    
    return Math.round(((thisWeekTotal - lastWeekTotal) / lastWeekTotal) * 100);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-bold text-gray-900" style={{fontFamily: "Permanent Marker"}}>QR Codes</h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage your QR codes and view their performance
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <Link
            to="/qr-codes/new"
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Create QR Code
          </Link>
        </div>
      </div>

      {qrCodes.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">📱</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No QR codes yet</h3>
          <p className="text-gray-500 mb-4">Get started by creating your first QR code</p>
          <Link
            to="/qr-codes/new"
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
          >
            Create QR Code
          </Link>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden lg:block mt-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Title
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Target URL
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Scans
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Weekly Trend
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Created
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {qrCodes.map((qr) => (
                    <tr key={qr.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link
                          to={`/qr-codes/${qr.id}`}
                          className="text-sm font-medium text-gray-900 hover:text-blue-600"
                        >
                          {qr.title}
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        <a
                          href={qr.target_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:text-blue-900 truncate block max-w-xs"
                        >
                          {qr.target_url}
                        </a>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            {qr.total_scans || 0} scans
                          </span>
                          <span className={`text-xs ${qr.weeklyGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {qr.weeklyGrowth >= 0 ? '+' : ''}{qr.weeklyGrowth}%
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="w-24 h-8">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={qr.weeklyData}>
                              <Line 
                                type="monotone" 
                                dataKey="scans" 
                                stroke="var(--color-blue)" 
                                strokeWidth={2}
                                dot={false}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(qr.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Card View */}
          <div className="lg:hidden mt-6 space-y-4">
            {qrCodes.map((qr) => (
              <div key={qr.id} className="bg-white shadow rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <Link
                      to={`/qr-codes/${qr.id}`}
                      className="text-lg font-medium text-gray-900 hover:text-blue-600 block truncate"
                    >
                      {qr.title}
                    </Link>
                    <p className="text-sm text-gray-500 truncate mt-1">
                      {qr.target_url}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Created {new Date(qr.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="ml-4 flex-shrink-0">
                    <div className="w-16 h-8">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={qr.weeklyData}>
                          <Line 
                            type="monotone" 
                            dataKey="scans" 
                            stroke="var(--color-blue)" 
                            strokeWidth={2}
                            dot={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      {qr.total_scans || 0} scans
                    </span>
                    <span className={`text-xs font-medium ${qr.weeklyGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {qr.weeklyGrowth >= 0 ? '+' : ''}{qr.weeklyGrowth}% this week
                    </span>
                  </div>
                  <Link
                    to={`/qr-codes/${qr.id}`}
                    className="text-sm text-blue-600 hover:text-blue-900 font-medium"
                  >
                    View Details →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default QRList;
