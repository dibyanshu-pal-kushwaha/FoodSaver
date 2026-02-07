'use client';

import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { getCurrentUser, getDonations, getUserById, updateDonation, addCompletionReport, getCompletionReportByDonationId, getNGORatings } from '@/lib/storage';
import { Donation } from '@/lib/types';

export default function NGORequestsPage() {
  const [donations, setDonations] = useState<Donation[]>([]);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [selectedDonation, setSelectedDonation] = useState<Donation | null>(null);
  const [completionForm, setCompletionForm] = useState({
    photo_url: '',
    description: '',
    people_served: '',
    location: '',
    additional_notes: '',
  });

  useEffect(() => {
    loadDonations();
    const interval = setInterval(loadDonations, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadDonations = () => {
    const user = getCurrentUser();
    if (user) {
      setDonations(getDonations(undefined, user.id));
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

  const handleCompleteDonation = (donation: Donation) => {
    setSelectedDonation(donation);
    setShowCompletionModal(true);
  };

  const handleSubmitCompletion = () => {
    if (!selectedDonation || !completionForm.photo_url || !completionForm.description) {
      alert('Please fill in all required fields (photo URL and description)');
      return;
    }

    const user = getCurrentUser();
    if (!user) return;

    // Add completion report
    addCompletionReport({
      donation_id: selectedDonation.id,
      ngo_id: user.id,
      restaurant_id: selectedDonation.restaurant_id,
      completion_date: new Date().toISOString(),
      photo_url: completionForm.photo_url,
      description: completionForm.description,
      people_served: completionForm.people_served ? parseInt(completionForm.people_served) : undefined,
      location: completionForm.location || undefined,
      additional_notes: completionForm.additional_notes || undefined,
    });

    // Update donation status only if it's not already completed
    if (selectedDonation.status !== 'completed') {
      updateDonation(selectedDonation.id, { status: 'completed' });
    }

    // Reset form and close modal
    setCompletionForm({
      photo_url: '',
      description: '',
      people_served: '',
      location: '',
      additional_notes: '',
    });
    setShowCompletionModal(false);
    setSelectedDonation(null);
    loadDonations();
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Convert to base64 for local storage (in production, upload to server)
      const reader = new FileReader();
      reader.onloadend = () => {
        setCompletionForm({ ...completionForm, photo_url: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDownloadCertificate = (donation: Donation, report: any, restaurant: any) => {
    const user = getCurrentUser();
    if (!user) return;

    // Get rating for this donation
    const ratings = getNGORatings(user.id, donation.id);
    const rating = ratings.length > 0 ? ratings[0].rating : 0;

    // Create certificate HTML
    const certificateHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Certificate of Donation Completion</title>
          <style>
            @page {
              size: A4 landscape;
              margin: 0;
            }
            body {
              margin: 0;
              padding: 0;
              font-family: 'Georgia', serif;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
            }
            .certificate {
              width: 11in;
              height: 8.5in;
              background: white;
              padding: 40px;
              box-shadow: 0 20px 60px rgba(0,0,0,0.3);
              position: relative;
              border: 15px solid #f4d03f;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
            }
            .certificate::before {
              content: '';
              position: absolute;
              top: 20px;
              left: 20px;
              right: 20px;
              bottom: 20px;
              border: 2px solid #667eea;
              pointer-events: none;
            }
            .header {
              text-align: center;
              margin-bottom: 20px;
            }
            .header h1 {
              font-size: 36px;
              color: #667eea;
              margin: 0;
              text-transform: uppercase;
              letter-spacing: 3px;
              font-weight: bold;
            }
            .header .subtitle {
              font-size: 14px;
              color: #764ba2;
              margin-top: 8px;
              font-style: italic;
            }
            .content {
              text-align: center;
              margin: 20px 0;
              flex: 1;
            }
            .content p {
              font-size: 18px;
              line-height: 1.5;
              color: #333;
              margin: 8px 0;
            }
            .name {
              font-size: 28px;
              font-weight: bold;
              color: #667eea;
              margin: 15px 0;
              text-decoration: underline;
              text-decoration-color: #f4d03f;
              text-decoration-thickness: 2px;
            }
            .details {
              margin: 20px 0;
              font-size: 14px;
              color: #555;
              line-height: 1.4;
            }
            .details p {
              margin: 5px 0;
            }
            .details strong {
              color: #667eea;
            }
            .footer {
              margin-top: 20px;
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
            }
            .signature {
              text-align: center;
              width: 250px;
            }
            .signature-line {
              border-top: 2px solid #333;
              margin: 40px 0 8px 0;
            }
            .signature p {
              margin: 0;
              font-size: 12px;
              color: #666;
            }
            .logo {
              text-align: center;
              margin-bottom: 15px;
            }
            .logo-text {
              font-size: 24px;
              font-weight: bold;
              color: #667eea;
              letter-spacing: 2px;
            }
            .rating {
              font-size: 20px;
              color: #f4d03f;
              margin: 15px 0;
            }
            .rating p {
              margin: 5px 0;
              font-size: 16px;
            }
            .rating-stars {
              font-size: 32px;
              letter-spacing: 8px;
            }
          </style>
        </head>
        <body>
          <div class="certificate">
            <div class="logo">
              <div class="logo-text">ShareBite</div>
            </div>
            <div class="header">
              <h1>Certificate of Excellence</h1>
              <div class="subtitle">In Recognition of Outstanding Contribution to Food Waste Reduction</div>
            </div>
            <div class="content">
              <p>This is to certify that</p>
              <div class="name">${user.name}</div>
              <p>has successfully completed a food donation initiative</p>
              <p>demonstrating commitment to reducing food waste and</p>
              <p>supporting communities in need.</p>
            </div>
            <div class="details">
              <p><strong>Donation Details:</strong></p>
              <p>Food Item: ${donation.food_item.name}</p>
              <p>Quantity: ${donation.food_item.quantity}kg</p>
              <p>Restaurant Partner: ${restaurant?.name || 'N/A'}</p>
              <p>Completion Date: ${new Date(report.completion_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
              ${report.people_served ? `<p>People Served: ${report.people_served}</p>` : ''}
              <div class="rating">
                <p>Performance Rating:</p>
                <div class="rating-stars">${'★'.repeat(Math.round(rating))}${'☆'.repeat(5 - Math.round(rating))}</div>
                <p>${rating.toFixed(1)} / 5.0</p>
              </div>
            </div>
            <div class="footer">
              <div class="signature">
                <div class="signature-line"></div>
                <p>ShareBite Platform</p>
                <p>${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
              </div>
              <div class="signature">
                <div class="signature-line"></div>
                <p>Certificate ID</p>
                <p>${donation.id.substring(0, 8).toUpperCase()}</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    // Create a new window and print/download
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(certificateHTML);
      printWindow.document.close();
      
      // Wait for content to load, then trigger print
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
        }, 250);
      };
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">My Requests</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {donations.map((donation) => {
            const restaurant = getUserById(donation.restaurant_id);
            const days = getDaysUntilExpiry(donation.food_item.expiry_date);
            const existingReport = getCompletionReportByDonationId(donation.id);
            const canSubmitReport = (donation.status === 'accepted' || donation.status === 'completed') && !existingReport;
            const hasReport = existingReport !== null;
            const hasRating = donation.ngo_id ? getNGORatings(donation.ngo_id, donation.id).length > 0 : false;
            const canDownloadCertificate = donation.status === 'completed' && hasReport && hasRating && donation.ngo_id;
            
            return (
              <div key={donation.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{donation.food_item.name}</h3>
                    <p className="text-sm text-gray-500">{donation.food_item.category}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(donation.status)}`}>
                    {donation.status}
                  </span>
                </div>
                <div className="space-y-2 text-sm text-gray-600 mb-4">
                  <p><strong>Quantity:</strong> {donation.food_item.quantity}kg</p>
                  <p><strong>Expiry:</strong> {new Date(donation.food_item.expiry_date).toLocaleDateString()}</p>
                  <p className={days <= 3 ? 'text-red-600 font-medium' : ''}>
                    <strong>Days Left:</strong> {days}
                  </p>
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
                  {donation.pickup_date && (
                    <p><strong>Pickup Date:</strong> {new Date(donation.pickup_date).toLocaleDateString()}</p>
                  )}
                  {hasReport && (
                    <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-xs text-green-700 font-semibold">✓ Completion Report Submitted</p>
                      <p className="text-xs text-green-600 mt-1">
                        Submitted: {new Date(existingReport!.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </div>
                {canSubmitReport && (
                  <button
                    onClick={() => handleCompleteDonation(donation)}
                    className="w-full mt-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white py-2.5 px-4 rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all font-semibold text-sm shadow-md hover:shadow-lg"
                  >
                    {donation.status === 'completed' ? 'Submit Completion Report' : 'Complete Donation & Submit Report'}
                  </button>
                )}
                {donation.status === 'accepted' && hasReport && !hasRating && (
                  <div className="w-full mt-4 bg-gray-100 text-gray-600 py-2.5 px-4 rounded-xl text-center text-sm font-semibold">
                    Report Submitted - Awaiting Admin Review
                  </div>
                )}
                {canDownloadCertificate && (
                  <button
                    onClick={() => handleDownloadCertificate(donation, existingReport!, restaurant)}
                    className="w-full mt-4 bg-gradient-to-r from-amber-500 to-orange-600 text-white py-2.5 px-4 rounded-xl hover:from-amber-600 hover:to-orange-700 transition-all font-semibold text-sm shadow-md hover:shadow-lg flex items-center justify-center space-x-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span>Download Certificate</span>
                  </button>
                )}
                <div className="text-xs text-gray-400 mt-3">
                  Requested: {new Date(donation.created_at).toLocaleDateString()}
                </div>
              </div>
            );
          })}
        </div>

        {/* Completion Questionnaire Modal */}
        {showCompletionModal && selectedDonation && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-2xl shadow-2xl border border-gray-200 max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold mb-4 text-gray-900">Complete Donation - Questionnaire</h2>
              <p className="text-sm text-gray-600 mb-6">Please provide details about the successful completion of this donation.</p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Photo of Completed Donation <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all outline-none"
                  />
                  {completionForm.photo_url && (
                    <img src={completionForm.photo_url} alt="Preview" className="mt-2 w-full h-48 object-cover rounded-xl" />
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Description of Completion <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={completionForm.description}
                    onChange={(e) => setCompletionForm({ ...completionForm, description: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all outline-none"
                    rows={4}
                    placeholder="Describe how the donation was used and distributed..."
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Number of People Served (Optional)
                  </label>
                  <input
                    type="number"
                    value={completionForm.people_served}
                    onChange={(e) => setCompletionForm({ ...completionForm, people_served: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all outline-none"
                    placeholder="e.g., 50"
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Distribution Location (Optional)
                  </label>
                  <input
                    type="text"
                    value={completionForm.location}
                    onChange={(e) => setCompletionForm({ ...completionForm, location: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all outline-none"
                    placeholder="e.g., Community Center, Downtown"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Additional Notes (Optional)
                  </label>
                  <textarea
                    value={completionForm.additional_notes}
                    onChange={(e) => setCompletionForm({ ...completionForm, additional_notes: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all outline-none"
                    rows={3}
                    placeholder="Any additional information about the donation completion..."
                  />
                </div>
              </div>

              <div className="flex space-x-3 pt-6">
                <button
                  onClick={handleSubmitCompletion}
                  disabled={!completionForm.photo_url || !completionForm.description}
                  className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3 px-4 rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all font-semibold shadow-md hover:shadow-lg disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Submit Completion Report
                </button>
                <button
                  onClick={() => {
                    setShowCompletionModal(false);
                    setSelectedDonation(null);
                    setCompletionForm({
                      photo_url: '',
                      description: '',
                      people_served: '',
                      location: '',
                      additional_notes: '',
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

        {donations.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-gray-500">No donation requests yet.</p>
          </div>
        )}
      </div>
    </Layout>
  );
}



