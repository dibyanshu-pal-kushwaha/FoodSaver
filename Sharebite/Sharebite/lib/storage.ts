import { User, FoodItem, Donation, Notification, Analytics, FoodItemStatus, CompletionReport, DisposalRequest, RewardRedemption, NGORating } from './types';

const STORAGE_KEYS = {
  USERS: 'sharebite_users',
  FOOD_ITEMS: 'sharebite_food_items',
  DONATIONS: 'sharebite_donations',
  NOTIFICATIONS: 'sharebite_notifications',
  ANALYTICS: 'sharebite_analytics',
  CURRENT_USER: 'sharebite_current_user',
  COMPLETION_REPORTS: 'sharebite_completion_reports',
  DISPOSAL_REQUESTS: 'sharebite_disposal_requests',
  REWARD_REDEMPTIONS: 'sharebite_reward_redemptions',
  NGO_RATINGS: 'sharebite_ngo_ratings',
};

// Initialize dummy data
export function initializeStorage() {
  if (typeof window === 'undefined') return;

  // Check if already initialized
  if (localStorage.getItem(STORAGE_KEYS.USERS)) return;

  // Create dummy users
  const users: User[] = [
    {
      id: '1',
      email: 'admin@sharebite.com',
      password: 'admin123',
      name: 'Admin User',
      role: 'admin',
      createdAt: new Date().toISOString(),
    },
    {
      id: '2',
      email: 'ngo1@sharebite.com',
      password: 'ngo123',
      name: 'Food Rescue Foundation',
      role: 'ngo',
      location: 'Downtown',
      phone: '+1234567890',
      createdAt: new Date().toISOString(),
    },
    {
      id: '3',
      email: 'ngo2@sharebite.com',
      password: 'ngo123',
      name: 'Community Food Bank',
      role: 'ngo',
      location: 'Uptown',
      phone: '+1234567891',
      createdAt: new Date().toISOString(),
    },
    {
      id: '4',
      email: 'restaurant1@sharebite.com',
      password: 'rest123',
      name: 'Green Bistro',
      role: 'restaurant',
      restaurant_type: 'Fine Dining',
      location: 'Main Street',
      phone: '+1234567892',
      createdAt: new Date().toISOString(),
    },
    {
      id: '5',
      email: 'restaurant2@sharebite.com',
      password: 'rest123',
      name: 'Quick Bites Cafe',
      role: 'restaurant',
      restaurant_type: 'Fast Food',
      location: 'Park Avenue',
      phone: '+1234567893',
      createdAt: new Date().toISOString(),
    },
  ];

  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  localStorage.setItem(STORAGE_KEYS.FOOD_ITEMS, JSON.stringify([]));
  localStorage.setItem(STORAGE_KEYS.DONATIONS, JSON.stringify([]));
  localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify([]));
  localStorage.setItem(STORAGE_KEYS.ANALYTICS, JSON.stringify([]));
  localStorage.setItem(STORAGE_KEYS.COMPLETION_REPORTS, JSON.stringify([]));
  localStorage.setItem(STORAGE_KEYS.DISPOSAL_REQUESTS, JSON.stringify([]));
  localStorage.setItem(STORAGE_KEYS.REWARD_REDEMPTIONS, JSON.stringify([]));
  localStorage.setItem(STORAGE_KEYS.NGO_RATINGS, JSON.stringify([]));
}

// User operations
export function getUsers(): User[] {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(STORAGE_KEYS.USERS);
  return data ? JSON.parse(data) : [];
}

export function getUserByEmail(email: string): User | null {
  const users = getUsers();
  return users.find(u => u.email === email) || null;
}

export function getUserById(id: string): User | null {
  const users = getUsers();
  return users.find(u => u.id === id) || null;
}

export function addUser(user: Omit<User, 'id' | 'createdAt'>): User {
  const users = getUsers();
  const newUser: User = {
    ...user,
    id: Date.now().toString(),
    createdAt: new Date().toISOString(),
  };
  users.push(newUser);
  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  return newUser;
}

// Food items operations
export function getFoodItems(restaurantId?: string): FoodItem[] {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(STORAGE_KEYS.FOOD_ITEMS);
  const items: FoodItem[] = data ? JSON.parse(data) : [];
  if (restaurantId) {
    return items.filter(item => item.restaurant_id === restaurantId);
  }
  return items;
}

