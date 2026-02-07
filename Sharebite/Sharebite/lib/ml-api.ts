import { MLPrediction } from './types';

const ML_API_URL = process.env.NEXT_PUBLIC_ML_API_URL || 'http://localhost:5000';

export async function checkMLAPIHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${ML_API_URL}/health`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await response.json();
    return data.status === 'ML API is running';
  } catch (error) {
    return false;
  }
}

// Valid categories matching ML API
export const VALID_CATEGORIES = [
  'Fruits', 'Vegetables', 'Dairy', 'Meat', 'Bakery',
  'Grains', 'Beverages', 'Prepared Foods', 'Frozen Foods', 'Canned Goods'
] as const;

// Valid restaurant types matching ML API
export const VALID_RESTAURANT_TYPES = [
  'Fast Food', 'Fine Dining', 'Cafe', 'Buffet', 'Food Truck', 'Bakery'
] as const;

export function validateCategory(category: string): string {
  return VALID_CATEGORIES.includes(category as any) ? category : 'Fruits';
}

export function validateRestaurantType(restaurantType: string | undefined): string {
  if (!restaurantType) return 'Fast Food';
  return VALID_RESTAURANT_TYPES.includes(restaurantType as any) ? restaurantType : 'Fast Food';
}

export function formatDateForML(date: string | undefined): string {
  if (!date) {
    // Default to today if not provided
    return new Date().toISOString().split('T')[0];
  }
  // Ensure format is YYYY-MM-DD
  const d = new Date(date);
  if (isNaN(d.getTime())) {
    return new Date().toISOString().split('T')[0];
  }
  return d.toISOString().split('T')[0];
}

export async function getMLPredictions(data: {
  category: string;
  restaurant_type: string;
  quantity: number;
  purchase_date: string;
  expiry_date: string;
}): Promise<MLPrediction | null> {
  try {
    // Validate and format data to match ML API expectations
    const validatedData = {
      category: validateCategory(data.category),
      restaurant_type: validateRestaurantType(data.restaurant_type),
      quantity: Math.max(0, parseFloat(data.quantity.toString()) || 0),
      purchase_date: formatDateForML(data.purchase_date),
      expiry_date: formatDateForML(data.expiry_date),
    };

    const response = await fetch(`${ML_API_URL}/predict/all`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validatedData),
    });
    
    if (!response.ok) {
      return null;
    }
    
    const result = await response.json();
    if (result.success && result.predictions) {
      return result.predictions;
    }
    return null;
  } catch (error) {
    console.error('ML API error:', error);
    return null;
  }
}

export async function predictExpiration(data: {
  category: string;
  restaurant_type: string;
  quantity: number;
  purchase_date: string;
  expiry_date: string;
}): Promise<number | null> {
  try {
    const response = await fetch(`${ML_API_URL}/predict/expiration`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) return null;
    
    const result = await response.json();
    return result.success ? result.predicted_days_until_expiry : null;
  } catch (error) {
    return null;
  }
}

export async function predictWasteRisk(data: {
  category: string;
  restaurant_type: string;
  quantity: number;
  purchase_date: string;
  expiry_date: string;
}): Promise<{ score: number; level: string } | null> {
  try {
    const response = await fetch(`${ML_API_URL}/predict/waste-risk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) return null;
    
    const result = await response.json();
    return result.success
      ? { score: result.waste_risk_score, level: result.risk_level }
      : null;
  } catch (error) {
    return null;
  }
}

export async function predictDonation(data: {
  category: string;
  restaurant_type: string;
  quantity: number;
  purchase_date: string;
  expiry_date: string;
}): Promise<{ should_donate: boolean; probability: number } | null> {
  try {
    const response = await fetch(`${ML_API_URL}/predict/donation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) return null;
    
    const result = await response.json();
    return result.success
      ? { should_donate: result.should_donate, probability: result.donation_probability }
      : null;
  } catch (error) {
    return null;
  }
}

export async function predictPriority(data: {
  category: string;
  restaurant_type: string;
  quantity: number;
  purchase_date: string;
  expiry_date: string;
}): Promise<{ score: number; level: string } | null> {
  try {
    const response = await fetch(`${ML_API_URL}/predict/priority`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) return null;
    
    const result = await response.json();
    return result.success
      ? { score: result.priority_score, level: result.priority_level }
      : null;
  } catch (error) {
    return null;
  }
}
