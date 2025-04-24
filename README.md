## 🌊 Coastal LST Prediction Using Random Forest in GEE
This repository contains code and resources for the project:
"Predicting Coastal Land Surface Temperature with Geospatial Variables Using Random Forest Regression in Google Earth Engine", developed for climate and environmental modeling in coastal Zhejiang, China.

## 📌 Project Overview
This project applies a Random Forest regression model in Google Earth Engine (GEE) to predict Land Surface Temperature (LST) using multiple geospatial predictors. The study focuses on the effects of:

🌧️ Cumulative precipitation,

🧍 Population density, and

🗻 Topographic elevation
on surface temperature variation.

The project includes spatial analysis, feature extraction, model evaluation, and visualization tools.

## 📂 Repository Structure
bash
Copy
Edit
📁 /scripts
 └── coastal_LST_prediction.js     # Main GEE script for modeling and visualization

📄 README.md                        # Project overview and usage instructions
## 🧠 Methods
Data Preprocessing (clip, scale, clean)

Feature Sampling (rain, pop, elevation)

Random Forest Regression using smileRandomForest

Model Evaluation: RMSE, MAE, Scatter plots

Visualizations: Sentinel-2, MODIS, LST maps

## 🗺️ Region of Interest
Coastal region in Zhejiang Province, China
Latitude: 27.75°N – 30.25°N
Longitude: 120.75°E – 122.25°E

## 📦 How to Use
Open the script in Google Earth Engine

Run it to generate maps, metrics, and charts

Adjust parameters or region as needed
