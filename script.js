// -------------------------------------------------------------
// Weather Application - Main Logic 
// -------------------------------------------------------------

const API_KEY = '370a02ef50e77ce84bb52da2eee961f4';
const DEFAULT_CITY = 'Tangier';

// DOM Element Selectors
const body = document.body;
const weatherBg = document.getElementById('weather-background');
const cityInput = document.getElementById('city-input');
const quickSelectContainer = document.getElementById('quick-select');
const loader = document.getElementById('loader');
const errorMessage = document.getElementById('error-message');
const weatherMain = document.getElementById('weather-main');

// Weather Details Selectors
const cityNameEl = document.getElementById('city-name');
const weatherDescEl = document.getElementById('weather-desc');
const temperatureEl = document.getElementById('temperature');
const tempHighEl = document.getElementById('temp-high');
const tempLowEl = document.getElementById('temp-low');

// Details Grid
const humidityEl = document.getElementById('humidity');
const windSpeedEl = document.getElementById('wind-speed');
const feelsLikeEl = document.getElementById('feels-like');
const visibilityEl = document.getElementById('visibility');

// Containers
const hourlyContainer = document.getElementById('hourly-container');
const forecastContainer = document.getElementById('forecast-container');

// Registration of service worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('Service Worker registered'))
            .catch(err => console.log('Service Worker registration failed:', err));
    });
}

// -------------------------------------------------------------
// Suggestion Logic (Random Cities)
// -------------------------------------------------------------
const popularCities = [
    'Tangier', 'London', 'Tokyo', 'New York', 'Paris', 
    'Dubai', 'Sydney', 'Rome', 'Berlin', 'Madrid', 
    'Istanbul', 'Seoul', 'Toronto', 'Singapore', 'Mumbai',
    'Cairo', 'Rio de Janeiro', 'Bangkok', 'Moscow', 'Mexico City'
];

function generateRandomCities() {
    // Pick 5 random unique cities
    const shuffled = [...popularCities].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, 5);
    
    quickSelectContainer.innerHTML = '';
    selected.forEach(city => {
        const btn = document.createElement('button');
        btn.className = 'quick-btn';
        btn.setAttribute('data-city', city);
        btn.textContent = city;
        
        btn.addEventListener('click', () => {
            fetchWeather(city);
            cityInput.value = ''; 
        });
        
        quickSelectContainer.appendChild(btn);
    });
}

// -------------------------------------------------------------
// Initialization & Event Listeners
// -------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
    generateRandomCities();
    fetchWeather(DEFAULT_CITY);
    
    // Scroll Behavior wrapper logic for hiding quick-select
    const appContainer = document.querySelector('.app-container');
    const quickSelect = document.querySelector('.quick-select');
    const searchSection = document.querySelector('.search-section');

    appContainer.addEventListener('scroll', () => {
        if (appContainer.scrollTop > 50) {
            quickSelect.classList.add('hidden-scroll');
        } else {
            quickSelect.classList.remove('hidden-scroll');
        }
    });
});

// Search input
cityInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        const city = cityInput.value.trim();
        if (city) {
            fetchWeather(city);
            cityInput.blur(); // Hide keyboard on mobile
        }
    }
});

// -------------------------------------------------------------
// Core API Logic
// -------------------------------------------------------------

