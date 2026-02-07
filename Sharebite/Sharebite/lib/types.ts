export type UserRole = 'restaurant' | 'ngo' | 'admin';

export interface User {
  id: string;
  email: string;
  password: string;
  name: string;
  role: UserRole;
  restaurant_type?: string;
  location?: string;
  phone?: string;
  createdAt: string;
  rating?: number; // NGO rating (1-5)
  reward_points?: number; // Restaurant reward points
}

export type FoodItemStatus = 'active' | 'expiring_soon' | 'expired' | 'consumed' | 'donated';

export interface FoodItem {
  id: string;
  restaurant_id: string;
  name: string;
  category: string;
  quantity: number;
  purchase_date?: string; // Optional for backward compatibility
  expiry_date: string;
  status: FoodItemStatus;
  priority_score: number;
  photo_url?: string; // Optional photo URL
  created_at: string;
  updated_at: string;
}

export type DonationStatus = 'pending' | 'accepted' | 'completed' | 'rejected';

export interface Donation {
  id: string;
  food_item_id: string;
  restaurant_id: string;
  ngo_id?: string;
  food_item: FoodItem;
  status: DonationStatus;
  pickup_date?: string;
  pickup_time?: string;
  pickup_location?: string;
  pickup_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'expiry' | 'donation' | 'system';
  read: boolean;
  created_at: string;
}

export interface Analytics {
  user_id: string;
  waste_saved: number; // kg
  donations_made: number;
  items_consumed: number;
  carbon_footprint_reduced: number; // kg CO2
  donations_received?: number; // for NGOs
  meals_provided?: number; // for NGOs
  people_served?: number; // for NGOs
  last_updated: string;
}

export interface MLPrediction {
  expiration_days?: number;
  waste_risk?: number;
  waste_risk_level?: 'Low' | 'Medium' | 'High';
  should_donate?: boolean;
  donation_probability?: number;
  priority_score?: number;
  priority_level?: 'Low' | 'Medium' | 'High';
}

export interface CompletionReport {
  id: string;
  donation_id: string;
  ngo_id: string;
  restaurant_id: string;
  completion_date: string;
  photo_url: string;
  description: string;
  people_served?: number;
  location?: string;
  additional_notes?: string;
  created_at: string;
}

export type DisposalStatus = 'pending' | 'accepted' | 'completed' | 'rejected';

export interface DisposalRequest {
  id: string;
  food_item_id: string;
  restaurant_id: string;
  ngo_id?: string;
  food_item: FoodItem;
  status: DisposalStatus;
  pickup_date?: string;
  pickup_time?: string;
  pickup_location?: string;
  pickup_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface RewardRedemption {
  id: string;
  restaurant_id: string;
  points_used: number;
  reward_type: string;
  description: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

export interface NGORating {
  id: string;
  ngo_id: string;
  donation_id: string;
  rating: number; // 1-5
  created_at: string;
}
