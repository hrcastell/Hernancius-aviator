# Sugerencias de UI/UX - Hernancius Aviation

## ✅ Implementado en el ROADMAP

Las siguientes configuraciones ya están contempladas en el diseño (implementación web: React + Vite):

### 1. Temas Visuales
- **Modo Claro** y **Modo Oscuro** con paletas completas
- **Auto**: Sigue configuración del sistema operativo (`prefers-color-scheme`)
- Colores específicos de aviación (VFR/IFR/MVFR/LIFR)

### 2. Tipografía Adaptativa
- Fuente única: **Roboto** (Regular, Medium, Bold)
- **Respeta configuración del navegador/OS** para tamaño de fuente (unidades `rem`)
- Escala opcional adicional (0.85x - 2.0x)
- Jerarquía visual clara (Display, Headline, Title, Body, Caption)

### 3. Accesibilidad
- **Alto contraste**: Sigue configuración del sistema
- **Reducción de movimiento**: Desactiva animaciones complejas
- **Tamaño de fuente**: Adaptativo según OS
- **Navegación por teclado**: Estados de enfoque visibles

### 4. Responsividad Multi-dispositivo
- **Breakpoints**: Compact (<600px), Medium (600-840px), Expanded (>840px)
- **Orientación**: Portrait y Landscape optimizados
- **Plataformas**: Navegadores modernos de escritorio, tablet y móvil

### 5. Densidad de Información
- **Compact**: Para pilotos expertos (más datos, menos espacio)
- **Comfortable**: Balance (default)
- **Spacious**: Mayor legibilidad (más espacio)

### 6. Visualización de Unidades
- Mostrar unidades siempre
- **Opción de doble unidad**: "150 kts / 278 km/h"
- 8 tipos de unidades configurables

### 7. Modo de Vuelo
- **Flight Mode**: Optimizado para uso en cabina
- Alto contraste automático
- Texto más grande
- Fondo oscuro para reducir brillo

---

## 💡 Sugerencias Adicionales de UX

### 8. **Quick Actions / Shortcuts**
**Descripción**: Accesos rápidos a funciones críticas desde cualquier pantalla.

**Implementación**:
- **FAB (Floating Action Button)**: Siempre visible
  - Nuevo vuelo
  - Calculadora rápida
  - Ver checklist
- **Atajos de teclado** (escritorio) y **gestos táctiles** (móvil/tablet):
  - Menú principal
  - Calculadora de conversión
  - Menú contextual rápido en aeronave

**Beneficio**: Reduce clics y tiempo de acceso a funciones críticas durante vuelo.

---

### 9. **Voice Input / Voice Commands** (Futuro)
**Descripción**: Entrada de datos por voz para uso hands-free en cabina.

**Casos de uso**:
- "Agregar 15 galones de combustible"
- "Guardar hobbs 1234.5"
- "Calcular tiempo a KJFK"
- "Leer checklist de despegue"

**Tecnología**: Web Speech API del navegador (soporte variable según navegador)

**Beneficio**: Seguridad en cabina - manos libres para controlar la aeronave.

---

### 10. **Widgets de Pantalla de Inicio** (requiere PWA/app nativa — fuera de alcance del stack web actual)
**Descripción**: Información rápida sin abrir la app.

**Widgets posibles**:
- **Próximo vuelo**: Aeronave, ruta, hora
- **Horas totales**: Display de total de horas
- **Alertas**: Vencimientos próximos
- **Weather**: Condiciones del aeropuerto base (futuro)

**Beneficio**: Vista rápida de información crítica.

---

### 11. **Indicadores de Conexión (y Modo Offline futuro)**
**Descripción**: Indicadores claros del estado de conexión con el servidor. El modo offline completo (PWA) está en backlog.

**Implementación**:
- Ícono de conexión en barra superior
- Color badge:
  - 🟢 Verde: Online
  - 🟡 Amarillo: Guardando / reintentando
  - ⚪ Blanco: Sin conexión (solo calculadoras disponibles)
- Banner discreto: "Sin conexión: las calculadoras siguen disponibles"

**Beneficio**: Claridad sobre el estado de la app y capacidades disponibles.

---

### 12. **Templates y Presets**
**Descripción**: Configuraciones guardadas para escenarios comunes.

**Ejemplos**:
- **Rutas frecuentes**: KJFK → KLAX guardada con cálculos
- **Configuración de aeronave**: Performance presets (crucero económico, máximo alcance, etc.)
- **Checklists personalizados**: Por tipo de vuelo (VFR local, IFR XC, etc.)

**Beneficio**: Acelera la planificación de vuelos repetitivos.

---

### 13. **Comparación Visual de Datos**
**Descripción**: Gráficas y visualizaciones de tendencias.

**Implementación**:
- **Gráfica de horas**: Evolución mensual/anual
- **Consumo de combustible**: Comparación entre vuelos
- **Performance**: Desviaciones de plan vs real
- **Costos**: Tendencia de gastos operacionales

