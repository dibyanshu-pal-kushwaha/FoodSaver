'use client';

import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { getCurrentUser, getAnalytics, getDonations } from '@/lib/storage';
import { Analytics } from '@/lib/types';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function NGOImpactPage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    const user = getCurrentUser();
    if (user) {
      const userAnalytics = getAnalytics(user.id);
      setAnalytics(userAnalytics);
      
      // Generate chart data for last 30 days
      const donations = getDonations(undefined, user.id);
      const last30Days = Array.from({ length: 30 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (29 - i));
        const dateStr = date.toISOString().split('T')[0];
        
        const completedOnDate = donations.filter(donation => {
          if (donation.status !== 'completed') return false;
          const donationDate = new Date(donation.updated_at).toISOString().split('T')[0];
          return donationDate === dateStr;
        });
        
        const meals = completedOnDate.reduce((sum, donation) => sum + (donation.food_item.quantity * 2), 0);
        const people = Math.floor(meals / 3);
        
        return {
          date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          donations: completedOnDate.length,
          meals,
          people,
        };
      });
      
      setChartData(last30Days);
    }
  }, []);

  if (!analytics) return <Layout><div>Loading...</div></Layout>;

  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">Impact Dashboard</h1>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Donations Received</h3>
            <p className="text-3xl font-bold text-blue-600">{analytics.donations_received || 0}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Meals Provided</h3>
            <p className="text-3xl font-bold text-green-600">{analytics.meals_provided || 0}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">People Served</h3>
            <p className="text-3xl font-bold text-purple-600">{analytics.people_served || 0}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Active Requests</h3>
            <p className="text-3xl font-bold text-orange-600">
              {getDonations(undefined, getCurrentUser()?.id || '').filter(d => d.status === 'accepted' || d.status === 'pending').length}
            </p>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Donations Received (Last 30 Days)</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="donations" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Meals & People Served (Last 30 Days)</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="meals" stroke="#10b981" strokeWidth={2} name="Meals" />
                <Line type="monotone" dataKey="people" stroke="#8b5cf6" strokeWidth={2} name="People" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Summary */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Last 30 Days Summary</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-500">Total Donations</p>
              <p className="text-2xl font-bold text-blue-600">
                {chartData.reduce((sum, d) => sum + d.donations, 0)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Meals</p>
              <p className="text-2xl font-bold text-green-600">
                {chartData.reduce((sum, d) => sum + d.meals, 0)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Total People</p>
              <p className="text-2xl font-bold text-purple-600">
                {chartData.reduce((sum, d) => sum + d.people, 0)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Avg Meals/Day</p>
              <p className="text-2xl font-bold text-orange-600">
                {Math.round(chartData.reduce((sum, d) => sum + d.meals, 0) / 30)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}



