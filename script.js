const weatherForm = document.querySelector(".weatherForm");
const cityInput = document.querySelector(".cityInput");
const card = document.querySelector(".card");
const searchStatus = document.querySelector(".searchStatus");
const submitButton = weatherForm.querySelector('button[type="submit"]');
const themeToggle = document.querySelector(".themeToggle");
const unitToggle = document.querySelector(".unitToggle");
const installButton = document.querySelector(".installButton");
const apikey = "2e6e73e9f3caf826a765a7dd471391d9";
let isLoading = false;
let displayedCityKey = null;
let isFahrenheit = false;
let currentWeatherData = null;
let currentForecastData = null;
let installPrompt = null;

function getStoredPreference(key){
    try{
        return localStorage.getItem(key);
    }
    catch(error){
        console.error(`Could not read ${key} from local storage.`, error);
        return null;
    }
}

function setStoredPreference(key, value){
    try{
        localStorage.setItem(key, value);
    }
    catch(error){
        console.error(`Could not save ${key} to local storage.`, error);
    }
}

function applyTheme(theme){
    document.documentElement.dataset.theme = theme;
    themeToggle.setAttribute("aria-label", `Switch to ${theme === "dark" ? "light" : "dark"} mode`);
    document.querySelector('meta[name="theme-color"]').content =
        theme === "dark" ? "#14212d" : "#eaf4fb";
}

const savedTheme = getStoredPreference("weatherAppTheme");
const preferredTheme = savedTheme === "light" || savedTheme === "dark"
    ? savedTheme
    : window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
applyTheme(preferredTheme);

themeToggle.addEventListener("click", () => {
    const theme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    applyTheme(theme);
    setStoredPreference("weatherAppTheme", theme);
});

function updateUnitToggle(){
    const targetUnit = isFahrenheit ? "Celsius" : "Fahrenheit";
    unitToggle.textContent = isFahrenheit ? "°C" : "°F";
    unitToggle.setAttribute("aria-label", `Switch temperature to ${targetUnit}`);
}

unitToggle.addEventListener("click", () => {
    isFahrenheit = !isFahrenheit;
    updateUnitToggle();

    if(currentWeatherData && currentForecastData){
        displayWeatherInfo(currentWeatherData, currentForecastData);
    }
});

updateUnitToggle();

window.addEventListener("beforeinstallprompt", event => {
    event.preventDefault();
    installPrompt = event;
    installButton.hidden = false;
});

installButton.addEventListener("click", async () => {
    if(!installPrompt){
        return;
    }

    try{
        await installPrompt.prompt();
    }
    catch(error){
        console.error("Could not open the browser install prompt.", error);
        searchStatus.textContent = "Could not open the install prompt. Try your browser's install option.";
    }
    finally{
        installPrompt = null;
        installButton.hidden = true;
    }
});

window.addEventListener("appinstalled", () => {
    installPrompt = null;
    installButton.hidden = true;
});

weatherForm.addEventListener("submit", async event => {
    event.preventDefault();

    await searchWeather(cityInput.value);
});

async function searchWeather(input){
    if(isLoading){
        return;
    }

    let city;
    try{
        city = decodeURIComponent(input.trim()).trim();
    }
    catch(error){
        if(!(error instanceof URIError)){
            throw error;
        }
        searchStatus.textContent = "Enter a valid city name.";
        displayError("Enter a valid city name.");
        cityInput.focus();
        return;
    }

    if(!city){
        searchStatus.textContent = "Enter a city name to search.";
        displayError("Enter a city name to search.");
        cityInput.focus();
        return;
    }

    const cityKey = city.toLowerCase();
    if(cityKey === displayedCityKey){
        searchStatus.textContent = `Weather for ${city} is already displayed.`;
        return;
    }

    isLoading = true;
    displayedCityKey = null;
    submitButton.disabled = true;
    submitButton.textContent = "Searching...";
    searchStatus.textContent = `Searching for ${city}...`;
    displayLoading(city);

    try{
        const weatherData = await getWeatherData(city);
        currentWeatherData = weatherData.current;
        currentForecastData = weatherData.forecast;
        displayWeatherInfo(currentWeatherData, currentForecastData);
        displayedCityKey = cityKey;
        searchStatus.textContent = "";

        if(!saveLastCity(city)){
            searchStatus.textContent += " This browser couldn't save your last searched city.";
        }
    }
    catch(error){
        console.error(error);
        searchStatus.textContent = "";

        if(error.message === "CITY_NOT_FOUND"){
            displayError(`We couldn't find "${city}". Check the spelling, or try adding a country code (for example, London, UK).`, city);
        }
        else{
            displayError("We couldn't load the weather. Check your connection and try again.", city);
        }
    }
    finally{
        isLoading = false;
        submitButton.disabled = false;
        submitButton.textContent = "Get Weather";
    }
}

