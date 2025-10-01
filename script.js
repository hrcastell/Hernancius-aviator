// Valores estándar de distancia para una altitud de presión dada (p.ej., 0 ft)
// Datos estándar de distancia de despegue con diferentes intensidades de viento
const takeoffData = {
    0: {
        0: { groundRun: 735, totalToClear: 1385 },
        2500: { groundRun: 910, totalToClear: 1660 },
        5000: { groundRun: 1115, totalToClear: 1985 },
        7500: { groundRun: 1360, totalToClear: 2440 }
    },
    10: {
        0: { groundRun: 500, totalToClear: 1035 },
        2500: { groundRun: 630, totalToClear: 1250 },
        5000: { groundRun: 780, totalToClear: 1510 },
        7500: { groundRun: 970, totalToClear: 1875 }
    },
    20: {
        0: { groundRun: 305, totalToClear: 730 },
        2500: { groundRun: 395, totalToClear: 890 },
        5000: { groundRun: 505, totalToClear: 1090 },
        7500: { groundRun: 640, totalToClear: 1375 }
    }
};

// Valores estándar de Rate of Climb para diferentes altitudes
const rocData = {
    0: { iasMph: 76, rocFeetPerMinute: 670, fuelUsedGal: 0.6, temperatureF: 59 },
    5000: { iasMph: 73, rocFeetPerMinute: 440, fuelUsedGal: 1.6, temperatureF: 41 },
    10000: { iasMph: 70, rocFeetPerMinute: 220, fuelUsedGal: 3, temperatureF: 23 }
};

// Valores estándar de Landing Distance para diferentes altitudes
const standardLandingData = {
    0: { groundRoll: 445, totalToClear: 1075 },
    2500: { groundRoll: 470, totalToClear: 1135 },
    5000: { groundRoll: 495, totalToClear: 1195 },
    7500: { groundRoll: 520, totalToClear: 1255 }
};



// Función para convertir de Celsius a Fahrenheit
function celsiusToFahrenheit(celsius) {
    return celsius * 9/5 + 32;
}

// Función para convertir pies a metros
function feetToMeters(feet) {
    return feet * 0.3048;
}

//selecciona el valor mas cercano segun la intensidad de viento
function selectNearestWindData(windSpeedKnots) {
    const windCategories = [0, 10, 20];
    return windCategories.reduce((prev, curr) => 
        Math.abs(curr - windSpeedKnots) < Math.abs(prev - windSpeedKnots) ? curr : prev
    );
}

// Función para seleccionar la altitud más cercana
function selectNearestAltitudeData(altitude) {
    const altitudeCategories = [0, 5000, 10000];
    return altitudeCategories.reduce((prev, curr) => 
        Math.abs(curr - altitude) < Math.abs(prev - altitude) ? curr : prev
    );
}


function calculateTakeoffDistance(altitude, temperatureCelsius, windSpeedKnots) {
    let temperatureFahrenheit = celsiusToFahrenheit(temperatureCelsius);

    // Seleccionar el valor de viento más cercano
    let nearestWindSpeed = selectNearestWindData(windSpeedKnots);
    let baseData = takeoffData[nearestWindSpeed];

    // Seleccionar el valor de altitud más cercano
    let nearestAltitude = selectNearestAltitudeData(altitude);
    let groundRun = baseData[nearestAltitude].groundRun;
    let totalToClear = baseData[nearestAltitude].totalToClear;

    // Ajuste de temperatura
    let temperatureAdjustment = 1 + ((temperatureFahrenheit - 59) / 35) * 0.1;
    let adjustedGroundRun = groundRun * temperatureAdjustment;
    let adjustedTotalToClear = totalToClear * temperatureAdjustment;

    return {
        groundRunFeet: adjustedGroundRun,
        groundRunMeters: feetToMeters(adjustedGroundRun),
        totalToClearFeet: adjustedTotalToClear,
        totalToClearMeters: feetToMeters(adjustedTotalToClear)
    };
}


