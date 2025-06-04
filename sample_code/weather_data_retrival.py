import ee
from geopy.geocoders import Nominatim
import math

# Initialize
geolocator = Nominatim(user_agent="geoapiexercise")
ee.Initialize(project='ivory-alcove-426308-d9')

# Obtain user input
country = input('Input country: ')
postal_code = input('Input postal code: ')

# Convert to geocode
address = postal_code + ', ' + country
location = geolocator.geocode(address)

# Create Google Earth Engine point object
point = ee.Geometry.Point([location.longitude, location.latitude])

# State data range
start_date = '2020-01-01'
end_date = '2020-01-31'

# Obtain dataset for ERA5 daily data
dataset = ee.ImageCollection('ECMWF/ERA5/DAILY') \
            .filterDate(start_date, end_date) \
            .filterBounds(point)

# Select precipitation band and average it
rainfall = dataset.select('total_precipitation')
average_rainfall = rainfall.mean()

# Sample precipitation at the point
rain_meters = average_rainfall.sample(region=point, scale=10000).first().get('total_precipitation').getInfo()

# Convert precipitation to millimeters
rain_mm = rain_meters * 1000

# Select wind components
u_wind = dataset.select('u_component_of_wind_10m').mean()
v_wind = dataset.select('v_component_of_wind_10m').mean()

# Sample wind components at the point
u_val = u_wind.sample(region=point, scale=10000).first().get('u_component_of_wind_10m').getInfo()
v_val = v_wind.sample(region=point, scale=10000).first().get('v_component_of_wind_10m').getInfo()

# Calculate wind speed (m/s)
wind_speed = math.sqrt(u_val**2 + v_val**2)

# Calculate wind direction in degrees
# Meteorological wind direction: degrees from which the wind is coming
wind_dir_rad = math.atan2(-u_val, -v_val)  # note the negative signs for meteorological convention
wind_dir_deg = math.degrees(wind_dir_rad)
if wind_dir_deg < 0:
    wind_dir_deg += 360  # Normalize to [0,360)

print(f"Average daily rainfall from {start_date} to {end_date} at {location.address}: {rain_mm:.2f} mm/day")
print(f"Average wind speed: {wind_speed:.2f} m/s")
print(f"Average wind direction: {wind_dir_deg:.1f} degrees (meteorological, from where wind is blowing)")


def get_rain_class(mean_rain_fall, mean_wind_speed, mean_wind_dir, exposure_type, exposure_dir = 0):
    exposure_map = {
        'high' : 0.35,
        'medium' : 0.25,
        'low' : 0.2,
    }
    print(f'rain fall: {mean_rain_fall} \n windspeed: {mean_wind_speed} \n wind_dir: {mean_wind_dir} \nexposure type : {exposure_type} \n exposure dir: {exposure_dir}')
    a = exposure_map[exposure_type]
    C_wdr = min(1,a * mean_wind_speed * math.cos(mean_wind_dir- exposure_dir))
    print(f'C_wdr = {C_wdr}')
    q_wdr = (mean_rain_fall/24 * C_wdr)/3600
    print('qwdr', q_wdr)
    relative_exposure = q_wdr/20.83

    print(relative_exposure)

    if relative_exposure >= 0.8:
        return 'A'
    elif relative_exposure < 0.8 and relative_exposure >= 0.4:
        return 'B'
    elif relative_exposure < 0.4 and relative_exposure >= 0.2:
        return 'C'
    elif relative_exposure < 0.2:
        return 'D'
    else:
        return 'error'
    
print (get_rain_class(rain_mm, wind_speed, wind_dir_rad, 'high'))