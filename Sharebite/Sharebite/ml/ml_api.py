"""
Flask API to serve ML model predictions
"""
from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import os

app = Flask(__name__)
CORS(app)  # Enable CORS for React frontend

# Load models
models = {}
feature_info = None

# Category mapping (simplified - should match training data)
CATEGORY_MAPPING = {
    'Fruits': 0,
    'Vegetables': 1,
    'Dairy': 2,
    'Meat': 3,
    'Bakery': 4,
    'Grains': 5,
    'Beverages': 6,
    'Prepared Foods': 7,
    'Frozen Foods': 8,
    'Canned Goods': 9,
}

RESTAURANT_TYPE_MAPPING = {
    'Fast Food': 0,
    'Fine Dining': 1,
    'Cafe': 2,
    'Buffet': 3,
    'Food Truck': 4,
    'Bakery': 5,
}

def load_models():
    """Load all trained models"""
    global models, feature_info
    
    try:
        models['expiration_predictor'] = joblib.load('models/expiration_predictor.joblib')
        models['waste_risk_predictor'] = joblib.load('models/waste_risk_predictor.joblib')
        models['donation_recommender'] = joblib.load('models/donation_recommender.joblib')
        models['priority_scorer'] = joblib.load('models/priority_scorer.joblib')
        feature_info = joblib.load('models/feature_info.joblib')
        print("Models loaded successfully")
        return True
    except Exception as e:
        print(f"Error loading models: {e}")
        return False