**Paquete**: `chart.js` (ya usado en los prototipos estáticos)

**Beneficio**: Identificar patrones y optimizar operaciones.

---

### 14. **Notificaciones Inteligentes**
**Descripción**: Recordatorios contextuales y útiles.

**Tipos de notificaciones**:
- **Pre-vuelo**: "Recuerda verificar el peso y balance" (1 hora antes)
- **Post-vuelo**: "Registra tu vuelo" (30 min después del aterrizaje)
- **Mantenimiento**: "Próximo cambio de aceite en 2.5 horas"
- **Documentos**: "Tu certificado médico vence en 15 días"

**Tecnología**:
- Alertas dentro de la app (dashboard + modal)
- Web Notifications API / email (opcional, futuro)

**Beneficio**: Proactividad y cumplimiento de regulaciones.

---

### 15. **Búsqueda Global Inteligente**
**Descripción**: Búsqueda unificada en toda la app.

**Capacidades**:
- Buscar aeronaves por matrícula
- Buscar vuelos por fecha, ruta o aeropuerto
- Buscar en bitácora personal
- Buscar en checklists

**Implementación**:
- Campo de búsqueda en AppBar
- Filtros rápidos
- Sugerencias mientras escribes
- Historial de búsquedas recientes

**Beneficio**: Acceso rápido a cualquier información.

---

### 16. **Onboarding Interactivo**
**Descripción**: Tutorial inicial para nuevos usuarios.

**Contenido**:
1. Bienvenida y propósito de la app
2. Configurar perfil de piloto (wizard)
3. Agregar primera aeronave (paso a paso)
4. Tour por módulos principales
5. Configurar preferencias iniciales

**Implementación**: componente React propio (wizard por pasos)

**Beneficio**: Reducir curva de aprendizaje.

---

### 17. **Backup y Restauración**
**Descripción**: Sistema de respaldo de datos.

**Opciones**:
- **Exportar todo**: Archivo JSON/Excel con todos los datos del usuario + documentos
- **Backup automático**: `pg_dump` programado en el hosting (cPanel)
- **Importar**: Restaurar desde export
- **Cloud backup** (Futuro): Google Drive, Dropbox

**Beneficio**: Seguridad de datos y migración entre dispositivos.

---

### 18. **Modo Nocturno Inteligente**
**Descripción**: Ajuste automático según hora del día.

**Implementación**:
- Detectar hora de sunset/sunrise según ubicación (Geolocation API del navegador)
- Cambiar a modo oscuro automáticamente
- Opción manual para override
- Reducción gradual de brillo

**Beneficio**: Reduce fatiga visual durante vuelos nocturnos.

---

### 19. **Indicadores de Progreso en Tiempo Real**
**Descripción**: Feedback visual de operaciones largas.

**Casos de uso**:
- Generación de reportes
- Exportación a Excel
- Cálculos complejos de planificación
- Sincronización offline de datos (futuro)

**Implementación**:
- Progress bars con porcentaje
- Animaciones suaves
- Estimación de tiempo restante
- Cancelación de operación

**Beneficio**: Usuario informado, menos ansiedad durante operaciones.

---

### 20. **Ayuda Contextual**
**Descripción**: Información útil donde se necesita.

**Implementación**:
- Ícono de ayuda (?) en campos complejos
- Tooltips informativos
- "¿Qué es esto?" en términos técnicos
- Link a documentación completa
- Videos tutoriales (futuro)

**Beneficio**: Reduce confusión sin saturar la interfaz.

---

## 🎯 Priorización Recomendada

### ✅ Fase 1 (MVP)
1. Temas claro/oscuro
2. Tipografía adaptativa
3. Responsividad
4. Densidad de información
5. Modo de vuelo

### 🟡 Fase 2 (Post-MVP)
6. Quick Actions
7. Templates y Presets
8. Notificaciones inteligentes
9. Búsqueda global
10. Onboarding

### 🔵 Fase 3 (Futuro)
11. Voice input
12. Widgets de pantalla
13. Comparación visual
14. Backup cloud
15. Modo nocturno inteligente

---

## 📐 Guías de Diseño a Seguir

### Material Design 3 (web)
- **Guía principal**: Material Design 3 aplicado a web (componentes React propios o librería compatible)
- **Elevaciones**: Según especificación MD3 (sombras CSS)
- **Transiciones**: Material motion system (respetando `prefers-reduced-motion`)

### Web responsive
- **Móvil**: Respetar safe areas (`env(safe-area-inset-*)`), objetivos táctiles ≥ 44px
- **Tablet**: Layout con panel lateral en landscape
- **Escritorio**: Menú lateral plegable, estados hover y foco visibles, atajos de teclado

---

**Última actualización**: 20 de octubre de 2026 (adaptado a stack web React)  
**Versión**: 1.1.0
