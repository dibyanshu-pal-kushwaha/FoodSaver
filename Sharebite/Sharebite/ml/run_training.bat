@echo off
REM Training pipeline script for Windows

echo === Food Waste ML Training Pipeline ===
echo.

echo Step 1: Generating dataset...
python generate_dataset.py

echo.
echo Step 2: Training models...
python train_models.py

echo.
echo === Training Complete ===
echo Models are ready in the 'models/' directory
echo Start the API server with: python ml_api.py

pause




