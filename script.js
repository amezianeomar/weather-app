// -------------------------------------------------------------
// Weather Application - Main Logic 
// -------------------------------------------------------------

// OpenWeatherMap API Configuration
const API_KEY = '370a02ef50e77ce84bb52da2eee961f4'; // Replace with a valid OpenWeatherMap API key
const DEFAULT_CITY = 'Tangier';

// DOM Element Selectors
const body = document.getElementById('app-body');
const cityInput = document.getElementById('city-input');
const searchBtn = document.getElementById('search-btn');
const quickBtns = document.querySelectorAll('.quick-btn');

const loader = document.getElementById('loader');
const errorMessage = document.getElementById('error-message');
const weatherMain = document.getElementById('weather-main');

// Weather Details Selectors
const cityNameEl = document.getElementById('city-name');
const weatherDescEl = document.getElementById('weather-desc');
const weatherIconEl = document.getElementById('weather-icon');
const temperatureEl = document.getElementById('temperature');
const humidityEl = document.getElementById('humidity');
const windSpeedEl = document.getElementById('wind-speed');
const forecastContainer = document.getElementById('forecast-container');

// -------------------------------------------------------------
// Initialization & Event Listeners
// -------------------------------------------------------------

// Fetch default city weather on initial load
document.addEventListener('DOMContentLoaded', () => {
    fetchWeather(DEFAULT_CITY);
});

// Search button click event
searchBtn.addEventListener('click', () => {
    const city = cityInput.value.trim();
    if (city) fetchWeather(city);
});

// Enter key press event on input
cityInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        const city = cityInput.value.trim();
        if (city) fetchWeather(city);
    }
});

// Quick Select Locations click event
quickBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const city = btn.getAttribute('data-city');
        fetchWeather(city);
        cityInput.value = ''; // clear input when quick selecting
    });
});

// -------------------------------------------------------------
// Core API Logic
// -------------------------------------------------------------

/**
 * Fetches both current weather and 5-day forecast for a given city
 * @param {string} city - The name of the city to search for
 */
async function fetchWeather(city) {
    if (API_KEY === 'YOUR_API_KEY_HERE') {
        showError('Please set your expected API_KEY in script.js');
        return;
    }

    showLoader();
    try {
        // Fetch Current Weather
        const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric`;
        const weatherRes = await fetch(weatherUrl);
        
        if (!weatherRes.ok) {
            throw new Error(`City not found (${weatherRes.status})`);
        }
        
        const weatherData = await weatherRes.json();
        
        // Fetch 5-Day Forecast
        const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric`;
        const forecastRes = await fetch(forecastUrl);
        const forecastData = await forecastRes.json();
        
        updateUI(weatherData, forecastData);
    } catch (error) {
        console.error('Error fetching weather data:', error);
        showError('City not found. Please try again.');
    }
}

// -------------------------------------------------------------
// DOM Updating Functions
// -------------------------------------------------------------

/**
 * Main UI update handler delegating to specific components
 * @param {Object} current - Current weather data from API
 * @param {Object} forecast - Forecast data from API
 */
function updateUI(current, forecast) {
    // Reveal main display, hide states
    loader.classList.add('hidden');
    errorMessage.classList.add('hidden');
    weatherMain.classList.remove('hidden');

    // Update Current Weather Basics
    cityNameEl.textContent = `${current.name}, ${current.sys.country}`;
    weatherDescEl.textContent = current.weather[0].description;
    
    // Temperature and Icon (Using higher res @4x icon)
    temperatureEl.textContent = `${Math.round(current.main.temp)}°C`;
    const iconCode = current.weather[0].icon;
    weatherIconEl.src = `https://openweathermap.org/img/wn/${iconCode}@4x.png`;
    weatherIconEl.classList.remove('hidden');
    
    // Additional Details
    humidityEl.textContent = `${current.main.humidity}%`;
    windSpeedEl.textContent = `${current.wind.speed.toFixed(1)} m/s`;

    // Dynamic UI Updates based on data
    updateBackground(current.weather[0].main.toLowerCase(), current.dt, current.sys);
    updateForecastUI(forecast.list);
}