def prepare_features(data):
    """Prepare features for prediction - returns both features DataFrame and metadata"""
    category = data.get('category', 'Fruits')
    restaurant_type = data.get('restaurant_type', 'Fast Food')
    quantity = float(data.get('quantity', 10))
    purchase_date = data.get('purchase_date')
    expiry_date = data.get('expiry_date')
    
    # Get current date
    now = datetime.now()
    now_date = now.date()
    
    # Calculate days remaining from TODAY (not from purchase date)
    days_remaining = None
    total_shelf_life = None
    
    if purchase_date and expiry_date:
        try:
            purchase = pd.to_datetime(purchase_date).date()
            expiry = pd.to_datetime(expiry_date).date()
            
            # Total shelf life (from purchase to expiry)
            total_shelf_life = (expiry - purchase).days
            
            # Days remaining from TODAY
            days_remaining = (expiry - now_date).days
        except:
            total_shelf_life = 7
            days_remaining = 7
    else:
        # Default values if dates not provided
        total_shelf_life = 7
        days_remaining = 7
    
    # Get current date features
    month = now.month
    day_of_week = now.weekday()
    is_weekend = 1 if day_of_week >= 5 else 0
    
    # Category and restaurant type encoding
    category_encoded = CATEGORY_MAPPING.get(category, 0)
    restaurant_type_encoded = RESTAURANT_TYPE_MAPPING.get(restaurant_type, 0)
    
    # Waste probability (matching original training data format)
    waste_probabilities = {
        'Fruits': 0.15, 'Vegetables': 0.20, 'Dairy': 0.10, 'Meat': 0.25,
        'Bakery': 0.30, 'Grains': 0.05, 'Beverages': 0.08,
        'Prepared Foods': 0.35, 'Frozen Foods': 0.05, 'Canned Goods': 0.02,
    }
    waste_probability = waste_probabilities.get(category, 0.15)
    
    # Shelf life estimate (use total shelf life for model compatibility)
    shelf_life = total_shelf_life if total_shelf_life and total_shelf_life > 0 else 7
    
    # CRITICAL FIX: Use days_remaining (from today) instead of days_until_expiry (total shelf life)
    # This matches what the model was trained on
    days_until_expiry = days_remaining if days_remaining is not None else 7
    
    # Enhanced features for better donation prediction
    perishable_categories = ['Fruits', 'Vegetables', 'Dairy', 'Meat', 'Bakery', 'Prepared Foods']
    is_perishable = 1 if category in perishable_categories else 0
    high_quantity = 1 if quantity >= 30 else 0
    very_high_quantity = 1 if quantity >= 50 else 0
    
    # Create feature vector (matching training data format exactly)
    # CRITICAL: Use days_remaining (from today) not days_until_expiry (total shelf life)
    features = pd.DataFrame({
        'category_encoded': [category_encoded],
        'restaurant_type_encoded': [restaurant_type_encoded],
        'quantity': [quantity],
        'days_remaining': [days_remaining],  # FIXED: Use days_remaining from today
        'shelf_life': [shelf_life],
        'month': [month],
        'day_of_week': [day_of_week],
        'is_weekend': [is_weekend],
        'waste_probability': [waste_probability],
    })
    
    # Add interaction features
    features['quantity_expiry_interaction'] = features['quantity'] * features['days_remaining']  # FIXED
    features['category_waste_interaction'] = features['category_encoded'] * features['waste_probability']
    
    # Add enhanced features for donation prediction
    features['is_perishable'] = [is_perishable]
    features['high_quantity'] = [high_quantity]
    features['very_high_quantity'] = [very_high_quantity]
    features['quantity_perishable_interaction'] = [quantity * is_perishable]
    
    # Add urgency features based on days_remaining (matching training)
    features['is_expired'] = [1 if days_remaining < 0 else 0]
    features['expiring_today'] = [1 if days_remaining <= 1 else 0]
    features['expiring_soon'] = [1 if days_remaining <= 7 else 0]
    
    # Calculate metadata separately (not in features DataFrame to avoid model issues)
    # Calculate urgency factor
    if days_remaining <= 0:
        urgency_factor = 1.0
    elif days_remaining <= 1:
        urgency_factor = 0.95
    elif days_remaining <= 3:
        urgency_factor = 0.85
    elif days_remaining <= 7:
        urgency_factor = 0.70
    else:
        urgency_factor = max(0.1, 1.0 - (days_remaining / 30))
    
    quantity_factor = min(1.0, quantity / 100)
    
    # Enhanced waste risk for post-processing
    adjusted_waste_risk = waste_probability * 100 * (1 + urgency_factor * 0.5) * (1 + quantity_factor * 0.3)
    adjusted_waste_risk = min(100, max(0, adjusted_waste_risk))
    
    # Return both features and metadata
    metadata = {
        'days_remaining': days_remaining,
        'urgency_factor': urgency_factor,
        'quantity_factor': quantity_factor,
        'adjusted_waste_risk': adjusted_waste_risk,
    }
    
    return features, metadata

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({'status': 'healthy', 'models_loaded': len(models) > 0})

