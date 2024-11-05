const weatherForm = document.querySelector(".weatherForm");
const cityInput = document.querySelector(".cityInput");
const card = document.querySelector(".card");
const apikey = "2e6e73e9f3caf826a765a7dd471391d9";

weatherForm.addEventListner("submit", event=> {

    event.preventDefault();

    const city = cityInput.value;

    if(city){

    }
    else{
        displayError("Please enter a city");
    }    
});

async function getWeatherData(city){

}

function displayWeatherInfo(data){

}

function getWeatherEmoji(weatherId){

}

function displayError(message){
    const errorDisplay = document.createElement("p");
    errorDisplay.textContent = message;
    errorDisplay.classList.add("errorDisplay");

    card.textContent = "" ;
    card.style.display = "block";
    card.appendChild(errorDisplay);
}



