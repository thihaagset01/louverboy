# Louver Selector Tool

A professional web application for architectural louver selection and recommendation based on industry best practices and pattern recognition.

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Project Overview

The Louver Selector Tool is an expert system that helps architects, engineers, and building professionals select the most appropriate louver models for their projects. It uses a pattern-based recommendation engine that leverages industry expertise and best practices rather than simple mathematical scoring.

### Key Features

- **Pattern-Based Recommendations**: Utilizes industry expertise and pattern recognition to recommend louver models
- **Multi-Tier Recommendations**: Provides primary, secondary, and tertiary recommendations with confidence levels
- **Professional Explanations**: Includes detailed reasoning and explanations for each recommendation
- **Smart Location Validation**: Validates location input and allows manual map selection when needed
- **Weather Data Integration**: Uses location-based weather data to validate and refine recommendations
- **Interactive Form**: 5-step process to gather all necessary project information
- **Responsive Design**: Works on desktop and mobile devices
- **Summary View with Map**: Displays project location on a map in the final summary

### Technical Features

- React-based frontend with hooks for state management
- CSV data loading for louver specifications
- Integration with weather API (requires separate Flask backend)
- Lazy-loaded map component for location selection and validation
- Intelligent location validation with fallback to manual map selection
- Cached weather data to minimize API calls
- Interactive map using React Leaflet
- Pattern-based expert system for recommendations
- Responsive UI with contextual feedback for user inputs

## Location Validation and Weather Data Workflow

The application features an optimized location validation and weather data workflow:

1. **Fast Location Validation**: 
   - Uses direct geocoding for quick location validation without waiting for weather data
   - Provides immediate feedback to users about location validity
   - Extracts exact address and coordinates for precise identification

2. **Background Weather Data Fetching**:
   - Weather data is fetched in the background only after successful location validation
   - Uses coordinates (when available) for more precise weather data
   - Implements efficient caching to prevent duplicate API calls

3. **Weather Data Display**:
   - Weather data is only displayed in the summary step
   - Includes temperature, rainfall, wind speed, and wind direction
   - Calculates rain defense class based on BS EN 13030:2001 standard

4. **Manual Location Selection**:
   - If automatic validation fails, users can manually select their location on a map
   - Clicking on the map sets coordinates and validates the location

5. **Summary View**:
   - Displays the validated location on a map with detailed weather data
   - Shows exact address and coordinates for precise identification
   - Presents rain defense class with detailed explanation

## Setup Requirements

1. **Frontend**: React application (this repository)
2. **Backend**: Flask API for weather data (separate repository)
3. **Data**: CSV file with louver specifications (included in `/public` folder)

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However we understand that this tool wouldn't be useful if you couldn't customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)

## Running the Complete Application

To run the complete Louver Selector Tool with weather data integration:

1. **Start the Flask backend**:
   ```
   cd /path/to/weather_api
   python weather_api.py
   ```
   The API should be running on http://localhost:5000

2. **Start the React frontend**:
   ```
   cd /path/to/louvre-selector-app
   npm start
   ```
   The app will be available at http://localhost:3000

3. **Using the application**:
   - Navigate through the 5-step form process
   - Enter location information to fetch weather data
   - Complete all required fields
   - View recommendations on the final summary page

## Recent Updates

- Implemented pattern-based recommendation system replacing weather-only logic
- Added multi-tier recommendations with confidence levels
- Fixed syntax errors and duplicate declarations
- Enhanced form field consistency and error handling
- Improved CSV data loading with robust error handling
- Added detailed professional explanations for recommendations
- Integrated weather data as a secondary validation layer
