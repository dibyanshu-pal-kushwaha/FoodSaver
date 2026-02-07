/**
 * Centralized Recommendation System
 * Uses ML predictions as the PRIMARY source - no fallbacks
 */
import { FoodItem, MLPrediction } from './types';
import { getDonations } from './storage';

interface ItemWithML extends FoodItem {
  mlPredictions?: MLPrediction;
}

/**
 * Calculate days until expiry from today
 */
export function getDaysUntilExpiry(expiryDate: string): number {
  const expiry = new Date(expiryDate);
  const now = new Date();
  const diff = expiry.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/**
 * Get consumption recommendations - ONLY uses ML predictions
 * Returns items that should be consumed soon based on ML predictions
 */
export function getConsumptionRecommendations(items: ItemWithML[], mlAvailable: boolean): ItemWithML[] {
  if (!mlAvailable) {
    return []; // No recommendations without ML
  }

  return items.filter(item => {
    // Must be active or expiring soon
    if (item.status !== 'active' && item.status !== 'expiring_soon') return false;
    
    // MUST have ML predictions - no fallback
    if (!item.mlPredictions) return false;
    
    const mlDays = item.mlPredictions.expiration_days;
    if (mlDays === undefined) return false;
    
    // Use ML prediction: items expiring within 3 days
    return mlDays <= 3 && mlDays >= 0;
  });
}

/**
 * Get donation recommendations - ONLY uses ML predictions
 * Returns items that should be donated based on ML predictions
 */
export function getDonationRecommendations(items: ItemWithML[], mlAvailable: boolean, restaurantId: string): ItemWithML[] {
  if (!mlAvailable) {
    return []; // No recommendations without ML
  }

  // Get items that already have donations
  const donations = getDonations(restaurantId);
  const donatedItemIds = new Set(donations.map(d => d.food_item_id));

  return items.filter(item => {
    // Must be active or expiring soon
    if (item.status !== 'active' && item.status !== 'expiring_soon') return false;
    
    // Must not already have a donation
    if (donatedItemIds.has(item.id)) return false;
    
    // MUST have ML predictions - no fallback
    if (!item.mlPredictions) return false;
    
    // Use ML prediction: should_donate flag OR high probability
    const shouldDonate = item.mlPredictions.should_donate === true;
    const highProbability = item.mlPredictions.donation_probability !== undefined && 
                           item.mlPredictions.donation_probability >= 0.45;
    
    return shouldDonate || highProbability;
  });
}

/**
 * Get items available for donation dropdown - uses ML predictions
 * NO FALLBACKS - only shows items with ML predictions that recommend donation
 */
export function getAvailableDonationItems(items: ItemWithML[], restaurantId: string, mlAvailable: boolean): ItemWithML[] {
  // Get items that already have donations
  const donations = getDonations(restaurantId);
  const donatedItemIds = new Set(donations.map(d => d.food_item_id));

  return items.filter(item => {
    // Must be active or expiring soon
    if (item.status !== 'active' && item.status !== 'expiring_soon') return false;
    
    // Must not already have a donation
    if (donatedItemIds.has(item.id)) return false;
    
    // MUST have ML predictions if ML is available - NO FALLBACKS
    if (mlAvailable) {
      if (!item.mlPredictions) {
        // Wait for ML predictions to load
        return false;
      }
      
      // Only show items that ML recommends for donation
      const shouldDonate = item.mlPredictions.should_donate === true;
      const highProbability = item.mlPredictions.donation_probability !== undefined && 
                             item.mlPredictions.donation_probability >= 0.40;
      
      return shouldDonate || highProbability;
    }
    
    // If ML is not available, return empty (no recommendations without ML)
    return false;
  });
}

/**
 * Check if all items have ML predictions loaded
 */
export function allItemsHaveMLPredictions(items: ItemWithML[]): boolean {
  return items.length > 0 && items.every(item => item.mlPredictions !== undefined);
}

/**
 * Get items that need ML predictions
 */
export function getItemsNeedingMLPredictions(items: ItemWithML[]): ItemWithML[] {
  return items.filter(item => (item.status === 'active' || item.status === 'expiring_soon') && !item.mlPredictions);
}