@app.route('/predict/expiration', methods=['POST'])
def predict_expiration():
    """Predict days until expiration from TODAY"""
    try:
        data = request.json
        features, metadata = prepare_features(data)
        
        # CRITICAL FIX: Always use actual calculation if expiry_date is provided
        # The ML model now predicts days_remaining from today, but actual calculation is always more accurate
        if data.get('expiry_date'):
            try:
                expiry = pd.to_datetime(data.get('expiry_date')).date()
                now = datetime.now().date()
                actual_days_remaining = (expiry - now).days
                prediction = float(actual_days_remaining)
            except:
                # Fallback to ML prediction (which now also predicts days_remaining)
                prediction = float(models['expiration_predictor'].predict(features)[0])
        else:
            # If no expiry date, use ML model prediction (which predicts days_remaining from today)
            prediction = float(models['expiration_predictor'].predict(features)[0])
        
        return jsonify({
            'success': True,
            'predicted_days_until_expiry': prediction,
            'message': f'Predicted to expire in {prediction:.1f} days'
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400

@app.route('/predict/waste-risk', methods=['POST'])
def predict_waste_risk():
    """Predict waste risk (0-100)"""
    try:
        data = request.json
        features, metadata = prepare_features(data)
        
        # Get ML model prediction
        ml_prediction = models['waste_risk_predictor'].predict(features)[0]
        ml_prediction = max(0, min(100, ml_prediction))  # Clamp to 0-100
        
        # Get metadata
        days_remaining = metadata['days_remaining']
        adjusted_risk = metadata['adjusted_waste_risk']
        
        # Combine ML prediction with rule-based adjustments
        # Weight: 70% ML prediction, 30% rule-based adjustment
        combined_risk = (ml_prediction * 0.7) + (adjusted_risk * 0.3)
        
        # CRITICAL FIX: Adjust based on actual days remaining (critical factor)
        # The model should already account for this, but we add safety adjustments
        if days_remaining < 0:
            # Already expired - maximum risk
            final_risk = 100
        elif days_remaining <= 0:
            final_risk = 100
        elif days_remaining <= 1:
            # Expiring today/tomorrow - very high risk
            final_risk = min(100, max(combined_risk, 80))  # At least 80% risk
        elif days_remaining <= 3:
            # Expiring within 3 days - high risk
            final_risk = min(100, max(combined_risk * 1.3, 60))  # At least 60% risk
        elif days_remaining <= 7:
            # Expiring within 7 days - medium-high risk
            final_risk = min(100, max(combined_risk * 1.2, 40))  # At least 40% risk
        else:
            final_risk = combined_risk
        
        final_risk = max(0, min(100, final_risk))
        
        risk_level = 'Low' if final_risk < 30 else 'Medium' if final_risk < 70 else 'High'
        
        return jsonify({
            'success': True,
            'waste_risk_score': float(final_risk),
            'risk_level': risk_level,
            'message': f'Waste risk: {risk_level} ({final_risk:.1f}%)'
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400

@app.route('/predict/donation', methods=['POST'])
def predict_donation():
    """Recommend if item should be donated"""
    try:
        data = request.json
        features, metadata = prepare_features(data)
        
        # Get ML model prediction
        ml_prediction = models['donation_recommender'].predict(features)[0]
        ml_probability = models['donation_recommender'].predict_proba(features)[0][1]
        
        # Get key factors
        days_remaining = metadata['days_remaining']
        quantity = float(data.get('quantity', 10))
        category = data.get('category', 'Fruits')
        
        # Enhanced rule-based donation recommendation logic
        donation_score = 0.0
        
        # CRITICAL: Expired items should be donated if still safe (within 1-2 days of expiry)
        if days_remaining < 0:
            # Expired items: high donation score if recently expired (still safe)
            if days_remaining >= -2:  # Expired within last 2 days - still potentially safe
                donation_score = 0.90
            else:
                donation_score = 0.70  # Expired longer ago - still recommend but lower
        elif days_remaining <= 0:
            donation_score = 1.0
        elif days_remaining <= 1:
            donation_score = 0.95
        elif days_remaining <= 3 and quantity >= 10:
            donation_score = 0.85
        elif days_remaining <= 7 and quantity >= 20:
            donation_score = 0.75
        
        # Enhanced: High quantity items with good shelf life can also be donated
        # This addresses the issue where new items with many days left should still be considered
        perishable_categories = ['Fruits', 'Vegetables', 'Dairy', 'Meat', 'Bakery', 'Prepared Foods']
        is_perishable = category in perishable_categories
        
        # High quantity perishable items are good donation candidates even with many days left
        if quantity >= 50:  # Very high quantity
            donation_score = max(donation_score, 0.65)
        elif quantity >= 30 and is_perishable and days_remaining >= 5:
            # Items with good shelf life but high quantity and perishable nature
            donation_score = max(donation_score, 0.55)
        elif quantity >= 20 and is_perishable and days_remaining >= 7:
            # Moderate quantity perishable items with good shelf life
            donation_score = max(donation_score, 0.50)
        
        # Category-based adjustments for perishable items
        if is_perishable and days_remaining <= 7:
            donation_score = max(donation_score, 0.60)
        
        # Combine ML prediction with rule-based logic
        # Trust ML more (80%) since we fixed the training, but keep rules for edge cases
        combined_probability = (ml_probability * 0.80) + (donation_score * 0.20)
        
        # Lower threshold for donation recommendation (0.45 instead of 0.5)
        # This makes the system more proactive about donations
        should_donate = combined_probability >= 0.45
        
        return jsonify({
            'success': True,
            'should_donate': bool(should_donate),
            'donation_probability': float(combined_probability),
            'message': 'Recommended for donation' if should_donate else 'Not recommended for donation'
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400

@app.route('/predict/priority', methods=['POST'])
def predict_priority():
    """Predict priority score (0-100)"""
    try:
        data = request.json
        features, metadata = prepare_features(data)
        
        # Get ML model prediction
        ml_prediction = models['priority_scorer'].predict(features)[0]
        ml_prediction = max(0, min(100, ml_prediction))  # Clamp to 0-100
        
        # Get key factors
        days_remaining = metadata['days_remaining']
        quantity = float(data.get('quantity', 10))
        urgency_factor = metadata['urgency_factor']
        
        # CRITICAL FIX: Calculate priority based on actual days remaining
        # Expired items should have maximum priority
        if days_remaining < 0:
            # Already expired - maximum priority
            priority_score = 100
        elif days_remaining <= 0:
            priority_score = 100
        elif days_remaining <= 1:
            # Expiring today/tomorrow - very high priority
            priority_score = 90 + min(10, quantity / 10)
        elif days_remaining <= 3:
            # Expiring within 3 days - high priority
            priority_score = 75 + min(15, quantity / 10)
        elif days_remaining <= 7:
            # Expiring within 7 days - medium-high priority
            priority_score = 60 + min(15, quantity / 10)
        else:
            # More time available - use ML prediction adjusted by urgency
            priority_score = (ml_prediction * 0.8) + (urgency_factor * 100 * 0.2)
            priority_score += min(10, quantity / 20)
        
        priority_score = max(0, min(100, priority_score))
        
        priority_level = 'Low' if priority_score < 40 else 'Medium' if priority_score < 70 else 'High'
        
        return jsonify({
            'success': True,
            'priority_score': float(priority_score),
            'priority_level': priority_level,
            'message': f'Priority: {priority_level} ({priority_score:.1f})'
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400

@app.route('/predict/all', methods=['POST'])
def predict_all():
    """Get all predictions at once"""
    try:
        # Ensure models are loaded
        if not models or 'waste_risk_predictor' not in models:
            return jsonify({'success': False, 'error': 'Models not loaded. Please restart the API server.'}), 500
        data = request.json
        features, metadata = prepare_features(data)
        
        # Get days remaining
        days_remaining = metadata['days_remaining']
        
        # Calculate expiration days from TODAY
        if data.get('expiry_date'):
            try:
                expiry = pd.to_datetime(data.get('expiry_date')).date()
                now = datetime.now().date()
                expiration_days = (expiry - now).days
            except:
                expiration_days = float(models['expiration_predictor'].predict(features)[0])
        else:
            expiration_days = float(models['expiration_predictor'].predict(features)[0])
        
        # Get waste risk
        try:
            ml_waste_risk = models['waste_risk_predictor'].predict(features)[0]
            ml_waste_risk = max(0, min(100, ml_waste_risk))
        except Exception as e:
            raise Exception(f"Error predicting waste risk: {str(e)}. Features shape: {features.shape}, Columns: {list(features.columns)}")
        adjusted_risk = metadata['adjusted_waste_risk']
        
        combined_risk = (ml_waste_risk * 0.7) + (adjusted_risk * 0.3)
        if days_remaining < 0:
            # Already expired - maximum risk
            waste_risk = 100
        elif days_remaining <= 0:
            waste_risk = 100
        elif days_remaining <= 1:
            waste_risk = min(100, max(combined_risk * 1.3, 80))  # At least 80% risk
        elif days_remaining <= 3:
            waste_risk = min(100, max(combined_risk * 1.3, 60))  # At least 60% risk
        elif days_remaining <= 7:
            waste_risk = min(100, max(combined_risk * 1.2, 40))  # At least 40% risk
        else:
            waste_risk = combined_risk
        waste_risk = max(0, min(100, waste_risk))
        
        # Get donation recommendation
        ml_donate = models['donation_recommender'].predict(features)[0]
        ml_donate_prob = models['donation_recommender'].predict_proba(features)[0][1]
        quantity = float(data.get('quantity', 10))
        category = data.get('category', 'Fruits')
        
        # Enhanced donation logic (same as in /predict/donation endpoint)
        donation_score = 0.0
        if days_remaining < 0:
            # Expired items: high donation score if recently expired (still safe)
            if days_remaining >= -2:
                donation_score = 0.90
            else:
                donation_score = 0.70
        elif days_remaining <= 0:
            donation_score = 1.0
        elif days_remaining <= 1:
            donation_score = 0.95
        elif days_remaining <= 3 and quantity >= 10:
            donation_score = 0.85
        elif days_remaining <= 7 and quantity >= 20:
            donation_score = 0.75
        
        perishable_categories = ['Fruits', 'Vegetables', 'Dairy', 'Meat', 'Bakery', 'Prepared Foods']
        is_perishable = category in perishable_categories
        
        # High quantity items with good shelf life
        if quantity >= 50:
            donation_score = max(donation_score, 0.65)
        elif quantity >= 30 and is_perishable and days_remaining >= 5:
            donation_score = max(donation_score, 0.55)
        elif quantity >= 20 and is_perishable and days_remaining >= 7:
            donation_score = max(donation_score, 0.50)
        
        if is_perishable and days_remaining <= 7:
            donation_score = max(donation_score, 0.60)
        
        combined_donate_prob = (ml_donate_prob * 0.80) + (donation_score * 0.20)
        should_donate = combined_donate_prob >= 0.45
        
        # Get priority score
        ml_priority = models['priority_scorer'].predict(features)[0]
        ml_priority = max(0, min(100, ml_priority))
        urgency_factor = metadata['urgency_factor']
        
        if days_remaining < 0:
            # Already expired - maximum priority
            priority_score = 100
        elif days_remaining <= 0:
            priority_score = 100
        elif days_remaining <= 1:
            priority_score = 90 + min(10, quantity / 10)
        elif days_remaining <= 3:
            priority_score = 75 + min(15, quantity / 10)
        elif days_remaining <= 7:
            priority_score = 60 + min(15, quantity / 10)
        else:
            priority_score = (ml_priority * 0.8) + (urgency_factor * 100 * 0.2) + min(10, quantity / 20)
        priority_score = max(0, min(100, priority_score))
        
        results = {
            'expiration_days': float(expiration_days),
            'waste_risk': float(waste_risk),
            'should_donate': bool(should_donate),
            'donation_probability': float(combined_donate_prob),
            'priority_score': float(priority_score),
        }
        
        # Add risk and priority levels
        results['waste_risk_level'] = 'Low' if waste_risk < 30 else 'Medium' if waste_risk < 70 else 'High'
        results['priority_level'] = 'Low' if priority_score < 40 else 'Medium' if priority_score < 70 else 'High'
        
        return jsonify({
            'success': True,
            'predictions': results
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400

if __name__ == '__main__':
    print("Loading ML models...")
    if load_models():
        print("Starting Flask API server...")
        app.run(host='0.0.0.0', port=5000, debug=True)
    else:
        print("Failed to load models. Please train models first.")


