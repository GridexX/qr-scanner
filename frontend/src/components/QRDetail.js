import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../services/api';
import { useCallback } from 'react';

const QRDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [qrImageUrl, setQrImageUrl] = useState('');

  const fetchQRAnalytics = useCallback(async () => {
    try {
      const response = await api.get(`/api/analytics/qr/${id}`);
      setAnalytics(response.data);

      // Set QR image URL
      const baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:8080';
      setQrImageUrl(`${baseUrl}/data/qr_images/${response.data.qr_code.code}.png`);
    } catch (error) {
      console.error('Error fetching QR analytics:', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchQRAnalytics();
  }, [fetchQRAnalytics]);

  const downloadQRCode = () => {
    const link = document.createElement('a');
    link.href = qrImageUrl;
    link.download = `${analytics.qr_code.title}-qr-code.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this QR code? This action cannot be undone.')) {
      try {
        await api.delete(`/api/qr/${id}`);
        navigate('/qr-codes');
      } catch (error) {
        console.error('Error deleting QR code:', error);
        alert('Failed to delete QR code');
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900">QR Code not found</h3>
        <Link to="/qr-codes" className="text-blue-600 hover:text-blue-500">
          Back to QR Codes
        </Link>
      </div>
    );
  }

  const { qr_code, total_scans, recent_scans, time_series } = analytics;
  const baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:8080';
  const redirectUrl = `${baseUrl}/r/${qr_code.code}`;

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{qr_code.title}</h1>
            <p className="mt-2 text-gray-600">QR Code Analytics and Details</p>
          </div>
          <div className="mt-4 sm:mt-0 flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
            <Link
              to="/qr-codes"
              className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              ← Back to QR Codes
            </Link>
            <button
              onClick={handleDelete}
              className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              Delete QR Code
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* QR Code Display */}
        <div className="lg:col-span-1">
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">QR Code</h3>
            <div className="text-center">
              <img
                src={qrImageUrl}
                alt={qr_code.title}
                className="mx-auto mb-4 max-w-full h-auto"
                style={{ maxWidth: '256px' }}
              />
              <div className="space-y-2">
                <button
                  onClick={downloadQRCode}
                  className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                >
                  Download QR Code
                </button>
                <button
                  onClick={() => copyToClipboard(redirectUrl)}
                  className="w-full bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors"
                >
                  Copy Redirect URL
                </button>
              </div>
            </div>
          </div>

          {/* QR Details */}
          <div className="bg-white shadow rounded-lg p-6 mt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Details</h3>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm font-medium text-gray-500">Target URL</dt>
                <dd className="text-sm text-gray-900 break-all">
                  <a
                    href={qr_code.target_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-500"
                  >
                    {qr_code.target_url}
                  </a>
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Redirect URL</dt>
                <dd className="text-sm text-gray-900 break-all">
                  <span className="font-mono">{redirectUrl}</span>
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Created</dt>
                <dd className="text-sm text-gray-900">
                  {new Date(qr_code.created_at).toLocaleDateString()}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Size</dt>
                <dd className="text-sm text-gray-900">{qr_code.size}x{qr_code.size} pixels</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Colors</dt>
                <dd className="text-sm text-gray-900 flex items-center space-x-2">
                  <span
                    className="inline-block w-4 h-4 rounded border"
                    style={{ backgroundColor: qr_code.foreground_color }}
                  ></span>
                  <span>on</span>
                  <span
                    className="inline-block w-4 h-4 rounded border"
                    style={{ backgroundColor: qr_code.background_color }}
                  ></span>
                </dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Analytics */}
        <div className="lg:col-span-2 space-y-6">
          {/* Stats */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Statistics</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-blue-600">{total_scans}</div>
                <div className="text-sm text-blue-600">Total Scans</div>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-green-600">
                  {recent_scans.filter(scan => 
                    new Date(scan.scanned_at).toDateString() === new Date().toDateString()
                  ).length}
                </div>
                <div className="text-sm text-green-600">Scans Today</div>
              </div>
            </div>
          </div>

          {/* Time Series Chart */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Scan Trend (Last 30 days)</h3>
            {time_series && time_series.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={time_series}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => new Date(value).toLocaleDateString()}
                    />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip
                      labelFormatter={(value) => new Date(value).toLocaleDateString()}
                      formatter={(value) => [value, 'Scans']}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="scans" 
                      stroke="#3B82F6" 
                      strokeWidth={2}
                      dot={{ fill: '#3B82F6', strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-500">
                No scan data available
              </div>
            )}
          </div>

          {/* Recent Scans */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Scans</h3>
            {recent_scans && recent_scans.length > 0 ? (
              <div className="overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Location
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Device
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Browser
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {recent_scans.map((scan, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(scan.scanned_at).toLocaleDateString()} {new Date(scan.scanned_at).toLocaleTimeString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {scan.city && scan.country ? `${scan.city}, ${scan.country}` : 'Unknown'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {scan.device_type || 'Unknown'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {scan.browser || 'Unknown'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No scans recorded yet
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default QRDetail;
