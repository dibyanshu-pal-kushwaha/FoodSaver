'use client';

import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { getUsers, getFoodItems, getDonations, getAnalytics } from '@/lib/storage';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    restaurants: 0,
    ngos: 0,
    totalDonations: 0,
    activeDonations: 0,
    totalWasteReduced: 0,
  });

  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadStats = () => {
    const users = getUsers();
    const donations = getDonations();
    const allAnalytics = getAnalytics('');
    
    const totalWasteReduced = users.reduce((sum, user) => {
      const analytics = getAnalytics(user.id);
      return sum + analytics.waste_saved;
    }, 0);

    setStats({
      totalUsers: users.length,
      restaurants: users.filter(u => u.role === 'restaurant').length,
      ngos: users.filter(u => u.role === 'ngo').length,
      totalDonations: donations.length,
      activeDonations: donations.filter(d => d.status === 'pending' || d.status === 'accepted').length,
      totalWasteReduced,
    });
  };

  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">Platform Overview</h1>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Total Users</h3>
            <p className="text-3xl font-bold text-blue-600">{stats.totalUsers}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Restaurants</h3>
            <p className="text-3xl font-bold text-green-600">{stats.restaurants}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">NGOs</h3>
            <p className="text-3xl font-bold text-purple-600">{stats.ngos}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Total Donations</h3>
            <p className="text-3xl font-bold text-orange-600">{stats.totalDonations}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Active Donations</h3>
            <p className="text-3xl font-bold text-yellow-600">{stats.activeDonations}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Total Waste Reduced</h3>
            <p className="text-3xl font-bold text-red-600">{stats.totalWasteReduced.toFixed(1)} kg</p>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Recent Donations</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Food Item</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Restaurant</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {getDonations()
                  .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                  .slice(0, 10)
                  .map((donation) => {
                    const restaurant = getUsers().find(u => u.id === donation.restaurant_id);
                    return (
                      <tr key={donation.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {donation.food_item.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {restaurant?.name || 'Unknown'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            donation.status === 'completed' ? 'bg-green-100 text-green-800' :
                            donation.status === 'accepted' ? 'bg-blue-100 text-blue-800' :
                            donation.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {donation.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(donation.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
}