export function getFoodItemById(id: string): FoodItem | null {
  const items = getFoodItems();
  return items.find(item => item.id === id) || null;
}

export function addFoodItem(item: Omit<FoodItem, 'id' | 'status' | 'priority_score' | 'created_at' | 'updated_at'>): FoodItem {
  const items = getFoodItems();
  const status = calculateFoodItemStatus(item.expiry_date);
  const priority_score = calculatePriorityScore(item.expiry_date, item.quantity);
  
  const newItem: FoodItem = {
    ...item,
    id: Date.now().toString(),
    status,
    priority_score,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  
  items.push(newItem);
  localStorage.setItem(STORAGE_KEYS.FOOD_ITEMS, JSON.stringify(items));
  
  // Create expiry notification if needed
  if (status === 'expiring_soon') {
    createNotification({
      user_id: item.restaurant_id,
      title: 'Item Expiring Soon',
      message: `${item.name} is expiring in ${getDaysUntilExpiry(item.expiry_date)} day(s). Consider consuming or donating it soon!`,
      type: 'expiry',
    });
  }
  
  return newItem;
}

export function updateFoodItem(id: string, updates: Partial<FoodItem>): FoodItem | null {
  const items = getFoodItems();
  const index = items.findIndex(item => item.id === id);
  if (index === -1) return null;
  
  const updatedItem: FoodItem = {
    ...items[index],
    ...updates,
    updated_at: new Date().toISOString(),
  };
  
  // Recalculate status and priority if expiry_date or quantity changed
  if (updates.expiry_date || updates.quantity !== undefined) {
    updatedItem.status = calculateFoodItemStatus(updatedItem.expiry_date);
    updatedItem.priority_score = calculatePriorityScore(updatedItem.expiry_date, updatedItem.quantity);
  }
  
  items[index] = updatedItem;
  localStorage.setItem(STORAGE_KEYS.FOOD_ITEMS, JSON.stringify(items));
  
  // Update analytics if status changed to consumed
  if (updates.status === 'consumed') {
    updateAnalyticsOnConsume(updatedItem.restaurant_id, updatedItem.quantity);
  }
  
  return updatedItem;
}

export function deleteFoodItem(id: string): boolean {
  const items = getFoodItems();
  const filtered = items.filter(item => item.id !== id);
  localStorage.setItem(STORAGE_KEYS.FOOD_ITEMS, JSON.stringify(filtered));
  return filtered.length < items.length;
}

// Donation operations
export function getDonations(restaurantId?: string, ngoId?: string): Donation[] {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(STORAGE_KEYS.DONATIONS);
  let donations: Donation[] = data ? JSON.parse(data) : [];
  
  // Load food items for donations
  donations = donations.map(donation => {
    const foodItem = getFoodItemById(donation.food_item_id);
    return { ...donation, food_item: foodItem || null };
  }).filter(donation => donation.food_item !== null) as Donation[];
  
  if (restaurantId) {
    donations = donations.filter(d => d.restaurant_id === restaurantId);
  }
  if (ngoId) {
    donations = donations.filter(d => d.ngo_id === ngoId);
  }
  
  return donations;
}

export function getAvailableDonations(): Donation[] {
  return getDonations().filter(d => d.status === 'pending');
}

export function addDonation(foodItemId: string, restaurantId: string): Donation {
  const donations = getDonations();
  const foodItem = getFoodItemById(foodItemId);
  if (!foodItem) throw new Error('Food item not found');
  
  const newDonation: Donation = {
    id: Date.now().toString(),
    food_item_id: foodItemId,
    restaurant_id: restaurantId,
    food_item: foodItem,
    status: 'pending',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  
  donations.push(newDonation);
  localStorage.setItem(STORAGE_KEYS.DONATIONS, JSON.stringify(donations));
  
  // Update food item status
  updateFoodItem(foodItemId, { status: 'donated' });
  
  // Notify all NGOs
  const ngos = getUsers().filter(u => u.role === 'ngo');
  ngos.forEach(ngo => {
    createNotification({
      user_id: ngo.id,
      title: 'New Donation Available',
      message: `${foodItem.name} (${foodItem.quantity}kg) is available for donation`,
      type: 'donation',
    });
  });
  
  return newDonation;
}

export function updateDonation(id: string, updates: Partial<Donation>): Donation | null {
  const donations = getDonations();
  const index = donations.findIndex(d => d.id === id);
  if (index === -1) return null;
  
  const updatedDonation: Donation = {
    ...donations[index],
    ...updates,
    updated_at: new Date().toISOString(),
  };
  
  donations[index] = updatedDonation;
  localStorage.setItem(STORAGE_KEYS.DONATIONS, JSON.stringify(donations));
  
  // Notify restaurant if NGO accepts
  if (updates.status === 'accepted' && updates.ngo_id && updatedDonation.food_item) {
    createNotification({
      user_id: updatedDonation.restaurant_id,
      title: 'Donation Accepted',
      message: `Your donation of ${updatedDonation.food_item.name} has been accepted`,
      type: 'donation',
    });
  }
  
  // Update analytics if completed
  if (updates.status === 'completed' && updatedDonation.food_item) {
    updateAnalyticsOnDonationComplete(updatedDonation);
  }
  
  return updatedDonation;
}

// Notification operations
export function getNotifications(userId: string): Notification[] {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
  const notifications: Notification[] = data ? JSON.parse(data) : [];
  if (!userId) return notifications;
  return notifications.filter(n => n.user_id === userId).sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

export function getUnreadNotificationCount(userId: string): number {
  return getNotifications(userId).filter(n => !n.read).length;
}

export function createNotification(notification: Omit<Notification, 'id' | 'read' | 'created_at'>): Notification {
  const notifications = getNotifications('');
  const newNotification: Notification = {
    ...notification,
    id: Date.now().toString(),
    read: false,
    created_at: new Date().toISOString(),
  };
  
  const allNotifications = JSON.parse(localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS) || '[]');
  allNotifications.push(newNotification);
  localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(allNotifications));
  
  return newNotification;
}

export function markNotificationAsRead(id: string): void {
  const data = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
  const notifications: Notification[] = data ? JSON.parse(data) : [];
  const index = notifications.findIndex(n => n.id === id);
  if (index !== -1) {
    notifications[index].read = true;
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifications));
  }
}

