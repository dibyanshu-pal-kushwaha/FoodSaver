'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import Layout from '@/components/Layout';
import { getCurrentUser, getFoodItems, deleteFoodItem, updateFoodItem, addDisposalRequest } from '@/lib/storage';
import { FoodItem, MLPrediction } from '@/lib/types';
import { getMLPredictions, checkMLAPIHealth, validateCategory, validateRestaurantType, formatDateForML } from '@/lib/ml-api';
import { getConsumptionRecommendations, getDonationRecommendations, getItemsNeedingMLPredictions } from '@/lib/recommendations';
import Link from 'next/link';

interface ItemWithML extends FoodItem {
  mlPredictions?: MLPrediction;
}

export default function RestaurantInventoryPage() {
  const [items, setItems] = useState<ItemWithML[]>([]);
  const [mlAvailable, setMlAvailable] = useState(false);
  const [mlLoading, setMlLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<FoodItem | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    category: 'Fruits',
    quantity: '',
    purchase_date: '',
    expiry_date: '',
    photo_url: '',
  });
  const [mlPreview, setMlPreview] = useState<MLPrediction | null>(null);

  useEffect(() => {
    const user = getCurrentUser();
    if (user) {
      loadItems();
      checkMLAPIHealth().then(setMlAvailable);
    }
  }, []);

  const loadItems = async () => {
    const user = getCurrentUser();
    if (user) {
      const userItems = getFoodItems(user.id);
      // Sort by expiry date
      userItems.sort((a, b) => new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime());
      
      // Preserve existing ML predictions when reloading items
      setItems(prevItems => {
        const itemsWithPreservedML = userItems.map(item => {
          const existingItem = prevItems.find(i => i.id === item.id);
          if (existingItem && existingItem.mlPredictions) {
            return { ...item, mlPredictions: existingItem.mlPredictions };
          }
          return item;
        });
        return itemsWithPreservedML as ItemWithML[];
      });
    }
  };

  const loadMLPredictions = useCallback(async () => {
    const user = getCurrentUser();
    if (!user || !mlAvailable || mlLoading) return;

    // Ensure restaurant_type is set
    const restaurantType = user.restaurant_type || 'Fast Food';
    if (!user.restaurant_type) {
      const { getUsers } = await import('@/lib/storage');
      const users = getUsers();
      const userIndex = users.findIndex(u => u.id === user.id);
      if (userIndex !== -1) {
        users[userIndex].restaurant_type = restaurantType;
        localStorage.setItem('sharebite_users', JSON.stringify(users));
      }
    }

    // Use current state items to check what needs ML
    setItems(currentItems => {
      const itemsNeedingML = currentItems.filter(item => 
        (item.status === 'active' || item.status === 'expiring_soon') && !item.mlPredictions
      );
      
      if (itemsNeedingML.length === 0) {
        return currentItems;
      }
      
      setMlLoading(true);
      
      // Load predictions for items that need them
      Promise.all(
        itemsNeedingML.map(async (item) => {
          try {
            const purchaseDate = item.purchase_date || item.created_at.split('T')[0];
            const predictions = await getMLPredictions({
              category: item.category,
              restaurant_type: restaurantType,
              quantity: item.quantity,
              purchase_date: purchaseDate,
              expiry_date: item.expiry_date,
            });
            
            if (predictions) {
              if (predictions.priority_score !== undefined) {
                updateFoodItem(item.id, { priority_score: Math.round(predictions.priority_score) });
              }
              return { itemId: item.id, predictions };
            }
          } catch (error) {
            console.error(`Error loading ML for ${item.name}:`, error);
          }
          return null;
        })
      ).then(results => {
        // Update state with predictions
        setItems(prevItems => {
          // Get fresh items from storage to ensure we have latest data
          const freshItems = getFoodItems(user.id) as ItemWithML[];
          
          const updated = freshItems.map(item => {
            // Preserve existing ML predictions first
            const existing = prevItems.find(i => i.id === item.id);
            if (existing && existing.mlPredictions) {
              return { ...item, mlPredictions: existing.mlPredictions };
            }
            
            // Add new predictions from results
            const result = results.find(r => r && r.itemId === item.id);
            if (result && result.predictions) {
              return { ...item, mlPredictions: result.predictions };
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
  }, [mlAvailable, mlLoading]);

  // Track items needing ML predictions
  const itemsNeedingMLCount = useMemo(() => {
    return items.filter(item => (item.status === 'active' || item.status === 'expiring_soon') && !item.mlPredictions).length;
  }, [items]);

  useEffect(() => {
    // Load ML predictions for all items when ML is available
    if (mlAvailable && items.length > 0 && !mlLoading && itemsNeedingMLCount > 0) {
      // Load predictions for items that need them
      loadMLPredictions();
    }
  }, [mlAvailable, items.length, itemsNeedingMLCount, loadMLPredictions]); // Track count of items needing ML

  // Get ML preview when form data changes
  useEffect(() => {
    if (mlAvailable && formData.category && formData.quantity && formData.purchase_date && formData.expiry_date) {
      const user = getCurrentUser();
      if (user && user.restaurant_type) {
        getMLPreview();
      }
    } else {
      setMlPreview(null);
    }
  }, [formData.category, formData.quantity, formData.purchase_date, formData.expiry_date, mlAvailable]);

  const getMLPreview = async () => {
    const user = getCurrentUser();
    if (!user) return;

    const restaurantType = user.restaurant_type || 'Fast Food';

    try {
      const predictions = await getMLPredictions({
        category: formData.category,
        restaurant_type: restaurantType,
        quantity: parseFloat(formData.quantity) || 0,
        purchase_date: formData.purchase_date,
        expiry_date: formData.expiry_date,
      });
      setMlPreview(predictions);
    } catch (error) {
      console.error('Error getting ML preview:', error);
      setMlPreview(null);
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const user = getCurrentUser();
    if (!user) return;

    const { addFoodItem } = await import('@/lib/storage');
    const newItem = await addFoodItem({
      restaurant_id: user.id,
      name: formData.name,
      category: formData.category,
      quantity: parseFloat(formData.quantity),
      purchase_date: formData.purchase_date,
      expiry_date: formData.expiry_date,
      photo_url: formData.photo_url || undefined,
    });

    // If ML is available, get predictions and update priority
    if (mlAvailable && mlPreview && mlPreview.priority_score !== undefined) {
      updateFoodItem(newItem.id, { priority_score: Math.round(mlPreview.priority_score) });
    }

    setFormData({
      name: '',
      category: 'Fruits',
      quantity: '',
      purchase_date: '',
      expiry_date: '',
      photo_url: '',
    });
    setMlPreview(null);
    setShowAddModal(false);
    
    // Reload items
    await loadItems();
    
    // Load ML predictions for the new item
    if (mlAvailable) {
      // Small delay to ensure state is updated
      setTimeout(() => {
        loadMLPredictions();
      }, 100);
    }
  };

  const handleMarkConsumed = (id: string) => {
    updateFoodItem(id, { status: 'consumed' });
    loadItems();
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this item?')) {
      deleteFoodItem(id);
      loadItems();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'expiring_soon': return 'bg-yellow-100 text-yellow-800';
      case 'expired': return 'bg-red-100 text-red-800';
      case 'consumed': return 'bg-green-100 text-green-800';
      case 'donated': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getDaysUntilExpiry = (expiryDate: string) => {
    const expiry = new Date(expiryDate);
    const now = new Date();
    const diff = expiry.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  // Use centralized recommendation system - NO FALLBACKS
  // Recalculate when items change or ML predictions are loaded
  const user = getCurrentUser();
  
  // Create a dependency string that changes when ML predictions are added/updated
  const mlPredictionsKey = items
    .filter(i => i.status === 'active' || i.status === 'expiring_soon')
    .map(i => i.id + (i.mlPredictions ? ':' + JSON.stringify(i.mlPredictions) : ':none'))
    .join('|');
  
  const consumptionRecs = useMemo(() => {
    if (!mlAvailable || !user) return [];
    return getConsumptionRecommendations(items, mlAvailable);
  }, [items, mlAvailable, user, mlPredictionsKey]); // Use ML predictions key to trigger recalculation

  const donationRecs = useMemo(() => {
    if (!mlAvailable || !user) return [];
    return getDonationRecommendations(items, mlAvailable, user.id);
  }, [items, mlAvailable, user, mlPredictionsKey]); // Use ML predictions key to trigger recalculation

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, photo_url: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header with Stats */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Inventory Dashboard</h1>
            {mlAvailable && (
              <div className="flex items-center mt-1 text-sm text-emerald-600 font-medium">
                <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                ML Predictions Active
              </div>
            )}
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-6 py-3 rounded-xl hover:from-emerald-700 hover:to-teal-700 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center space-x-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Add Food Item</span>
          </button>
        </div>

        {/* Recommendations - Only show if ML is available and predictions are loaded */}
        {mlAvailable && (consumptionRecs.length > 0 || donationRecs.length > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {consumptionRecs.length > 0 && (
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-5 shadow-soft">
                <div className="flex items-center mb-3">
                  <div className="w-10 h-10 bg-amber-500 rounded-lg flex items-center justify-center mr-3">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <h3 className="font-bold text-amber-900 text-lg">Consumption Recommendations</h3>
                </div>
                <p className="text-sm text-amber-800 mb-3 font-medium">Items expiring within 3 days (ML-based):</p>
                <ul className="space-y-2">
                  {consumptionRecs.map(item => {
                    const mlDays = item.mlPredictions?.expiration_days;
                    return (
                      <li key={item.id} className="text-sm text-amber-900 bg-white/60 rounded-lg px-3 py-2 font-medium">
                        • {item.name} ({item.quantity}kg) - {mlDays !== undefined ? `${Math.round(mlDays)} days left (ML)` : `${getDaysUntilExpiry(item.expiry_date)} days left`}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
            {donationRecs.length > 0 && (
              <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200 rounded-xl p-5 shadow-soft">
                <div className="flex items-center mb-3">
                  <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center mr-3">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                  </div>
                  <h3 className="font-bold text-blue-900 text-lg">Donation Recommendations</h3>
                </div>
                <p className="text-sm text-blue-800 mb-3 font-medium">ML-recommended items for donation:</p>
                <ul className="space-y-2">
                  {donationRecs.map(item => {
                    const mlDays = item.mlPredictions?.expiration_days;
                    return (
                      <li key={item.id} className="text-sm text-blue-900 bg-white/60 rounded-lg px-3 py-2 font-medium">
                        • {item.name} ({item.quantity}kg) - {mlDays !== undefined ? `${Math.round(mlDays)} days left` : `${getDaysUntilExpiry(item.expiry_date)} days left`}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
        )}
        
        {/* Loading indicator when ML predictions are being loaded */}
        {mlAvailable && mlLoading && items.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
            <div className="flex items-center justify-center space-x-2 text-blue-700">
              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="font-medium">Loading ML predictions for recommendations...</span>
            </div>
          </div>
        )}

        {/* Food Items - Card Layout */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
          {items.length > 0 ? (
            /* Scrollable Container for Headers and Items */
            <div className="overflow-x-auto">
              {/* Table Headers */}
              <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border-b border-gray-200 px-6 py-4">
                <div className="grid grid-cols-[80px_1.5fr_1fr_100px_120px_100px_120px_140px_2fr_280px] gap-3 items-center min-w-[1480px]">
                  <div className="text-xs font-bold text-gray-700 uppercase tracking-wider">Photo</div>
                  <div className="text-xs font-bold text-gray-700 uppercase tracking-wider">Name</div>
                  <div className="text-xs font-bold text-gray-700 uppercase tracking-wider">Category</div>
                  <div className="text-xs font-bold text-gray-700 uppercase tracking-wider">Quantity</div>
                  <div className="text-xs font-bold text-gray-700 uppercase tracking-wider">Expiry</div>
                  <div className="text-xs font-bold text-gray-700 uppercase tracking-wider">Days Left</div>
                  <div className="text-xs font-bold text-gray-700 uppercase tracking-wider">Status</div>
                  <div className="text-xs font-bold text-gray-700 uppercase tracking-wider">Priority</div>
                  {mlAvailable ? (
                    <div className="text-xs font-bold text-gray-700 uppercase tracking-wider">ML Insights</div>
                  ) : (
                    <div></div>
                  )}
                  <div className="text-xs font-bold text-gray-700 uppercase tracking-wider text-center">Actions</div>
                </div>
              </div>

              {/* Items as Cards */}
              <div className="divide-y divide-gray-100">
              {items.map((item) => {
              const days = getDaysUntilExpiry(item.expiry_date);
              const ml = item.mlPredictions;
              return (
                <div key={item.id} className="px-6 py-5 hover:bg-gray-50 transition-colors">
                  <div className="grid grid-cols-[80px_1.5fr_1fr_100px_120px_100px_120px_140px_2fr_280px] gap-3 items-center min-w-[1480px]">
                    {/* Photo */}
                    <div>
                      {item.photo_url ? (
                        <img src={item.photo_url} alt={item.name} className="w-16 h-16 object-cover rounded-xl border-2 border-gray-200 shadow-sm" />
                      ) : (
                        <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl flex items-center justify-center border-2 border-gray-200">
                          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                    </div>
                    
                    {/* Name */}
                    <div>
                      <p className="text-sm font-bold text-gray-900 truncate">{item.name}</p>
                    </div>
                    
                    {/* Category */}
                    <div>
                      <span className="text-sm text-gray-600">{item.category}</span>
                    </div>
                    
                    {/* Quantity */}
                    <div>
                      <span className="text-sm font-semibold text-gray-700">{item.quantity}kg</span>
                    </div>
                    
                    {/* Expiry Date */}
                    <div>
                      <span className="text-sm text-gray-600 whitespace-nowrap">{new Date(item.expiry_date).toLocaleDateString()}</span>
                    </div>
                    
                    {/* Days Left */}
                    <div>
                      {ml?.expiration_days !== undefined ? (
                        <span className="text-sm font-semibold text-emerald-600 whitespace-nowrap">
                          {Math.round(ml.expiration_days)} <span className="text-xs text-emerald-500">(ML)</span>
                        </span>
                      ) : (
                        <span className={`text-sm font-semibold whitespace-nowrap ${days <= 3 ? 'text-red-600' : days <= 7 ? 'text-yellow-600' : 'text-gray-600'}`}>
                          {days}
                        </span>
                      )}
                    </div>
                    
                    {/* Status */}
                    <div>
                      <span className={`px-3 py-1.5 text-xs font-semibold rounded-full whitespace-nowrap ${getStatusColor(item.status)}`}>
                        {item.status}
                      </span>
                    </div>
                    
                    {/* Priority */}
                    <div>
                      <div className="flex items-center space-x-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2.5 min-w-[60px]">
                          <div
                            className={`h-2.5 rounded-full ${
                              item.priority_score >= 70 ? 'bg-red-500' :
                              item.priority_score >= 40 ? 'bg-yellow-500' :
                              'bg-green-500'
                            }`}
                            style={{ width: `${item.priority_score}%` }}
                          ></div>
                        </div>
                        <span className="text-xs font-bold text-gray-700 whitespace-nowrap">
                          {ml?.priority_score !== undefined ? Math.round(ml.priority_score) : item.priority_score}
                        </span>
                      </div>
                    </div>
                    
                    {/* ML Insights */}
                    {mlAvailable && (
                      <div>
                        {ml ? (
                          <div className="flex flex-col space-y-1.5">
                            {ml.waste_risk !== undefined && (
                              <span className={`inline-block px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap ${
                                ml.waste_risk_level === 'High' ? 'bg-red-100 text-red-800 border border-red-200' :
                                ml.waste_risk_level === 'Medium' ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' :
                                'bg-green-100 text-green-800 border border-green-200'
                              }`}>
                                Risk: {ml.waste_risk_level} ({Math.round(ml.waste_risk)}%)
                              </span>
                            )}
                            {ml.should_donate !== undefined && (
                              <span className={`inline-block px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap ${
                                ml.should_donate 
                                  ? 'bg-blue-100 text-blue-800 border border-blue-200' 
                                  : 'bg-gray-100 text-gray-600 border border-gray-200'
                              }`}>
                                {ml.should_donate ? '✓ Donate' : 'No Donate'} ({Math.round((ml.donation_probability || 0) * 100)}%)
                              </span>
                            )}
                          </div>
                        ) : (item.status === 'donated' || item.status === 'consumed') ? (
                          // Empty for donated or disposed items
                          <div></div>
                        ) : (
                          <div className="flex items-center space-x-1.5 text-xs text-gray-400">
                            <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span>Loading...</span>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Actions */}
                    <div className="flex justify-end items-center gap-2">
                      {(item.status === 'active'|| item.status ==='expiring_soon') && (
                        <>
                          <button
                            onClick={() => handleMarkConsumed(item.id)}
                            className="px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 font-semibold transition-all text-xs whitespace-nowrap"
                          >
                            Consumed
                          </button>
                          <Link
                            href={`/restaurant/donations?create=${item.id}`}
                            className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 font-semibold transition-all text-xs whitespace-nowrap"
                          >
                            Donate
                          </Link>
                        </>
                      )}
                      {item.status === 'expired' && (
                        <button
                          onClick={() => {
                            const user = getCurrentUser();
                            if (user && confirm(`Create disposal request for ${item.name}?`)) {
                              try {
                                addDisposalRequest(item.id, user.id);
                                alert('Disposal request created successfully!');
                                loadItems();
                              } catch (error) {
                                alert('Failed to create disposal request');
                              }
                            }
                          }}
                          className="px-3 py-1.5 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 font-semibold transition-all text-xs whitespace-nowrap"
                        >
                          Request Disposal
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 font-semibold transition-all text-xs whitespace-nowrap"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
              </div>
            </div>
          ) : (
            <div className="text-center py-16 text-gray-500">
              <svg className="mx-auto h-16 w-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <p className="text-lg font-medium">No food items in inventory</p>
              <p className="text-sm mt-1">Add your first item to get started</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-strong border border-gray-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Add Food Item</h2>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setMlPreview(null);
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleAddItem} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all outline-none"
                  placeholder="e.g., Fresh Tomatoes"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all outline-none bg-white"
                  required
                >
                  <option>Fruits</option>
                  <option>Vegetables</option>
                  <option>Dairy</option>
                  <option>Meat</option>
                  <option>Bakery</option>
                  <option>Grains</option>
                  <option>Beverages</option>
                  <option>Prepared Foods</option>
                  <option>Frozen Foods</option>
                  <option>Canned Goods</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Quantity (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all outline-none"
                  placeholder="0.0"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Purchase Date</label>
                <input
                  type="date"
                  value={formData.purchase_date}
                  onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Expiry Date</label>
                <input
                  type="date"
                  value={formData.expiry_date}
                  onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Food Photo (Optional)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all outline-none"
                />
                {formData.photo_url && (
                  <div className="mt-3">
                    <img src={formData.photo_url} alt="Preview" className="w-full h-48 object-cover rounded-xl border border-gray-200" />
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, photo_url: '' })}
                      className="mt-2 text-sm text-red-600 hover:text-red-700"
                    >
                      Remove Photo
                    </button>
                  </div>
                )}
              </div>

              {/* ML Predictions Preview */}
              {mlAvailable && mlPreview && (
                <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200 rounded-xl p-5 space-y-3 shadow-soft">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center mr-2">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                    </div>
                    <h3 className="font-bold text-blue-900">AI Predictions Preview</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {mlPreview.expiration_days !== undefined && (
                      <div>
                        <span className="text-blue-600 font-medium">Expiry:</span> {Math.round(mlPreview.expiration_days)} days
                      </div>
                    )}
                    {mlPreview.waste_risk !== undefined && (
                      <div>
                        <span className="text-blue-600 font-medium">Waste Risk:</span>{' '}
                        <span className={
                          mlPreview.waste_risk_level === 'High' ? 'text-red-600' :
                          mlPreview.waste_risk_level === 'Medium' ? 'text-yellow-600' :
                          'text-green-600'
                        }>
                          {mlPreview.waste_risk_level} ({Math.round(mlPreview.waste_risk)}%)
                        </span>
                      </div>
                    )}
                    {mlPreview.should_donate !== undefined && (
                      <div>
                        <span className="text-blue-600 font-medium">Donate:</span>{' '}
                        {mlPreview.should_donate ? (
                          <span className="text-green-600 font-semibold">
                            ✓ Yes ({Math.round((mlPreview.donation_probability || 0) * 100)}%)
                          </span>
                        ) : (
                          <span className="text-gray-600">
                            Not recommended ({Math.round((mlPreview.donation_probability || 0) * 100)}%)
                          </span>
                        )}
                      </div>
                    )}
                    {mlPreview.priority_score !== undefined && (
                      <div>
                        <span className="text-blue-600 font-medium">Priority:</span>{' '}
                        <span className={
                          mlPreview.priority_level === 'High' ? 'text-red-600' :
                          mlPreview.priority_level === 'Medium' ? 'text-yellow-600' :
                          'text-green-600'
                        }>
                          {mlPreview.priority_level} ({Math.round(mlPreview.priority_score)})
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex space-x-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 text-white py-3 px-4 rounded-xl hover:from-emerald-700 hover:to-teal-700 transition-all duration-200 font-semibold shadow-medium hover:shadow-strong"
                >
                  Add Item
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setMlPreview(null);
                  }}
                  className="flex-1 bg-gray-100 text-gray-700 py-3 px-4 rounded-xl hover:bg-gray-200 transition-all font-semibold"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}

