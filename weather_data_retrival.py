import ee
from geopy.geocoders import Nominatim

#initialise
geolocator = Nominatim(user_agent= "geoapiexercise")
ee.Initialize(project = 'ivory-alcove-426308-d9')

#obtain user input
country = input('Input country: ')
postal_code = input('Input postal code: ')

#convert to geocode
address = postal_code + ', ' + country
location = geolocator.geocode(address)

#create google earth engine point object
point = ee.Geometry.Point([location.longitude, location.latitude])

#state data range
start_date = '2020-01-01'
end_date = '2020-01-31'

#obtain dataset for temperature
dataset = ee.ImageCollection('ECMWF/ERA5/DAILY') \
            .filterDate(start_date, end_date) \
            .filterBounds(point)

temperature = dataset.select('mean_2m_air_temperature')
mean_temp = temperature.mean()

temp_kelvin = mean_temp.sample(region=point, scale=10000).first().get('mean_2m_air_temperature').getInfo()

temp_celsius = temp_kelvin - 273.15
print(f"Average temperature from {start_date} to {end_date} at {location}: {temp_celsius:.2f} °C")


# Select and average daily precipitation
rainfall = dataset.select('total_precipitation')
average_rainfall = rainfall.mean()

# Sample at the point
rain_meters = average_rainfall.sample(region=point, scale=10000).first().get('total_precipitation').getInfo()

# Convert to millimeters
rain_mm = rain_meters * 1000

print(f"Average daily rainfall from {start_date} to {end_date} at {location.address}: {rain_mm:.2f} mm/day")