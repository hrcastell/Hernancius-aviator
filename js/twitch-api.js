// Twitch API Integration
document.addEventListener('DOMContentLoaded', function() {
    // Cargar configuración guardada
    loadTwitchConfig();
    
    // Cargar el script de Twitch Embed
    const twitchEmbedScript = document.createElement('script');
    twitchEmbedScript.src = 'https://embed.twitch.tv/embed/v1.js';
    document.body.appendChild(twitchEmbedScript);
    
    twitchEmbedScript.onload = function() {
        // Inicializar el reproductor de Twitch cuando el script esté cargado
        initTwitchPlayer();
        
        // Cargar clips destacados
        loadFeaturedClips();
    };
    
    // También intentamos cargar el estado del canal para mostrar si está en vivo
    checkChannelStatus();
});

// Configuración de Twitch - Valores por defecto
let TWITCH_CHANNEL = localStorage.getItem('twitch_channel') || 'hernancius'; // Valor predeterminado
const TWITCH_CLIENT_ID = 'gp762nuuoqcoxypju8c569th9wz7q5'; // ID del cliente proporcionado
let TWITCH_ACCESS_TOKEN = localStorage.getItem('twitch_access_token') || 'e59ftazosj5gg6gqlfvg13tma3vez6'; // Token proporcionado
const TWITCH_REFRESH_TOKEN = 'hxicf8wchxppsmm4cem9rx5m3797sf4vm8a4jkv5yi0jqpodnz'; // Token de refresco proporcionado

// Cargar configuración desde localStorage
function loadTwitchConfig() {
    const savedToken = localStorage.getItem('twitch_access_token');
    const savedChannel = localStorage.getItem('twitch_channel');
    
    // Si no hay token guardado, usar el predeterminado y guardarlo
    if (!savedToken) {
        localStorage.setItem('twitch_access_token', TWITCH_ACCESS_TOKEN);
    }
    
    // Si no hay canal guardado, usar el predeterminado y guardarlo
    if (!savedChannel) {
        localStorage.setItem('twitch_channel', TWITCH_CHANNEL);
    }
    
    // Actualizar enlaces a Twitch con el canal correcto
    const twitchLinks = document.querySelectorAll('a[href*="twitch.tv"]');
    twitchLinks.forEach(link => {
        link.href = `https://www.twitch.tv/${TWITCH_CHANNEL}`;
    });
}

// Inicializar el reproductor de Twitch
function initTwitchPlayer() {
    if (window.Twitch && document.getElementById('twitch-embed')) {
        new Twitch.Embed("twitch-embed", {
            width: "100%",
            height: "100%",
            channel: TWITCH_CHANNEL,
            layout: "video-with-chat", // Incluir chat para mayor interacción
            autoplay: true, // Reproducir automáticamente
            muted: false, // No silenciar
            parent: [window.location.hostname, 'localhost', '127.0.0.1'] // Permitir embebido en localhost para pruebas
        });
    }
}

// Verificar si el canal está en vivo
function checkChannelStatus() {
    // Esta función requiere un token de acceso válido
    if (!TWITCH_ACCESS_TOKEN) {
        console.log('Se requiere un token de acceso para verificar el estado del canal');
        updateStreamStatus(false, 'Estado desconocido');
        return;
    }
    
    fetch(`https://api.twitch.tv/helix/streams?user_login=${TWITCH_CHANNEL}`, {
        headers: {
            'Client-ID': TWITCH_CLIENT_ID,
            'Authorization': `Bearer ${TWITCH_ACCESS_TOKEN}`
        }
    })
    .then(response => response.json())
    .then(data => {
        const isLive = data.data && data.data.length > 0;
        const streamInfo = isLive ? data.data[0] : null;
        
        updateStreamStatus(isLive, streamInfo);
    })
    .catch(error => {
        console.error('Error al verificar el estado del canal:', error);
        updateStreamStatus(false, 'Error al cargar el estado');
    });
}

