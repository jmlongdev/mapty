'use strict';
// https://leafletjs.com/reference.html

/* 10 ADDITIONAL FEATURE IDEAS: 

1. Ability to edit a workout
2. Ability to delete a workout
3. Ability to delete all a workouts
4. Ability to sort workouts by a certain field (ex. distance)
5. Re-Build Running and Cycling objects coming from Local Storage
6. Create more realistic error and confirmation messages

   using leaflet docs
7. Ability to position the map to show all workouts[very hard]
8. Ability to draw lines and shapes instead of just points [very hard]
9. Geocode Location from coodrinates (gives back real location)[only after async JS section]
10. Display weather data for workout time and place [only after async JS section]
*/

class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10);
  clicks = 0;
  constructor(coords, distance, duration) {
    // this.date = ... //this is for ES6
    // this.id = ... // this is for ES6
    this.coords = coords; // [lat, lng]
    this.distance = distance; // km or miles
    this.duration = duration; // min
  }
  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}
    `;
  }
  click() {
    this.clicks++;
  }
}

//child classes of Workout
class Running extends Workout {
  type = 'running';

  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }

  calcPace() {
    // min/km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  type = 'cycling';
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
  }

  calcSpeed() {
    //km/hour
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

class Swimming extends Workout {
  type = 'swimming';
  constructor(coords, distance, duration, laps) {
    super(coords, distance, duration);
    this.laps = laps;
    this.calcLapPace();
    this._setDescription();
  }

  calcLapPace() {
    this.pace = (this.distance / 50 / this.duration) * 60;
  }
}

//////////////////////////////////
//APPLICATION ARCHITECTURE

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
const inputLap = document.querySelector('.form__input--lap');

class App {
  #map;
  #mapZoomLevel = 13;
  #mapEvent;
  #workouts = [];

  constructor() {
    // get users position
    this._getPosition();

    //get data from local storae
    this._getLocalStorage();
    // Attach event handlers
    form.addEventListener('submit', this._newWorkout.bind(this)); // the keyword points to the App object and not the form
    inputType.addEventListener('change', this._toggleTypeField);
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
  }

  _getPosition() {
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert('Could not get your position');
        }
      );
  }
  //Happens First, gets the geolocation and renders the map
  _loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;
    console.log(`https://www.google.com/maps/@${latitude},${longitude}`);
    const coords = [latitude, longitude];

    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);
    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot//{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);
    //Handling clicks on map
    this.#map.on('click', this._showForm.bind(this));
    this.#workouts.forEach(workout => {
      this._renderWorkoutMarker(workout);
    });
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  _hideForm() {
    //empty inputs
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
      inputLap.value =
        '';
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  _toggleTypeField() {
    if (inputType.value === 'running') {
      inputCadence.closest('.form__row').classList.remove('form__row--hidden');
      inputElevation.closest('.form__row').classList.add('form__row--hidden');
      inputLap.closest('.form__row').classList.add('form__row--hidden');
    } else if (inputType.value === 'swimming') {
      inputLap.closest('.form__row').classList.remove('form__row--hidden');
      inputCadence.closest('.form__row').classList.add('form__row--hidden');
      inputElevation.closest('.form__row').classList.add('form__row--hidden');
    } else if (inputType.value === 'cycling') {
      inputElevation
        .closest('.form__row')
        .classList.remove('form__row--hidden');
      inputCadence.closest('.form__row').classList.add('form__row--hidden');
      inputLap.closest('.form__row').classList.add('form__row--hidden');
    }
    // inputArray.map(input => console.log(input));
  }

  _newWorkout(e) {
    //helper functions for checking to see if inputs are numbers and positive
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));
    const allPositive = (...inputs) => inputs.every(inp => inp >= 0);
    e.preventDefault();

    // Get data from form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;
    // if workout running, create running object
    if (type === 'running') {
      const cadence = +inputCadence.value;
      // Check if data is valid
      if (
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        return alert('Inputs have to be positive numbers');
      workout = new Running([lat, lng], distance, duration, cadence);
    }

    // if workout cycling, create cycling object
    if (type === 'cycling') {
      const elevation = +inputElevation.value;
      // Check if data is valid
      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
      )
        return alert('Inputs have to be positive numbers');
      workout = new Cycling([lat, lng], distance, duration, elevation);
    }

    if (type === 'swimming') {
      const laps = +inputLap.value;
      if (
        !validInputs(distance, duration, laps) ||
        !allPositive(distance, duration, laps)
      )
        return alert('Inputs have to be positive numbers');
      workout = new Swimming([lat, lng], distance, duration, laps);
    }

    //add new object to the workout array
    this.#workouts.push(workout);
    // Render workout on map as marker
    this._renderWorkoutMarker(workout);
    // render workout on list
    this._renderWorkout(workout);
    // Hide form + clear input fields
    this._hideForm();

    // Set local storage to all Workouts array
    this._setLocalStorage();
  }

  _renderWorkoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${
          workout.type === 'running'
            ? '🏃‍♂️'
            : workout.type === 'cycling'
            ? '🚴‍♂️'
            : workout.type === 'swimming'
            ? '🏊🏻‍♂️'
            : ''
        }${workout.description}`
      )
      .openPopup();
  }

  test() {
    console.log('test');
  }
  _renderWorkout(workout) {
    let html = `
    <li class="workout workout--${workout.type}" data-id="${workout.id}">
    
    <h2 class="workout__title">${workout.description}
    <span class="icon"><i class="fas fa-trash"></i></span></h2>
    <div class="workout__details">
    <span class="workout__icon">${
      workout.type === 'running'
        ? '🏃‍♂️'
        : workout.type === 'cycling'
        ? '🚴‍♂️'
        : workout.type === 'swimming'
        ? '🏊🏻‍♂️'
        : ''
    }</span>
    <span class="workout__value">${workout.distance}</span>
    <span class="workout__unit">${
      workout.type === 'swimming' ? 'm' : 'km'
    }</span>
    </div>
    <div class="workout__details">
    <span class="workout__icon">⏱</span>
    <span class="workout__value">${workout.duration}</span>
    <span class="workout__unit">min</span>
    </div>`;
    if (workout.type === 'running')
      html += `
      <div class="workout__details">
        <span class="workout__icon">⚡️</span>
        <span class="workout__value">${workout.pace.toFixed(1)}</span>
        <span class="workout__unit">min/km</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">🦶🏼</span>
        <span class="workout__value">${workout.cadence}</span>
        <span class="workout__unit">spm</span>
      </div>
    </li>    
      `;
    if (workout.type === 'cycling')
      html += `
      <div class="workout__details">
        <span class="workout__icon">⚡️</span>
        <span class="workout__value">${workout.speed.toFixed(1)}</span>
        <span class="workout__unit">km/h</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">⛰</span>
        <span class="workout__value">${workout.elevationGain}</span>
        <span class="workout__unit">m</span>
      </div>
    </li>
      `;
    if (workout.type === 'swimming')
      html += `<div class="workout__details">
      <span class="workout__icon">🔁</span>
      <span class="workout__value">${workout.laps}</span>
      <span class="workout__unit">laps</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">🏊🏻‍♀️</span>
      <span class="workout__value">${workout.pace}</span>
      <span class="workout__unit">m/min</span>
    </div>
  </li>
  `;
    form.insertAdjacentHTML('afterend', html);
  }

  _moveToPopup(e) {
    const workoutEl = e.target.closest('.workout');

    if (!workoutEl) return;

    const workout = this.#workouts.find(
      workout => workout.id === workoutEl.dataset.id
    );

    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    });

    // using the public inteface
    // workout.click();
  }

  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));

    if (!data) return;
    this.#workouts = data;
    this.#workouts.forEach(workout => {
      this._renderWorkout(workout);
    });
  }

  _deleteWorkout(id) {
    // const getStorage = localStorage.getItem('workouts');
    // data = JSON.parse(getStorage);
    // data.splice(index, 1);
    // setLocalStorage();
    // this._renderWorkout();
    console.log('it works');
  }

  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }
}

const app = new App();
