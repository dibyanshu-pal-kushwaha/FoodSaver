"""
Train ML models for food waste prediction and recommendations
"""
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor, RandomForestClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import mean_absolute_error, mean_squared_error, accuracy_score, classification_report
import joblib
import os

def load_dataset():
    """Load the generated dataset"""
    if not os.path.exists('food_waste_dataset.csv'):
        print("Dataset not found. Please run generate_dataset.py first.")
        return None
    return pd.read_csv('food_waste_dataset.csv', parse_dates=['purchase_date', 'expiry_date'])

def prepare_features(df):
    """Prepare features for ML models"""
    # CRITICAL: Use days_remaining (from today) instead of days_until_expiry (total shelf life)
    # This is what we actually need for real-time predictions
    
    # Feature columns
    feature_cols = [
        'category_encoded',
        'restaurant_type_encoded',
        'quantity',
        'days_remaining',  # CHANGED: Use days_remaining from today, not days_until_expiry
        'shelf_life',  # Keep shelf_life as additional context
        'month',
        'day_of_week',
        'is_weekend',
        'waste_probability',
    ]
    
    X = df[feature_cols].copy()
    
    # Add interaction features
    X['quantity_expiry_interaction'] = X['quantity'] * X['days_remaining']  # CHANGED
    X['category_waste_interaction'] = X['category_encoded'] * X['waste_probability']
    
    # Add enhanced features for better donation prediction
    perishable_categories = ['Fruits', 'Vegetables', 'Dairy', 'Meat', 'Bakery', 'Prepared Foods']
    X['is_perishable'] = df['category'].isin(perishable_categories).astype(int)
    X['high_quantity'] = (X['quantity'] >= 30).astype(int)
    X['very_high_quantity'] = (X['quantity'] >= 50).astype(int)
    X['quantity_perishable_interaction'] = X['quantity'] * X['is_perishable']
    
    # Add urgency features based on days_remaining
    X['is_expired'] = (X['days_remaining'] < 0).astype(int)
    X['expiring_today'] = (X['days_remaining'] <= 1).astype(int)
    X['expiring_soon'] = (X['days_remaining'] <= 7).astype(int)
    
    return X

def train_expiration_predictor(X, y):
    """Train model to predict days until expiration"""
    print("\n=== Training Expiration Predictor ===")
    
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )
    
    # Train Random Forest Regressor
    model = RandomForestRegressor(
        n_estimators=100,
        max_depth=15,
        min_samples_split=5,
        random_state=42,
        n_jobs=-1
    )
    
    model.fit(X_train, y_train)
    
    # Evaluate
    y_pred = model.predict(X_test)
    mae = mean_absolute_error(y_test, y_pred)
    rmse = np.sqrt(mean_squared_error(y_test, y_pred))
    
    print(f"MAE: {mae:.2f} days")
    print(f"RMSE: {rmse:.2f} days")
    print(f"Feature importance (top 5):")
    feature_importance = pd.Series(model.feature_importances_, index=X.columns)
    print(feature_importance.nlargest(5))
    
    return model

def train_waste_risk_predictor(X, y):
    """Train model to predict waste risk (0-100)"""
    print("\n=== Training Waste Risk Predictor ===")
    
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )
    
    # Train Random Forest Regressor
    model = RandomForestRegressor(
        n_estimators=100,
        max_depth=15,
        min_samples_split=5,
        random_state=42,
        n_jobs=-1
    )
    
    model.fit(X_train, y_train)
    
    # Evaluate
    y_pred = model.predict(X_test)
    mae = mean_absolute_error(y_test, y_pred)
    rmse = np.sqrt(mean_squared_error(y_test, y_pred))
    
    print(f"MAE: {mae:.2f}")
    print(f"RMSE: {rmse:.2f}")
    print(f"Feature importance (top 5):")
    feature_importance = pd.Series(model.feature_importances_, index=X.columns)
    print(feature_importance.nlargest(5))
    
    return model

def train_donation_recommender(X, y):
    """Train model to recommend if item should be donated"""
    print("\n=== Training Donation Recommender ===")
    
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )
    
    # Train Random Forest Classifier
    model = RandomForestClassifier(
        n_estimators=100,
        max_depth=15,
        min_samples_split=5,
        random_state=42,
        n_jobs=-1
    )
    
    model.fit(X_train, y_train)
    
    # Evaluate
    y_pred = model.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)
    
    print(f"Accuracy: {accuracy:.4f}")
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred))
    print(f"\nFeature importance (top 5):")
    feature_importance = pd.Series(model.feature_importances_, index=X.columns)
    print(feature_importance.nlargest(5))
    
    return model

def train_priority_scorer(X, y):
    """Train model to predict priority score"""
    print("\n=== Training Priority Scorer ===")
    
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )
    
    # Train Random Forest Regressor
    model = RandomForestRegressor(
        n_estimators=100,
        max_depth=15,
        min_samples_split=5,
        random_state=42,
        n_jobs=-1
    )
    
    model.fit(X_train, y_train)
    
    # Evaluate
    y_pred = model.predict(X_test)
    mae = mean_absolute_error(y_test, y_pred)
    rmse = np.sqrt(mean_squared_error(y_test, y_pred))
    
    print(f"MAE: {mae:.2f}")
    print(f"RMSE: {rmse:.2f}")
    print(f"Feature importance (top 5):")
    feature_importance = pd.Series(model.feature_importances_, index=X.columns)
    print(feature_importance.nlargest(5))
    
    return model

def main():
    """Main training function"""
    print("Loading dataset...")
    df = load_dataset()
    
    if df is None:
        return
    
    print(f"Dataset loaded: {len(df)} samples")
    
    # Prepare features
    print("\nPreparing features...")
    X = prepare_features(df)
    
    # Train models
    models = {}
    
    # 1. Expiration predictor - predict days_remaining from today
    y_expiry = df['days_remaining']  # CHANGED: Predict days_remaining, not days_until_expiry
    models['expiration_predictor'] = train_expiration_predictor(X, y_expiry)
    
    # 2. Waste risk predictor - use improved waste_risk calculation
    y_waste_risk = df['waste_risk']
    models['waste_risk_predictor'] = train_waste_risk_predictor(X, y_waste_risk)
    
    # 3. Donation recommender
    y_donate = df['should_donate']
    models['donation_recommender'] = train_donation_recommender(X, y_donate)
    
    # 4. Priority scorer
    y_priority = df['priority_score']
    models['priority_scorer'] = train_priority_scorer(X, y_priority)
    
    # Save models
    print("\n=== Saving Models ===")
    os.makedirs('models', exist_ok=True)
    
    for name, model in models.items():
        model_path = f'models/{name}.joblib'
        joblib.dump(model, model_path)
        print(f"Saved: {model_path}")
    
    # Save feature columns for API
    feature_info = {
        'feature_columns': X.columns.tolist(),
    }
    
    # Get category mapping if category column exists
    if 'category' in df.columns:
        if df['category'].dtype.name == 'category':
            category_mapping = dict(enumerate(df['category'].cat.categories))
        else:
            # Convert to categorical or get unique values
            unique_categories = df['category'].unique()
            category_mapping = dict(enumerate(unique_categories))
        feature_info['category_mapping'] = category_mapping
    else:
        feature_info['category_mapping'] = {}
    
    joblib.dump(feature_info, 'models/feature_info.joblib')
    print("Saved: models/feature_info.joblib")
    
    print("\n=== Training Complete ===")
    print("Models saved to 'models/' directory")

if __name__ == '__main__':
    main()

