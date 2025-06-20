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
    weatherData: null // Weather data from API
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [weatherCache, setWeatherCache] = useState({});
  const [patternRecommendations, setPatternRecommendations] = useState([]);
  const [louverData, setLouverData] = useState([]);
  const [recommendedLouvers, setRecommendedLouvers] = useState([]);
  const [louverDataLoading, setLouverDataLoading] = useState(false);
  const [louverDataError, setLouverDataError] = useState(null);
  const [weatherDataLoading, setWeatherDataLoading] = useState(false);
  const [weatherDataError, setWeatherDataError] = useState(null);

  // Function to fetch weather data for a location
  // State for location validation
  const [locationValid, setLocationValid] = useState(false);
  const [showLocationMap, setShowLocationMap] = useState(false);
  
  const fetchWeatherData = (location) => {
    if (!location || location.length < 3) {
      setLocationValid(false);
      return;
    }
    
    // Check cache first
    if (weatherCache[location]) {
      console.log('Using cached weather data for:', location);
      setFormData(prev => ({
        ...prev,
        weatherData: weatherCache[location],
        mapCoordinates: weatherCache[location].coordinates || null
      }));
      setLocationValid(true);
      setShowLocationMap(false);
      return;
    }
    
    console.log('Fetching weather data for location:', location);
    setWeatherDataLoading(true);
    setWeatherDataError(null);
    setLocationValid(false);
    
    // Call the weather API using POST with location in the body
    fetch('http://localhost:5000/weather', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ location })
    })
      .then(response => {
        if (!response.ok) {
          throw new Error(`Weather API error: ${response.status} ${response.statusText}`);
        }
        return response.json();
      })
      .then(data => {
        console.log('Weather data received:', data);
        // Cache the weather data
        setWeatherCache(prev => ({
          ...prev,
          [location]: data
        }));
        
        // Update form data with weather information
        setFormData(prev => ({
          ...prev,
          weatherData: data,
          mapCoordinates: data.coordinates || null
        }));
        
        setWeatherDataLoading(false);
        setLocationValid(true);
        setShowLocationMap(false);
      })
      .catch(error => {
        console.error('Failed to fetch weather data:', error);
        setWeatherDataError(`Failed to fetch weather data: ${error.message}`);
        setWeatherDataLoading(false);
        setLocationValid(false);
        setShowLocationMap(true); // Show map when location is invalid
      });
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
          tier: 'Primary'
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
    
    // If location changes, try to fetch weather data
    if (field === 'location' && value.length > 5) {
      // Debounce the API call to avoid too many requests
      clearTimeout(window.locationTimeout);
      window.locationTimeout = setTimeout(() => {
        fetchWeatherData(value);
      }, 1000);
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
                  <input
                    type="text"
                    placeholder="City, State or Postal Code"
                    value={formData.location || ''}
                    onChange={(e) => handleInputChange('location', e.target.value)}
                  />
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
            
            {formData.location && formData.location.length > 3 && (
              <div className="location-validation-container">
                {weatherDataLoading && (
                  <div className="loading-indicator">Validating location...</div>
                )}
                
                {locationValid && (
                  <div className="location-valid-message">
                    <div className="success-message">
                      <span className="success-icon">✓</span> Location validated successfully
                    </div>
                  </div>
                )}
                
                {weatherDataError && !locationValid && (
                  <div className="location-invalid-container">
                    <div className="error-message">{weatherDataError}</div>
                    <p>Please select your location on the map below:</p>
                    
                    <Suspense fallback={<div className="loading-indicator">Loading map...</div>}>
                      <LocationMap 
                        location={formData.location} 
                        coordinates={formData.mapCoordinates}
                        onLocationSelect={(coords) => {
                          console.log('Location selected:', coords);
                          setFormData(prev => ({
                            ...prev,
                            mapCoordinates: coords
                          }));
                          // When user selects a location manually, consider it valid
                          setLocationValid(true);
                        }}
                      />
                    </Suspense>
                  </div>
                )}
              </div>
            )}
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
                  <span className="summary-label">Performance Priority:</span>
                  <span className="summary-value">{formData.performancePriority || 'Not specified'}</span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Project Phase:</span>
                  <span className="summary-value">{formData.projectPhase || 'Not specified'}</span>
                </div>
              </div>
            </div>
            
            {formData.weatherData && (
              <div className="summary-section">
                <h3>Environmental Conditions</h3>
                <div className="summary-grid">
                  <div className="summary-item">
                    <span className="summary-label">Location:</span>
                    <span className="summary-value">{formData.weatherData.location || formData.location}</span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">Recommended Rain Class:</span>
                    <span className="summary-value">{formData.weatherData.recommended_rain_class || 'Not available'}</span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">Average Rainfall:</span>
                    <span className="summary-value">{formData.weatherData.average_rainfall ? `${formData.weatherData.average_rainfall} mm/day` : 'Not available'}</span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">Average Wind Speed:</span>
                    <span className="summary-value">{formData.weatherData.average_wind_speed ? `${formData.weatherData.average_wind_speed} m/s` : 'Not available'}</span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">Average Temperature:</span>
                    <span className="summary-value">{formData.weatherData.average_temperature ? `${formData.weatherData.average_temperature}°C` : 'Not available'}</span>
                  </div>
                </div>
                
                {/* Map display in summary step */}
                <div className="summary-map-container">
                  <h4>Project Location</h4>
                  <Suspense fallback={<div className="loading-indicator">Loading map...</div>}>
                    <LocationMap 
                      location={formData.location} 
                      coordinates={formData.weatherData?.coordinates || formData.mapCoordinates}
                      onLocationSelect={null} // No selection in summary view
                    />
                  </Suspense>
                </div>
              </div>
            )}
            
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