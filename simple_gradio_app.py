import gradio as gr
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
import numpy as np
import warnings
warnings.filterwarnings('ignore')

# Set style for plots
plt.style.use('seaborn-v0_8')
sns.set_palette("husl")

# Create some dummy louver data
louver_data = pd.DataFrame({
    'model': ['PL-1075', 'PL-2075', 'PL-2170', 'PL-2250', 'PL-2250V', 'PL-3075', 'PL-2150V', 'AC-150', 'AC-300'],
    'airflow_rating': [85, 70, 65, 60, 75, 55, 70, 90, 80],
    'water_resistance': [65, 75, 80, 85, 80, 90, 75, 60, 70],
    'cost_factor': [1.0, 1.2, 1.3, 1.5, 1.8, 2.0, 1.7, 0.9, 1.1],
    'profile_depth': [75, 75, 70, 50, 50, 75, 50, 50, 75],
    'rain_defense_class': ['C', 'B', 'B', 'A', 'A', 'A', 'B', 'D', 'C']
})

def determine_rain_class(rainfall, wind_speed, exposure_type='medium'):
    """Simple function to determine rain class based on rainfall and wind speed"""
    # Convert wind speed from km/h to m/s if needed
    wind_speed_ms = wind_speed / 3.6 if wind_speed > 10 else wind_speed
    
    # Exposure coefficients
    exposure_map = {
        'high': 0.35,    # Coastal areas, open terrain
        'medium': 0.25,  # Suburban, forest
        'low': 0.2,      # City centers, dense urban areas
    }
    
    # Get exposure coefficient
    a = exposure_map.get(exposure_type, 0.25)
    
    # Calculate wind-driven rain coefficient
    c_wdr = min(1, a * wind_speed_ms)
    
    # Calculate effective rainfall (mm/day)
    effective_rainfall = rainfall * c_wdr
    
    # Determine rain class based on effective rainfall
    if effective_rainfall < 60:
        return 'D'
    elif effective_rainfall < 100:
        return 'C'
    elif effective_rainfall < 150:
        return 'B'
    else:
        return 'A'

def get_louver_recommendations(building_type, primary_purpose, performance_priority, 
                              building_height, environmental_exposure):
    """Generate louver recommendations based on inputs"""
    
    # Start with all louvers
    filtered_louvers = louver_data.copy()
    
    # Apply filters based on inputs
    if primary_purpose == 'Fresh air intake' or primary_purpose == 'Natural ventilation':
        # Prioritize airflow
        filtered_louvers = filtered_louvers[filtered_louvers['airflow_rating'] >= 70]
    
    if primary_purpose == 'Weather protection' or environmental_exposure == 'Near coast/water':
        # Prioritize water resistance
        filtered_louvers = filtered_louvers[filtered_louvers['water_resistance'] >= 75]
    
    if performance_priority == 'Cost-effective':
        # Prioritize cost
        filtered_louvers = filtered_louvers[filtered_louvers['cost_factor'] <= 1.3]
    
    if performance_priority == 'High weather protection':
        # Prioritize water resistance
        filtered_louvers = filtered_louvers[filtered_louvers['water_resistance'] >= 80]
    
    # If no louvers match all criteria, return top 3 from original data
    if len(filtered_louvers) == 0:
        print("No exact matches, returning best overall options")
        if performance_priority == 'Maximum airflow':
            return louver_data.sort_values('airflow_rating', ascending=False).head(3)
        elif performance_priority == 'High weather protection':
            return louver_data.sort_values('water_resistance', ascending=False).head(3)
        elif performance_priority == 'Cost-effective':
            return louver_data.sort_values('cost_factor').head(3)
        else:
            # Balanced approach - create a score
            louver_data['balanced_score'] = (
                louver_data['airflow_rating'] * 0.4 + 
                louver_data['water_resistance'] * 0.4 + 
                (100 - louver_data['cost_factor'] * 50) * 0.2
            )
            return louver_data.sort_values('balanced_score', ascending=False).head(3)
    
    # Return top 3 recommendations
    if performance_priority == 'Maximum airflow':
        return filtered_louvers.sort_values('airflow_rating', ascending=False).head(3)
    elif performance_priority == 'High weather protection':
        return filtered_louvers.sort_values('water_resistance', ascending=False).head(3)
    elif performance_priority == 'Cost-effective':
        return filtered_louvers.sort_values('cost_factor').head(3)
    else:
        # Balanced approach
        filtered_louvers['balanced_score'] = (
            filtered_louvers['airflow_rating'] * 0.4 + 
            filtered_louvers['water_resistance'] * 0.4 + 
            (100 - filtered_louvers['cost_factor'] * 50) * 0.2
        )
        return filtered_louvers.sort_values('balanced_score', ascending=False).head(3)

