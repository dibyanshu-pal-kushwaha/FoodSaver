'use client';

import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { getCurrentUser, getDisposalRequests, getUserById, updateDisposalRequest } from '@/lib/storage';
import { DisposalRequest } from '@/lib/types';

export default function RestaurantDisposalPage() {
  const [disposalRequests, setDisposalRequests] = useState<DisposalRequest[]>([]);

  useEffect(() => {
    loadDisposalRequests();
    const interval = setInterval(loadDisposalRequests, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadDisposalRequests = () => {
    const user = getCurrentUser();
    if (user) {
      setDisposalRequests(getDisposalRequests(user.id));
    }
  };

  const handleRejectRequest = (requestId: string) => {
    if (confirm('Reject this disposal request?')) {
      updateDisposalRequest(requestId, { status: 'rejected' });
      loadDisposalRequests();
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

  const pendingRequests = disposalRequests.filter(r => r.status === 'pending');
  const acceptedRequests = disposalRequests.filter(r => r.status === 'accepted');
  const completedRequests = disposalRequests.filter(r => r.status === 'completed');
  const rejectedRequests = disposalRequests.filter(r => r.status === 'rejected');

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Disposal Requests</h1>
          <p className="text-gray-600">Track and manage disposal requests for expired food items</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-gradient-to-br from-yellow-50 to-amber-50 border border-yellow-200 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-600 text-sm font-semibold mb-1">Pending</p>
                <p className="text-3xl font-bold text-yellow-900">{pendingRequests.length}</p>
              </div>
              <div className="w-12 h-12 bg-yellow-500 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-600 text-sm font-semibold mb-1">Accepted</p>
                <p className="text-3xl font-bold text-blue-900">{acceptedRequests.length}</p>
              </div>
              <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-600 text-sm font-semibold mb-1">Completed</p>
                <p className="text-3xl font-bold text-green-900">{completedRequests.length}</p>
              </div>
              <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-red-50 to-pink-50 border border-red-200 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-600 text-sm font-semibold mb-1">Rejected</p>
                <p className="text-3xl font-bold text-red-900">{rejectedRequests.length}</p>
              </div>
              <div className="w-12 h-12 bg-red-500 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Disposal Requests Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {disposalRequests.map((request) => {
            const ngo = request.ngo_id ? getUserById(request.ngo_id) : null;
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
                  {ngo && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-3">
                      <div className="flex items-center mb-1">
                        <svg className="w-4 h-4 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        <span className="text-green-700 font-semibold">Assigned NGO</span>
                      </div>
                      <p className="text-green-800 font-medium">{ngo.name}</p>
                      {ngo.location && <p className="text-xs text-green-600 mt-1">📍 {ngo.location}</p>}
                      {ngo.phone && <p className="text-xs text-green-600">📞 {ngo.phone}</p>}
                    </div>
                  )}
                  {request.pickup_date && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-2">
                      <p className="text-blue-800 font-semibold text-xs mb-1">Pickup Information</p>
                      <p className="text-blue-700 text-xs">📅 {new Date(request.pickup_date).toLocaleDateString()}</p>
                      {request.pickup_time && <p className="text-blue-700 text-xs">🕐 {request.pickup_time}</p>}
                      {request.pickup_location && <p className="text-blue-700 text-xs">📍 {request.pickup_location}</p>}
                      {request.pickup_notes && <p className="text-blue-700 text-xs mt-1">📝 {request.pickup_notes}</p>}
                    </div>
                  )}
                </div>
                {request.status === 'pending' && (
                  <button
                    onClick={() => handleRejectRequest(request.id)}
                    className="w-full mt-4 bg-red-100 text-red-700 py-2.5 px-4 rounded-xl hover:bg-red-200 transition-all font-semibold text-sm shadow-md hover:shadow-lg"
                  >
                    Reject Request
                  </button>
                )}
                {request.status === 'accepted' && (
                  <div className="w-full mt-4 bg-blue-50 text-blue-700 py-2.5 px-4 rounded-xl text-center text-sm font-semibold">
                    Awaiting NGO Pickup
                  </div>
                )}
                {request.status === 'completed' && (
                  <div className="w-full mt-4 bg-green-50 text-green-700 py-2.5 px-4 rounded-xl text-center text-sm font-semibold">
                    ✓ Disposal Completed
                  </div>
                )}
                <div className="text-xs text-gray-400 mt-3 text-center">
                  Created: {new Date(request.created_at).toLocaleDateString()}
                </div>
              </div>
            );
          })}
        </div>

        {disposalRequests.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <svg className="mx-auto h-16 w-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            <p className="text-gray-500 text-lg font-medium">No disposal requests yet</p>
            <p className="text-gray-400 text-sm mt-1">Create disposal requests from expired items in your inventory</p>
          </div>
        )}
      </div>
    </Layout>
  );
}

