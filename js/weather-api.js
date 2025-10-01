class WeatherAPI {
    constructor() {
        this.config = window.appConfig.avwx;
        this.headers = {
            'Authorization': `Bearer ${this.config.apiKey}`,
            'Content-Type': 'application/json'
        };
        this.recentSearches = JSON.parse(localStorage.getItem('recentAirports') || '[]');
        this.favoriteAirports = JSON.parse(localStorage.getItem('favoriteAirports') || '[]');
    }

    async fetchMetar(icao) {
        try {
            const response = await fetch(`${this.config.baseUrl}/metar/${icao}`, {
                method: 'GET',
                headers: this.headers
            });

            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status}`);
            }

            const data = await response.json();
            return {
                raw: data.raw,
                parsed: data
            };
        } catch (error) {
            console.error('Error fetching METAR:', error);
            throw error;
        }
    }

    async fetchTaf(icao) {
        try {
            const response = await fetch(`${this.config.baseUrl}/taf/${icao}`, {
                method: 'GET',
                headers: this.headers
            });

            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status}`);
            }

            const data = await response.json();
            return {
                raw: data.raw,
                parsed: data
            };
        } catch (error) {
            console.error('Error fetching TAF:', error);
            throw error;
        }
    }

    // Función para validar el código ICAO
    validateIcao(icao) {
        return /^[A-Z]{4}$/.test(icao);
    }

    // Función para obtener el historial de METAR
    async fetchMetarHistory(icao) {
        try {
            const response = await fetch(`${this.config.baseUrl}/metar/${icao}/history`, {
                method: 'GET',
                headers: this.headers
            });

            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error fetching METAR history:', error);
            throw error;
        }
    }

    // Función para obtener información del aeropuerto
    async fetchStationInfo(icao) {
        try {
            const response = await fetch(`${this.config.baseUrl}/station/${icao}`, {
                method: 'GET',
                headers: this.headers
            });

            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error fetching station info:', error);
            throw error;
        }
    }

    // Nuevos métodos para manejar aeropuertos favoritos y recientes
    addToRecent(icao, name) {
        const airport = { icao, name, timestamp: Date.now() };
        this.recentSearches = this.recentSearches.filter(a => a.icao !== icao);
        this.recentSearches.unshift(airport);
        if (this.recentSearches.length > 5) {
            this.recentSearches.pop();
        }
        localStorage.setItem('recentAirports', JSON.stringify(this.recentSearches));
    }

    toggleFavorite(icao, name) {
        const index = this.favoriteAirports.findIndex(a => a.icao === icao);
        if (index === -1) {
            this.favoriteAirports.push({ icao, name });
        } else {
            this.favoriteAirports.splice(index, 1);
        }
        localStorage.setItem('favoriteAirports', JSON.stringify(this.favoriteAirports));
        return index === -1;
    }

    isFavorite(icao) {
        return this.favoriteAirports.some(a => a.icao === icao);
    }

    getRecentSearches() {
        return this.recentSearches;
    }

    getFavoriteAirports() {
        return this.favoriteAirports;
    }

    // Método para obtener el historial de METAR con análisis de tendencias
    async getMetarHistory(icao) {
        try {
            const history = await this.fetchMetarHistory(icao);
            return this.analyzeMetarTrends(history);
        } catch (error) {
            console.error('Error getting METAR history:', error);
            throw error;
        }
    }

    // Método para analizar tendencias en el historial METAR
    analyzeMetarTrends(history) {
        const trends = {
            visibility: [],
            temperature: [],
            windSpeed: [],
            pressure: []
        };

        history.forEach(metar => {
            if (metar.visibility && metar.visibility.value) {
                trends.visibility.push({
                    time: metar.time.dt,
                    value: metar.visibility.value
                });
            }
            if (metar.temperature && metar.temperature.value) {
                trends.temperature.push({
                    time: metar.time.dt,
                    value: metar.temperature.value
                });
            }
            if (metar.wind_speed && metar.wind_speed.value) {
                trends.windSpeed.push({
                    time: metar.time.dt,
                    value: metar.wind_speed.value
                });
            }
            if (metar.altimeter && metar.altimeter.value) {
                trends.pressure.push({
                    time: metar.time.dt,
                    value: metar.altimeter.value
                });
            }
        });

        return {
            raw: history,
            trends
        };
    }

    // Método para obtener aeropuertos cercanos
    async getNearbyAirports(lat, lon, radius = 50) {
        try {
            const response = await fetch(`${this.config.baseUrl}/station/near/${lat},${lon}?radius=${radius}`, {
                method: 'GET',
                headers: this.headers
            });

            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error fetching nearby airports:', error);
            throw error;
        }
    }
}