def predict_louvers(building_type, primary_purpose, performance_priority, 
                   building_height, environmental_exposure):
    """Main prediction function for Gradio interface"""
    
    # Get recommendations
    recommendations = get_louver_recommendations(
        building_type, primary_purpose, performance_priority,
        building_height, environmental_exposure
    )
    
    # Format results
    output = f"""
# 🏢 Louver Recommendations

## 🎯 Project Parameters
- Building Type: **{building_type}**
- Primary Purpose: **{primary_purpose}**
- Performance Priority: **{performance_priority}**
- Building Height: **{building_height}**
- Environmental Exposure: **{environmental_exposure}**

## 🏆 Top Recommendations:
"""
    
    for i, (_, row) in enumerate(recommendations.iterrows(), 1):
        model = row['model']
        airflow = row['airflow_rating']
        water = row['water_resistance']
        cost = row['cost_factor']
        rain_class = row['rain_defense_class']
        
        output += f"""
### {i}. {model}
- 💨 Airflow Rating: {airflow}/100
- 🌧️ Water Resistance: {water}/100
- 💰 Cost Factor: {cost:.1f}x
- 🛡️ Rain Defense Class: {rain_class}
"""
    
    return output

def create_comparison_chart(building_type, primary_purpose, performance_priority, 
                           building_height, environmental_exposure):
    """Create a comparison chart of recommended louvers"""
    
    # Get recommendations
    recommendations = get_louver_recommendations(
        building_type, primary_purpose, performance_priority,
        building_height, environmental_exposure
    )
    
    if len(recommendations) == 0:
        return None
    
    # Create comparison chart
    plt.figure(figsize=(10, 6))
    
    # Extract data for plotting
    models = recommendations['model'].tolist()
    airflow = recommendations['airflow_rating'].tolist()
    water = recommendations['water_resistance'].tolist()
    cost = [c * 50 for c in recommendations['cost_factor'].tolist()]  # Scale cost for visualization
    
    # Set up bar positions
    x = np.arange(len(models))
    width = 0.25
    
    # Create bars
    plt.bar(x - width, airflow, width, label='Airflow Rating', color='skyblue')
    plt.bar(x, water, width, label='Water Resistance', color='navy')
    plt.bar(x + width, cost, width, label='Cost (scaled)', color='darkred')
    
    # Customize chart
    plt.xlabel('Louver Models')
    plt.ylabel('Rating')
    plt.title('Louver Comparison')
    plt.xticks(x, models)
    plt.ylim(0, 100)
    plt.legend()
    plt.grid(axis='y', linestyle='--', alpha=0.7)
    
    return plt

# Create Gradio interface
with gr.Blocks(title="Louver Selector Tool", theme=gr.themes.Soft()) as demo:
    gr.Markdown("""
    # 🏢 Louver Selector Tool
    
    **Find the perfect louver solution for your architectural project**
    
    This tool helps architects and engineers select the optimal louver system based on:
    - Building characteristics
    - Performance requirements
    - Local weather conditions
    """)
    
    with gr.Row():
        with gr.Column():
            gr.Markdown("### 🏗️ Project Parameters")
            building_type = gr.Dropdown(
                choices=['Commercial', 'Industrial', 'Residential', 'Warehouse'],
                label="Building Type",
                value="Commercial"
            )
            
            primary_purpose = gr.Dropdown(
                choices=['Fresh air intake', 'Exhaust air outlet', 'Equipment screening', 
                        'Weather protection', 'Natural ventilation', 'Architectural feature'],
                label="Primary Purpose", 
                value="Fresh air intake"
            )
            
            performance_priority = gr.Dropdown(
                choices=['Maximum airflow', 'High weather protection', 
                       'Balanced cost/performance', 'Cost-effective'],
                label="Performance Priority",
                value="Balanced cost/performance"
            )
        
        with gr.Column():
            gr.Markdown("### 🌍 Environmental Conditions")
            building_height = gr.Dropdown(
                choices=['Low-rise', 'Mid-rise', 'High-rise'],
                label="Building Height",
                value="Mid-rise"
            )
            
            environmental_exposure = gr.Dropdown(
                choices=['City center', 'Suburban', 'Near coast/water', 'Open/rural'],
                label="Environmental Exposure",
                value="City center"
            )
    
    with gr.Row():
        predict_btn = gr.Button("🔍 Get Louver Recommendations", variant="primary", size="lg")
    
    with gr.Row():
        with gr.Column():
            recommendation_output = gr.Markdown()
        with gr.Column():
            comparison_chart = gr.Plot(label="Comparison Chart")
    
    predict_btn.click(
        fn=predict_louvers,
        inputs=[building_type, primary_purpose, performance_priority, building_height,
               environmental_exposure],
        outputs=recommendation_output
    )
    
    predict_btn.click(
        fn=create_comparison_chart,
        inputs=[building_type, primary_purpose, performance_priority, building_height,
               environmental_exposure],
        outputs=comparison_chart
    )
    
    gr.Markdown("""
    ---
    ### 📊 How It Works
    
    This tool combines:
    1. **Project requirements analysis**
    2. **Performance matching algorithm**
    3. **Visual comparison of options**
    
    For detailed specifications, please contact our engineering team.
    """)

if __name__ == "__main__":
    print("Starting Simple Gradio Louver Selector Tool...")
    try:
        # Launch the Gradio app
        print("Launching Gradio interface...")
        demo.launch(server_name="localhost", server_port=7860)
        print("Gradio server started successfully!")
    except Exception as e:
        print(f"Error starting Gradio server: {e}")
        import traceback
        traceback.print_exc()
