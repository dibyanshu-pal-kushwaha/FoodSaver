'use client';

import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { getUsers, getDonations, getAnalytics, getFoodItems } from '@/lib/storage';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function AdminAnalyticsPage() {
  const [userDistribution, setUserDistribution] = useState<any[]>([]);
  const [donationTrends, setDonationTrends] = useState<any[]>([]);
  const [wasteMetrics, setWasteMetrics] = useState({
    totalWasteSaved: 0,
    totalCarbonReduced: 0,
    totalDonations: 0,
    completedDonations: 0,
  });

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = () => {
    const users = getUsers();
    const donations = getDonations();
    
    // User distribution
    const distribution = [
      { name: 'Restaurants', value: users.filter(u => u.role === 'restaurant').length },
      { name: 'NGOs', value: users.filter(u => u.role === 'ngo').length },
      { name: 'Admins', value: users.filter(u => u.role === 'admin').length },
    ];
    setUserDistribution(distribution);

    // Donation trends (last 30 days)
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - i));
      const dateStr = date.toISOString().split('T')[0];
      
      const donationsOnDate = donations.filter(d => {
        const donationDate = new Date(d.created_at).toISOString().split('T')[0];
        return donationDate === dateStr;
      });
      
      const completedOnDate = donations.filter(d => {
        if (d.status !== 'completed') return false;
        const donationDate = new Date(d.updated_at).toISOString().split('T')[0];
        return donationDate === dateStr;
      });
      
      return {
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        created: donationsOnDate.length,
        completed: completedOnDate.length,
      };
    });
    setDonationTrends(last30Days);

    // Waste metrics
    let totalWaste = 0;
    let totalCarbon = 0;
    users.forEach(user => {
      const analytics = getAnalytics(user.id);
      totalWaste += analytics.waste_saved;
      totalCarbon += analytics.carbon_footprint_reduced;
    });

    setWasteMetrics({
      totalWasteSaved: totalWaste,
      totalCarbonReduced: totalCarbon,
      totalDonations: donations.length,
      completedDonations: donations.filter(d => d.status === 'completed').length,
    });
  };

  const COLORS = ['#10b981', '#3b82f6', '#ef4444'];

  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">Platform Analytics</h1>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Total Waste Saved</h3>
            <p className="text-3xl font-bold text-green-600">{wasteMetrics.totalWasteSaved.toFixed(1)} kg</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Carbon Reduced</h3>
            <p className="text-3xl font-bold text-orange-600">{wasteMetrics.totalCarbonReduced.toFixed(1)} kg CO₂</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Total Donations</h3>
            <p className="text-3xl font-bold text-blue-600">{wasteMetrics.totalDonations}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Completed Donations</h3>
            <p className="text-3xl font-bold text-purple-600">{wasteMetrics.completedDonations}</p>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">User Distribution</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={userDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {userDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Donation Trends (Last 30 Days)</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={donationTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="created" fill="#3b82f6" name="Created" />
                <Bar dataKey="completed" fill="#10b981" name="Completed" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </Layout>
  );
}