// Función para calcular el Rate of Climb ajustado
function calculateROC(altitude, temperatureCelsius) {
    let temperatureFahrenheit = celsiusToFahrenheit(temperatureCelsius);

    // Seleccionar la altitud más cercana
    let nearestAltitude = selectNearestAltitudeData(altitude);
    let baseData = rocData[nearestAltitude];

    // Verificar si se obtuvo correctamente el conjunto de datos
    if (!baseData) {
        console.error("Datos no encontrados para la altitud más cercana:", nearestAltitude);
        return { rocFeetPerMinute: 0, rocMetersPerMinute: 0, fuelUsedGal: 0 };
    }

    // Calcular la diferencia de temperatura
    let temperatureDifference = temperatureFahrenheit - baseData.temperatureF;

    // Ajustar la ROC según la diferencia de temperatura
    let temperatureAdjustmentFactor = 1 - (temperatureDifference / 10) * 0.1;
    let adjustedROCFeetPerMinute = baseData.rocFeetPerMinute * temperatureAdjustmentFactor;

    return {
        rocFeetPerMinute: adjustedROCFeetPerMinute,
        rocMetersPerMinute: feetToMeters(adjustedROCFeetPerMinute),
        fuelUsedGal: baseData.fuelUsedGal
    };
}


// Función para calcular la distancia de aterrizaje ajustada según la altitud de la pista de aterrizaje
function calculateLandingDistance(altitude) {
    let baseLanding;

    if (altitude <= 2500) {
        baseLanding = standardLandingData[0];
    } else if (altitude <= 5000) {
        baseLanding = standardLandingData[2500];
    } else if (altitude <= 7500) {
        baseLanding = standardLandingData[5000];
    } else {
        baseLanding = standardLandingData[7500];
    }

    return {
        groundRollFeet: baseLanding.groundRoll,
        groundRollMeters: feetToMeters(baseLanding.groundRoll),
        totalToClearFeet: baseLanding.totalToClear,
        totalToClearMeters: feetToMeters(baseLanding.totalToClear)
    };
}

// Función para manejar la entrada del usuario y mostrar resultados
function handleUserInput() {
    let takeoffAltitude1 = parseFloat(document.getElementById("takeoffAltitude1").value);
    let landingAltitude = parseFloat(document.getElementById("landingAltitude").value);
    let temperatureCelsius1 = parseFloat(document.getElementById("temperature1").value);
    let windSpeedKnots = parseFloat(document.getElementById("windSpeed0").value);

    let takeoffDistance = calculateTakeoffDistance(takeoffAltitude1, temperatureCelsius1, windSpeedKnots);
    let roc = calculateROC(takeoffAltitude1, temperatureCelsius1); // Pasamos la altitud de despegue y la temperatura
    let landingDistance = calculateLandingDistance(landingAltitude);

    document.getElementById("groundRunResultFeet").textContent = takeoffDistance.groundRunFeet.toFixed(2) + " ft";
    document.getElementById("groundRunResultMeters").textContent = takeoffDistance.groundRunMeters.toFixed(2) + " m";
    document.getElementById("totalToClearResultFeet").textContent = takeoffDistance.totalToClearFeet.toFixed(2) + " ft";
    document.getElementById("totalToClearResultMeters").textContent = takeoffDistance.totalToClearMeters.toFixed(2) + " m";

    document.getElementById("rocFeetPerMinute").textContent = roc.rocFeetPerMinute.toFixed(2) + " ft/min";
    document.getElementById("rocMetersPerMinute").textContent = roc.rocMetersPerMinute.toFixed(2) + " m/min";

    document.getElementById("landingGroundRollResultFeet").textContent = landingDistance.groundRollFeet.toFixed(2) + " ft";
    document.getElementById("landingGroundRollResultMeters").textContent = landingDistance.groundRollMeters.toFixed(2) + " m";
    document.getElementById("landingTotalToClearResultFeet").textContent = landingDistance.totalToClearFeet.toFixed(2) + " ft";
    document.getElementById("landingTotalToClearResultMeters").textContent = landingDistance.totalToClearMeters.toFixed(2) + " m";
}


