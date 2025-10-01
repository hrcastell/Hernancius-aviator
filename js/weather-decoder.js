// Funciones para decodificar reportes meteorológicos
class WeatherDecoder {
    constructor() {
        this.visibilityUnits = {
            m: 'metros',
            km: 'kilómetros',
            SM: 'millas estatuto'
        };

        this.cloudTypes = {
            FEW: 'Escasa (1-2 octas)',
            SCT: 'Dispersa (3-4 octas)',
            BKN: 'Fragmentada (5-7 octas)',
            OVC: 'Cubierto (8 octas)',
            CLR: 'Sin nubes',
            SKC: 'Cielo despejado'
        };

        this.weatherPhenomena = {
            // Intensidad
            '-': 'Ligero',
            '+': 'Fuerte',
            'VC': 'En las proximidades',
            
            // Precipitación
            'DZ': 'Llovizna',
            'RA': 'Lluvia',
            'SN': 'Nieve',
            'SG': 'Cinarra',
            'IC': 'Cristales de hielo',
            'PL': 'Hielo granulado',
            'GR': 'Granizo',
            'GS': 'Granizo pequeño',
            
            // Oscurecimiento
            'BR': 'Neblina',
            'FG': 'Niebla',
            'FU': 'Humo',
            'VA': 'Ceniza volcánica',
            'DU': 'Polvo',
            'SA': 'Arena',
            'HZ': 'Calima',
            
            // Otros
            'PO': 'Remolinos de polvo',
            'SQ': 'Turbonada',
            'FC': 'Nube embudo',
            'SS': 'Tormenta de arena',
            'DS': 'Tormenta de polvo'
        };
    }

    decodeMetar(metar) {
        const parts = metar.split(' ');
        let decoded = {
            aeropuerto: parts[0],
            tiempo: this.decodeTime(parts[1]),
            viento: this.decodeWind(parts[2]),
            visibilidad: this.decodeVisibility(parts[3]),
            fenomenos: [],
            nubes: [],
            temperatura: null,
            presion: null
        };

        // Procesar el resto de los elementos
        for (let i = 4; i < parts.length; i++) {
            const part = parts[i];
            
            // Temperatura y punto de rocío
            if (part.includes('/')) {
                decoded.temperatura = this.decodeTemperature(part);
            }
            // Presión
            else if (part.startsWith('Q') || part.startsWith('A')) {
                decoded.presion = this.decodePressure(part);
            }
            // Nubes
            else if (this.isCloudLayer(part)) {
                decoded.nubes.push(this.decodeCloud(part));
            }
            // Fenómenos meteorológicos
            else if (this.isWeatherPhenomena(part)) {
                decoded.fenomenos.push(this.decodeWeatherPhenomena(part));
            }
        }

        return decoded;
    }

    decodeTaf(taf) {
        const parts = taf.split(' ');
        let decoded = {
            aeropuerto: parts[0],
            tiempo_emision: this.decodeTime(parts[1]),
            validez: this.decodeValidityPeriod(parts[2]),
            pronosticos: []
        };

        let currentForecast = {
            condiciones: {}
        };

        // Procesar el resto de los elementos
        for (let i = 3; i < parts.length; i++) {
            const part = parts[i];
            
            // Nuevo período de pronóstico
            if (part.includes('/')) {
                if (Object.keys(currentForecast.condiciones).length > 0) {
                    decoded.pronosticos.push({...currentForecast});
                }
                currentForecast = {
                    periodo: this.decodeValidityPeriod(part),
                    condiciones: {}
                };
            }
            // Cambio temporal
            else if (part === 'TEMPO' || part === 'BECMG' || part === 'FM') {
                if (Object.keys(currentForecast.condiciones).length > 0) {
                    decoded.pronosticos.push({...currentForecast});
                }
                currentForecast = {
                    tipo: part,
                    condiciones: {}
                };
            }
            // Resto de elementos
            else {
                if (this.isWind(part)) {
                    currentForecast.condiciones.viento = this.decodeWind(part);
                }
                else if (this.isVisibility(part)) {
                    currentForecast.condiciones.visibilidad = this.decodeVisibility(part);
                }
                else if (this.isCloudLayer(part)) {
                    if (!currentForecast.condiciones.nubes) {
                        currentForecast.condiciones.nubes = [];
                    }
                    currentForecast.condiciones.nubes.push(this.decodeCloud(part));
                }
                else if (this.isWeatherPhenomena(part)) {
                    if (!currentForecast.condiciones.fenomenos) {
                        currentForecast.condiciones.fenomenos = [];
                    }
                    currentForecast.condiciones.fenomenos.push(this.decodeWeatherPhenomena(part));
                }
            }
        }

        // Agregar el último pronóstico
        if (Object.keys(currentForecast.condiciones).length > 0) {
            decoded.pronosticos.push(currentForecast);
        }

        return decoded;
    }

