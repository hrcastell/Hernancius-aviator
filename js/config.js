// Configuración de APIs
const config = {
    openWeatherMap: {
        apiKey: '4f04d3fda47ff9d3f1aa3c1733bbf52b'
    },
    avwx: {
        apiKey: '', // Pega aquí tu token de AVWX
        baseUrl: 'https://avwx.rest/api'
    }
};

// Exportar la configuración
window.appConfig = config;