function convertSpeedToKnots(speed, unit) {
            if (unit === 'mph') {
                return speed * 0.868976;  // Conversión de mph a nudos
            }
            return speed;  // Si ya está en nudos, no hace falta convertir
        }

        function calculateClimb() {
            let speedUnit = document.getElementById("speedUnit").value;
            let takeoffAltitude2 = parseFloat(document.getElementById("takeoffAltitude2").value);
            let cruiseAltitude = parseFloat(document.getElementById("cruiseAltitude").value);
            let rpm = parseFloat(document.getElementById("rpm").value);
            let climbSpeed = parseFloat(document.getElementById("climbSpeed").value);
            let roc = parseFloat(document.getElementById("roc").value);
            let temperature2 = parseFloat(document.getElementById("temperature2").value);
            let windSpeed1 = parseFloat(document.getElementById("windSpeed1").value);
        
            // Convertir la velocidad de ascenso a nudos si es necesario
            climbSpeed = convertSpeedToKnots(climbSpeed, speedUnit);
        
            // Calcular el descenso de temperatura con la altitud
            let temperatureAtCruise = temperature2 - ((cruiseAltitude - takeoffAltitude2) / 1000) * 2;
        
            // Calcular TAS
            let TAS = calculateTAS(climbSpeed, cruiseAltitude, temperatureAtCruise);
        
            // Calcular GS
            let GS = calculateGS(TAS, windSpeed1, 0, 0);  // Suponemos que el viento y el rumbo coinciden
        
            // Calcular tiempo de ascenso (Altitud de crucero - Altitud de despegue) / ROC
            let climbTimeMinutes = (cruiseAltitude - takeoffAltitude2) / roc;
        
            // Calcular distancia recorrida durante el ascenso
            let climbDistanceNM = (GS * climbTimeMinutes) / 60;
        
            // Cálculo del consumo de combustible basado en RPM y altitud
            const cruisePerformance = {
                2200: { 0: 4.4, 2500: 4.2, 5000: 4.0, 7500: 3.8 },
                2300: { 0: 4.8, 2500: 4.6, 5000: 4.4, 7500: 4.2 },
                2400: { 0: 5.4, 2500: 5.2, 5000: 5.0, 7500: 4.8 },
                2500: { 0: 6.1, 2500: 5.9, 5000: 5.7, 7500: 5.5 },
                2600: { 0: 6.9, 2500: 6.7, 5000: 6.5, 7500: 6.3 }
            };
        
            // Seleccionar la altitud correcta para el consumo de combustible
            let altitudeCategory = 
                cruiseAltitude <= 2500 ? 0 :
                cruiseAltitude <= 5000 ? 2500 :
                cruiseAltitude <= 7500 ? 5000 : 7500;
        
            let nearestRPM = Object.keys(cruisePerformance).reduce((prev, curr) => 
                Math.abs(curr - rpm) < Math.abs(prev - rpm) ? curr : prev
            );
            let fuelConsumptionPerHour = cruisePerformance[nearestRPM][altitudeCategory];
            let fuelConsumption = (climbTimeMinutes / 60) * fuelConsumptionPerHour;
        
            // Mostrar los resultados
            document.getElementById("climbDistance").textContent = climbDistanceNM.toFixed(2) + " NM";
            document.getElementById("climbTime").textContent = climbTimeMinutes.toFixed(2) + " min";
            document.getElementById("climbFuelConsumption").textContent = fuelConsumption.toFixed(2) + " GAL";
        }
        
//----------------------------------------------------------------------------------------------------------------
        function calculateTAS(CAS, altitude, temperatureCelsius) {
            let temperatureFahrenheit = celsiusToFahrenheit(temperatureCelsius);
            let factorTemperature = (temperatureFahrenheit - 59) / 1000;
            let TAS = CAS * (1 + (altitude / 1000) * factorTemperature);
            return TAS;
        }

        function calculateGS(TAS, windSpeed, windDirection, flightDirection) {
            let windAngle = (windDirection - flightDirection) * (Math.PI / 180);
            let GS = TAS + windSpeed * Math.cos(windAngle);
            return GS;
        }

        function celsiusToFahrenheit(celsius) {
            return celsius * 9/5 + 32;
        }

