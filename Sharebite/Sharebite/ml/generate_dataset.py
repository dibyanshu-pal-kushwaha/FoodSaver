"""
Generate synthetic food waste management dataset for ML training
"""
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import random

# Set random seed for reproducibility
np.random.seed(42)
random.seed(42)

# Food categories and their typical shelf lives
FOOD_CATEGORIES = {
    'Fruits': {'min_shelf_life': 3, 'max_shelf_life': 14, 'waste_probability': 0.15},
    'Vegetables': {'min_shelf_life': 5, 'max_shelf_life': 21, 'waste_probability': 0.20},
    'Dairy': {'min_shelf_life': 7, 'max_shelf_life': 14, 'waste_probability': 0.10},
    'Meat': {'min_shelf_life': 1, 'max_shelf_life': 5, 'waste_probability': 0.25},
    'Bakery': {'min_shelf_life': 2, 'max_shelf_life': 7, 'waste_probability': 0.30},
    'Grains': {'min_shelf_life': 30, 'max_shelf_life': 365, 'waste_probability': 0.05},
    'Beverages': {'min_shelf_life': 30, 'max_shelf_life': 365, 'waste_probability': 0.08},
    'Prepared Foods': {'min_shelf_life': 1, 'max_shelf_life': 3, 'waste_probability': 0.35},
    'Frozen Foods': {'min_shelf_life': 30, 'max_shelf_life': 180, 'waste_probability': 0.05},
    'Canned Goods': {'min_shelf_life': 365, 'max_shelf_life': 1095, 'waste_probability': 0.02},
}

# Restaurant types and their characteristics
RESTAURANT_TYPES = {
    'Fast Food': {'avg_quantity': 50, 'waste_factor': 0.15},
    'Fine Dining': {'avg_quantity': 20, 'waste_factor': 0.25},
    'Cafe': {'avg_quantity': 30, 'waste_factor': 0.20},
    'Buffet': {'avg_quantity': 100, 'waste_factor': 0.30},
    'Food Truck': {'avg_quantity': 40, 'waste_factor': 0.18},
    'Bakery': {'avg_quantity': 60, 'waste_factor': 0.25},
}

def generate_food_item(category, restaurant_type, purchase_date):
    """Generate a single food item with realistic attributes"""
    category_info = FOOD_CATEGORIES[category]
    restaurant_info = RESTAURANT_TYPES[restaurant_type]
    
    # Generate shelf life based on category
    shelf_life = random.randint(
        category_info['min_shelf_life'],
        category_info['max_shelf_life']
    )
    
    # Calculate expiry date
    expiry_date = purchase_date + timedelta(days=shelf_life)
    
    # Generate quantity (normal distribution around restaurant average)
    base_quantity = restaurant_info['avg_quantity']
    quantity = max(1, int(np.random.normal(base_quantity, base_quantity * 0.3)))
    
    # Determine if item will be wasted (based on category and restaurant type)
    waste_prob = category_info['waste_probability'] * (1 + restaurant_info['waste_factor'])
    
    # Days until expiry at purchase
    days_until_expiry = shelf_life
    
    # Status prediction (simplified)
    if days_until_expiry <= 3:
        status = 'expiring_soon'
    elif days_until_expiry < 0:
        status = 'expired'
    else:
        status = 'active'
    
    # Will it be wasted? (for training target)
    will_be_wasted = np.random.random() < waste_prob
    
    # If wasted, determine if consumed or donated
    if will_be_wasted:
        # 70% chance of being wasted (expired), 30% chance of being donated
        if np.random.random() < 0.7:
            final_status = 'expired'
            was_donated = False
        else:
            final_status = 'donated'
            was_donated = True
    else:
        final_status = 'consumed'
        was_donated = False
    
    # Enhanced donation logic: Items with high quantity and good shelf life can also be donated
    # This helps the model learn that donations aren't just for expiring items
    if not was_donated and quantity >= 30 and days_until_expiry >= 5:
        # 15% chance that high-quantity items with good shelf life are proactively donated
        if np.random.random() < 0.15:
            was_donated = True
            final_status = 'donated'
    
    # Calculate priority score (higher for items expiring soon with high quantity)
    if days_until_expiry <= 0:
        priority_score = 100
    elif days_until_expiry <= 1:
        priority_score = 90 + min(quantity / 10, 10)
    elif days_until_expiry <= 3:
        priority_score = 70 + min(quantity / 10, 10)
    elif days_until_expiry <= 7:
        priority_score = 50 + min(quantity / 10, 10)
    else:
        priority_score = 30 + min(quantity / 10, 10)
    
    priority_score = min(priority_score, 100)
    
    return {
        'category': category,
        'restaurant_type': restaurant_type,
        'purchase_date': purchase_date,
        'expiry_date': expiry_date,
        'days_until_expiry': days_until_expiry,
        'quantity': quantity,
        'status': status,
        'final_status': final_status,
        'was_donated': was_donated,
        'priority_score': priority_score,
        'waste_probability': waste_prob,
        'shelf_life': shelf_life,
    }