/**
 * Processes the 3-hour forecast API data into a daily format and renders it
 * @param {Array} forecastList - The array of 3-hour forecast chunks
 */
function updateForecastUI(forecastList) {
    forecastContainer.innerHTML = ''; // Clear previous forecast
    
    // OpenWeatherMap returns data in 3-hour intervals
    // We group them by day to calculate daily high/low temperatures
    const dailyData = {};
    
    forecastList.forEach(item => {
        // Extract date component (YYYY-MM-DD)
        const date = item.dt_txt.split(' ')[0]; 
        
        if (!dailyData[date]) {
            dailyData[date] = {
                minTemp: item.main.temp_min,
                maxTemp: item.main.temp_max,
                icon: item.weather[0].icon,
                dt: item.dt
            };
        } else {
            // Update daily min/max
            dailyData[date].minTemp = Math.min(dailyData[date].minTemp, item.main.temp_min);
            dailyData[date].maxTemp = Math.max(dailyData[date].maxTemp, item.main.temp_max);
            
            // Prefer midday icon for the day's overall icon representation
            if (item.dt_txt.includes('12:00:00')) {
                dailyData[date].icon = item.weather[0].icon;
            }
        }
    });

    // Determine the next 5 days
    const dates = Object.keys(dailyData).slice(0, 5); 

    dates.forEach(dateStr => {
        const dayData = dailyData[dateStr];
        const dateObj = new Date(dayData.dt * 1000);
        // Format to short weekday (e.g. "Mon", "Tue")
        const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' }); 
        
        const forecastItem = document.createElement('div');
        forecastItem.className = 'forecast-item';
        
        forecastItem.innerHTML = `
            <div class="forecast-day">${dayName}</div>
            <img src="https://openweathermap.org/img/wn/${dayData.icon}@2x.png" alt="Weather" class="forecast-icon">
            <div class="forecast-temp">
                <span class="forecast-high">${Math.round(dayData.maxTemp)}°</span>
                <span class="forecast-low">${Math.round(dayData.minTemp)}°</span>
            </div>
        `;
        
        forecastContainer.appendChild(forecastItem);
    });
}

/**
 * Dynamically changes body background class based on weather condition
 * @param {string} condition - Main weather condition group 
 * @param {number} currentTime - Current unix timestamp
 * @param {Object} sys - sys object containing sunrise/sunset times
 */
function updateBackground(condition, currentTime, sys) {
    // Reset background classes
    body.className = '';
    
    // Check for sunset/sunrise aesthetics roughly (if it's right around sunset/sunrise time)
    // Optional aesthetic touch, otherwise fallback to specific condition mapping
    const isSunset = (currentTime > sys.sunset - 3600) && (currentTime < sys.sunset + 3600);
    
    if (isSunset && condition.includes('clear')) {
        body.classList.add('sunset');
        return;
    }

    // Map API condition to CSS class
    if (condition.includes('clear')) {
        body.classList.add('clear');
    } else if (condition.includes('cloud')) {
        body.classList.add('clouds');
    } else if (condition.includes('rain') || condition.includes('drizzle')) {
        body.classList.add('rain');
    } else if (condition.includes('thunderstorm')) {
        body.classList.add('thunderstorm');
    } else if (condition.includes('snow')) {
        body.classList.add('snow');
    } else {
        body.classList.add('mist'); // Default for fog, haze, dust etc.
    }
}

// -------------------------------------------------------------
// State Management Functions
// -------------------------------------------------------------

function showLoader() {
    loader.classList.remove('hidden');
    weatherMain.classList.add('hidden');
    errorMessage.classList.add('hidden');
}

function showError(msgStr) {
    loader.classList.add('hidden');
    weatherMain.classList.add('hidden');
    errorMessage.textContent = msgStr;
    errorMessage.classList.remove('hidden');
}
