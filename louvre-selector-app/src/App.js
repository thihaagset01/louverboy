import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import './App.css';

// Lazy load the map component to improve initial load performance
const LocationMap = lazy(() => import('./components/LocationMap'));

function App() {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    // Step 1 - Project Info
    projectName: '',
    buildingType: '',
    location: '',
    // Step 2 - Technical Requirements
    airflowRate: '',
    rainDefense: '',
    application: '',
    // Step 3 - Contact Info
    architectName: '',
    company: '',
    email: '',
    phone: '',
    mapCoordinates: null, // Store selected coordinates from map
    weatherData: null // Weather data from API
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [weatherCache, setWeatherCache] = useState({});

  const handleInputChange = (field, value) => {
    setFormData(prevData => ({
      ...prevData,
      [field]: value
    }));
    
    // If location field is updated, clear error and fetch weather data after a delay
    if (field === 'location') {
      // Clear any existing error when user is typing
      setError(null);
      
      // Only fetch weather data if the location has enough characters and after user stops typing
      if (value.length > 5) {
        // Use debounce to prevent API calls while user is still typing
        clearTimeout(window.locationTimeout);
        window.locationTimeout = setTimeout(() => {
          fetchWeatherData(value);
        }, 800); // Wait 800ms after user stops typing
      }
    }
  };
  
  // Memoized function to fetch weather data with caching
  const fetchWeatherData = useCallback(async (location) => {
    // Don't fetch if location is too short
    if (!location || location.length < 5) {
      return;
    }

    // Check if we already have cached data for this location
    if (weatherCache[location]) {
      console.log('Using cached weather data for', location);
      setFormData(prevData => ({
        ...prevData,
        weatherData: weatherCache[location],
        mapCoordinates: weatherCache[location].coordinates || null
      }));
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // First check if the API is running
      try {
        const healthCheck = await fetch('http://localhost:5000/health');
        if (!healthCheck.ok) {
          throw new Error('Weather API is not responding');
        }
      } catch (e) {
        console.error('Health check failed:', e);
        throw new Error('Weather service is not running. Please start the Flask API first.');
      }
      
      // If health check passes, proceed with the weather request
      const response = await fetch('http://localhost:5000/weather', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ location: location }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        console.log('Weather data:', data);
        
        // Add coordinates if they don't exist (would come from the API)
        if (!data.coordinates && data.latitude && data.longitude) {
          data.coordinates = [data.latitude, data.longitude];
        }
        
        // Cache the weather data
        setWeatherCache(prevCache => ({
          ...prevCache,
          [location]: data
        }));
        
        setFormData(prev => ({
          ...prev,
          weatherData: data,
          mapCoordinates: data.coordinates || null
        }));
      } else {
        console.error('Weather API error:', data.error);
        throw new Error(data.error || 'Failed to fetch weather data');
      }
    } catch (error) {
      console.error('Failed to fetch weather data:', error);
      setError(error.message || 'Failed to connect to weather service');
    } finally {
      setIsLoading(false);
    }
  }, [weatherCache]);

  const nextStep = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div>
            <h2>Step 1: Project Information</h2>
            <p>Tell us about your project</p>
            
            <div className="form-group">
              <label>Project Name</label>
              <input
                type="text"
                placeholder="Enter project name"
                value={formData.projectName}
                onChange={(e) => handleInputChange('projectName', e.target.value)}
              />
            </div>
            
            <div className="form-group">
              <label>Building Type</label>
              <select
                value={formData.buildingType}
                onChange={(e) => handleInputChange('buildingType', e.target.value)}
              >
                <option value="">Select building type</option>
                <option value="Residential">Residential</option>
                <option value="Commercial">Commercial</option>
                <option value="Industrial">Industrial</option>
                <option value="Warehouse">Warehouse</option>
              </select>
            </div>
            
            <div className="form-group">
              <label>Location</label>
              <input
                type="text"
                placeholder="e.g., Singapore, Marina Bay, or 123 Main St, New York, NY"
                value={formData.location || ''}
                onChange={(e) => handleInputChange('location', e.target.value)}
              />
              {isLoading && <div className="loading-indicator">Fetching weather data...</div>}
              {error && formData.location.length > 5 && <div className="error-message">{error}</div>}
              
              {/* Map component for location selection */}
              {formData.weatherData && formData.mapCoordinates && (
                <div className="location-map-wrapper">
                  <h4>Confirm Location</h4>
                  <Suspense fallback={<div className="loading-indicator">Loading map...</div>}>
                    <LocationMap 
                      coordinates={formData.mapCoordinates} 
                      location={formData.location}
                      onLocationSelect={(coords) => {
                        // When user selects a location on the map
                        if (Array.isArray(coords) && coords.length === 2) {
                          console.log("Selected coordinates:", coords);
                          
                          // First update with coordinates to show immediate feedback
                          const coordString = `${coords[0].toFixed(6)}, ${coords[1].toFixed(6)}`;
                          console.log("Initial coordinates as location:", coordString);
                          
                          // Update coordinates immediately
                          setFormData(prev => ({
                            ...prev,
                            mapCoordinates: coords,
                            location: "Finding location name..." // Temporary placeholder
                          }));
                          
                          // Use Nominatim for reverse geocoding to get a friendly location name
                          fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords[0]}&lon=${coords[1]}&zoom=18&addressdetails=1`)
                            .then(response => response.json())
                            .then(data => {
                              console.log("Reverse geocoding result:", data);
                              
                              // Extract a user-friendly location name
                              let locationName = "";
                              
                              if (data.display_name) {
                                // Get a shorter, more readable version of the location
                                const addressParts = [];
                                
                                // Add the most important parts of the address
                                if (data.address) {
                                  const addr = data.address;
                                  // Priority: suburb/neighborhood, city/town, state, country
                                  if (addr.suburb || addr.neighbourhood || addr.neighbourhood_unit) {
                                    addressParts.push(addr.suburb || addr.neighbourhood || addr.neighbourhood_unit);
                                  }
                                  if (addr.city || addr.town || addr.village) {
                                    addressParts.push(addr.city || addr.town || addr.village);
                                  }
                                  if (addr.state || addr.province) {
                                    addressParts.push(addr.state || addr.province);
                                  }
                                  if (addr.country) {
                                    addressParts.push(addr.country);
                                  }
                                }
                                
                                locationName = addressParts.length > 0 ? 
                                  addressParts.join(", ") : 
                                  data.display_name.split(",").slice(0, 3).join(",");
                              } else {
                                // Fallback to coordinates if no display name
                                locationName = coordString;
                              }
                              
                              console.log("Using location name:", locationName);
                              
                              // Update the form with the friendly location name
                              setFormData(prev => ({
                                ...prev,
                                location: locationName
                              }));
                            })
                            .catch(err => {
                              console.error("Error in reverse geocoding:", err);
                              // Fallback to coordinates if reverse geocoding fails
                              setFormData(prev => ({
                                ...prev,
                                location: coordString
                              }));
                            });
                          
                          // Fetch weather data for the coordinates
                          setIsLoading(true);
                          setError(null);
                          
                          // Fetch weather data directly with better error handling
                          fetch(`http://localhost:5000/weather?lat=${coords[0]}&lon=${coords[1]}`)
                            .then(response => {
                              if (!response.ok) {
                                throw new Error(`HTTP error! Status: ${response.status}`);
                              }
                              return response.json();
                            })
                            .then(data => {
                              console.log("Weather data for map selection:", data);
                              
                              // Check if the response contains an error message
                              if (data.error) {
                                throw new Error(data.error);
                              }
                              
                              // Make sure we have the expected data structure
                              if (!data.average_rainfall && !data.average_temperature) {
                                throw new Error("Received invalid weather data format");
                              }
                              
                              // Update weather data in state
                              setFormData(prev => ({
                                ...prev,
                                weatherData: {
                                  ...data,
                                  // Ensure location is set in the weather data
                                  location: prev.location
                                }
                              }));
                              setIsLoading(false);
                            })
                            .catch(err => {
                              console.error("Error fetching data for map selection:", err);
                              setError(`Failed to fetch weather data: ${err.message}`);
                              setIsLoading(false);
                            });
                        } else {
                          console.error("Invalid coordinates format:", coords);
                        }
                      }}
                    />
                  </Suspense>
                  <p className="map-note">You can click on the map to refine your location if needed</p>
                </div>
              )}
              
              {formData.weatherData && (
                <div className="weather-data">
                  <h4>Weather Data</h4>
                  <div className="weather-data-grid">
                    {formData.weatherData.average_rainfall && (
                      <div className="weather-data-item">
                        <div className="weather-icon">
                          <img src="https://cdn-icons-png.flaticon.com/512/4150/4150897.png" alt="Rainfall" />
                        </div>
                        <p><strong>Rainfall</strong></p>
                        <p className="weather-value">
                          {isFinite(Number(formData.weatherData.average_rainfall)) && !isNaN(Number(formData.weatherData.average_rainfall)) 
                            ? Number(formData.weatherData.average_rainfall).toFixed(1)
                            : '0.0'} mm/day
                        </p>
                      </div>
                    )}
                    {formData.weatherData.average_wind_speed && (
                      <div className="weather-data-item">
                        <div className="weather-icon">
                          <img src="https://cdn-icons-png.flaticon.com/512/1585/1585400.png" alt="Wind" />
                        </div>
                        <p><strong>Wind</strong></p>
                        <p className="weather-value">
                          {isFinite(Number(formData.weatherData.average_wind_speed)) && !isNaN(Number(formData.weatherData.average_wind_speed)) 
                            ? Number(formData.weatherData.average_wind_speed).toFixed(2)
                            : 'N/A'} m/s
                        </p>
                        <p className="wind-direction">
                          {isFinite(Number(formData.weatherData.average_wind_direction)) && !isNaN(Number(formData.weatherData.average_wind_direction)) 
                            ? `${Number(formData.weatherData.average_wind_direction).toFixed(1)}°`
                            : 'N/A'}
                        </p>
                      </div>
                    )}
                    {formData.weatherData.recommended_rain_class && (
                      <div className="weather-data-item rain-class">
                        <div className="weather-icon">
                          <img src="https://cdn-icons-png.flaticon.com/512/1146/1146858.png" alt="Rain Class" />
                        </div>
                        <p><strong>Recommended Rain Class</strong></p>
                        <div className="rain-class-badge-container">
                          <div className={`rain-class-badge class-${formData.weatherData.recommended_rain_class.toLowerCase()}`}>
                            {formData.weatherData.recommended_rain_class}
                          </div>
                        </div>
                        <div className="rain-class-description">
                          {formData.weatherData.recommended_rain_class === 'A' && 'Highest Protection'}
                          {formData.weatherData.recommended_rain_class === 'B' && 'High Protection'}
                          {formData.weatherData.recommended_rain_class === 'C' && 'Moderate Protection'}
                          {formData.weatherData.recommended_rain_class === 'D' && 'Minimal Protection'}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
        
      case 2:
        return (
          <div>
            <h2>Step 2: Technical Requirements</h2>
            <p>Specify your ventilation needs</p>
            

            
            <div className="form-group">
              <label>Rain Defense Level</label>
              <select
                value={formData.rainDefense}
                onChange={(e) => handleInputChange('rainDefense', e.target.value)}
              >
                <option value="">Select rain defense level</option>
                <option value="Good">Good</option>
                <option value="Excellent">Excellent</option>
                <option value="Superior">Superior</option>
              </select>
            </div>
            
            <div className="form-group">
              <label>Application</label>
              <select
                value={formData.application}
                onChange={(e) => handleInputChange('application', e.target.value)}
              >
                <option value="">Select application</option>
                <option value="Intake">Air Intake</option>
                <option value="Exhaust">Air Exhaust</option>
                <option value="Natural">Natural Ventilation</option>
                <option value="Mechanical">Mechanical Ventilation</option>
              </select>
            </div>
          </div>
        );
        
      case 3:
        return (
          <div>
            <h2>Step 3: Contact Information</h2>
            <p>So we can follow up with detailed specifications</p>
            
            <div className="form-group">
              <label>Architect Name</label>
              <input
                type="text"
                placeholder="Your full name"
                value={formData.architectName}
                onChange={(e) => handleInputChange('architectName', e.target.value)}
              />
            </div>
            
            <div className="form-group">
              <label>Company</label>
              <input
                type="text"
                placeholder="Architecture firm name"
                value={formData.company}
                onChange={(e) => handleInputChange('company', e.target.value)}
              />
            </div>
            
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                placeholder="your@email.com"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
              />
            </div>
            
            <div className="form-group">
              <label>Phone</label>
              <input
                type="tel"
                placeholder="+1 (555) 123-4567"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
              />
            </div>
          </div>
        );
        
      case 4:
        return (
          <div>
            <h2>Step 4: Summary</h2>
            <p>Review your information</p>
            
            <div className="summary-section">
              <h3>Project Details</h3>
              <div className="details-list">
                <div className="detail-row">
                  <span className="detail-label">Project Name:</span>
                  <span className="detail-value">{formData.projectName || 'Not specified'}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Building Type:</span>
                  <span className="detail-value">{formData.buildingType || 'Not specified'}</span>
                </div>
                {formData.weatherData && (
                  <div className="detail-row">
                    <span className="detail-label">Location:</span>
                    <span className="detail-value">{formData.weatherData.location}</span>
                  </div>
                )}
              </div>
            </div>
            
            {formData.weatherData && (
              <div className="summary-section">
                <h3>Weather Conditions</h3>
                <div className="details-list">
                  <div className="detail-row">
                    <span className="detail-label">Rainfall:</span>
                    <span className="detail-value">
                      {isFinite(Number(formData.weatherData.average_rainfall)) && !isNaN(Number(formData.weatherData.average_rainfall))
                        ? Number(formData.weatherData.average_rainfall).toFixed(1)
                        : '0.0'} mm/hr
                    </span>
                  </div>
                  {formData.weatherData.average_wind_speed && (
                    <div className="detail-row">
                      <span className="detail-label">Wind:</span>
                      <span className="detail-value">
                        {isFinite(Number(formData.weatherData.average_wind_speed)) && !isNaN(Number(formData.weatherData.average_wind_speed))
                          ? (Number(formData.weatherData.average_wind_speed) > 100
                            ? '5.00'
                            : Number(formData.weatherData.average_wind_speed).toFixed(2))
                          : '5.00'} m/s
                        {formData.weatherData.average_wind_direction && (
                          <span className="wind-direction-text">
                            {' '}at{' '}
                            {isFinite(Number(formData.weatherData.average_wind_direction)) && !isNaN(Number(formData.weatherData.average_wind_direction))
                              ? `${Number(formData.weatherData.average_wind_direction).toFixed(1)}°`
                              : '0.0°'}
                          </span>
                        )}
                      </span>
                    </div>
                  )}
                </div>
                
                {formData.weatherData.recommended_rain_class && (
                  <div className="rain-class-recommendation">
                    <h4>Recommended Rain Class</h4>
                    <div className="rain-class-badge-container">
                      <span className={`rain-class-badge class-${formData.weatherData.recommended_rain_class.toLowerCase()}`}>
                        {formData.weatherData.recommended_rain_class}
                      </span>
                    </div>
                    <p className="rain-class-description">
                      {formData.weatherData.recommended_rain_class === 'A' && 'Highest level of rain protection required'}
                      {formData.weatherData.recommended_rain_class === 'B' && 'High level of rain protection required'}
                      {formData.weatherData.recommended_rain_class === 'C' && 'Moderate level of rain protection required'}
                      {formData.weatherData.recommended_rain_class === 'D' && 'Minimal level of rain protection required'}
                    </p>
                  </div>
                )}
              </div>
            )}
            
            <div className="summary-section">
              <h3>Technical Requirements</h3>
              <div className="details-list">
                <div className="detail-row">
                  <span className="detail-label">Rain Defense:</span>
                  <span className="detail-value">{formData.rainDefense || 'Not specified'}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Application:</span>
                  <span className="detail-value">{formData.application || 'Not specified'}</span>
                </div>
              </div>
            </div>
            
            <div className="summary-section">
              <h3>Contact Information</h3>
              <div className="details-list">
                <div className="detail-row">
                  <span className="detail-label">Contact:</span>
                  <span className="detail-value">{formData.architectName || 'Not specified'}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Email:</span>
                  <span className="detail-value">{formData.email || 'Not specified'}</span>
                </div>
                {formData.phone && (
                  <div className="detail-row">
                    <span className="detail-label">Phone:</span>
                    <span className="detail-value">{formData.phone}</span>
                  </div>
                )}
              </div>
            </div>
            
            <button className="submit-btn">Get Recommendations</button>
          </div>
        );
        
      default:
        return null;
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Louvre Selection Tool</h1>
        <p>Find the perfect performance louvre for your project</p>
      </header>
      
      <div className="form-container">
        {renderStep()}
        
        <div className="navigation">
          <button 
            onClick={prevStep} 
            disabled={currentStep === 1}
            className="prev-btn"
          >
            Previous
          </button>
          
          {currentStep < 4 && (
            <button onClick={nextStep} className="next-btn">
              Next
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;