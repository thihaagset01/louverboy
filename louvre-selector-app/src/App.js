import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import './App.css';
import Papa from 'papaparse'; // For CSV parsing

// Lazy load the map component to improve initial load performance
const LocationMap = lazy(() => import('./components/LocationMap'));

function App() {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    // Step 1 - Project Basics
    projectName: '',
    buildingType: '',
    location: '',
    buildingHeight: '', // New field: Low-rise, Mid-rise, High-rise
    environmentalExposure: '', // New field: City center, Suburban, Near coast, Open/rural
    // Step 2 - Louver Purpose & Requirements
    primaryPurpose: '', // New field: Fresh air intake, Exhaust air outlet, etc.
    performancePriority: '', // New field: Cost-effective, High weather protection, etc.
    openingWidth: '', // New field: Opening width in meters
    openingHeight: '', // New field: Opening height in meters
    specialRequirements: { // New field: Special requirements checkboxes
      coastal: false,
      acoustic: false,
      security: false,
      highWinds: false
    },
    // Step 3 - Aesthetic & Practical
    preferredFinish: '', // New field: Standard aluminum, Painted, etc.
    installationType: '', // New field: New construction, Retrofit, etc.
    budgetPriority: '', // New field: Most economical, Balanced, Premium
    projectPhase: '',
    decisionTimeline: '',
    projectConstraints: {},
    designPreferences: {},
    performanceStandards: {},
    airflowNeeds: '',
    pressureDrop: '',
    // Step 4 - Contact Info
    contactName: '', // Changed from architectName to match Step 4 form
    contactCompany: '', // Changed from company to match Step 4 form
    contactRole: '',
    contactEmail: '',
    contactPhone: '',
    contactPreference: 'Email',
    additionalNotes: '',
    mapCoordinates: null, // Store selected coordinates from map
    weatherData: null // State for form data and validation
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [weatherCache, setWeatherCache] = useState({}); // Properly declare weatherCache with setter
  const [patternRecommendations, setPatternRecommendations] = useState([]);
  const [louverData, setLouverData] = useState([]);
  const [recommendedLouvers, setRecommendedLouvers] = useState([]);
  const [louverDataLoading, setLouverDataLoading] = useState(false);
  const [louverDataError, setLouverDataError] = useState(null);
  const [weatherDataLoading, setWeatherDataLoading] = useState(false);
  const [weatherDataError, setWeatherDataError] = useState(null);

  // Separate state for location validation
  const [locationValid, setLocationValid] = useState(false);
  const [locationValidating, setLocationValidating] = useState(false);
  const [locationError, setLocationError] = useState(null);
  
  // Function to validate location existence only (fast validation)
  const validateLocation = (location) => {
    if (!location || location.length < 3) return;
    
    setLocationValidating(true);
    setLocationError(null);
    setLocationValid(false);
    
    // Check if we already have cached data for this location
    if (weatherCache[location]) {
      console.log('Using cached location data for validation:', location);
      
      // Extract the cached data
      const data = weatherCache[location];
      
      // Extract detailed location information
      let fullAddress = data.location || '';
      
      // Set coordinates if available
      if (data.coordinates) {
        setFormData(prev => ({
          ...prev,
          coordinates: {
            lat: parseFloat(data.coordinates[0]),
            lng: parseFloat(data.coordinates[1])
          }
        }));
      }
      
      // Store the exact address
      setFormData(prev => ({
        ...prev,
        exactAddress: fullAddress
      }));
      
      // Mark location as valid
      setLocationValid(true);
      setLocationValidating(false);
      return;
    }
    
    console.log('Validating location:', location);
    
    // Use our new lightweight validation endpoint for geocoding only
    // This is much faster than the full weather API call
    fetch('http://localhost:5000/validate-location', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ location })
    })
    .then(response => {
      if (!response.ok) {
        throw new Error(`Location not found or invalid`);
      }
      return response.json();
    })
    .then(data => {
      if (!data || !data.location) {
        throw new Error(`Location not found: ${location}`);
      }
      
      console.log('Location validation successful:', data);
      
      // Extract location information from response
      const fullAddress = data.location || location;
      
      // Extract coordinates
      const coordinates = {
        lat: data.coordinates ? parseFloat(data.coordinates[0]) : 0,
        lng: data.coordinates ? parseFloat(data.coordinates[1]) : 0
      };
      
      // Store coordinates and address in form data
      setFormData(prev => ({
        ...prev,
        coordinates: coordinates,
        exactAddress: fullAddress
      }));
      
      // Mark location as valid
      setLocationValid(true);
      setLocationValidating(false);
      
      // Fetch weather data in the background
      fetchWeatherDataInBackground(fullAddress, coordinates);
    })
    .catch(error => {
      console.error('Error validating location:', error);
      setLocationError(error.message);
      setLocationValidating(false);
    });
  };
  
  // Helper function to check if we have cached weather data
  const checkWeatherCache = (location) => {
    if (weatherCache[location]) {
      console.log('Using cached weather data for:', location);
      setFormData(prev => ({
        ...prev,
        weatherData: weatherCache[location]
      }));
      return true;
    }
    return false;
  };
  
  // Function to fetch weather data in the background after location validation
  // This is only called after a successful location validation
  const fetchWeatherDataInBackground = (fullAddress, coordinates) => {
    // If we're already loading weather data or already have it in the form data, don't fetch again
    if (weatherDataLoading || formData.weatherData) {
      return;
    }
    
    console.log('Fetching weather data in background for:', fullAddress);
    setWeatherDataLoading(true);
    
    // We don't show loading indicators to the user since this is a background task
    // The weather data will only be displayed in the summary step
    
    // We can use either the coordinates or the full address for the weather API
    // Using coordinates is more precise
    fetch(`http://localhost:5000/weather?lat=${coordinates.lat}&lon=${coordinates.lng}`, {
      method: 'GET',  // Using GET with coordinates is more reliable
      headers: {
        'Content-Type': 'application/json'
      }
    })
    .then(response => {
      if (!response.ok) {
        // If GET with coordinates fails, fall back to POST with location string
        return fetch('http://localhost:5000/weather', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ location: fullAddress })
        });
      }
      return response;
    })
    .then(response => {
      if (!response.ok) {
        throw new Error(`Failed to fetch weather data: ${response.statusText}`);
      }
      return response.json();
    })
    .then(data => {
      console.log('Weather data received in background:', data);
      
      // Cache the weather data using the full address as the key
      setWeatherCache(prev => ({
        ...prev,
        [fullAddress]: data
      }));
      
      // We don't update formData.weatherData here
      // It will be loaded when the user reaches the summary step
      
      setWeatherDataLoading(false);
    })
    .catch(error => {
      console.error('Error fetching weather data in background:', error);
      setWeatherDataError(error.message);
      setWeatherDataLoading(false);
    });
  };
  
  // Function to load weather data for the summary step
  const loadWeatherDataForSummary = () => {
    if (!formData.location || !locationValid) return;
    
    // If we already have weather data in formData, no need to do anything
    if (formData.weatherData) {
      console.log('Weather data already loaded for summary');
      return;
    }
    
    // Check if we have cached weather data for this location
    if (checkWeatherCache(formData.exactAddress || formData.location)) {
      console.log('Using cached weather data for summary');
      return;
    }
    
    // No cached data, but we have a valid location, so we need to fetch weather data
    console.log('Fetching weather data for summary step...');
    setWeatherDataLoading(true);
    setWeatherDataError(null);
    
    // If we have coordinates, use them for more precise weather data
    if (formData.coordinates && formData.coordinates.lat && formData.coordinates.lng) {
      fetch(`http://localhost:5000/weather?lat=${formData.coordinates.lat}&lon=${formData.coordinates.lng}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      .then(response => {
        if (!response.ok) {
          // Fall back to POST with location string
          return fetch('http://localhost:5000/weather', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ location: formData.exactAddress || formData.location })
          });
        }
        return response;
      })
      .then(response => {
        if (!response.ok) {
          throw new Error(`Failed to fetch weather data: ${response.statusText}`);
        }
        return response.json();
      })
      .then(data => {
        console.log('Weather data received for summary:', data);
        
        // Cache the weather data
        setWeatherCache(prev => ({
          ...prev,
          [formData.exactAddress || formData.location]: data
        }));
        
        // Update form data with weather information
        setFormData(prev => ({
          ...prev,
          weatherData: data
        }));
        
        setWeatherDataLoading(false);
      })
      .catch(error => {
        console.error('Error fetching weather data for summary:', error);
        setWeatherDataError(error.message);
        setWeatherDataLoading(false);
      });
    } else {
      // No coordinates, use location string
      fetch('http://localhost:5000/weather', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ location: formData.exactAddress || formData.location })
      })
      .then(response => {
        if (!response.ok) {
          throw new Error(`Failed to fetch weather data: ${response.statusText}`);
        }
        return response.json();
      })
      .then(data => {
        console.log('Weather data received for summary:', data);
        
        // Cache the weather data
        setWeatherCache(prev => ({
          ...prev,
          [formData.exactAddress || formData.location]: data
        }));
        
        // Update form data with weather information
        setFormData(prev => ({
          ...prev,
          weatherData: data
        }));
        
        setWeatherDataLoading(false);
      })
      .catch(error => {
        console.error('Error fetching weather data for summary:', error);
        setWeatherDataError(error.message);
        setWeatherDataLoading(false);
      });
    }
  };
  
  // Load louver data from CSV file
  useEffect(() => {
    const loadLouverData = () => {
      console.log('Loading louver data from CSV file...');
      setLouverDataLoading(true);
      setLouverDataError(null);
      
      try {
        // Fetch the CSV file from the public folder
        fetch('/louverdata.csv')
          .then(response => {
            if (!response.ok) {
              throw new Error(`Failed to fetch CSV file: ${response.status} ${response.statusText}`);
            }
            return response.text();
          })
          .then(csvText => {
            console.log('CSV file fetched successfully, parsing data...');
            // Parse the CSV text
            Papa.parse(csvText, {
              header: true,
              skipEmptyLines: true,
              dynamicTyping: true,
              complete: (results) => {
                if (results.errors && results.errors.length > 0) {
                  console.error('CSV parsing errors:', results.errors);
                  setLouverDataError('Error parsing louver data: ' + results.errors.map(e => e.message).join(', '));
                } else if (!results.data || results.data.length === 0) {
                  // Handle empty data case
                  console.error('No valid data found in CSV');
                  setLouverDataError('No louver data found in the CSV file');
                } else {
                  // Filter out any rows that don't have a Louver Model
                  const validData = results.data.filter(row => row && row['Louver Model']);
                  
                  if (validData.length === 0) {
                    console.error('No valid louver models found in CSV');
                    setLouverDataError('No valid louver models found in the CSV file');
                  } else {
                    console.log('Louver data loaded successfully:', validData.length, 'models');
                    console.log('First few louver models:', validData.slice(0, 3));
                    setLouverData(validData);
                  }
                }
                setLouverDataLoading(false);
              },
              error: (error) => {
                console.error('CSV parsing error:', error);
                setLouverDataError('Error parsing louver data: ' + error.message);
                setLouverDataLoading(false);
              }
            });
          })
          .catch(error => {
            console.error('Failed to fetch CSV file:', error);
            setLouverDataError(`Failed to load louver data: ${error.message}`);
            setLouverDataLoading(false);
          });
      } catch (error) {
        console.error('Failed to load louver data:', error);
        setLouverDataError(error.message || 'Failed to load louver data');
        setLouverDataLoading(false);
      }
    };
    
    loadLouverData();
  }, []);
  
  // Generate louver recommendations when step 5 is reached or when relevant form data changes
  useEffect(() => {
    if (currentStep === 5 && louverData.length > 0) {
      generateLouverRecommendations();
    }
  }, [currentStep, louverData, formData.weatherData, formData.buildingType, formData.primaryPurpose, formData.performancePriority, formData.buildingHeight, formData.environmentalExposure]);
  
  // Effect to load weather data when reaching the summary step
  useEffect(() => {
    // When user reaches the summary step, ensure we have weather data
    if (currentStep === 5 && locationValid && formData.location) {
      console.log('Summary step reached: Loading weather data if needed');
      loadWeatherDataForSummary();
    }
  }, [currentStep, locationValid, formData.location, formData.weatherData]);
  
  // Function to determine rain defense class based on BS EN 13030:2001 standard and application requirements
  const determineRainDefenseClass = (formData) => {
    // Default to class D (minimal protection) if no specific requirements
    let requiredRainClass = 'D';
    
    // Step 1: Determine required rain defense class based on application requirements
    // According to BS EN 13030:2001, applications are classified by their sensitivity to water ingress
    
    // Class D (Basic): General purpose applications with minimal sensitivity to water ingress
    // Class C (Moderate): Applications where occasional water ingress is acceptable
    // Class B (High): Applications where water ingress should be minimized
    // Class A (Severe): Applications where water ingress must be prevented
    
    // Map building types to required rain defense classes
    const buildingTypeMap = {
      'Office Building': 'C',
      'Residential': 'C',
      'Commercial': 'C',
      'Industrial': 'B',
      'Educational': 'C',
      'Healthcare': 'B',
      'Hospital': 'A',
      'Data Center': 'A',
      'Laboratory': 'A',
      'Warehouse': 'D',
      'Mixed Use': 'C'
    };
    
    // If building type has a specific requirement, use it
    if (formData.buildingType && buildingTypeMap[formData.buildingType]) {
      requiredRainClass = buildingTypeMap[formData.buildingType];
    }
    
    // Map primary purposes to required rain defense classes
    const purposeMap = {
      'Air Intake': 'B',
      'Equipment Protection': 'A',
      'Weather Protection': 'B',
      'Visual Screening': 'D',
      'Architectural Feature': 'C',
      'Solar Shading': 'C'
    };
    
    // If purpose has a specific requirement, potentially upgrade the class
    if (formData.primaryPurpose && purposeMap[formData.primaryPurpose]) {
      const purposeClass = purposeMap[formData.primaryPurpose];
      const classRanking = { 'A': 3, 'B': 2, 'C': 1, 'D': 0 };
      
      // Only upgrade if the purpose requires higher protection
      if (classRanking[purposeClass] > classRanking[requiredRainClass]) {
        requiredRainClass = purposeClass;
      }
    }
    
    // Special requirements can further increase the required class
    if (formData.specialRequirements) {
      // Coastal environments need high protection due to salt spray and higher wind-driven rain
      if (formData.specialRequirements.coastal) {
        requiredRainClass = requiredRainClass === 'A' ? 'A' : 'B';
      }
      
      // Hurricane zones need highest protection
      if (formData.specialRequirements.hurricane) {
        requiredRainClass = 'A';
      }
    }
    
    // Performance standards explicitly set by the user take highest priority
    if (formData.performanceStandards?.waterPenetration) {
      requiredRainClass = 'A';
    }
    
    // Step 2: Consider weather data from the location
    // The BS EN 13030:2001 standard calculates rain defense class based on:
    // - Rainfall intensity
    // - Wind speed
    // - Wind direction relative to louver orientation
    // - Site exposure level
    
    let weatherBasedClass = 'D'; // Default if no weather data
    
    if (formData.weatherData) {
      // If backend already calculated recommended_rain_class using the standard, use it
      if (formData.weatherData.recommended_rain_class) {
        weatherBasedClass = formData.weatherData.recommended_rain_class;
      }
      // Otherwise, we could implement the calculation here if needed
    }
    
    // Step 3: Final rain class is the more stringent of application requirements and weather data
    const classRanking = { 'A': 3, 'B': 2, 'C': 1, 'D': 0 };
    const finalRainClass = classRanking[weatherBasedClass] > classRanking[requiredRainClass] ? 
                           weatherBasedClass : requiredRainClass;
    
    return {
      finalClass: finalRainClass,
      applicationClass: requiredRainClass,
      weatherClass: weatherBasedClass,
      explanation: getRainClassExplanation(finalRainClass)
    };
  };
  
  // Helper function to get explanation for rain defense classes
  const getRainClassExplanation = (rainClass) => {
    const explanations = {
      'A': 'Class A: Highest level of rain defense. Required for critical applications where water ingress must be prevented.',
      'B': 'Class B: High level of rain defense. Suitable for applications where water ingress should be minimized.',
      'C': 'Class C: Moderate level of rain defense. Acceptable for applications where occasional water ingress is tolerable.',
      'D': 'Class D: Basic level of rain defense. Suitable for general purpose applications with minimal sensitivity to water ingress.'
    };
    
    return explanations[rainClass] || 'Rain defense class information not available.';
  };
  
  // Function to generate louver recommendations based on form data and industry patterns
  const generateLouverRecommendations = () => {
    console.log('Generating pattern-based louver recommendations...');
    console.log('Weather data available:', !!formData.weatherData);
    console.log('Louver data available:', !!louverData, 'Count:', louverData?.length || 0);
    
    if (!louverData || louverData.length === 0) {
      console.error('Cannot generate recommendations: Missing louver data');
      setRecommendedLouvers([]);
      return;
    }
    
    // Extract relevant criteria from form data
    const buildingType = formData.buildingType || '';
    const primaryPurpose = formData.primaryPurpose || '';
    const performancePriority = formData.performancePriority || '';
    const specialRequirements = formData.specialRequirements || {};
    const weatherData = formData.weatherData || {};
    
    console.log('Building type:', buildingType);
    console.log('Primary purpose:', primaryPurpose);
    console.log('Performance priority:', performancePriority);
    console.log('Special requirements:', specialRequirements);
    
    // Industry pattern matching logic based on training data
    const getPatternBasedRecommendations = () => {
      // Define pattern-based recommendations from training data
      const industryPatterns = [
        {
          // Data Centre pattern
          condition: (formData) => {
            return formData.buildingType === 'Industrial' && 
                  (formData.primaryPurpose === 'Equipment screening' || 
                   formData.primaryPurpose === 'Fresh air intake');
          },
          primaryModel: 'PL-2250',
          alternativeModels: ['PL-2250V'],
          confidence: 'High',
          explanation: 'High specification double bank louvers are typically specified for data centers due to their superior performance requirements',
          reasoning: 'Data centers require reliable protection of sensitive equipment while maintaining proper airflow for cooling'
        },
        {
          // MRT/Commercial pattern with balanced needs
          condition: (formData) => {
            return formData.buildingType === 'Commercial' && 
                  formData.performancePriority === 'Balanced cost/performance';
          },
          primaryModel: 'PL-2075',
          alternativeModels: ['PL-1075', 'PL-3075'],
          confidence: 'High',
          explanation: 'PL-2075 offers the balanced performance commonly specified for commercial buildings',
          reasoning: 'Commercial buildings typically need a good balance between rain defense, airflow, and cost efficiency'
        },
        {
          // MRT/Commercial pattern with airflow priority
          condition: (formData) => {
            return formData.buildingType === 'Commercial' && 
                  formData.performancePriority === 'Maximum airflow';
          },
          primaryModel: 'PL-3075',
          alternativeModels: ['PL-2075', 'PL-1075'],
          confidence: 'Medium',
          explanation: 'PL-3075 is preferred when maximum airflow is critical for commercial applications',
          reasoning: 'When airflow is the top priority in commercial buildings, this model provides optimal performance'
        },
        {
          // MRT/Commercial with vertical profile needs
          condition: (formData) => {
            return formData.buildingType === 'Commercial';
          },
          primaryModel: 'PL-2065V',
          alternativeModels: ['PL-2075'],
          confidence: 'Low',
          explanation: 'Vertical profile louvers are sometimes preferred for commercial buildings for aesthetic reasons',
          reasoning: 'Consider this option if vertical visual lines are important to the architectural design'
        },
        {
          // Warehouse/Budget projects
          condition: (formData) => {
            return (formData.buildingType === 'Warehouse' || 
                   formData.performancePriority === 'Cost-effective');
          },
          primaryModel: 'PL-2170',
          alternativeModels: ['PL-2150V'],
          confidence: 'High',
          explanation: 'PL-2170 is commonly specified for warehouse and budget-conscious projects',
          reasoning: 'This model offers adequate performance at a more economical price point'
        },
        {
          // Warehouse/Budget with vertical profile
          condition: (formData) => {
            return formData.buildingType === 'Warehouse';
          },
          primaryModel: 'PL-2150V',
          alternativeModels: ['PL-2170'],
          confidence: 'Medium',
          explanation: 'Vertical profile option for warehouse applications',
          reasoning: 'Provides a different aesthetic while maintaining cost-effectiveness'
        },
        {
          // Staircase/Rooftop screening
          condition: (formData) => {
            return formData.primaryPurpose === 'Equipment screening' || 
                  formData.primaryPurpose === 'Architectural feature';
          },
          primaryModel: 'PL-1075',
          alternativeModels: ['PL-2075'],
          confidence: 'Medium',
          explanation: 'Single bank louvers are typically used for staircase and rooftop screening applications',
          reasoning: 'Provides adequate protection with a simpler design and lower cost'
        },
        {
          // Acoustic requirements
          condition: (formData) => {
            return formData.performanceStandards?.soundAttenuation || 
                  formData.specialRequirements?.acoustic;
          },
          primaryModel: 'AC-150',
          alternativeModels: ['AC-300'],
          confidence: 'High',
          explanation: 'Acoustic louvers are specifically designed for applications where sound attenuation is required',
          reasoning: 'These models include sound-absorbing materials to reduce noise transmission'
        },
        {
          // Higher acoustic requirements
          condition: (formData) => {
            return (formData.performanceStandards?.soundAttenuation || 
                   formData.specialRequirements?.acoustic) && 
                   formData.performancePriority === 'High weather protection';
          },
          primaryModel: 'AC-300',
          alternativeModels: ['AC-150'],
          confidence: 'High',
          explanation: 'Premium acoustic louvers for applications requiring both sound attenuation and high performance',
          reasoning: 'Provides superior acoustic performance with enhanced weather protection'
        }
      ];
      
      // Find matching patterns based on form data
      const matchingPatterns = industryPatterns.filter(pattern => pattern.condition(formData));
      console.log('Matching patterns found:', matchingPatterns.length);
      
      // If no patterns match, return a default recommendation
      if (matchingPatterns.length === 0) {
        console.log('No specific pattern matches, using default recommendations');
        return [
          {
            louverModel: 'PL-2075',
            confidence: 'Low',
            explanation: 'This is a general-purpose louver suitable for most applications',
            reasoning: 'Without specific requirements, this balanced model offers good overall performance',
            alternatives: ['PL-1075', 'PL-3075']
          }
        ];
      }
      
      // Sort patterns by confidence level (High > Medium > Low)
      const confidenceScore = (confidence) => {
        switch (confidence) {
          case 'High': return 3;
          case 'Medium': return 2;
          case 'Low': return 1;
          default: return 0;
        }
      };
      
      const sortedPatterns = [...matchingPatterns].sort((a, b) => {
        return confidenceScore(b.confidence) - confidenceScore(a.confidence);
      });
      
      // Function to determine rain defense class based on BS EN 13030:2001 standard and application requirements
      const determineRainDefenseClass = (formData) => {
        // Default to class D (minimal protection) if no specific requirements
        let requiredRainClass = 'D';
        
        // Step 1: Determine required rain defense class based on application requirements
        // According to BS EN 13030:2001, applications are classified by their sensitivity to water ingress
        
        // Class D (Basic): General purpose applications with minimal sensitivity to water ingress
        // Class C (Moderate): Applications where occasional water ingress is acceptable
        // Class B (High): Applications where water ingress should be minimized
        // Class A (Severe): Applications where water ingress must be prevented
        
        // Map building types to required rain defense classes
        const buildingTypeMap = {
          'Office Building': 'C',
          'Residential': 'C',
          'Commercial': 'C',
          'Industrial': 'B',
          'Educational': 'C',
          'Healthcare': 'B',
          'Hospital': 'A',
          'Data Center': 'A',
          'Laboratory': 'A',
          'Warehouse': 'D',
          'Mixed Use': 'C'
        };
        
        // If building type has a specific requirement, use it
        if (formData.buildingType && buildingTypeMap[formData.buildingType]) {
          requiredRainClass = buildingTypeMap[formData.buildingType];
        }
        
        // Map primary purposes to required rain defense classes
        const purposeMap = {
          'Air Intake': 'B',
          'Equipment Protection': 'A',
          'Weather Protection': 'B',
          'Visual Screening': 'D',
          'Architectural Feature': 'C',
          'Solar Shading': 'C'
        };
        
        // If purpose has a specific requirement, potentially upgrade the class
        if (formData.primaryPurpose && purposeMap[formData.primaryPurpose]) {
          const purposeClass = purposeMap[formData.primaryPurpose];
          const classRanking = { 'A': 3, 'B': 2, 'C': 1, 'D': 0 };
          
          // Only upgrade if the purpose requires higher protection
          if (classRanking[purposeClass] > classRanking[requiredRainClass]) {
            requiredRainClass = purposeClass;
          }
        }
        
        // Special requirements can further increase the required class
        if (formData.specialRequirements) {
          // Coastal environments need high protection due to salt spray and higher wind-driven rain
          if (formData.specialRequirements.coastal) {
            requiredRainClass = requiredRainClass === 'A' ? 'A' : 'B';
          }
          
          // Hurricane zones need highest protection
          if (formData.specialRequirements.hurricane) {
            requiredRainClass = 'A';
          }
        }
        
        // Performance standards explicitly set by the user take highest priority
        if (formData.performanceStandards?.waterPenetration) {
          requiredRainClass = 'A';
        }
        
        // Step 2: Consider weather data from the location
        // The BS EN 13030:2001 standard calculates rain defense class based on:
        // - Rainfall intensity
        // - Wind speed
        // - Wind direction relative to louver orientation
        // - Site exposure level
        
        let weatherBasedClass = 'D'; // Default if no weather data
        
        if (formData.weatherData) {
          // If backend already calculated recommended_rain_class using the standard, use it
          if (formData.weatherData.recommended_rain_class) {
            weatherBasedClass = formData.weatherData.recommended_rain_class;
          }
          // Otherwise, we could implement the calculation here if needed
        }
        
        // Step 3: Final rain class is the more stringent of application requirements and weather data
        const classRanking = { 'A': 3, 'B': 2, 'C': 1, 'D': 0 };
        const finalRainClass = classRanking[weatherBasedClass] > classRanking[requiredRainClass] ? 
                               weatherBasedClass : requiredRainClass;
        
        return {
          finalClass: finalRainClass,
          applicationClass: requiredRainClass,
          weatherClass: weatherBasedClass,
          explanation: getRainClassExplanation(finalRainClass)
        };
      };
      
      // Helper function to get explanation for rain defense classes
      const getRainClassExplanation = (rainClass) => {
        const explanations = {
          'A': 'Class A: Highest level of rain defense. Required for critical applications where water ingress must be prevented.',
          'B': 'Class B: High level of rain defense. Suitable for applications where water ingress should be minimized.',
          'C': 'Class C: Moderate level of rain defense. Acceptable for applications where occasional water ingress is tolerable.',
          'D': 'Class D: Basic level of rain defense. Suitable for general purpose applications with minimal sensitivity to water ingress.'
        };
        
        return explanations[rainClass] || 'Rain defense class information not available.';
      };
      
      // Generate recommendations from the matching patterns
      const recommendations = [];
      
      // Primary recommendation (best match)
      if (sortedPatterns.length > 0) {
        const bestMatch = sortedPatterns[0];
        recommendations.push({
          louverModel: bestMatch.primaryModel,
          confidence: bestMatch.confidence,
          explanation: bestMatch.explanation,
          reasoning: bestMatch.reasoning,
          alternatives: bestMatch.alternativeModels,
          tier: 'Primary',
          rainDefenseClass: determineRainDefenseClass(formData)
        });
      }
      
      // Secondary recommendation (alternative from same pattern or next best pattern)
      if (sortedPatterns.length > 0) {
        const bestMatch = sortedPatterns[0];
        if (bestMatch.alternativeModels && bestMatch.alternativeModels.length > 0) {
          recommendations.push({
            louverModel: bestMatch.alternativeModels[0],
            confidence: adjustConfidence(bestMatch.confidence),
            explanation: `Alternative option within the same category as ${bestMatch.primaryModel}`,
            reasoning: `Provides similar benefits to the primary recommendation with slight differences in performance characteristics`,
            alternatives: [bestMatch.primaryModel],
            tier: 'Secondary'
          });
        } else if (sortedPatterns.length > 1) {
          const secondMatch = sortedPatterns[1];
          recommendations.push({
            louverModel: secondMatch.primaryModel,
            confidence: secondMatch.confidence,
            explanation: secondMatch.explanation,
            reasoning: secondMatch.reasoning,
            alternatives: secondMatch.alternativeModels,
            tier: 'Secondary'
          });
        }
      }
      
      // Tertiary recommendation (consider-if option)
      if (sortedPatterns.length > 1) {
        const secondMatch = sortedPatterns[1];
        if (secondMatch.alternativeModels && secondMatch.alternativeModels.length > 0) {
          recommendations.push({
            louverModel: secondMatch.alternativeModels[0],
            confidence: adjustConfidence(secondMatch.confidence),
            explanation: `Consider this option if ${secondMatch.reasoning.toLowerCase()}`,
            reasoning: `This provides an alternative approach that may be suitable depending on specific project requirements`,
            alternatives: [secondMatch.primaryModel],
            tier: 'Tertiary'
          });
        } else if (sortedPatterns.length > 2) {
          const thirdMatch = sortedPatterns[2];
          recommendations.push({
            louverModel: thirdMatch.primaryModel,
            confidence: thirdMatch.confidence,
            explanation: thirdMatch.explanation,
            reasoning: thirdMatch.reasoning,
            alternatives: thirdMatch.alternativeModels,
            tier: 'Tertiary'
          });
        }
      }
      
      // If we still need more recommendations, add default options
      while (recommendations.length < 3) {
        const defaultModels = ['PL-2075', 'PL-1075', 'PL-3075'];
        const modelToAdd = defaultModels[recommendations.length] || 'PL-2075';
        
        recommendations.push({
          louverModel: modelToAdd,
          confidence: 'Low',
          explanation: 'This is a general-purpose louver suitable for most applications',
          reasoning: 'Without specific requirements, this balanced model offers good overall performance',
          alternatives: defaultModels.filter(m => m !== modelToAdd),
          tier: recommendations.length === 0 ? 'Primary' : 
                recommendations.length === 1 ? 'Secondary' : 'Tertiary'
        });
      }
      
      return recommendations;
    };
    
    // Helper function to adjust confidence level down one step
    const adjustConfidence = (confidence) => {
      switch (confidence) {
        case 'High': return 'Medium';
        case 'Medium': return 'Low';
        default: return 'Low';
      }
    };
    
    // Weather data integration - adjust confidence or add notes based on weather
    const adjustRecommendationsForWeather = (recommendations) => {
      if (!formData.weatherData) return recommendations;
      
      const weatherNotes = [];
      const recommendedRainClass = formData.weatherData.recommended_rain_class || 'C';
      
      // Add weather-based notes
      if (recommendedRainClass === 'A') {
        weatherNotes.push('Rain Class A suggests considering higher-spec options for better weather protection');
      }
      
      if (formData.weatherData.avgWindSpeed > 20) {
        weatherNotes.push('Higher than average wind speeds detected - consider wind load requirements');
      }
      
      // Return recommendations with weather notes
      return recommendations.map(rec => ({
        ...rec,
        weatherNotes: weatherNotes
      }));
    };
    
    // Get pattern-based recommendations
    const patternRecommendations = getPatternBasedRecommendations();
    console.log('Pattern-based recommendations:', patternRecommendations);
    
    // Adjust for weather conditions
    const finalRecommendations = adjustRecommendationsForWeather(patternRecommendations);
    console.log('Final recommendations with weather adjustments:', finalRecommendations);
    
    // Map recommendations to louver data for display
    const enhancedRecommendations = finalRecommendations.map(rec => {
      // Find the actual louver data for this model
      const matchedLouver = louverData.find(l => l['Louver Model'] === rec.louverModel) || {
        'Louver Model': rec.louverModel,
        'Rain Defense Rating': 'Not specified',
        'Airflow Rating': 'Not specified',
        'Type': 'Standard'
      };
      
      return {
        louver: matchedLouver,
        confidence: rec.confidence,
        explanation: rec.explanation,
        reasoning: rec.reasoning,
        alternatives: rec.alternatives,
        tier: rec.tier,
        weatherNotes: rec.weatherNotes || []
      };
    });
    
    setRecommendedLouvers(enhancedRecommendations);
  };
  
  // Handle form input changes
  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // If location changes, handle validation appropriately
    if (field === 'location') {
      // Clear validation status immediately when user starts typing
      if (locationValid || locationError) {
        setLocationValid(false);
        setLocationError(null);
      }
      
      // Only validate if there's enough text to be a valid location
      if (value.length > 3) {
        // Debounce the API call to avoid too many requests
        clearTimeout(window.locationTimeout);
        window.locationTimeout = setTimeout(() => {
          validateLocation(value);
          
          // After successful validation, we'll fetch weather data in the background
          // The weather data will be fetched only after location is validated
        }, 800); // Slightly faster response for better UX
      }
    }
    
    // Map primary purpose to appropriate performance values
    if (field === 'primaryPurpose') {
      let recommendedPriority = '';
      switch(value) {
        case 'Fresh air intake':
          recommendedPriority = 'Maximum airflow';
          break;
        case 'Exhaust air outlet':
          recommendedPriority = 'Cost-effective';
          break;
        case 'Natural ventilation':
          recommendedPriority = 'Balanced cost/performance';
          break;
        case 'Weather protection':
          recommendedPriority = 'High weather protection';
          break;
        default:
          break;
      }
      
      if (recommendedPriority && !formData.performancePriority) {
        setFormData(prev => ({
          ...prev,
          [field]: value,
          performancePriority: recommendedPriority
        }));
        return;
      }
    }
    
    // Update special requirements based on environmental exposure
    if (field === 'environmentalExposure' && value === 'Near coast/water') {
      setFormData(prev => ({
        ...prev,
        [field]: value,
        specialRequirements: {
          ...prev.specialRequirements,
          coastal: true
        }
      }));
      return;
    }
  };

  // Navigation functions
  const nextStep = () => {
    if (currentStep < 5) {
      setCurrentStep(currentStep + 1);
    }
  };
  
  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Render the current step content
  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div>
            <h2>Step 1: Project Basics</h2>
            <p>Let's start with the essential details about your project</p>
            
            <div className="form-group">
              <label>Project Name</label>
              <input
                type="text"
                placeholder="Enter project name"
                value={formData.projectName}
                onChange={(e) => handleInputChange('projectName', e.target.value)}
              />
              <div className="tooltip">A name to identify your project</div>
            </div>
            
            <div className="form-row">
              <div className="form-col">
                <div className="form-group">
                  <label>Primary Purpose</label>
                  <select
                    value={formData.primaryPurpose || ''}
                    onChange={(e) => handleInputChange('primaryPurpose', e.target.value)}
                  >
                    <option value="">Select primary purpose</option>
                    <option value="Fresh air intake">Fresh air intake</option>
                    <option value="Exhaust air outlet">Exhaust air outlet</option>
                    <option value="Natural ventilation">Natural ventilation</option>
                    <option value="Weather protection">Weather protection</option>
                    <option value="Equipment screening">Equipment screening</option>
                    <option value="Architectural feature">Architectural feature</option>
                  </select>
                  <div className="tooltip">The main function of the louver in your project</div>
                </div>
              </div>
              <div className="form-col">
                <div className="form-group">
                  <label>Performance Priority</label>
                  <select
                    value={formData.performancePriority || ''}
                    onChange={(e) => handleInputChange('performancePriority', e.target.value)}
                  >
                    <option value="">Select priority</option>
                    <option value="Maximum airflow">Maximum airflow</option>
                    <option value="High weather protection">High weather protection</option>
                    <option value="Balanced cost/performance">Balanced cost/performance</option>
                    <option value="Cost-effective">Cost-effective</option>
                  </select>
                  <div className="tooltip">What matters most for your project's success?</div>
                </div>
              </div>
            </div>
            
            <div className="section-divider">
              <span>Optional Technical Guidance</span>
            </div>
            <p className="section-note">These fields help us understand your technical needs but are not required at this stage</p>
            
            <div className="form-row">
              <div className="form-col">
                <div className="form-group optional">
                  <label>
                    Estimated Airflow Needs
                    <span className="guidance-badge">•</span>
                  </label>
                  <select
                    value={formData.airflowNeeds || 'Not sure yet'}
                    onChange={(e) => handleInputChange('airflowNeeds', e.target.value)}
                  >
                    <option value="Not sure yet">Not sure yet</option>
                    <option value="Low (<1000 CFM)">Low (&lt;1000 CFM)</option>
                    <option value="Medium (1000-5000 CFM)">Medium (1000-5000 CFM)</option>
                    <option value="High (>5000 CFM)">High (&gt;5000 CFM)</option>
                  </select>
                  <div className="tooltip">Approximate airflow requirements for the system</div>
                </div>
              </div>
              <div className="form-col">
                <div className="form-group optional">
                  <label>
                    Maximum Pressure Drop
                    <span className="guidance-badge">•</span>
                  </label>
                  <select
                    value={formData.pressureDrop || 'Not sure yet'}
                    onChange={(e) => handleInputChange('pressureDrop', e.target.value)}
                  >
                    <option value="Not sure yet">Not sure yet</option>
                    <option value="Low (<0.05 in. w.g.)">Low (&lt;0.05 in. w.g.)</option>
                    <option value="Medium (0.05-0.15 in. w.g.)">Medium (0.05-0.15 in. w.g.)</option>
                    <option value="High (>0.15 in. w.g.)">High (&gt;0.15 in. w.g.)</option>
                  </select>
                  <div className="tooltip">Maximum allowable pressure drop across the louver</div>
                </div>
              </div>
            </div>
            
            <div className="form-group optional">
              <label>
                Performance Standards
                <span className="guidance-badge">•</span>
              </label>
              <div className="checkbox-group">
                <div className="checkbox-item">
                  <input
                    type="checkbox"
                    id="certifiedData"
                    checked={formData.performanceStandards?.certifiedData || false}
                    onChange={(e) => handleInputChange('performanceStandards', {
                      ...formData.performanceStandards,
                      certifiedData: e.target.checked
                    })}
                  />
                  <label htmlFor="certifiedData">Need certified performance data</label>
                </div>
                <div className="checkbox-item">
                  <input
                    type="checkbox"
                    id="pressureSensitive"
                    checked={formData.performanceStandards?.pressureSensitive || false}
                    onChange={(e) => handleInputChange('performanceStandards', {
                      ...formData.performanceStandards,
                      pressureSensitive: e.target.checked
                    })}
                  />
                  <label htmlFor="pressureSensitive">Pressure-sensitive system</label>
                </div>
                <div className="checkbox-item">
                  <input
                    type="checkbox"
                    id="soundAttenuation"
                    checked={formData.performanceStandards?.soundAttenuation || false}
                    onChange={(e) => handleInputChange('performanceStandards', {
                      ...formData.performanceStandards,
                      soundAttenuation: e.target.checked
                    })}
                  />
                  <label htmlFor="soundAttenuation">Sound attenuation important</label>
                </div>
                <div className="checkbox-item">
                  <input
                    type="checkbox"
                    id="needGuidance"
                    checked={formData.performanceStandards?.needGuidance || false}
                    onChange={(e) => handleInputChange('performanceStandards', {
                      ...formData.performanceStandards,
                      needGuidance: e.target.checked
                    })}
                  />
                  <label htmlFor="needGuidance">Need guidance on standards</label>
                </div>
              </div>
              <div className="tooltip">Select any known performance requirements</div>
            </div>
          </div>
        );
        
      case 2:
        return (
          <div>
            <h2>Step 2: Building Details</h2>
            <p>Tell us more about your building's characteristics</p>
            
            <div className="form-row">
              <div className="form-col">
                <div className="form-group">
                  <label>Building Type</label>
                  <select
                    value={formData.buildingType || ''}
                    onChange={(e) => handleInputChange('buildingType', e.target.value)}
                  >
                    <option value="">Select building type</option>
                    <option value="Commercial">Commercial</option>
                    <option value="Residential">Residential</option>
                    <option value="Industrial">Industrial</option>
                    <option value="Institutional">Institutional</option>
                    <option value="Warehouse">Warehouse</option>
                  </select>
                  <div className="tooltip">Type of building for your project</div>
                </div>
              </div>
              <div className="form-col">
                <div className="form-group">
                  <label>Building Height</label>
                  <select
                    value={formData.buildingHeight || ''}
                    onChange={(e) => handleInputChange('buildingHeight', e.target.value)}
                  >
                    <option value="">Select building height</option>
                    <option value="Low-rise (1-3 floors)">Low-rise (1-3 floors)</option>
                    <option value="Mid-rise (4-12 floors)">Mid-rise (4-12 floors)</option>
                    <option value="High-rise (&gt;12 floors)">High-rise (&gt;12 floors)</option>
                  </select>
                  <div className="tooltip">Height category of your building</div>
                </div>
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-col">
                <div className="form-group">
                  <label>Location</label>
                  <div className="input-with-status">
                    <input
                      type="text"
                      placeholder="City, State or Postal Code"
                      value={formData.location || ''}
                      onChange={(e) => handleInputChange('location', e.target.value)}
                      className={locationError ? 'input-error' : locationValid ? 'input-valid' : ''}
                    />
                    {formData.location && (
                      <button 
                        className="clear-input-btn" 
                        onClick={() => {
                          handleInputChange('location', '');
                          setLocationValid(false);
                          setLocationError(null);
                          setLocationValidating(false);
                        }}
                        type="button"
                        aria-label="Clear location"
                      >
                        ×
                      </button>
                    )}
                    {locationValidating && <span className="validation-indicator validating">Validating...</span>}
                    {locationValid && !locationValidating && <span className="validation-indicator valid">✓ Valid location</span>}
                    {locationError && !locationValidating && <span className="validation-indicator error">{locationError}</span>}
                  </div>
                  {locationValid && formData.exactAddress && (
                    <div className="exact-address-display">
                      <span className="exact-address-label">Exact location:</span> {formData.exactAddress}
                      {formData.coordinates && (
                        <div className="coordinates-display">
                          <span className="coordinates-label">Coordinates:</span> 
                          {formData.coordinates.lat.toFixed(4)}, {formData.coordinates.lng.toFixed(4)}
                        </div>
                      )}
                    </div>
                  )}
                  <div className="tooltip">Location helps us assess climate factors</div>
                </div>
              </div>
              <div className="form-col">
                <div className="form-group">
                  <label>Environmental Exposure</label>
                  <select
                    value={formData.environmentalExposure || ''}
                    onChange={(e) => handleInputChange('environmentalExposure', e.target.value)}
                  >
                    <option value="">Select exposure type</option>
                    <option value="City center">City center</option>
                    <option value="Suburban">Suburban</option>
                    <option value="Near coast/water">Near coast/water</option>
                    <option value="Open/rural">Open/rural</option>
                  </select>
                  <div className="tooltip">Environmental conditions at the building site</div>
                </div>
              </div>
            </div>
            
            <div className="form-group">
              <label>Special Requirements</label>
              <div className="checkbox-group">
                <div className="checkbox-item">
                  <input
                    type="checkbox"
                    id="highWinds"
                    checked={formData.specialRequirements?.highWinds || false}
                    onChange={(e) => handleInputChange('specialRequirements', {
                      ...formData.specialRequirements,
                      highWinds: e.target.checked
                    })}
                  />
                  <label htmlFor="highWinds">High wind area</label>
                </div>
                <div className="checkbox-item">
                  <input
                    type="checkbox"
                    id="coastal"
                    checked={formData.specialRequirements?.coastal || false}
                    onChange={(e) => handleInputChange('specialRequirements', {
                      ...formData.specialRequirements,
                      coastal: e.target.checked
                    })}
                  />
                  <label htmlFor="coastal">Coastal/corrosive environment</label>
                </div>
                <div className="checkbox-item">
                  <input
                    type="checkbox"
                    id="acoustic"
                    checked={formData.specialRequirements?.acoustic || false}
                    onChange={(e) => handleInputChange('specialRequirements', {
                      ...formData.specialRequirements,
                      acoustic: e.target.checked
                    })}
                  />
                  <label htmlFor="acoustic">Acoustic requirements</label>
                </div>
                <div className="checkbox-item">
                  <input
                    type="checkbox"
                    id="hurricane"
                    checked={formData.specialRequirements?.hurricane || false}
                    onChange={(e) => handleInputChange('specialRequirements', {
                      ...formData.specialRequirements,
                      hurricane: e.target.checked
                    })}
                  />
                  <label htmlFor="hurricane">Hurricane zone</label>
                </div>
              </div>
              <div className="tooltip">Select any special requirements that apply to your project</div>
            </div>
            
            {/* Location validation status is now shown inline with the input field */}
          </div>
        );
        
      case 3:
        return (
          <div>
            <h2>Step 3: Project Context & Constraints</h2>
            <p>Help us understand your design process and project constraints</p>
            
            <div className="form-row">
              <div className="form-col">
                <div className="form-group">
                  <label>Project Phase</label>
                  <select
                    value={formData.projectPhase || ''}
                    onChange={(e) => handleInputChange('projectPhase', e.target.value)}
                  >
                    <option value="">Select current phase</option>
                    <option value="Concept Design">Concept Design</option>
                    <option value="Schematic Design">Schematic Design</option>
                    <option value="Design Development">Design Development</option>
                    <option value="Construction Documents">Construction Documents</option>
                  </select>
                  <div className="tooltip">Helps us tailor information to your current design stage</div>
                </div>
              </div>
              <div className="form-col">
                <div className="form-group">
                  <label>Decision Timeline</label>
                  <select
                    value={formData.decisionTimeline || ''}
                    onChange={(e) => handleInputChange('decisionTimeline', e.target.value)}
                  >
                    <option value="">Select timeline</option>
                    <option value="This week">This week</option>
                    <option value="Within month">Within a month</option>
                    <option value="2-3 months">2-3 months</option>
                    <option value="6+ months">6+ months</option>
                  </select>
                  <div className="tooltip">When do you need to finalize louver specifications?</div>
                </div>
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-col">
                <div className="form-group">
                  <label>Project Constraints</label>
                  <div className="checkbox-group">
                    <div className="checkbox-item">
                      <input
                        type="checkbox"
                        id="budgetConscious"
                        checked={formData.projectConstraints?.budgetConscious || false}
                        onChange={(e) => handleInputChange('projectConstraints', {
                          ...formData.projectConstraints,
                          budgetConscious: e.target.checked
                        })}
                      />
                      <label htmlFor="budgetConscious">Budget-conscious</label>
                    </div>
                    <div className="checkbox-item">
                      <input
                        type="checkbox"
                        id="fastTrack"
                        checked={formData.projectConstraints?.fastTrack || false}
                        onChange={(e) => handleInputChange('projectConstraints', {
                          ...formData.projectConstraints,
                          fastTrack: e.target.checked
                        })}
                      />
                      <label htmlFor="fastTrack">Fast-track schedule</label>
                    </div>
                    <div className="checkbox-item">
                      <input
                        type="checkbox"
                        id="limitedAccess"
                        checked={formData.projectConstraints?.limitedAccess || false}
                        onChange={(e) => handleInputChange('projectConstraints', {
                          ...formData.projectConstraints,
                          limitedAccess: e.target.checked
                        })}
                      />
                      <label htmlFor="limitedAccess">Limited maintenance access</label>
                    </div>
                  </div>
                  <div className="tooltip">Select any key constraints affecting your project</div>
                </div>
              </div>
              <div className="form-col">
                <div className="form-group">
                  <label>Aesthetic & Design Preferences</label>
                  <div className="checkbox-group">
                    <div className="checkbox-item">
                      <input
                        type="checkbox"
                        id="aestheticsCritical"
                        checked={formData.projectConstraints?.aestheticsCritical || false}
                        onChange={(e) => handleInputChange('projectConstraints', {
                          ...formData.projectConstraints,
                          aestheticsCritical: e.target.checked
                        })}
                      />
                      <label htmlFor="aestheticsCritical">Aesthetics critical</label>
                    </div>
                    <div className="checkbox-item">
                      <input
                        type="checkbox"
                        id="customColor"
                        checked={formData.designPreferences?.customColor || false}
                        onChange={(e) => handleInputChange('designPreferences', {
                          ...formData.designPreferences,
                          customColor: e.target.checked
                        })}
                      />
                      <label htmlFor="customColor">Custom color/finish required</label>
                    </div>
                    <div className="checkbox-item">
                      <input
                        type="checkbox"
                        id="minimalistDesign"
                        checked={formData.designPreferences?.minimalistDesign || false}
                        onChange={(e) => handleInputChange('designPreferences', {
                          ...formData.designPreferences,
                          minimalistDesign: e.target.checked
                        })}
                      />
                      <label htmlFor="minimalistDesign">Minimalist design preferred</label>
                    </div>
                    <div className="checkbox-item">
                      <input
                        type="checkbox"
                        id="matchExisting"
                        checked={formData.designPreferences?.matchExisting || false}
                        onChange={(e) => handleInputChange('designPreferences', {
                          ...formData.designPreferences,
                          matchExisting: e.target.checked
                        })}
                      />
                      <label htmlFor="matchExisting">Must match existing building elements</label>
                    </div>
                  </div>
                  <div className="tooltip">Select any aesthetic considerations for your project</div>
                </div>
              </div>
            </div>
          </div>
        );
        
      case 4:
        return (
          <div>
            <h2>Step 4: Contact Information</h2>
            <p>Help us prepare your personalized louver recommendations</p>
            
            <div className="form-row">
              <div className="form-col">
                <div className="form-group">
                  <label>Your Name</label>
                  <input
                    type="text"
                    placeholder="Enter your name"
                    value={formData.contactName || ''}
                    onChange={(e) => handleInputChange('contactName', e.target.value)}
                  />
                </div>
              </div>
              <div className="form-col">
                <div className="form-group">
                  <label>Company/Organization</label>
                  <input
                    type="text"
                    placeholder="Enter your company or organization"
                    value={formData.contactCompany || ''}
                    onChange={(e) => handleInputChange('contactCompany', e.target.value)}
                  />
                </div>
              </div>
            </div>
            
            <div className="form-group">
              <label>Role</label>
              <select
                value={formData.contactRole || ''}
                onChange={(e) => handleInputChange('contactRole', e.target.value)}
              >
                <option value="">Select your role</option>
                <option value="Architect">Architect</option>
                <option value="M&E Consultant">M&E Consultant</option>
                <option value="Facade Consultant">Facade Consultant</option>
                <option value="Project Manager">Project Manager</option>
                <option value="Contractor">Contractor</option>
                <option value="Building Owner">Building Owner</option>
                <option value="Other">Other</option>
              </select>
            </div>
            
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                placeholder="Enter your email"
                value={formData.contactEmail || ''}
                onChange={(e) => handleInputChange('contactEmail', e.target.value)}
              />
              <div className="tooltip">We'll send your recommendations to this address</div>
            </div>
            
            <div className="form-row">
              <div className="form-col">
                <div className="form-group">
                  <label>Phone <span className="guidance-badge">•</span></label>
                  <input
                    type="tel"
                    placeholder="Enter your phone number"
                    value={formData.contactPhone || ''}
                    onChange={(e) => handleInputChange('contactPhone', e.target.value)}
                  />
                </div>
              </div>
              <div className="form-col">
                <div className="form-group">
                  <label>Preferred Contact Method</label>
                  <div className="radio-group">
                    <div className="radio-item">
                      <input
                        type="radio"
                        id="contactEmail"
                        name="contactPreference"
                        checked={formData.contactPreference === 'Email'}
                        onChange={() => handleInputChange('contactPreference', 'Email')}
                      />
                      <label htmlFor="contactEmail">Email</label>
                    </div>
                    <div className="radio-item">
                      <input
                        type="radio"
                        id="contactPhone"
                        name="contactPreference"
                        checked={formData.contactPreference === 'Phone'}
                        onChange={() => handleInputChange('contactPreference', 'Phone')}
                      />
                      <label htmlFor="contactPhone">Phone</label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="form-group">
              <label>Additional Notes <span className="guidance-badge">•</span></label>
              <textarea
                placeholder="Any other information that might help us understand your project needs"
                value={formData.additionalNotes || ''}
                onChange={(e) => handleInputChange('additionalNotes', e.target.value)}
                rows="4"
              ></textarea>
            </div>
          </div>
        );
        
      case 5:
        return (
          <div>
            <h2>Step 5: Project Discovery Summary</h2>
            <p>Review your information and explore initial recommendations</p>
            
            <div className="summary-section">
              <h3>Project Overview</h3>
              <div className="summary-grid">
                <div className="summary-item">
                  <span className="summary-label">Project Name:</span>
                  <span className="summary-value">{formData.projectName || 'Not specified'}</span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Building Type:</span>
                  <span className="summary-value">{formData.buildingType || 'Not specified'}</span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Location:</span>
                  <span className="summary-value">{formData.location || 'Not specified'}</span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Primary Purpose:</span>
                  <span className="summary-value">{formData.primaryPurpose || 'Not specified'}</span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Project Phase:</span>
                  <span className="summary-value">{formData.projectPhase || 'Not specified'}</span>
                </div>
              </div>
            </div>
            
            <div className="summary-section weather-data">
              <h3>Environmental Conditions</h3>
              
              {weatherDataLoading && <div className="loading-indicator">Loading weather data...</div>}
              
              {weatherDataError && <div className="error-message">{weatherDataError}</div>}
              
              {!weatherDataLoading && !formData.weatherData && locationValid && (
                <div className="loading-indicator">Fetching weather data for your location...</div>
              )}
              
              {formData.weatherData && (
                <div className="weather-data-container">
                  <div className="weather-data-item">
                    <span className="label">Climate Zone:</span>
                    <span className="value">{formData.weatherData.climate_zone || 'Not available'}</span>
                  </div>
                  
                  <div className="weather-data-item">
                    <span className="label">Average Temperature:</span>
                    <span className="value">
                      {formData.weatherData.average_temperature ? 
                        `${formData.weatherData.average_temperature}°C` : 
                        (formData.weatherData.avgTemp ? `${formData.weatherData.avgTemp}°C` : 'Not available')}
                    </span>
                  </div>
                  
                  <div className="weather-data-item">
                    <span className="label">Average Rainfall:</span>
                    <span className="value">
                      {formData.weatherData.average_rainfall ? 
                        `${formData.weatherData.average_rainfall} mm/day` : 
                        (formData.weatherData.avgRainfall ? `${formData.weatherData.avgRainfall} mm/year` : 'Not available')}
                    </span>
                  </div>
                  
                  <div className="weather-data-item">
                    <span className="label">Average Wind Speed:</span>
                    <span className="value">
                      {formData.weatherData.average_wind_speed ? 
                        `${formData.weatherData.average_wind_speed} m/s` : 
                        (formData.weatherData.avgWindSpeed ? `${formData.weatherData.avgWindSpeed} km/h` : 'Not available')}
                    </span>
                  </div>
                  
                  <div className="weather-data-item">
                    <span className="label">Recommended Rain Defense Class:</span>
                    {(() => {
                      const rainDefenseInfo = determineRainDefenseClass(formData);
                      return (
                        <>
                          <span className="value highlight">{rainDefenseInfo.finalClass}</span>
                          <span className="rain-class-note">
                            {rainDefenseInfo.explanation}
                          </span>
                          <div className="rain-class-details">
                            <div className="rain-class-factor">
                              <span className="factor-label">Application-based:</span> 
                              <span className="factor-value">{rainDefenseInfo.applicationClass}</span>
                            </div>
                            <div className="rain-class-factor">
                              <span className="factor-label">Weather-based:</span> 
                              <span className="factor-value">{rainDefenseInfo.weatherClass}</span>
                            </div>
                            <div className="rain-class-standard">
                              Based on BS EN 13030:2001 standard
                            </div>
                          </div>
                        </>
                      );
                    })()} 
                  </div>
                </div>
              )}
              
              {/* Location information in summary step */}
              {locationValid && formData.exactAddress && (
                <div className="summary-location-container">
                  <h4>Project Location</h4>
                  <p className="summary-address">{formData.exactAddress}</p>
                  {formData.coordinates && (
                    <div className="location-map-container">
                      <iframe
                        title="Project Location Map"
                        className="location-map"
                        src={`https://maps.google.com/maps?q=${formData.coordinates.lat},${formData.coordinates.lng}&z=15&output=embed`}
                        width="100%"
                        height="250"
                        style={{ border: 0, borderRadius: '4px', marginTop: '10px' }}
                        allowFullScreen=""
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                      ></iframe>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <div className="summary-section">
              <h3>Initial Louver Recommendations</h3>
              {recommendedLouvers.length > 0 ? (
                <div className="recommendations-section">
                  <h3>Recommended Louver Solutions</h3>
                  <p className="recommendation-intro">Based on industry best practices and your project requirements</p>
                  <div className="recommendations-grid">
                    {recommendedLouvers.map((rec, index) => (
                      <div className="recommendation-card" key={index}>
                        <div className="recommendation-header">
                          <h4>{rec.louver['Louver Model'] || 'Recommendation ' + (index + 1)}</h4>
                          <span className={`confidence-badge ${(rec.confidence || 'Medium').toLowerCase()}`}>
                            {rec.confidence || 'Medium'} Confidence
                          </span>
                          <span className="tier-badge">{rec.tier || `Tier ${index + 1}`}</span>
                        </div>
                        <div className="recommendation-details">
                          <p><strong>Rain Defense:</strong> {rec.louver['Rain Defense Rating'] || 'Not specified'}</p>
                          <p><strong>Airflow Rating:</strong> {rec.louver['Airflow Rating'] || 'Not specified'}</p>
                          <p><strong>Type:</strong> {rec.louver['Type'] || 'Standard'}</p>
                          <p className="recommendation-explanation">{rec.explanation || 'This louver matches your requirements'}</p>
                          {rec.reasoning && <p className="recommendation-reasoning">{rec.reasoning}</p>}
                          {rec.weatherNotes && rec.weatherNotes.length > 0 && (
                            <div className="weather-notes">
                              <p><strong>Weather Considerations:</strong></p>
                              <ul>
                                {rec.weatherNotes.map((note, i) => (
                                  <li key={i}>{note}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {rec.alternatives && rec.alternatives.length > 0 && (
                            <p className="alternatives"><strong>Alternatives:</strong> {rec.alternatives.join(', ')}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="no-recommendations">Complete all required fields to generate recommendations</p>
              )}
            </div>
            
            <div className="summary-section what-we-determine">
              <h3>What We'll Determine Next</h3>
              <p className="discovery-note">This tool is the first step in our specification process. After reviewing your project details, our team will provide:</p>
              
              <div className="next-steps-grid">
                <div className="next-step-item">
                  <span className="next-step-icon">📊</span>
                  <span className="next-step-label">Detailed Performance Calculations</span>
                  <span className="next-step-description">Precise airflow rates, pressure drops, and water penetration resistance values</span>
                </div>
                <div className="next-step-item">
                  <span className="next-step-icon">🔧</span>
                  <span className="next-step-label">Technical Specifications</span>
                  <span className="next-step-description">Mounting details, material specifications, and integration requirements</span>
                </div>
                <div className="next-step-item">
                  <span className="next-step-icon">📝</span>
                  <span className="next-step-label">Compliance Documentation</span>
                  <span className="next-step-description">Certification documents and performance test reports</span>
                </div>
                <div className="next-step-item">
                  <span className="next-step-icon">💰</span>
                  <span className="next-step-label">Cost Estimates</span>
                  <span className="next-step-description">Detailed pricing and potential value engineering options</span>
                </div>
              </div>
              
              <p className="follow-up-note">Our technical team will contact you within 1 business day to discuss your project in more detail and provide comprehensive specifications.</p>
            </div>
          </div>
        );
        
      default:
        return null;
    }
  };
  
  // Main App component return
  return (
    <div className="App">
      <header className="App-header">
        <h1>Louver Selector Tool</h1>
        <p>Find the perfect louver solution for your architectural project</p>
      </header>
      <div className="form-container">
        {/* Step Progress Indicator */}
        <div className="step-progress">
          <div className="step-counter">Step {currentStep} of 5</div>
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${(currentStep / 5) * 100}%` }}
            ></div>
          </div>
        </div>
        {renderStep()}
        
        <div className="navigation">
          <button 
            onClick={prevStep}
            disabled={currentStep === 1}
            className="prev-btn"
          >
            Previous
          </button>
          
          {currentStep < 5 && (
            <button onClick={nextStep} className="next-btn">
              {currentStep === 4 ? 'View Summary' : 'Next'}
            </button>
          )}
          
          {currentStep === 5 && (
            <button className="submit-btn" onClick={() => {
              console.log('Submitting final form with pattern-based recommendations:', recommendedLouvers);
              console.log('Form data:', formData);
              alert('Your louver recommendations have been generated based on industry best practices!');
            }}>Get Detailed Specifications</button>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;