//----------------------------------------------------------------------------------------------------------------
// Función principal de cálculo del vuelo recto y nivelado
function calculateLevelFlight() {
    // Obtener los valores del formulario
    const getInputValue = (id) => {
        const element = document.getElementById(id);
        if (!element) {
            console.error(`Elemento con id '${id}' no encontrado`);
            return NaN;
        }
        const value = parseFloat(element.value);
        console.log(`Valor de '${id}': ${value}`); // Log para verificar el valor obtenido
        return value;
    };

    const inputs = {
        windDirection: getInputValue("windDirection"),
        windSpeed2: getInputValue("windSpeed2"),
        heading: getInputValue("heading"),
        temperature3: getInputValue("temperature3"),
        power: getInputValue("power"),
        indicatedSpeed: getInputValue("indicatedSpeed"),
        distance: getInputValue("distance"),
        altitude: getInputValue("altitude")
    };

    console.log("Valores de entrada:", inputs);

    // Verificar si algún valor es NaN
    if (Object.values(inputs).some(isNaN)) {
        console.error("Uno o más valores de entrada son inválidos");
        return;
    }

    // Cálculos
    let windAngle = (inputs.windDirection - inputs.heading + 360) % 360;
    let headwindComponent = inputs.windSpeed2 * Math.cos(windAngle * Math.PI / 180);
    let GS = inputs.indicatedSpeed + headwindComponent;
    let flightTime = inputs.distance / GS;
    let crosswindComponent = inputs.windSpeed2 * Math.sin(windAngle * Math.PI / 180);
    let WCA = Math.atan2(crosswindComponent, inputs.indicatedSpeed) * (180 / Math.PI);

    // Tabla de consumo de combustible
    const cruisePerformance = {
        2200: { 0: 4.4, 2500: 4.2, 5000: 4.0, 7500: 3.8 },
        2300: { 0: 4.8, 2500: 4.6, 5000: 4.4, 7500: 4.2 },
        2400: { 0: 5.4, 2500: 5.2, 5000: 5.0, 7500: 4.8 },
        2500: { 0: 6.1, 2500: 5.9, 5000: 5.7, 7500: 5.5 },
        2600: { 0: 6.9, 2500: 6.7, 5000: 6.5, 7500: 6.3 }
    };

    // Seleccionar la altitud correcta para el consumo de combustible
    let altitudeCategory = 
        inputs.altitude <= 2500 ? 0 :
        inputs.altitude <= 5000 ? 2500 :
        inputs.altitude <= 7500 ? 5000 : 7500;

    // Cálculo del consumo de combustible basado en RPM y altitud
    let nearestRPM = Object.keys(cruisePerformance).reduce((prev, curr) => 
        Math.abs(curr - inputs.power) < Math.abs(prev - inputs.power) ? curr : prev
    );
    let fuelConsumptionPerHour = cruisePerformance[nearestRPM][altitudeCategory];
    let fuelConsumption = fuelConsumptionPerHour * flightTime;

    // Función para actualizar un elemento del DOM
    const updateElement = (id, value) => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
            console.log(`Actualizado ${id}: ${value}`);
        } else {
            console.error(`Elemento con id '${id}' no encontrado`);
        }
    };

    // Actualizar los resultados en el HTML
    updateElement("flightTime", Math.round(flightTime * 60) + " minutos");
    updateElement("fuelConsumption", fuelConsumption.toFixed(1) + " GAL");
    updateElement("windCorrection", WCA.toFixed(1) + "°");
    updateElement("groundSpeedKnots", GS.toFixed(1) + " nudos");
    updateElement("groundSpeedMiles", (GS * 1.15078).toFixed(1) + " millas/hora");

    console.log("Cálculos completados");
}

// Función para inicializar la calculadora
function initializeCalculator() {
    const calculateButton = document.getElementById("calculateButton");
    if (calculateButton) {
        calculateButton.addEventListener('click', function(e) {
            e.preventDefault();
            calculateLevelFlight();
        });
        console.log("Event listener añadido al botón de cálculo");
    } else {
        console.error("Botón de cálculo no encontrado");
    }

    // Ejecutar un cálculo inicial si todos los campos tienen valores
    if (document.querySelectorAll('input[type="number"]').length > 0) {
        calculateLevelFlight();
    }
}

// Inicializar la calculadora cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', initializeCalculator);



// lectura de la carta
function renderChart() {
    const ctx = document.getElementById('myChart').getContext('2d');
    const myChart = new Chart(ctx, {
        type: 'line',  // Tipo de gráfico (línea)
        data: {
            labels: ['Despegue', 'Ascenso', 'Crucero', 'Descenso', 'Aterrizaje'],  // Etiquetas del eje X
            datasets: [{
                label: 'Consumo de Combustible (galones)',
                data: [5, 6, 7, 4, 2],  // Datos para cada fase del vuelo
                backgroundColor: 'rgba(54, 162, 235, 0.2)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 2,
                fill: true  // Rellenar el área bajo la línea
            }]
        },
        options: {
            responsive: true,
            plugins: {
                tooltip: {
                    mode: 'index',  // Mostrar tooltip cuando el ratón está sobre el gráfico
                    intersect: false
                },
                title: {
                    display: true,
                    text: 'Consumo de Combustible durante el Vuelo'
                }
            },
            scales: {
                x: {
                    beginAtZero: true
                },
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}