    decodeTime(timeStr) {
        if (!timeStr) return null;
        const day = timeStr.substring(0, 2);
        const hour = timeStr.substring(2, 4);
        const minute = timeStr.substring(4, 6);
        return `Día ${day} a las ${hour}:${minute}Z`;
    }

    decodeWind(windStr) {
        if (!windStr) return null;
        const direction = windStr.substring(0, 3);
        const speed = windStr.substring(3, 5);
        const unit = windStr.includes('KT') ? 'nudos' : 'KPH';
        const gust = windStr.includes('G') ? windStr.split('G')[1].replace(unit, '') : null;
        
        return {
            direccion: direction === 'VRB' ? 'Variable' : `${direction}°`,
            velocidad: `${speed} ${unit}`,
            rafaga: gust ? `${gust} ${unit}` : null
        };
    }

    decodeVisibility(visStr) {
        if (!visStr) return null;
        if (visStr === '9999') return 'Más de 10 kilómetros';
        
        let value = parseInt(visStr);
        let unit = 'm';
        
        if (visStr.includes('SM')) {
            unit = 'SM';
            value = parseFloat(visStr);
        } else if (value >= 1000) {
            value = value / 1000;
            unit = 'km';
        }
        
        return `${value} ${this.visibilityUnits[unit]}`;
    }

    decodeCloud(cloudStr) {
        if (!cloudStr) return null;
        const type = cloudStr.substring(0, 3);
        const height = parseInt(cloudStr.substring(3, 6)) * 100;
        return `${this.cloudTypes[type]} a ${height} pies`;
    }

    decodeTemperature(tempStr) {
        if (!tempStr) return null;
        const [temp, dewpoint] = tempStr.split('/');
        return {
            temperatura: `${temp}°C`,
            punto_rocio: `${dewpoint}°C`
        };
    }

    decodePressure(pressureStr) {
        if (!pressureStr) return null;
        if (pressureStr.startsWith('Q')) {
            return `${pressureStr.substring(1)} hPa`;
        } else {
            return `${pressureStr.substring(1)} inHg`;
        }
    }

    decodeValidityPeriod(periodStr) {
        if (!periodStr) return null;
        const [start, end] = periodStr.split('/');
        return {
            inicio: this.decodeTime(start),
            fin: this.decodeTime(end)
        };
    }

    decodeWeatherPhenomena(wxStr) {
        if (!wxStr) return null;
        let intensity = '';
        let phenomena = wxStr;

        // Verificar intensidad
        if (wxStr.startsWith('+') || wxStr.startsWith('-')) {
            intensity = wxStr[0];
            phenomena = wxStr.substring(1);
        } else if (wxStr.startsWith('VC')) {
            intensity = 'VC';
            phenomena = wxStr.substring(2);
        }

        // Decodificar fenómeno
        const decoded = this.weatherPhenomena[phenomena] || phenomena;
        const intensityText = this.weatherPhenomena[intensity] || '';

        return intensityText ? `${intensityText} ${decoded}` : decoded;
    }

    isWind(str) {
        return /^\d{5,6}(G\d{2,3})?(KT|MPS|KPH)$|^VRB\d{2}(G\d{2,3})?(KT|MPS|KPH)$/.test(str);
    }

    isVisibility(str) {
        return /^\d{4}$|^\d{1,2}SM$/.test(str);
    }

    isCloudLayer(str) {
        return /^(FEW|SCT|BKN|OVC)\d{3}(CB|TCU)?$|^(CLR|SKC)$/.test(str);
    }

    isWeatherPhenomena(str) {
        const phenomena = Object.keys(this.weatherPhenomena).join('|');
        const regex = new RegExp(`^[+-]?(${phenomena})+$`);
        return regex.test(str);
    }
}

// Exportar el decodificador
window.WeatherDecoder = WeatherDecoder;
