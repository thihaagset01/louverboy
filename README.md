# Louverboy

Recommend Louver models to Users based off different parameters with integrated weather data from Google Earth Engine.

## Project Structure

- `louvre-selector-app/` - React frontend application
- `weather_api.py` - Flask API for weather data retrieval using Google Earth Engine
- `requirements.txt` - Python dependencies
- `sample_code/` - Reference code samples

## Setup Instructions

### 1. Google Earth Engine Authentication (Required)

Before running the Flask API, you need to authenticate with Google Earth Engine:

```bash
# Install the Earth Engine CLI if not already installed
pip install earthengine-api

# Authenticate with Google Earth Engine
earthengine authenticate
```

Follow the authentication prompts to authorize access to Earth Engine. This will create a credentials file that the API will use.

### 2. Backend Setup (Flask API)

```bash
# Install Python dependencies
pip install -r requirements.txt

# Run the Flask API
python weather_api.py
```

The API will be available at http://localhost:5000

### 3. Frontend Setup (React App)

```bash
# Navigate to the React app directory
cd louvre-selector-app

# Install dependencies (if not already done)
npm install

# Start the React app
npm start
```

The app will be available at http://localhost:3000

## Features

### Weather Data Integration

The application uses Google Earth Engine to retrieve real climate data for any location:

- **Data Source**: ERA5 daily aggregates from ECMWF
- **Climate Period**: 20-year historical average (2000-2020)
- **Available Data**: Temperature and precipitation
- **Endpoint**: POST to `/weather` with a JSON body containing `{"location": "City, Country"}`

### API Endpoints

- `POST /weather` - Get climate data for a location
- `GET /health` - Check API and Earth Engine status

- Multi-step form for collecting project information
- Integration with Google Earth Engine for weather data
- Automatic weather data retrieval based on location input
- Project summary with weather statistics