export function markAllNotificationsAsRead(userId: string): void {
  const data = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
  const notifications: Notification[] = data ? JSON.parse(data) : [];
  notifications.forEach(n => {
    if (n.user_id === userId && !n.read) {
      n.read = true;
    }
  });
  localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifications));
}

// Analytics operations
export function getAnalytics(userId: string): Analytics {
  const data = localStorage.getItem(STORAGE_KEYS.ANALYTICS);
  const analytics: Analytics[] = data ? JSON.parse(data) : [];
  
  if (!userId) {
    // Return default analytics if no userId provided
    return {
      user_id: '',
      waste_saved: 0,
      donations_made: 0,
      items_consumed: 0,
      carbon_footprint_reduced: 0,
      last_updated: new Date().toISOString(),
    };
  }
  
  const userAnalytics = analytics.find(a => a.user_id === userId);
  
  if (userAnalytics) {
    return userAnalytics;
  }
  
  // Create default analytics
  const user = getUserById(userId);
  const defaultAnalytics: Analytics = {
    user_id: userId,
    waste_saved: 0,
    donations_made: 0,
    items_consumed: 0,
    carbon_footprint_reduced: 0,
    donations_received: user?.role === 'ngo' ? 0 : undefined,
    meals_provided: user?.role === 'ngo' ? 0 : undefined,
    people_served: user?.role === 'ngo' ? 0 : undefined,
    last_updated: new Date().toISOString(),
  };
  
  analytics.push(defaultAnalytics);
  localStorage.setItem(STORAGE_KEYS.ANALYTICS, JSON.stringify(analytics));
  return defaultAnalytics;
}

