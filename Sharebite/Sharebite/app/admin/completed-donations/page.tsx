'use client';

import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { getDonations, getCompletionReports, getUserById, updateNGORating, getUsers, getNGORating, getNGORatings } from '@/lib/storage';
import { Donation, CompletionReport } from '@/lib/types';

export default function AdminCompletedDonationsPage() {
  const [completedDonations, setCompletedDonations] = useState<Donation[]>([]);
  const [reports, setReports] = useState<CompletionReport[]>([]);
  const [selectedDonation, setSelectedDonation] = useState<Donation | null>(null);
  const [selectedReport, setSelectedReport] = useState<CompletionReport | null>(null);
  const [rating, setRating] = useState<number>(0);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadData = () => {
    const allDonations = getDonations();
    const completed = allDonations.filter(d => d.status === 'completed');
    setCompletedDonations(completed);
    
    const allReports = getCompletionReports();
    setReports(allReports);
  };

  const handleViewReport = (donation: Donation) => {
    setSelectedDonation(donation);
    const report = reports.find(r => r.donation_id === donation.id);
    setSelectedReport(report || null);
    if (donation.ngo_id && donation.id) {
      // Get individual rating for this specific donation
      const donationRatings = getNGORatings(donation.ngo_id, donation.id);
      if (donationRatings.length > 0) {
        setRating(donationRatings[0].rating);
      } else {
        setRating(0);
      }
    }
  };

  const handleSubmitRating = () => {
    if (!selectedDonation?.ngo_id || !selectedDonation?.id || rating < 1 || rating > 5) {
      alert('Please select a valid rating (1-5)');
      return;
    }
    updateNGORating(selectedDonation.ngo_id, selectedDonation.id, rating);
    alert('Rating updated successfully!');
    loadData();
    setSelectedDonation(null);
    setSelectedReport(null);
    setRating(0);
  };

  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">Completed Donations</h1>
        <p className="text-gray-600">Review completed donations and rate NGOs based on their work</p>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Food Item</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Restaurant</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">NGO</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Completion Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Report</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {completedDonations.map((donation) => {
                const restaurant = getUserById(donation.restaurant_id);
                const ngo = donation.ngo_id ? getUserById(donation.ngo_id) : null;
                const report = reports.find(r => r.donation_id === donation.id);
                const ngoRating = donation.ngo_id ? getNGORating(donation.ngo_id) : 0;
                
                return (
                  <tr key={donation.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{donation.food_item?.name || 'Unknown'}</div>
                      <div className="text-sm text-gray-500">{donation.food_item?.quantity}kg</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {restaurant?.name || 'Unknown'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{ngo?.name || 'Unknown'}</div>
                      {ngoRating > 0 && (
                        <div className="flex items-center mt-1">
                          <span className="text-xs text-gray-500 mr-1">Rating:</span>
                          <div className="flex">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <svg
                                key={star}
                                className={`w-4 h-4 ${star <= ngoRating ? 'text-yellow-400' : 'text-gray-300'}`}
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                            ))}
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(donation.updated_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {report ? (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                          Submitted
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleViewReport(donation)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        View & Rate
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {completedDonations.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-gray-500">No completed donations yet.</p>
          </div>
        )}

        {/* Report View & Rating Modal */}
        {selectedDonation && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-3xl shadow-2xl border border-gray-200 max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold mb-4 text-gray-900">Completion Report & Rating</h2>
              
              {selectedReport ? (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Donation Details</h3>
                    <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                      <p><strong>Food Item:</strong> {selectedDonation.food_item?.name}</p>
                      <p><strong>Quantity:</strong> {selectedDonation.food_item?.quantity}kg</p>
                      <p><strong>Restaurant:</strong> {getUserById(selectedDonation.restaurant_id)?.name}</p>
                      <p><strong>NGO:</strong> {selectedDonation.ngo_id ? getUserById(selectedDonation.ngo_id)?.name : 'Unknown'}</p>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Completion Report</h3>
                    <div className="space-y-4">
                      {selectedReport.photo_url && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Photo</label>
                          <img src={selectedReport.photo_url} alt="Completion" className="w-full h-64 object-cover rounded-xl" />
                        </div>
                      )}
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                        <p className="bg-gray-50 rounded-lg p-4">{selectedReport.description}</p>
                      </div>

                      {selectedReport.people_served && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">People Served</label>
                          <p className="bg-gray-50 rounded-lg p-4">{selectedReport.people_served}</p>
                        </div>
                      )}

                      {selectedReport.location && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Distribution Location</label>
                          <p className="bg-gray-50 rounded-lg p-4">{selectedReport.location}</p>
                        </div>
                      )}

                      {selectedReport.additional_notes && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Additional Notes</label>
                          <p className="bg-gray-50 rounded-lg p-4">{selectedReport.additional_notes}</p>
                        </div>
                      )}

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Completion Date</label>
                        <p className="bg-gray-50 rounded-lg p-4">{new Date(selectedReport.completion_date).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Rate This Donation</h3>
                    {selectedDonation?.ngo_id && (
                      <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                        <p className="text-sm text-gray-600">
                          <strong>Overall NGO Rating:</strong> {getNGORating(selectedDonation.ngo_id).toFixed(1)}/5.0 
                          <span className="text-xs text-gray-500 ml-2">
                            (Average of {getNGORatings(selectedDonation.ngo_id).length} rating{getNGORatings(selectedDonation.ngo_id).length !== 1 ? 's' : ''})
                          </span>
                        </p>
                      </div>
                    )}
                    <div className="flex items-center space-x-2 mb-4">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          onClick={() => setRating(star)}
                          className="focus:outline-none"
                        >
                          <svg
                            className={`w-8 h-8 ${star <= rating ? 'text-yellow-400' : 'text-gray-300'} hover:text-yellow-400 transition-colors`}
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        </button>
                      ))}
                      {rating > 0 && <span className="ml-2 text-sm text-gray-600">({rating}/5)</span>}
                    </div>
                    <button
                      onClick={handleSubmitRating}
                      disabled={rating < 1 || rating > 5}
                      className="bg-gradient-to-r from-green-600 to-emerald-600 text-white py-2 px-6 rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all font-semibold shadow-md hover:shadow-lg disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                      {rating > 0 && getNGORatings(selectedDonation?.ngo_id || '', selectedDonation?.id || '').length > 0 
                        ? 'Update Rating' 
                        : 'Submit Rating'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">Completion report not yet submitted by NGO.</p>
                </div>
              )}

              <div className="mt-6">
                <button
                  onClick={() => {
                    setSelectedDonation(null);
                    setSelectedReport(null);
                    setRating(0);
                  }}
                  className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-xl hover:bg-gray-200 transition-all font-semibold"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

