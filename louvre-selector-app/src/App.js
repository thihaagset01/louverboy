import React, { useState } from 'react';
import './App.css';

function App() {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    projectName: '',
    buildingType: '',
    location: ''
  });

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Louvre Selection Tool</h1>
        <p>Find the perfect performance louvre for your project</p>
      </header>
      
      <div className="form-container">
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
            placeholder="City, Country"
            value={formData.location}
            onChange={(e) => handleInputChange('location', e.target.value)}
          />
        </div>
        
        <button className="next-btn">Next</button>
      </div>
    </div>
  );
}

export default App;