def generate_dataset(n_samples=10000):
    """Generate complete dataset"""
    data = []
    
    # Generate dates over the past year
    start_date = datetime.now() - timedelta(days=365)
    now = datetime.now()
    now_date = now.date()
    
    for i in range(n_samples):
        # Random purchase date in the past year
        days_ago = random.randint(0, 365)
        purchase_date = start_date + timedelta(days=days_ago)
        
        # Random category and restaurant type
        category = random.choice(list(FOOD_CATEGORIES.keys()))
        restaurant_type = random.choice(list(RESTAURANT_TYPES.keys()))
        
        # Generate food item
        item = generate_food_item(category, restaurant_type, purchase_date)
        data.append(item)
    
    df = pd.DataFrame(data)
    
    # Add derived features
    df['month'] = df['purchase_date'].dt.month
    df['day_of_week'] = df['purchase_date'].dt.dayofweek
    df['is_weekend'] = df['day_of_week'].isin([5, 6]).astype(int)
    
    # CRITICAL FIX: Calculate days_remaining from TODAY (not from purchase date)
    # This is what we actually need for predictions
    # Convert now_date to pandas Timestamp for compatibility
    df['days_remaining'] = (df['expiry_date'] - pd.Timestamp(now_date)).dt.days
    
    # Encode categorical variables
    df['category_encoded'] = pd.Categorical(df['category']).codes
    df['restaurant_type_encoded'] = pd.Categorical(df['restaurant_type']).codes
    
    # Target variables
    df['will_expire'] = (df['final_status'] == 'expired').astype(int)
    
    # Enhanced donation logic: Items should be donated if:
    # 1. They were actually donated, OR
    # 2. They expire within 7 days (using days_remaining from today), OR
    # 3. They have high quantity (>=30) and are perishable, OR
    # 4. They have very high quantity (>=50) regardless of expiry
    # 5. They are already expired (days_remaining < 0) - should be donated if still safe
    perishable = df['category'].isin(['Fruits', 'Vegetables', 'Dairy', 'Meat', 'Bakery', 'Prepared Foods'])
    high_quantity = df['quantity'] >= 30
    very_high_quantity = df['quantity'] >= 50
    expiring_soon = df['days_remaining'] <= 7
    already_expired = df['days_remaining'] < 0
    
    df['should_donate'] = (
        df['was_donated'] | 
        expiring_soon | 
        (high_quantity & perishable) | 
        very_high_quantity |
        (already_expired & perishable)  # Expired perishable items should be donated if still safe
    ).astype(int)
    
    # IMPROVED: Waste risk should consider days_remaining, not just probability
    # Higher risk for items expiring soon or already expired
    base_risk = df['waste_probability'] * 100
    
    # Adjust based on days_remaining
    urgency_multiplier = df['days_remaining'].apply(lambda x: 
        2.0 if x < 0 else  # Already expired
        1.5 if x <= 1 else  # Expiring today/tomorrow
        1.3 if x <= 3 else  # Expiring within 3 days
        1.2 if x <= 7 else  # Expiring within 7 days
        1.0  # More time available
    )
    
    # Also consider quantity (higher quantity = higher risk if expiring)
    quantity_factor = 1 + (df['quantity'] / 100) * 0.3
    
    df['waste_risk'] = (base_risk * urgency_multiplier * quantity_factor).clip(0, 100)
    
    return df

def main():
    """Main function to generate and save dataset"""
    print("Generating synthetic food waste dataset...")
    
    # Generate dataset
    df = generate_dataset(n_samples=15000)
    
    # Save to CSV
    output_file = 'food_waste_dataset.csv'
    df.to_csv(output_file, index=False)
    
    print(f"Dataset generated successfully!")
    print(f"Total samples: {len(df)}")
    print(f"\nDataset statistics:")
    print(f"Categories: {df['category'].nunique()}")
    print(f"Restaurant types: {df['restaurant_type'].nunique()}")
    print(f"\nStatus distribution:")
    print(df['final_status'].value_counts())
    print(f"\nWaste rate: {df['will_expire'].mean() * 100:.2f}%")
    print(f"Donation rate: {df['was_donated'].mean() * 100:.2f}%")
    print(f"\nDataset saved to: {output_file}")
    
    return df

if __name__ == '__main__':
    df = main()



