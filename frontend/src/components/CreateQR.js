import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const CreateQR = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: '',
    target_url: '',
    background_color: '#FFFFFF',
    foreground_color: '#000000',
    size: 256
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'size' ? parseInt(value) : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await api.post('/api/qr', formData);
      navigate('/qr-codes');
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to create QR code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900" style={{fontFamily: "Permanent Marker"}}>Create QR Code</h1>
        <p className="mt-2 text-gray-600">Generate a new QR code with tracking capabilities</p>
      </div>

      <div className="max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
            
            <div className="grid grid-cols-1 gap-6">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                  Title *
                </label>
                <input
                  type="text"
                  name="title"
                  id="title"
                  required
                  value={formData.title}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="e.g., Business Card, Website Link"
                />
              </div>

              <div>
                <label htmlFor="target_url" className="block text-sm font-medium text-gray-700">
                  Target URL *
                </label>
                <input
                  type="url"
                  name="target_url"
                  id="target_url"
                  required
                  value={formData.target_url}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="https://example.com"
                />
              </div>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Customization</h3>
            
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="background_color" className="block text-sm font-medium text-gray-700">
                  Background Color
                </label>
                <div className="mt-1 flex items-center space-x-3">
                  <input
                    type="color"
                    name="background_color"
                    id="background_color"
                    value={formData.background_color}
                    onChange={handleInputChange}
                    className="h-10 w-20 border-gray-300 rounded-md"
                  />
                  <input
                    type="text"
                    value={formData.background_color}
                    onChange={(e) => setFormData(prev => ({ ...prev, background_color: e.target.value }))}
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="foreground_color" className="block text-sm font-medium text-gray-700">
                  Foreground Color
                </label>
                <div className="mt-1 flex items-center space-x-3">
                  <input
                    type="color"
                    name="foreground_color"
                    id="foreground_color"
                    value={formData.foreground_color}
                    onChange={handleInputChange}
                    className="h-10 w-20 border-gray-300 rounded-md"
                  />
                  <input
                    type="text"
                    value={formData.foreground_color}
                    onChange={(e) => setFormData(prev => ({ ...prev, foreground_color: e.target.value }))}
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="size" className="block text-sm font-medium text-gray-700">
                  Size (pixels)
                </label>
                <select
                  name="size"
                  id="size"
                  value={formData.size}
                  onChange={(e) => setFormData(prev => ({ ...prev, size: parseInt(e.target.value) }))}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value={128}>128x128</option>
                  <option value={256}>256x256</option>
                  <option value={512}>512x512</option>
                  <option value={1024}>1024x1024</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => navigate('/qr-codes')}
              className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create QR Code'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateQR;