function updateAnalyticsOnConsume(userId: string, quantity: number): void {
  const analytics = getAnalytics(userId);
  analytics.items_consumed += 1;
  analytics.waste_saved += quantity;
  analytics.carbon_footprint_reduced += quantity * 2.5;
  analytics.last_updated = new Date().toISOString();
  
  const data = localStorage.getItem(STORAGE_KEYS.ANALYTICS);
  const allAnalytics: Analytics[] = data ? JSON.parse(data) : [];
  const index = allAnalytics.findIndex(a => a.user_id === userId);
  if (index !== -1) {
    allAnalytics[index] = analytics;
  } else {
    allAnalytics.push(analytics);
  }
  localStorage.setItem(STORAGE_KEYS.ANALYTICS, JSON.stringify(allAnalytics));
}

function updateAnalyticsOnDonationComplete(donation: Donation): void {
  if (!donation.food_item) return; // Skip if food item is missing
  
  // Update restaurant analytics
  const restaurantAnalytics = getAnalytics(donation.restaurant_id);
  restaurantAnalytics.donations_made += 1;
  restaurantAnalytics.waste_saved += donation.food_item.quantity;
  restaurantAnalytics.carbon_footprint_reduced += donation.food_item.quantity * 2.5;
  restaurantAnalytics.last_updated = new Date().toISOString();
  
  // Award reward points to restaurant (based on quantity: 10 points per kg, minimum 10 points)
  const pointsEarned = Math.max(10, Math.round(donation.food_item.quantity * 10));
  const restaurant = getUserById(donation.restaurant_id);
  if (restaurant) {
    restaurant.reward_points = (restaurant.reward_points || 0) + pointsEarned;
    const users = getUsers();
    const userIndex = users.findIndex(u => u.id === restaurant.id);
    if (userIndex !== -1) {
      users[userIndex] = restaurant;
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    }
  }
  
  // Update NGO analytics
  if (donation.ngo_id) {
    const ngoAnalytics = getAnalytics(donation.ngo_id);
    ngoAnalytics.donations_received = (ngoAnalytics.donations_received || 0) + 1;
    ngoAnalytics.meals_provided = (ngoAnalytics.meals_provided || 0) + (donation.food_item.quantity * 2);
    ngoAnalytics.people_served = Math.floor((ngoAnalytics.meals_provided || 0) / 3);
    ngoAnalytics.last_updated = new Date().toISOString();
    
    const data = localStorage.getItem(STORAGE_KEYS.ANALYTICS);
    const allAnalytics: Analytics[] = data ? JSON.parse(data) : [];
    const index = allAnalytics.findIndex(a => a.user_id === donation.ngo_id);
    if (index !== -1) {
      allAnalytics[index] = ngoAnalytics;
    }
    localStorage.setItem(STORAGE_KEYS.ANALYTICS, JSON.stringify(allAnalytics));
  }
  
  const data = localStorage.getItem(STORAGE_KEYS.ANALYTICS);
  const allAnalytics: Analytics[] = data ? JSON.parse(data) : [];
  const index = allAnalytics.findIndex(a => a.user_id === donation.restaurant_id);
  if (index !== -1) {
    allAnalytics[index] = restaurantAnalytics;
  }
  localStorage.setItem(STORAGE_KEYS.ANALYTICS, JSON.stringify(allAnalytics));
}

// Helper functions
function calculateFoodItemStatus(expiryDate: string): FoodItemStatus {
  const days = getDaysUntilExpiry(expiryDate);
  if (days < 0) return 'expired';
  if (days <= 3) return 'expiring_soon';
  return 'active';
}

