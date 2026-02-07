'use client';

import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { getCurrentUser, getAvailableDonations, updateDonation, getUserById, getAnalytics, getDonations } from '@/lib/storage';
import { Donation } from '@/lib/types';

export default function NGODiscoverPage() {
  const [donations, setDonations] = useState<Donation[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [analytics, setAnalytics] = useState<any>(null);

  useEffect(() => {
    loadDonations();
    const user = getCurrentUser();
    if (user) {
      const userAnalytics = getAnalytics(user.id);
      const userDonations = getDonations(undefined, user.id);
      setAnalytics({
        ...userAnalytics,
        totalDonations: userDonations.length,
        completedDonations: userDonations.filter(d => d.status === 'completed').length,
        pendingDonations: userDonations.filter(d => d.status === 'pending' || d.status === 'accepted').length,
      });
    }
    const interval = setInterval(loadDonations, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadDonations = () => {
    setDonations(getAvailableDonations());
  };

  const handleRequestDonation = (donationId: string) => {
    const user = getCurrentUser();
    if (!user) return;

    if (confirm('Request this donation? The restaurant will be notified.')) {
      // For simplicity, directly accept. In a full implementation, this could create a request
      // that the restaurant needs to approve
      updateDonation(donationId, { status: 'accepted', ngo_id: user.id });
      loadDonations();
    }
  };

  const filteredDonations = donations.filter(donation => {
    const matchesSearch = donation.food_item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || donation.food_item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = Array.from(new Set(donations.map(d => d.food_item.category)));

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
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Discover Donations</h1>
          <p className="text-gray-600">Browse available food donations from restaurants</p>
        </div>

        {/* Stats Cards */}
        {analytics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-600 text-sm font-semibold mb-1">Donations Received</p>
                  <p className="text-3xl font-bold text-green-900">{analytics.donations_received || 0}</p>
                </div>
                <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-600 text-sm font-semibold mb-1">Meals Provided</p>
                  <p className="text-3xl font-bold text-blue-900">{analytics.meals_provided || 0}</p>
                </div>
                <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-600 text-sm font-semibold mb-1">People Served</p>
                  <p className="text-3xl font-bold text-purple-900">{analytics.people_served || 0}</p>
                </div>
                <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-amber-600 text-sm font-semibold mb-1">Available Now</p>
                  <p className="text-3xl font-bold text-amber-900">{donations.length}</p>
                </div>
                <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by food name..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">All Categories</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Donations Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDonations.map((donation) => {
            const restaurant = getUserById(donation.restaurant_id);
            const days = getDaysUntilExpiry(donation.food_item.expiry_date);
            return (
              <div key={donation.id} className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-shadow p-6 border border-gray-100">
                {donation.food_item.photo_url && (
                  <div className="mb-4 -mx-6 -mt-6">
                    <img src={donation.food_item.photo_url} alt={donation.food_item.name} className="w-full h-48 object-cover rounded-t-2xl" />
                  </div>
                )}
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{donation.food_item.name}</h3>
                    <p className="text-sm text-gray-500">{donation.food_item.category}</p>
                  </div>
                  <span className="px-3 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                    Available
                  </span>
                </div>
                <div className="space-y-2 text-sm text-gray-600 mb-4">
                  <div className="flex items-center">
                    <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                    <span><strong>Quantity:</strong> {donation.food_item.quantity}kg</span>
                  </div>
                  <div className="flex items-center">
                    <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span><strong>Expiry:</strong> {new Date(donation.food_item.expiry_date).toLocaleDateString()}</span>
                  </div>
                  <div className={`flex items-center ${days <= 3 ? 'text-red-600 font-semibold' : ''}`}>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span><strong>Days Left:</strong> {days}</span>
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
                  {(() => {
                    const currentUser = getCurrentUser();
                    const ngo = currentUser ? getUserById(currentUser.id) : null;
                    return ngo && ngo.rating ? (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-2">
                        <div className="flex items-center justify-between">
                          <span className="text-yellow-700 font-semibold text-sm">Your Rating</span>
                          <div className="flex items-center">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <svg
                                key={star}
                                className={`w-4 h-4 ${star <= ngo.rating! ? 'text-yellow-400' : 'text-gray-300'}`}
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                            ))}
                            <span className="text-xs text-gray-700 ml-2 font-medium">{ngo.rating.toFixed(1)}</span>
                          </div>
                        </div>
                      </div>
                    ) : null;
                  })()}
                  {donation.pickup_date && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-2">
                      <p className="text-amber-800 font-semibold text-xs mb-1">Pickup Information</p>
                      <p className="text-amber-700 text-xs">📅 {new Date(donation.pickup_date).toLocaleDateString()}</p>
                      {donation.pickup_time && <p className="text-amber-700 text-xs">🕐 {donation.pickup_time}</p>}
                      {donation.pickup_location && <p className="text-amber-700 text-xs">📍 {donation.pickup_location}</p>}
                      {donation.pickup_notes && <p className="text-amber-700 text-xs mt-1">📝 {donation.pickup_notes}</p>}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => handleRequestDonation(donation.id)}
                  className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3 px-4 rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all font-semibold shadow-md hover:shadow-lg"
                >
                  Request Donation
                </button>
              </div>
            );
          })}
        </div>

        {filteredDonations.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-gray-500">
              {donations.length === 0
                ? 'No donations available at the moment.'
                : 'No donations match your search criteria.'}
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
}

