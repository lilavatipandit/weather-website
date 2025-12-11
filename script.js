const wrapper = document.querySelector(".wrapper"),
  inputPart = document.querySelector(".input-part"),
  infoTxt = inputPart.querySelector(".info-txt"),
  inputField = inputPart.querySelector("input"),
  locationBtn = inputPart.querySelector("button"),
  weatherPart = wrapper.querySelector(".weather-part"),
  forecastSection = wrapper.querySelector(".forecast"),
  forecastDetails = forecastSection.querySelector(".forecast-details"),
  wIcon = weatherPart.querySelector("img"),
  arrowBack = wrapper.querySelector("header i");

let api;
const apiKey = "b190a0605344cc4f3af08d0dd473dd25";
const weatherChartCtx = document.getElementById("weatherChart").getContext("2d");
let weatherChart;

// Function to create or update weather chart
function createWeatherChart(labels, data) {
  if (weatherChart) weatherChart.destroy();

  weatherChart = new Chart(weatherChartCtx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [{
        label: "Temperature (°C)",
        data: data,
        backgroundColor: "rgba(54, 162, 235, 0.6)",
        borderColor: "rgba(54, 162, 235, 1)",
        borderWidth: 2,
        fill: false,
        tension: 0.3
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  });
}

// ------------------- Event Listeners -------------------

// User input (city search)
inputField.addEventListener("keyup", (e) => {
  if (e.key === "Enter" && inputField.value.trim() !== "") {
    requestApi(inputField.value.trim());
  }
});

// User location (geolocation)
locationBtn.addEventListener("click", () => {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(onSuccess, onError);
  } else {
    alert("Your browser does not support geolocation API.");
  }
});

// Back button
arrowBack.addEventListener("click", () => {
  wrapper.classList.remove("active");
  clearWeatherData();
});

// ------------------- Weather API Functions -------------------

// Request weather by city
function requestApi(city) {
  api = `https://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&appid=${apiKey}`;
  fetchData();
}

// Request weather by coordinates
function onSuccess(position) {
  const { latitude, longitude } = position.coords;
  api = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&units=metric&appid=${apiKey}`;
  fetchData();
}

// Geolocation error
function onError(error) {
  infoTxt.innerText = error.message;
  infoTxt.classList.add("error");
  clearWeatherData();
}

// Fetch weather data
function fetchData() {
  infoTxt.innerText = "Fetching weather details...";
  infoTxt.classList.add("pending");

  fetch(api)
    .then(res => res.json())
    .then(result => {
      if (result.cod && result.cod === "404") {
        infoTxt.innerText = `${inputField.value} is not a valid city name`;
        infoTxt.classList.replace("pending", "error");
        clearWeatherData();
      } else {
        clearWeatherData();
        displayWeather(result);
        fetchForecast(result.coord.lat, result.coord.lon);
        fetchHourlyForecast(result.coord.lat, result.coord.lon);
      }
    })
    .catch(() => {
      infoTxt.innerText = "Something went wrong";
      infoTxt.classList.replace("pending", "error");
      clearWeatherData();
    });
}

// Display weather details
function displayWeather(info) {
  const { name, sys: { country }, weather: [{ description, id }], main: { temp, feels_like, humidity }, wind: { speed }, dt } = info;

  const weatherDate = new Date(dt * 1000).toLocaleString('en', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: true
  });

  wIcon.src = getWeatherIcon(id);
  weatherPart.querySelector(".temp .numb").innerText = Math.round(temp);
  weatherPart.querySelector(".weather").innerText = description;
  weatherPart.querySelector(".location span").innerText = `${name}, ${country}`;
  weatherPart.querySelector(".temp .numb-2").innerText = Math.round(feels_like);
  weatherPart.querySelector(".humidity span").innerText = `${humidity}%`;
  weatherPart.querySelector(".wind span").innerText = `${speed} m/s`;
  weatherPart.querySelector(".date-time").innerText = weatherDate;

  infoTxt.classList.remove("pending", "error");
  infoTxt.innerText = "";
  inputField.value = "";
  wrapper.classList.add("active");
}

// ------------------- Forecast Functions -------------------

// Fetch daily forecast
function fetchForecast(lat, lon) {
  const forecastApi = `https://api.openweathermap.org/data/2.5/onecall?lat=${lat}&lon=${lon}&exclude=current,minutely,hourly,alerts&units=metric&appid=${apiKey}`;
  fetch(forecastApi)
    .then(res => res.json())
    .then(data => updateForecast(data.daily.slice(1, 8)))
    .catch(() => clearForecast());
}

