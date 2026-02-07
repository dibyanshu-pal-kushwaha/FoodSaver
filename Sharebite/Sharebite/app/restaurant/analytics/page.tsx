'use client';

import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { getCurrentUser, getAnalytics, getFoodItems, getDonations } from '@/lib/storage';
import { Analytics } from '@/lib/types';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function RestaurantAnalyticsPage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    const user = getCurrentUser();
    if (user) {
      const userAnalytics = getAnalytics(user.id);
      setAnalytics(userAnalytics);
      
      // Generate chart data for last 30 days
      const items = getFoodItems(user.id);
      const donations = getDonations(user.id);
      const last30Days = Array.from({ length: 30 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (29 - i));
        const dateStr = date.toISOString().split('T')[0];
        
        const consumedOnDate = items.filter(item => {
          if (item.status !== 'consumed') return false;
          const itemDate = new Date(item.updated_at).toISOString().split('T')[0];
          return itemDate === dateStr;
        }).reduce((sum, item) => sum + item.quantity, 0);
        
        const donatedOnDate = donations.filter(donation => {
          if (donation.status !== 'completed') return false;
          const donationDate = new Date(donation.updated_at).toISOString().split('T')[0];
          return donationDate === dateStr;
        }).reduce((sum, donation) => sum + donation.food_item.quantity, 0);
        
        return {
          date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          waste_saved: consumedOnDate + donatedOnDate,
          consumed: consumedOnDate,
          donated: donatedOnDate,
        };
      });
      
      setChartData(last30Days);
    }
  }, []);

  if (!analytics) return <Layout><div>Loading...</div></Layout>;

  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Waste Saved</h3>
            <p className="text-3xl font-bold text-green-600">{analytics.waste_saved.toFixed(1)} kg</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Donations Made</h3>
            <p className="text-3xl font-bold text-blue-600">{analytics.donations_made}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Items Consumed</h3>
            <p className="text-3xl font-bold text-purple-600">{analytics.items_consumed}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Carbon Footprint Reduced</h3>
            <p className="text-3xl font-bold text-orange-600">{analytics.carbon_footprint_reduced.toFixed(1)} kg CO₂</p>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Waste Saved Trend (Last 30 Days)</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="waste_saved" stroke="#10b981" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Consumed vs Donated (Last 30 Days)</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="consumed" fill="#8b5cf6" />
                <Bar dataKey="donated" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Summary */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Last 30 Days Summary</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-500">Total Waste Saved</p>
              <p className="text-2xl font-bold text-green-600">
                {chartData.reduce((sum, d) => sum + d.waste_saved, 0).toFixed(1)} kg
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Items Consumed</p>
              <p className="text-2xl font-bold text-purple-600">
                {chartData.reduce((sum, d) => sum + d.consumed, 0).toFixed(1)} kg
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Items Donated</p>
              <p className="text-2xl font-bold text-blue-600">
                {chartData.reduce((sum, d) => sum + d.donated, 0).toFixed(1)} kg
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">CO₂ Reduced</p>
              <p className="text-2xl font-bold text-orange-600">
                {(chartData.reduce((sum, d) => sum + d.waste_saved, 0) * 2.5).toFixed(1)} kg
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}



