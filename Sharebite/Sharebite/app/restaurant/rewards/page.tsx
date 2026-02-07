'use client';

import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { getCurrentUser, getUserById, getRewardRedemptions, addRewardRedemption } from '@/lib/storage';
import { RewardRedemption } from '@/lib/types';

export default function RestaurantRewardsPage() {
  const [user, setUser] = useState<any>(null);
  const [redemptions, setRedemptions] = useState<RewardRedemption[]>([]);
  const [showRedeemModal, setShowRedeemModal] = useState(false);
  const [redeemForm, setRedeemForm] = useState({
    reward_type: '',
    description: '',
    points_used: '',
  });

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadData = () => {
    const currentUser = getCurrentUser();
    if (currentUser) {
      const fullUser = getUserById(currentUser.id);
      setUser(fullUser);
      setRedemptions(getRewardRedemptions(currentUser.id));
    }
  };

  const handleRedeem = () => {
    if (!user || !redeemForm.reward_type || !redeemForm.description || !redeemForm.points_used) {
      alert('Please fill in all fields');
      return;
    }

    const points = parseInt(redeemForm.points_used);
    if (isNaN(points) || points <= 0) {
      alert('Please enter a valid number of points');
      return;
    }

    if (!user.reward_points || user.reward_points < points) {
      alert('Insufficient reward points');
      return;
    }

    const redemption = addRewardRedemption({
      restaurant_id: user.id,
      points_used: points,
      reward_type: redeemForm.reward_type,
      description: redeemForm.description,
    });

    if (redemption) {
      alert('Redemption request submitted successfully!');
      setRedeemForm({
        reward_type: '',
        description: '',
        points_used: '',
      });
      setShowRedeemModal(false);
      loadData();
    } else {
      alert('Failed to submit redemption request');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const rewardOptions = [
    { value: 'discount', label: 'Discount Voucher' },
    { value: 'certificate', label: 'Certificate of Recognition' },
    { value: 'merchandise', label: 'Merchandise' },
    { value: 'other', label: 'Other' },
  ];

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Rewards</h1>
            <p className="text-gray-600">Earn points for successful donations and redeem them for rewards</p>
          </div>
        </div>

        {/* Points Display */}
        <div className="bg-gradient-to-br from-yellow-50 to-orange-50 border border-yellow-200 rounded-2xl p-8 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-yellow-600 text-sm font-semibold mb-1">Total Reward Points</p>
              <p className="text-5xl font-bold text-yellow-900">{user?.reward_points || 0}</p>
              <p className="text-sm text-yellow-700 mt-2">Earn 10 points per kg of food donated (minimum 10 points per donation)</p>
            </div>
            <div className="w-20 h-20 bg-yellow-500 rounded-full flex items-center justify-center">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
              </svg>
            </div>
          </div>
        </div>

        {/* Redeem Button */}
        <div className="flex justify-end">
          <button
            onClick={() => setShowRedeemModal(true)}
            disabled={!user?.reward_points || user.reward_points <= 0}
            className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-3 rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:bg-gray-300 disabled:cursor-not-allowed disabled:transform-none"
          >
            Redeem Points
          </button>
        </div>

        {/* Redemption History */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Redemption History</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reward Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Points Used</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {redemptions.map((redemption) => (
                  <tr key={redemption.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(redemption.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {redemption.reward_type}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {redemption.description}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {redemption.points_used} points
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(redemption.status)}`}>
                        {redemption.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {redemptions.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No redemption history yet.</p>
            </div>
          )}
        </div>

        {/* Redeem Modal */}
        {showRedeemModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl border border-gray-200">
              <h2 className="text-2xl font-bold mb-4 text-gray-900">Redeem Reward Points</h2>
              <p className="text-sm text-gray-600 mb-6">Available Points: <strong>{user?.reward_points || 0}</strong></p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Reward Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={redeemForm.reward_type}
                    onChange={(e) => setRedeemForm({ ...redeemForm, reward_type: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all outline-none"
                    required
                  >
                    <option value="">Select reward type...</option>
                    {rewardOptions.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={redeemForm.description}
                    onChange={(e) => setRedeemForm({ ...redeemForm, description: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all outline-none"
                    rows={3}
                    placeholder="Describe the reward you'd like to redeem..."
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Points to Use <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={redeemForm.points_used}
                    onChange={(e) => setRedeemForm({ ...redeemForm, points_used: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all outline-none"
                    placeholder="Enter points to redeem"
                    min="1"
                    max={user?.reward_points || 0}
                    required
                  />
                </div>
              </div>

              <div className="flex space-x-3 pt-6">
                <button
                  onClick={handleRedeem}
                  disabled={!redeemForm.reward_type || !redeemForm.description || !redeemForm.points_used}
                  className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3 px-4 rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all font-semibold shadow-md hover:shadow-lg disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Submit Redemption
                </button>
                <button
                  onClick={() => {
                    setShowRedeemModal(false);
                    setRedeemForm({
                      reward_type: '',
                      description: '',
                      points_used: '',
                    });
                  }}
                  className="flex-1 bg-gray-100 text-gray-700 py-3 px-4 rounded-xl hover:bg-gray-200 transition-all font-semibold"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