// Actualizar la interfaz con el estado del stream
function updateStreamStatus(isLive, streamInfo) {
    const statusElement = document.getElementById('stream-status');
    if (!statusElement) return;
    
    if (isLive && streamInfo) {
        statusElement.innerHTML = `
            <div class="flex items-center">
                <span class="inline-block w-3 h-3 bg-red-500 rounded-full mr-2 animate-pulse"></span>
                <span class="font-semibold text-red-500">EN VIVO</span>
            </div>
            <p class="mt-2 text-gray-700 dark:text-gray-300">${streamInfo.title}</p>
            <p class="text-sm text-gray-600 dark:text-gray-400">
                ${streamInfo.viewer_count} espectadores • 
                Comenzó hace ${getTimeElapsed(streamInfo.started_at)}
            </p>
        `;
    } else {
        statusElement.innerHTML = `
            <div class="flex items-center">
                <span class="inline-block w-3 h-3 bg-gray-400 rounded-full mr-2"></span>
                <span class="font-semibold text-gray-500">OFFLINE</span>
            </div>
            <p class="mt-2 text-gray-600 dark:text-gray-400">
                El canal no está transmitiendo en este momento. 
                Consulta el horario para conocer las próximas transmisiones.
            </p>
        `;
    }
}

// Cargar clips destacados
function loadFeaturedClips() {
    // Esta función requiere un token de acceso válido
    if (!TWITCH_ACCESS_TOKEN) {
        document.getElementById('clips-loading').textContent = 'Se requiere autenticación para cargar clips';
        return;
    }
    
    fetch(`https://api.twitch.tv/helix/clips?broadcaster_id=${TWITCH_CHANNEL}&first=3`, {
        headers: {
            'Client-ID': TWITCH_CLIENT_ID,
            'Authorization': `Bearer ${TWITCH_ACCESS_TOKEN}`
        }
    })
    .then(response => response.json())
    .then(data => {
        const clipsContainer = document.getElementById('twitch-clips');
        
        if (data.data && data.data.length > 0) {
            // Limpiar el contenedor
            clipsContainer.innerHTML = '';
            
            // Agregar cada clip
            data.data.forEach(clip => {
                const clipElement = document.createElement('div');
                clipElement.className = 'mb-4';
                clipElement.innerHTML = `
                    <div class="aspect-w-16 aspect-h-9 mb-2">
                        <iframe
                            src="https://clips.twitch.tv/embed?clip=${clip.id}&parent=${window.location.hostname}"
                            frameborder="0"
                            allowfullscreen="true"
                            scrolling="no"
                            width="100%"
                            height="100%">
                        </iframe>
                    </div>
                    <h4 class="font-semibold text-gray-800 dark:text-gray-200">${clip.title}</h4>
                    <p class="text-sm text-gray-600 dark:text-gray-400">
                        ${clip.view_count} visualizaciones • 
                        Creado por ${clip.creator_name}
                    </p>
                `;
                clipsContainer.appendChild(clipElement);
            });
        } else {
            clipsContainer.innerHTML = '<p class="text-gray-600 dark:text-gray-400 text-center py-4">No se encontraron clips destacados</p>';
        }
    })
    .catch(error => {
        console.error('Error al cargar clips:', error);
        document.getElementById('clips-loading').textContent = 'Error al cargar clips destacados';
    });
}

// Función para configurar el token de acceso de Twitch
function setTwitchToken(token) {
    if (token && token.trim() !== '') {
        localStorage.setItem('twitch_access_token', token);
        TWITCH_ACCESS_TOKEN = token;
        
        // Recargar datos de Twitch
        checkChannelStatus();
        loadFeaturedClips();
        
        return true;
    }
    return false;
}

// Función auxiliar para calcular el tiempo transcurrido
function getTimeElapsed(startTime) {
    const start = new Date(startTime);
    const now = new Date();
    const diffMs = now - start;
    
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 60) {
        return `${diffMins} minutos`;
    } else {
        const hours = Math.floor(diffMins / 60);
        const mins = diffMins % 60;
        return `${hours} horas y ${mins} minutos`;
    }
}