async function fetchWeather(city) {
    if (API_KEY === 'YOUR_API_KEY_HERE') {
        showError('Please set your expected API_KEY in script.js');
        return;
    }

    showLoader();
    try {
        const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric`;
        const weatherRes = await fetch(weatherUrl);
        
        if (!weatherRes.ok) throw new Error(`City not found (${weatherRes.status})`);
        const weatherData = await weatherRes.json();
        
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

function updateUI(current, forecast) {
    loader.classList.add('hidden');
    errorMessage.classList.add('hidden');
    weatherMain.classList.remove('hidden');

    // Headers
    cityNameEl.textContent = current.name;
    weatherDescEl.textContent = current.weather[0].description;
    temperatureEl.innerHTML = `${Math.round(current.main.temp)}&deg;`;

    // Today's High/Low 
    tempHighEl.innerHTML = `${Math.round(current.main.temp_max)}&deg;`;
    tempLowEl.innerHTML = `${Math.round(current.main.temp_min)}&deg;`;
    
    // Details
    humidityEl.textContent = `${current.main.humidity}%`;
    windSpeedEl.innerHTML = `${current.wind.speed.toFixed(1)}<span class="unit">m/s</span>`;
    feelsLikeEl.innerHTML = `${Math.round(current.main.feels_like)}&deg;`;
    visibilityEl.innerHTML = `${(current.visibility / 1000).toFixed(1)}<span class="unit">km</span>`;

    updateBackground(current.weather[0].main.toLowerCase(), current.timezone, current.sys, current.dt);
    
    updateHourlyUI(forecast.list, current.timezone);
    updateDailyUI(forecast.list);
}

function updateHourlyUI(forecastList, timezoneOffset) {
    hourlyContainer.innerHTML = '';
    
    // Take next 8 items (24 hours)
    const houlyData = forecastList.slice(0, 8);
    
    houlyData.forEach((item, index) => {
        const dateObj = new Date((item.dt + timezoneOffset) * 1000);
        let hour = dateObj.getUTCHours();
        const ampm = hour >= 12 ? 'PM' : 'AM';
        hour = hour % 12;
        hour = hour ? hour : 12; // hour 0 should be 12
        const timeStr = index === 0 ? 'Now' : `${hour} ${ampm}`;

        const div = document.createElement('div');
        div.className = 'hourly-item';
        div.innerHTML = `
            <span class="hourly-time">${timeStr}</span>
            <img class="hourly-icon" src="https://openweathermap.org/img/wn/${item.weather[0].icon}@2x.png" alt="icon">
            <span class="hourly-temp">${Math.round(item.main.temp)}&deg;</span>
        `;
        hourlyContainer.appendChild(div);
    });
}

function updateDailyUI(forecastList) {
    forecastContainer.innerHTML = '';
    
    const dailyData = {};
    let minWeeklyTemp = 100;
    let maxWeeklyTemp = -100;
    
    forecastList.forEach(item => {
        const date = item.dt_txt.split(' ')[0]; 
        if (!dailyData[date]) {
            dailyData[date] = {
                minTemp: item.main.temp_min,
                maxTemp: item.main.temp_max,
                icon: item.weather[0].icon,
                dt: item.dt
            };
        } else {
            dailyData[date].minTemp = Math.min(dailyData[date].minTemp, item.main.temp_min);
            dailyData[date].maxTemp = Math.max(dailyData[date].maxTemp, item.main.temp_max);
            if (item.dt_txt.includes('12:00:00')) {
                dailyData[date].icon = item.weather[0].icon;
            }
        }
    });

    const dates = Object.keys(dailyData).slice(0, 5); 
    
    dates.forEach(d => {
        if(dailyData[d].minTemp < minWeeklyTemp) minWeeklyTemp = dailyData[d].minTemp;
        if(dailyData[d].maxTemp > maxWeeklyTemp) maxWeeklyTemp = dailyData[d].maxTemp;
    });
    
    const tempRange = maxWeeklyTemp - minWeeklyTemp || 1; // avoid division by zero

    dates.forEach((dateStr, index) => {
        const dayData = dailyData[dateStr];
        const dateObj = new Date(dayData.dt * 1000);
        let dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' }); 
        if (index === 0) dayName = 'Today';
        
        // Calculate bar widths
        const leftPercent = ((dayData.minTemp - minWeeklyTemp) / tempRange) * 100;
        const rightPercent = ((maxWeeklyTemp - dayData.maxTemp) / tempRange) * 100;
        
        const itemDiv = document.createElement('div');
        itemDiv.className = 'daily-item';
        itemDiv.innerHTML = `
            <span class="daily-day">${dayName}</span>
            <div class="daily-icon-wrapper">
                <img src="https://openweathermap.org/img/wn/${dayData.icon}@2x.png" alt="Weather" class="daily-icon">
            </div>
            <div class="daily-temps">
                <span class="daily-low">${Math.round(dayData.minTemp)}&deg;</span>
                <div class="temp-bar">
                    <div class="temp-bar-fill" style="left: ${leftPercent}%; right: ${rightPercent}%;"></div>
                </div>
                <span class="daily-high">${Math.round(dayData.maxTemp)}&deg;</span>
            </div>
        `;
        forecastContainer.appendChild(itemDiv);
    });
}

function updateBackground(condition, timezoneOffset, sys, dt) {
    weatherBg.className = 'weather-bg'; // reset
    
    // Determine local time using timezone
    const localDate = new Date((dt + timezoneOffset) * 1000);
    const hour = localDate.getUTCHours();
    const isNight = hour >= 19 || hour <= 5;

    if (condition.includes('clear')) {
        weatherBg.classList.add(isNight ? 'night' : 'clear');
    } else if (condition.includes('cloud')) {
        weatherBg.classList.add(isNight ? 'night' : 'clouds');
    } else if (condition.includes('rain') || condition.includes('drizzle')) {
        weatherBg.classList.add('rain');
    } else if (condition.includes('thunderstorm')) {
        weatherBg.classList.add('thunderstorm');
    } else if (condition.includes('snow')) {
        weatherBg.classList.add('snow');
    } else {
        weatherBg.classList.add('mist'); 
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