function getDaysUntilExpiry(expiryDate: string): number {
  const expiry = new Date(expiryDate);
  const now = new Date();
  const diff = expiry.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function calculatePriorityScore(expiryDate: string, quantity: number): number {
  const days = getDaysUntilExpiry(expiryDate);
  if (days < 0) return 100;
  
  // Base score from days (0-70 points)
  let score = Math.max(0, 70 - (days * 10));
  
  // Add quantity factor (0-30 points)
  const quantityFactor = Math.min(30, quantity / 10);
  score += quantityFactor;
  
  return Math.min(100, Math.max(0, Math.round(score)));
}

// Current user session
export function setCurrentUser(user: User | null): void {
  if (typeof window === 'undefined') return;
  if (user) {
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
  } else {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  }
}

export function getCurrentUser(): User | null {
  if (typeof window === 'undefined') return null;
  const data = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
  return data ? JSON.parse(data) : null;
}

// Completion Report operations
export function addCompletionReport(report: Omit<CompletionReport, 'id' | 'created_at'>): CompletionReport {
  const reports = getCompletionReports();
  const newReport: CompletionReport = {
    ...report,
    id: Date.now().toString(),
    created_at: new Date().toISOString(),
  };
  reports.push(newReport);
  localStorage.setItem(STORAGE_KEYS.COMPLETION_REPORTS, JSON.stringify(reports));
  return newReport;
}

export function getCompletionReports(donationId?: string, ngoId?: string): CompletionReport[] {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(STORAGE_KEYS.COMPLETION_REPORTS);
  let reports: CompletionReport[] = data ? JSON.parse(data) : [];
  if (donationId) {
    reports = reports.filter(r => r.donation_id === donationId);
  }
  if (ngoId) {
    reports = reports.filter(r => r.ngo_id === ngoId);
  }
  return reports;
}

export function getCompletionReportByDonationId(donationId: string): CompletionReport | null {
  const reports = getCompletionReports(donationId);
  return reports.length > 0 ? reports[0] : null;
}

// NGO Rating operations
export function getNGORatings(ngoId?: string, donationId?: string): NGORating[] {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(STORAGE_KEYS.NGO_RATINGS);
  let ratings: NGORating[] = data ? JSON.parse(data) : [];
  if (ngoId) {
    ratings = ratings.filter(r => r.ngo_id === ngoId);
  }
  if (donationId) {
    ratings = ratings.filter(r => r.donation_id === donationId);
  }
  return ratings;
}

export function getNGORating(ngoId: string): number {
  const ratings = getNGORatings(ngoId);
  if (ratings.length === 0) return 0;
  const sum = ratings.reduce((acc, r) => acc + r.rating, 0);
  return Math.round((sum / ratings.length) * 10) / 10; // Round to 1 decimal place
}

export function updateNGORating(ngoId: string, donationId: string, rating: number): User | null {
  if (rating < 1 || rating > 5) return null;
  const users = getUsers();
  const ngo = users.find(u => u.id === ngoId && u.role === 'ngo');
  if (!ngo) return null;
  
  // Check if rating already exists for this donation
  const existingRatings = getNGORatings(ngoId, donationId);
  let ratings = getNGORatings();
  
  if (existingRatings.length > 0) {
    // Update existing rating
    const index = ratings.findIndex(r => r.ngo_id === ngoId && r.donation_id === donationId);
    if (index !== -1) {
      ratings[index].rating = rating;
    }
  } else {
    // Add new rating
    const newRating: NGORating = {
      id: Date.now().toString(),
      ngo_id: ngoId,
      donation_id: donationId,
      rating: rating,
      created_at: new Date().toISOString(),
    };
    ratings.push(newRating);
  }
  
  localStorage.setItem(STORAGE_KEYS.NGO_RATINGS, JSON.stringify(ratings));
  
  // Update average rating in user object
  const averageRating = getNGORating(ngoId);
  ngo.rating = averageRating;
  const userIndex = users.findIndex(u => u.id === ngoId);
  if (userIndex !== -1) {
    users[userIndex] = ngo;
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  }
  
  return ngo;
}

// Disposal Request operations
export function getDisposalRequests(restaurantId?: string, ngoId?: string): DisposalRequest[] {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(STORAGE_KEYS.DISPOSAL_REQUESTS);
  let requests: DisposalRequest[] = data ? JSON.parse(data) : [];
  
  // Load food items for disposal requests
  requests = requests.map(request => {
    const foodItem = getFoodItemById(request.food_item_id);
    return { ...request, food_item: foodItem || null };
  }).filter(request => request.food_item !== null) as DisposalRequest[];
  
  if (restaurantId) {
    requests = requests.filter(r => r.restaurant_id === restaurantId);
  }
  if (ngoId) {
    requests = requests.filter(r => r.ngo_id === ngoId);
  }
  return requests;
}

export function getAvailableDisposalRequests(): DisposalRequest[] {
  return getDisposalRequests().filter(r => r.status === 'pending');
}

export function addDisposalRequest(foodItemId: string, restaurantId: string): DisposalRequest {
  const requests = getDisposalRequests();
  const foodItem = getFoodItemById(foodItemId);
  if (!foodItem) throw new Error('Food item not found');
  
  const newRequest: DisposalRequest = {
    id: Date.now().toString(),
    food_item_id: foodItemId,
    restaurant_id: restaurantId,
    food_item: foodItem,
    status: 'pending',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  
  requests.push(newRequest);
  localStorage.setItem(STORAGE_KEYS.DISPOSAL_REQUESTS, JSON.stringify(requests));
  
  // Update food item status
  updateFoodItem(foodItemId, { status: 'donated' });
  
  // Notify all NGOs
  const ngos = getUsers().filter(u => u.role === 'ngo');
  ngos.forEach(ngo => {
    createNotification({
      user_id: ngo.id,
      title: 'New Disposal Request',
      message: `${foodItem.name} (${foodItem.quantity}kg) is available for disposal`,
      type: 'donation',
    });
  });
  
  return newRequest;
}

export function updateDisposalRequest(id: string, updates: Partial<DisposalRequest>): DisposalRequest | null {
  const requests = getDisposalRequests();
  const index = requests.findIndex(r => r.id === id);
  if (index === -1) return null;
  
  const updatedRequest: DisposalRequest = {
    ...requests[index],
    ...updates,
    updated_at: new Date().toISOString(),
  };
  
  requests[index] = updatedRequest;
  localStorage.setItem(STORAGE_KEYS.DISPOSAL_REQUESTS, JSON.stringify(requests));
  
  // Notify restaurant if NGO accepts
  if (updates.status === 'accepted' && updates.ngo_id && updatedRequest.food_item) {
    createNotification({
      user_id: updatedRequest.restaurant_id,
      title: 'Disposal Request Accepted',
      message: `Your disposal request for ${updatedRequest.food_item.name} has been accepted`,
      type: 'donation',
    });
  }
  
  return updatedRequest;
}

// Reward Redemption operations
export function getRewardRedemptions(restaurantId?: string): RewardRedemption[] {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(STORAGE_KEYS.REWARD_REDEMPTIONS);
  let redemptions: RewardRedemption[] = data ? JSON.parse(data) : [];
  if (restaurantId) {
    redemptions = redemptions.filter(r => r.restaurant_id === restaurantId);
  }
  return redemptions.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export function addRewardRedemption(redemption: Omit<RewardRedemption, 'id' | 'created_at' | 'status'>): RewardRedemption | null {
  const user = getUserById(redemption.restaurant_id);
  if (!user || !user.reward_points || user.reward_points < redemption.points_used) {
    return null; // Insufficient points
  }
  
  const redemptions = getRewardRedemptions();
  const newRedemption: RewardRedemption = {
    ...redemption,
    id: Date.now().toString(),
    status: 'pending',
    created_at: new Date().toISOString(),
  };
  
  redemptions.push(newRedemption);
  localStorage.setItem(STORAGE_KEYS.REWARD_REDEMPTIONS, JSON.stringify(redemptions));
  
  // Deduct points
  user.reward_points = user.reward_points - redemption.points_used;
  const users = getUsers();
  const userIndex = users.findIndex(u => u.id === user.id);
  if (userIndex !== -1) {
    users[userIndex] = user;
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  }
  
  return newRedemption;
}

export function updateRewardRedemption(id: string, updates: Partial<RewardRedemption>): RewardRedemption | null {
  const redemptions = getRewardRedemptions();
  const index = redemptions.findIndex(r => r.id === id);
  if (index === -1) return null;
  
  const updatedRedemption: RewardRedemption = {
    ...redemptions[index],
    ...updates,
  };
  
  // If rejected, refund points
  if (updates.status === 'rejected') {
    const user = getUserById(updatedRedemption.restaurant_id);
    if (user) {
      user.reward_points = (user.reward_points || 0) + updatedRedemption.points_used;
      const users = getUsers();
      const userIndex = users.findIndex(u => u.id === user.id);
      if (userIndex !== -1) {
        users[userIndex] = user;
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
      }
    }
  }
  
  redemptions[index] = updatedRedemption;
  localStorage.setItem(STORAGE_KEYS.REWARD_REDEMPTIONS, JSON.stringify(redemptions));
  return updatedRedemption;
}
