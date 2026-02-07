'use client';

// 1. THIS COMMANDS VERCEL TO SKIP STATIC BUILD FOR THIS PAGE
export const dynamic = "force-dynamic";

import { useEffect, useState, useMemo, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Layout from '@/components/Layout';
import { getCurrentUser, getDonations, getFoodItems, addDonation, updateDonation, getUserById } from '@/lib/storage';
import { Donation, FoodItem, MLPrediction } from '@/lib/types';
import { getAvailableDonationItems } from '@/lib/recommendations';
import { checkMLAPIHealth, getMLPredictions } from '@/lib/ml-api';

interface ItemWithML extends FoodItem {
  mlPredictions?: MLPrediction;
}

// 2. The Logic Component
function DonationContent() {
  const [donations, setDonations] = useState<Donation[]>([]);
  const [items, setItems] = useState<ItemWithML[]>([]);
  const [mlAvailable, setMlAvailable] = useState(false);
  const [mlLoading, setMlLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedFoodItem, setSelectedFoodItem] = useState<string>('');
  const [showPickupForm, setShowPickupForm] = useState(false);
  const [pickupInfo, setPickupInfo] = useState({
    pickup_date: '',
    pickup_time: '',
    pickup_location: '',
    pickup_notes: '',
  });
  
  const searchParams = useSearchParams();

  useEffect(() => {
    const user = getCurrentUser();
    if (user) {
      loadItems();
      loadDonations();
      checkMLAPIHealth().then(setMlAvailable);
      const createId = searchParams.get('create');
      if (createId) {
        setSelectedFoodItem(createId);
        setShowCreateModal(true);
      }
    }
  }, [searchParams]);

  const loadItems = () => {
    const user = getCurrentUser();
    if (user) {
      const userItems = getFoodItems(user.id);
      setItems(prevItems => {
        return userItems.map(item => {
          const existingItem = prevItems.find(i => i.id === item.id);
          if (existingItem && existingItem.mlPredictions) {
            return { ...item, mlPredictions: existingItem.mlPredictions };
          }
          return item;
        }) as ItemWithML[];
      });
    }
  };

  const loadMLPredictions = useCallback(async () => {
    const user = getCurrentUser();
    if (!user || mlLoading) return;

    const restaurantType = user.restaurant_type || 'Fast Food';
    
    setItems(currentItems => {
      const itemsNeedingML = currentItems.filter(item => 
        (item.status === 'active' || item.status === 'expiring_soon') && !item.mlPredictions
      );

      if (itemsNeedingML.length === 0) {
        return currentItems;
      }

      setMlLoading(true);
      
      Promise.all(
        itemsNeedingML.map(async (item) => {
          try {
            const purchaseDate = item.purchase_date || item.created_at.split('T')[0];
            const prediction = await getMLPredictions({
              category: item.category,
              restaurant_type: restaurantType,
              quantity: item.quantity,
              purchase_date: purchaseDate,
              expiry_date: item.expiry_date,
            });
            return { itemId: item.id, prediction };
          } catch (error) {
            console.error(`Error loading ML for item ${item.id}:`, error);
            return null;
          }
        })
      ).then(predictions => {
        setItems(prevItems => {
          const freshItems = getFoodItems(user.id) as ItemWithML[];
          
          const updated = freshItems.map(item => {
            const existing = prevItems.find(i => i.id === item.id);
            if (existing && existing.mlPredictions) {
              return { ...item, mlPredictions: existing.mlPredictions };
            }
            
            const result = predictions.find(p => p && p.itemId === item.id);
            if (result && result.prediction) {
              return { ...item, mlPredictions: result.prediction };
            }
            
            return item;
          });
          
          setMlLoading(false);
          return updated;
        });
      }).catch(error => {
        console.error('Error loading ML predictions:', error);
        setMlLoading(false);
      });

      return currentItems;
    });
  }, [mlLoading]);

  const itemsNeedingMLCount = useMemo(() => {
    return items.filter(item => (item.status === 'active' || item.status === 'expiring_soon') && !item.mlPredictions).length;
  }, [items]);

  useEffect(() => {
    if (mlAvailable && items.length > 0 && !mlLoading && itemsNeedingMLCount > 0) {
      loadMLPredictions();
    }
  }, [mlAvailable, items.length, itemsNeedingMLCount, loadMLPredictions]);

  const loadDonations = () => {
    const user = getCurrentUser();
    if (user) {
      setDonations(getDonations(user.id));
    }
  };

  const handleCreateDonation = () => {
    const user = getCurrentUser();
    if (!user || !selectedFoodItem) return;

    if (!showPickupForm) {
      setShowPickupForm(true);
      return;
    }

    const donation = addDonation(selectedFoodItem, user.id);
    if (donation && (pickupInfo.pickup_date || pickupInfo.pickup_location)) {
      updateDonation(donation.id, {
        pickup_date: pickupInfo.pickup_date || undefined,
        pickup_time: pickupInfo.pickup_time || undefined,
        pickup_location: pickupInfo.pickup_location || undefined,
        pickup_notes: pickupInfo.pickup_notes || undefined,
      });
    }
    
    setShowCreateModal(false);
    setShowPickupForm(false);
    setSelectedFoodItem('');
    setPickupInfo({
      pickup_date: '',
      pickup_time: '',
      pickup_location: '',
      pickup_notes: '',
    });
    loadDonations();
    loadItems();
  };

  const handleCompleteDonation = (donationId: string) => {
    updateDonation(donationId, { status: 'completed' });
    loadDonations();
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

  const user = getCurrentUser();
  
  const mlPredictionsKey = items
    .filter(i => i.status === 'active' || i.status === 'expiring_soon')
    .map(i => i.id + (i.mlPredictions ? ':' + JSON.stringify(i.mlPredictions) : ':none'))
    .join('|');
  
  const availableItems = useMemo(() => {
    if (!user) return [];
    return getAvailableDonationItems(items, user.id, mlAvailable);
  }, [items, mlAvailable, user, donations, mlPredictionsKey]);

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">My Donations</h1>
            <p className="text-gray-600">Manage your food donations and track NGO assignments</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-3 rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center space-x-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Create Donation</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {donations.filter(donation => donation.food_item).map((donation) => {
            const ngo = donation.ngo_id ? getUserById(donation.ngo_id) : null;
            return (
              <div key={donation.id} className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-shadow p-6 border border-gray-100">
                {donation.food_item?.photo_url && (
                  <div className="mb-4 -mx-6 -mt-6">
                    <img src={donation.food_item.photo_url} alt={donation.food_item.name} className="w-full h-48 object-cover rounded-t-2xl" />
                  </div>
                )}
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{donation.food_item?.name || 'Unknown Item'}</h3>
                    <p className="text-sm text-gray-500">{donation.food_item?.category || 'Unknown Category'}</p>
                  </div>
                  <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(donation.status)}`}>
                    {donation.status}
                  </span>
                </div>
                <div className="space-y-2 text-sm text-gray-600 mb-4">
                  <div className="flex items-center">
                    <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                    <span><strong>Quantity:</strong> {donation.food_item?.quantity || 0}kg</span>
                  </div>
                  <div className="flex items-center">
                    <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span><strong>Expiry:</strong> {donation.food_item?.expiry_date ? new Date(donation.food_item.expiry_date).toLocaleDateString() : 'N/A'}</span>
                  </div>
                  {ngo && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-3">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center">
                          <svg className="w-4 h-4 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                          <span className="text-green-700 font-semibold">Assigned NGO</span>
                        </div>
                        {ngo.rating && (
                          <div className="flex items-center">
                            <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                            <span className="text-xs text-gray-700 ml-1 font-medium">{ngo.rating.toFixed(1)}</span>
                          </div>
                        )}
                      </div>
                      <p className="text-green-800 font-medium">{ngo.name}</p>
                      {ngo.location && <p className="text-xs text-green-600 mt-1">📍 {ngo.location}</p>}
                      {ngo.phone && <p className="text-xs text-green-600">📞 {ngo.phone}</p>}
                    </div>
                  )}
                  {donation.pickup_date && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-2">
                      <p className="text-blue-800 font-semibold text-xs mb-1">Pickup Information</p>
                      <p className="text-blue-700 text-xs">📅 {new Date(donation.pickup_date).toLocaleDateString()}</p>
                      {donation.pickup_time && <p className="text-blue-700 text-xs">🕐 {donation.pickup_time}</p>}
                      {donation.pickup_location && <p className="text-blue-700 text-xs">📍 {donation.pickup_location}</p>}
                      {donation.pickup_notes && <p className="text-blue-700 text-xs mt-1">📝 {donation.pickup_notes}</p>}
                    </div>
                  )}
                </div>
                {donation.status === 'pending' && (
                  <div className="text-xs text-gray-500 bg-gray-50 rounded-lg p-2 text-center">Waiting for NGO requests...</div>
                )}
                {donation.status === 'accepted' && (
                  <button
                    onClick={() => handleCompleteDonation(donation.id)}
                    className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-2.5 px-4 rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all font-semibold text-sm shadow-md hover:shadow-lg"
                  >
                    Mark as Completed
                  </button>
                )}
                <div className="mt-3 text-xs text-gray-400 text-center">
                  Created: {new Date(donation.created_at).toLocaleDateString()}
                </div>
              </div>
            );
          })}
        </div>

        {donations.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-gray-500">No donations created yet.</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-4 text-green-600 hover:text-green-700"
            >
              Create your first donation
            </button>
          </div>
        )}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl border border-gray-200">
            <h2 className="text-2xl font-bold mb-4 text-gray-900">{showPickupForm ? 'Pickup Information' : 'Create Donation'}</h2>
            <div className="space-y-4">
              {!showPickupForm ? (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Select Food Item</label>
                    <select
                      value={selectedFoodItem}
                      onChange={(e) => setSelectedFoodItem(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all outline-none"
                      required
                    >
                      <option value="">Select an item...</option>
                      {availableItems.map(item => (
                        <option key={item.id} value={item.id}>
                          {item.name} ({item.quantity}kg) - Expires: {new Date(item.expiry_date).toLocaleDateString()}
                        </option>
                      ))}
                    </select>
                  </div>
                  {availableItems.length === 0 && (
                    <div className="text-sm text-gray-500 bg-gray-50 rounded-xl p-4">
                      {mlAvailable && mlLoading ? (
                        <div className="flex items-center space-x-2">
                          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span>Loading ML predictions...</span>
                        </div>
                      ) : mlAvailable ? (
                        <p>No items recommended for donation by ML. Items need ML predictions that recommend donation.</p>
                      ) : (
                        <p>ML API is not available. Please ensure the ML server is running.</p>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Pickup Date</label>
                    <input
                      type="date"
                      value={pickupInfo.pickup_date}
                      onChange={(e) => setPickupInfo({ ...pickupInfo, pickup_date: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Pickup Time</label>
                    <input
                      type="time"
                      value={pickupInfo.pickup_time}
                      onChange={(e) => setPickupInfo({ ...pickupInfo, pickup_time: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Pickup Location</label>
                    <input
                      type="text"
                      value={pickupInfo.pickup_location}
                      onChange={(e) => setPickupInfo({ ...pickupInfo, pickup_location: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all outline-none"
                      placeholder="e.g., Main entrance, Loading dock"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Additional Notes (Optional)</label>
                    <textarea
                      value={pickupInfo.pickup_notes}
                      onChange={(e) => setPickupInfo({ ...pickupInfo, pickup_notes: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all outline-none"
                      rows={3}
                      placeholder="Any special instructions for pickup..."
                    />
                  </div>
                </>
              )}
              <div className="flex space-x-3 pt-2">
                <button
                  onClick={handleCreateDonation}
                  disabled={!showPickupForm && (!selectedFoodItem || availableItems.length === 0)}
                  className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3 px-4 rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all font-semibold shadow-md hover:shadow-lg disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {showPickupForm ? 'Create Donation' : 'Next: Add Pickup Info'}
                </button>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setShowPickupForm(false);
                    setSelectedFoodItem('');
                    setPickupInfo({
                      pickup_date: '',
                      pickup_time: '',
                      pickup_location: '',
                      pickup_notes: '',
                    });
                  }}
                  className="flex-1 bg-gray-100 text-gray-700 py-3 px-4 rounded-xl hover:bg-gray-200 transition-all font-semibold"
                >
                  Cancel
                </button>
              </div>
              {showPickupForm && (
                <button
                  onClick={() => setShowPickupForm(false)}
                  className="w-full text-sm text-gray-600 hover:text-gray-800 underline"
                >
                  ← Back to item selection
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

// 3. The Wrapper
export default function RestaurantDonationsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <DonationContent />
    </Suspense>
  );
}
