'use client';

import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { getCurrentUser, getAvailableDisposalRequests, getDisposalRequests, updateDisposalRequest, getUserById } from '@/lib/storage';
import { DisposalRequest } from '@/lib/types';

export default function NGODisposalPage() {
  const [availableRequests, setAvailableRequests] = useState<DisposalRequest[]>([]);
  const [myRequests, setMyRequests] = useState<DisposalRequest[]>([]);
  const [activeTab, setActiveTab] = useState<'available' | 'my-requests'>('available');

  useEffect(() => {
    loadRequests();
    const interval = setInterval(loadRequests, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadRequests = () => {
    const user = getCurrentUser();
    if (user) {
      setAvailableRequests(getAvailableDisposalRequests());
      setMyRequests(getDisposalRequests(undefined, user.id));
    }
  };

  const handleRequestDisposal = (requestId: string) => {
    const user = getCurrentUser();
    if (!user) return;

    if (confirm('Accept this disposal request? The restaurant will be notified.')) {
      updateDisposalRequest(requestId, { status: 'accepted', ngo_id: user.id });
      loadRequests();
    }
  };

  const handleCompleteDisposal = (requestId: string) => {
    if (confirm('Mark this disposal as completed?')) {
      updateDisposalRequest(requestId, { status: 'completed' });
      loadRequests();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'accepted': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getDaysUntilExpiry = (expiryDate: string) => {
    const expiry = new Date(expiryDate);
    const now = new Date();
    const diff = expiry.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Disposal Requests</h1>
          <p className="text-gray-600">Accept and manage disposal requests for expired food items</p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow border border-gray-200">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('available')}
              className={`flex-1 px-6 py-4 text-sm font-semibold transition-all ${
                activeTab === 'available'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              Available Requests ({availableRequests.length})
            </button>
            <button
              onClick={() => setActiveTab('my-requests')}
              className={`flex-1 px-6 py-4 text-sm font-semibold transition-all ${
                activeTab === 'my-requests'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              My Requests ({myRequests.length})
            </button>
          </div>

          <div className="p-6">
            {activeTab === 'available' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {availableRequests.map((request) => {
                  const restaurant = getUserById(request.restaurant_id);
                  const days = getDaysUntilExpiry(request.food_item.expiry_date);
                  return (
                    <div key={request.id} className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-shadow p-6 border border-gray-100">
                      {request.food_item.photo_url && (
                        <div className="mb-4 -mx-6 -mt-6">
                          <img src={request.food_item.photo_url} alt={request.food_item.name} className="w-full h-48 object-cover rounded-t-2xl" />
                        </div>
                      )}
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-xl font-bold text-gray-900">{request.food_item.name}</h3>
                          <p className="text-sm text-gray-500">{request.food_item.category}</p>
                        </div>
                        <span className="px-3 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                          Expired
                        </span>
                      </div>
                      <div className="space-y-2 text-sm text-gray-600 mb-4">
                        <div className="flex items-center">
                          <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                          </svg>
                          <span><strong>Quantity:</strong> {request.food_item.quantity}kg</span>
                        </div>
                        <div className="flex items-center">
                          <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span><strong>Expired:</strong> {new Date(request.food_item.expiry_date).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center text-red-600 font-semibold">
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span><strong>Days Overdue:</strong> {Math.abs(days)}</span>
                        </div>
                        {restaurant && (
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-3">
                            <div className="flex items-center mb-1">
                              <svg className="w-4 h-4 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                              </svg>
                              <span className="text-blue-700 font-semibold">Restaurant</span>
                            </div>
                            <p className="text-blue-800 font-medium">{restaurant.name}</p>
                            {restaurant.location && <p className="text-xs text-blue-600 mt-1">📍 {restaurant.location}</p>}
                            {restaurant.phone && <p className="text-xs text-blue-600">📞 {restaurant.phone}</p>}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => handleRequestDisposal(request.id)}
                        className="w-full bg-gradient-to-r from-orange-600 to-red-600 text-white py-3 px-4 rounded-xl hover:from-orange-700 hover:to-red-700 transition-all font-semibold shadow-md hover:shadow-lg"
                      >
                        Accept Disposal Request
                      </button>
                      <div className="text-xs text-gray-400 mt-3 text-center">
                        Created: {new Date(request.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {myRequests.map((request) => {
                  const restaurant = getUserById(request.restaurant_id);
                  const days = getDaysUntilExpiry(request.food_item.expiry_date);
                  return (
                    <div key={request.id} className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-shadow p-6 border border-gray-100">
                      {request.food_item.photo_url && (
                        <div className="mb-4 -mx-6 -mt-6">
                          <img src={request.food_item.photo_url} alt={request.food_item.name} className="w-full h-48 object-cover rounded-t-2xl" />
                        </div>
                      )}
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-xl font-bold text-gray-900">{request.food_item.name}</h3>
                          <p className="text-sm text-gray-500">{request.food_item.category}</p>
                        </div>
                        <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(request.status)}`}>
                          {request.status}
                        </span>
                      </div>
                      <div className="space-y-2 text-sm text-gray-600 mb-4">
                        <div className="flex items-center">
                          <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                          </svg>
                          <span><strong>Quantity:</strong> {request.food_item.quantity}kg</span>
                        </div>
                        {restaurant && (
                          <>
                            <p><strong>Restaurant:</strong> {restaurant.name}</p>
                            {restaurant.location && (
                              <p><strong>Location:</strong> {restaurant.location}</p>
                            )}
                            {restaurant.phone && (
                              <p><strong>Contact:</strong> {restaurant.phone}</p>
                            )}
                          </>
                        )}
                        {request.pickup_date && (
                          <p><strong>Pickup Date:</strong> {new Date(request.pickup_date).toLocaleDateString()}</p>
                        )}
                      </div>
                      {request.status === 'accepted' && (
                        <button
                          onClick={() => handleCompleteDisposal(request.id)}
                          className="w-full mt-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white py-2.5 px-4 rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all font-semibold text-sm shadow-md hover:shadow-lg"
                        >
                          Mark as Completed
                        </button>
                      )}
                      <div className="text-xs text-gray-400 mt-3 text-center">
                        Requested: {new Date(request.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {activeTab === 'available' && availableRequests.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500">No disposal requests available at the moment.</p>
              </div>
            )}

            {activeTab === 'my-requests' && myRequests.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500">No disposal requests yet.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}

