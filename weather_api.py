from flask import Flask, request, jsonify
from flask_cors import CORS
import ee
from geopy.geocoders import Nominatim
import random
import traceback
import os
import sys
import json

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Allow React to call this API

# Initialize once when server starts
# Increase timeout for geocoding requests
geolocator = Nominatim(user_agent="louvre_selector", timeout=10)

# Try to initialize Earth Engine, but provide fallback if it fails
EE_INITIALIZED = False
try:
    # Use the team project ID
    print("Attempting to initialize Earth Engine with project ID: ivory-alcove-426308-d9")
    ee.Initialize(project='ivory-alcove-426308-d9')
    
    # Test if Earth Engine is actually working by making a simple request
    print("Testing Earth Engine initialization with a simple request...")
    try:
        # Try to get a simple image to verify Earth Engine is working
        image = ee.Image('USGS/SRTMGL1_003')
        info = image.getInfo()
        print("Earth Engine test successful! Got image info.")
        EE_INITIALIZED = True
        print("Google Earth Engine initialized successfully!")
    except Exception as test_error:
        print(f"Earth Engine initialization test failed: {test_error}")
        print("Earth Engine appears to be initialized but may not be fully functional.")
        EE_INITIALIZED = False
except Exception as e:
    print(f"Warning: Could not initialize Google Earth Engine: {e}")


@app.route('/weather', methods=['POST'])
def get_weather():
    """Get weather data for a location"""
    try:
        # Get location from request
        data = request.get_json()
        if not data or 'location' not in data:
            return jsonify({'error': 'Please provide a location'}), 400
        
        location_str = data['location']
        
        # Geocode the location
        try:
            location = geolocator.geocode(location_str)
            if not location:
                return jsonify({'error': f'Could not geocode location: {location_str}'}), 400
        except Exception as e:
            return jsonify({'error': f'Geocoding error: {str(e)}'}), 500
        
        # If Earth Engine is initialized, try to get real data
        if EE_INITIALIZED:
            try:
                # Create Earth Engine point
                print(f"Creating Earth Engine point for coordinates: {location.longitude}, {location.latitude}")
                point = ee.Geometry.Point([location.longitude, location.latitude])
                
                # Define date range for weather data (using a 20-year range within available dataset period)
                end_date = '2020-07-09'  # Latest date in the dataset
                start_date = '2000-07-09'  # 20 years before the end date
                print(f"Using 20-year climate data range: {start_date} to {end_date}")
                
                # Fetch dataset
                dataset = ee.ImageCollection('ECMWF/ERA5/DAILY') \
                            .filterDate(start_date, end_date) \
                            .filterBounds(point)
                
                # Check if the dataset is empty
                dataset_size = dataset.size().getInfo()
                print(f"Dataset size: {dataset_size} images")
                
                if dataset_size == 0:
                    print("WARNING: Dataset is empty! Trying a different date range...")
                    # Try a different date range (15 years from an earlier period)
                    start_date = '1985-01-01'
                    end_date = '2000-01-01'
                    print(f"Using alternative 15-year climate data range: {start_date} to {end_date}")
                    
                    dataset = ee.ImageCollection('ECMWF/ERA5/DAILY') \
                                .filterDate(start_date, end_date) \
                                .filterBounds(point)
                    
                    dataset_size = dataset.size().getInfo()
                    print(f"New dataset size: {dataset_size} images")
                    
                    if dataset_size == 0:
                        return jsonify({
                            'error': 'No Earth Engine data available for this location'
                        }), 404
                
                print(f"Successfully fetched dataset from Earth Engine with {dataset_size} images")
                
                # Get a single image from the collection (first image)
                first_image = dataset.first()
                
                # Check if first_image is None
                if first_image is None:
                    print("ERROR: first_image is None despite dataset size > 0")
                    return jsonify({
                        'error': 'Earth Engine dataset is empty or invalid'
                    }), 500
                
                # Print available bands to debug
                print("Available bands:")
                band_names = first_image.bandNames().getInfo()
                print(band_names)
                
                # Create a buffer around the point to make it a small region
                # This helps avoid CRS issues
                buffer_distance = 1000  # 1km buffer
                region = point.buffer(buffer_distance)
                
                # Calculate mean temperature for the entire period
                print("Calculating mean temperature...")
                temp_image = dataset.select('mean_2m_air_temperature').mean()
                
                # Get temperature value using reduceRegion with explicit scale
                temp_stats = temp_image.reduceRegion(
                    reducer=ee.Reducer.mean(),
                    geometry=region,
                    scale=1000,  # 1km resolution
                    maxPixels=1e9
                ).getInfo()
                
                print("Temperature stats:", temp_stats)
                
                # Extract temperature and convert from Kelvin to Celsius
                if 'mean_2m_air_temperature' in temp_stats and temp_stats['mean_2m_air_temperature'] is not None:
                    temp_kelvin = temp_stats['mean_2m_air_temperature']
                    temp_celsius = temp_kelvin - 273.15
                else:
                    # Use a reasonable default if data is missing
                    print("Warning: Temperature data not available, using default value")
                    temp_celsius = 15.0
                
                print(f"Temperature processed: {temp_celsius}°C")
                
                # Calculate mean precipitation for the entire period
                print("Calculating mean precipitation...")
                precip_image = dataset.select('total_precipitation').mean()
                
                # Get precipitation value using reduceRegion with explicit scale
                precip_stats = precip_image.reduceRegion(
                    reducer=ee.Reducer.mean(),
                    geometry=region,
                    scale=1000,  # 1km resolution
                    maxPixels=1e9
                ).getInfo()
                
                print("Precipitation stats:", precip_stats)
                
                # Extract precipitation and convert from meters to mm
                if 'total_precipitation' in precip_stats and precip_stats['total_precipitation'] is not None:
                    rain_meters = precip_stats['total_precipitation']
                    rain_mm = rain_meters * 1000  # Convert m to mm
                else:
                    # Use a reasonable default if data is missing
                    print("Warning: Precipitation data not available, using default value")
                    rain_mm = 2.0
                
                print(f"Rainfall processed: {rain_mm} mm/day")
                
                return jsonify({
                    'location': location.address,
                    'coordinates': [location.latitude, location.longitude],
                    'average_temperature': round(temp_celsius, 2),
                    'average_rainfall': round(rain_mm, 2),
                    'period': f'{start_date} to {end_date}',
                    'data_source': 'Google Earth Engine'
                })
            except Exception as e:
                print(f"Error getting weather data: {e}")
                print(f"Detailed error type: {type(e).__name__}")
                print("Detailed error traceback:")
                traceback.print_exc()
                return jsonify({'error': f'Earth Engine error: {str(e)}'}), 500
        
        # If Earth Engine is not initialized, return an error
        return jsonify({'error': 'Earth Engine is not initialized'}), 503
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/health', methods=['GET'])
def health_check():
    """Simple endpoint to check if the API is running"""
    return jsonify({
        'status': 'ok',
        'earth_engine_initialized': EE_INITIALIZED
    })

if __name__ == '__main__':
    print("Starting Flask server for weather API...")
    print(f"Earth Engine initialized: {EE_INITIALIZED}")
    app.run(debug=True, port=5000)