// Update daily forecast
function updateForecast(dailyData) {
  forecastDetails.innerHTML = "";
  dailyData.forEach(day => {
    const { dt, weather: [{ description, id }], temp: { max, min } } = day;
    const dayOfWeek = new Date(dt * 1000).toLocaleDateString('en', { weekday: 'short' });

    const card = document.createElement("div");
    card.classList.add("forecast-card");
    card.innerHTML = `
      <div class="forecast-day">${dayOfWeek}</div>
      <img src="${getWeatherIcon(id)}" alt="Weather Icon" />
      <div class="forecast-temp">
        <span class="max-temp">${Math.round(max)}°C</span> / 
        <span class="min-temp">${Math.round(min)}°C</span>
      </div>
      <div class="forecast-desc">${description}</div>
    `;
    forecastDetails.appendChild(card);
  });
}

// Fetch hourly forecast
function fetchHourlyForecast(lat, lon) {
  const hourlyApi = `https://api.openweathermap.org/data/2.5/onecall?lat=${lat}&lon=${lon}&exclude=current,daily,minutely,alerts&units=metric&appid=${apiKey}`;
  fetch(hourlyApi)
    .then(res => res.json())
    .then(data => updateHourlyForecast(data.hourly.slice(0, 24)))
    .catch(() => clearHourlyForecast());
}

// Update hourly forecast chart
function updateHourlyForecast(hourlyData) {
  const labels = [], data = [];
  hourlyData.forEach(hour => {
    const { dt, temp } = hour;
    labels.push(new Date(dt * 1000).toLocaleTimeString('en', { hour: 'numeric', hour12: true }));
    data.push(temp);
  });
  createWeatherChart(labels, data);
}

// ------------------- Utility Functions -------------------

function clearWeatherData() {
  wIcon.src = "";
  weatherPart.querySelector(".temp .numb").innerText = "";
  weatherPart.querySelector(".weather").innerText = "";
  weatherPart.querySelector(".location span").innerText = "";
  weatherPart.querySelector(".temp .numb-2").innerText = "";
  weatherPart.querySelector(".humidity span").innerText = "";
  weatherPart.querySelector(".wind span").innerText = "";
  weatherPart.querySelector(".date-time").innerText = "";
  infoTxt.innerText = "";
  clearForecast();
  clearHourlyForecast();
}

function clearForecast() {
  forecastDetails.innerHTML = "";
}

function clearHourlyForecast() {
  if (weatherChart) weatherChart.destroy();
}

function getWeatherIcon(id) {
  if (id === 800) return "icons/clear.svg";
  if (id >= 200 && id <= 232) return "icons/storm.svg";
  if (id >= 600 && id <= 622) return "icons/snow.svg";
  if (id >= 701 && id <= 781) return "icons/haze.svg";
  if (id >= 801 && id <= 804) return "icons/cloud.svg";
  if ((id >= 500 && id <= 531) || (id >= 300 && id <= 321)) return "icons/rain.svg";
  return "icons/unknown.svg";
}

// ------------------- Theme (Dark/Bright) -------------------

let isDark = false;
const colors = ["hsl(345, 80%, 50%)","hsl(100, 80%, 50%)","hsl(200, 80%, 50%)","hsl(227, 66%, 55%)","hsl(26, 80%, 50%)","hsl(44, 90%, 51%)","hsl(280, 100%, 65%)","hsl(480, 100%, 25%)","hsl(180, 100%, 25%)"];
const colorBtns = document.querySelectorAll(".theme-color");
const darkModeBtn = document.querySelector(".dark-mode-btn");

darkModeBtn.addEventListener("click", () => {
  isDark = !isDark;
  changeTheme(isDark ? "#000" : colors[3]);
});

colorBtns.forEach((btn, i) => {
  btn.style.backgroundColor = colors[i];
  btn.addEventListener("click", () => changeTheme(btn.style.backgroundColor));
});

function changeTheme(color) {
  document.documentElement.style.setProperty("--primary-color", color);
  localStorage.setItem("theme", color);
}

function getTheme() {
  const theme = localStorage.getItem("theme");
  if (theme) changeTheme(theme);
}

getTheme();