async function getWeatherData(city){
    const encodedCity = encodeURIComponent(city);
    const currentUrl = `https://api.openweathermap.org/data/2.5/weather?q=${encodedCity}&appid=${apikey}`;
    const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${encodedCity}&appid=${apikey}`;
    const [current, forecast] = await Promise.all([
        fetchWeather(currentUrl),
        fetchWeather(forecastUrl)
    ]);

    return {current, forecast};
}

async function fetchWeather(url){
    const response = await fetch(url);

    if(response.status === 404){
        throw new Error("CITY_NOT_FOUND");
    }

    if(!response.ok){
        throw new Error(`Weather request failed (${response.status})`);
    }

    return response.json();
}

function displayLoading(city){
    const loadingDisplay = document.createElement("p");
    loadingDisplay.classList.add("loadingDisplay");
    loadingDisplay.textContent = `Searching weather for ${city}...`;

    card.textContent = "";
    card.style.display = "flex";
    card.appendChild(loadingDisplay);
}

function displayWeatherInfo(data, forecastData){
    const {name: city, main, weather: [{description, id}], wind, sys, timezone} = data;

    document.body.dataset.weather = getWeatherMood(id);
    card.textContent = "";
    card.style.display = "flex";

    const cityDisplay = document.createElement("h1");
    const tempDisplay = document.createElement("p");
    const descDisplay = document.createElement("p");
    const weatherEmoji = document.createElement("p");

    cityDisplay.textContent = city;
    tempDisplay.textContent = formatTemperature(main.temp);
    descDisplay.textContent = description;
    weatherEmoji.textContent = getWeatherEmoji(id);

    cityDisplay.classList.add("cityDisplay");
    tempDisplay.classList.add("tempDisplay");
    descDisplay.classList.add("descDisplay");
    weatherEmoji.classList.add("weatherEmoji");

    card.appendChild(cityDisplay);
    card.appendChild(tempDisplay);
    card.appendChild(descDisplay);
    card.appendChild(weatherEmoji);

    const weatherDetails = document.createElement("div");
    weatherDetails.classList.add("weatherDetails");
    weatherDetails.append(
        createDetail("Feels like", formatTemperature(main.feels_like)),
        createDetail("Humidity", `${main.humidity}%`),
        createDetail("Wind", `${wind.speed} m/s`),
        createDetail("Sunrise", formatLocalTime(sys.sunrise, timezone)),
        createDetail("Sunset", formatLocalTime(sys.sunset, timezone))
    );
    card.appendChild(weatherDetails);

    displayForecast(forecastData, timezone);

}

function createDetail(label, value){
    const detail = document.createElement("p");
    detail.classList.add("weatherDetail");
    detail.textContent = `${label}: ${value}`;
    return detail;
}

function toCelsius(kelvin){
    return (kelvin - 273.15).toFixed(1);
}

function formatTemperature(kelvin){
    if(isFahrenheit){
        return `${((kelvin - 273.15) * 9 / 5 + 32).toFixed(1)}°F`;
    }

    return `${toCelsius(kelvin)}°C`;
}

function formatLocalTime(timestamp, timezone){
    const localDate = new Date((timestamp + timezone) * 1000);
    return localDate.toISOString().slice(11, 16);
}

function displayForecast(forecastData, timezone){
    const days = new Map();

    forecastData.list.forEach(item => {
        const localDate = new Date((item.dt + timezone) * 1000);
        const dateKey = localDate.toISOString().slice(0, 10);
        const localHour = localDate.getUTCHours() + localDate.getUTCMinutes() / 60;
        const existingDay = days.get(dateKey);

        if(!existingDay){
            days.set(dateKey, {
                item,
                localDate,
                nearestNoon: Math.abs(localHour - 12),
                min: item.main.temp_min,
                max: item.main.temp_max
            });
            return;
        }

        existingDay.min = Math.min(existingDay.min, item.main.temp_min);
        existingDay.max = Math.max(existingDay.max, item.main.temp_max);
        const distanceFromNoon = Math.abs(localHour - 12);

        if(distanceFromNoon < existingDay.nearestNoon){
            existingDay.item = item;
            existingDay.nearestNoon = distanceFromNoon;
        }
    });

    const forecastSection = document.createElement("section");
    forecastSection.classList.add("forecastSection");

    const forecastHeading = document.createElement("h2");
    forecastHeading.textContent = "5-day forecast";
    forecastSection.appendChild(forecastHeading);

    const forecastGrid = document.createElement("div");
    forecastGrid.classList.add("forecastGrid");

    [...days.values()].slice(0, 5).forEach(day => {
        const forecastCard = document.createElement("article");
        forecastCard.classList.add("forecastDay");

        const dayName = document.createElement("h3");
        dayName.textContent = day.localDate.toLocaleDateString(undefined, {
            weekday: "short",
            month: "short",
            day: "numeric",
            timeZone: "UTC"
        });

        const icon = document.createElement("p");
        icon.classList.add("forecastEmoji");
        icon.textContent = getWeatherEmoji(day.item.weather[0].id);
        icon.setAttribute("aria-label", day.item.weather[0].description);

        const temperature = document.createElement("p");
        temperature.classList.add("forecastTemperature");
        temperature.textContent = `${formatTemperature(day.max)} / ${formatTemperature(day.min)}`;

        const description = document.createElement("p");
        description.classList.add("forecastDescription");
        description.textContent = day.item.weather[0].description;

        forecastCard.append(dayName, icon, temperature, description);
        forecastGrid.appendChild(forecastCard);
    });

    forecastSection.appendChild(forecastGrid);
    card.appendChild(forecastSection);
}

function getWeatherEmoji(weatherId){

    switch(true){
        case (weatherId >= 200 && weatherId < 300):
            return "⛈️";
        case (weatherId >= 300 && weatherId < 600):
            return "🌧";
        case (weatherId >= 600 && weatherId < 700):
            return "🌨";
        case (weatherId >= 700 && weatherId < 800):
            return "🌫";
        case (weatherId === 800):
            return "☀️";
        case (weatherId >= 801 && weatherId < 810):
            return "☁️";
        default:
            return "❓️";
    }
}

function getWeatherMood(weatherId){
    if(weatherId >= 200 && weatherId < 300){
        return "storm";
    }
    if(weatherId >= 300 && weatherId < 600){
        return "rain";
    }
    if(weatherId >= 600 && weatherId < 700){
        return "snow";
    }
    if(weatherId >= 700 && weatherId < 800){
        return "mist";
    }
    if(weatherId === 800){
        return "clear";
    }
    return "clouds";
}

function displayError(message, retryCity){
    const errorDisplay = document.createElement("p");
    errorDisplay.textContent = message;
    errorDisplay.classList.add("errorDisplay");

    card.textContent = "" ;
    card.style.display = "flex";
    card.appendChild(errorDisplay);

    if(retryCity){
        const retryButton = document.createElement("button");
        retryButton.type = "button";
        retryButton.classList.add("retryButton");
        retryButton.textContent = "Try again";
        retryButton.addEventListener("click", () => {
            const city = cityInput.value.trim() || retryCity;
            searchWeather(city);
        });
        card.appendChild(retryButton);
    }
}

function loadLastCity(){
    try{
        return localStorage.getItem("weatherAppLastCity");
    }
    catch(error){
        console.error("Could not read the last searched city from local storage.", error);
        return null;
    }
}

function saveLastCity(city){
    try{
        localStorage.setItem("weatherAppLastCity", city);
        return true;
    }
    catch(error){
        console.error("Could not save the last searched city to local storage.", error);
        return false;
    }
}

const initialCity = loadLastCity()?.trim() || "Kathmandu";
cityInput.value = initialCity;
searchWeather(initialCity);

if("serviceWorker" in navigator){
    window.addEventListener("load", () => {
        const workerUrl = new URL("./service-worker.js", document.baseURI);
        navigator.serviceWorker.register(workerUrl)
            .catch(error => console.error("Could not register the offline app worker.", error));
    });
}
