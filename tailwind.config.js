module.exports = {
  content: ['./**/*.html'],
  theme: {
    extend: {
      colors: {
        gray: {
          800: '#404040', // Reemplaza el valor de bg-gray-800 en modo oscuro
        },
        light: {
          // Colores personalizados para el tema claro
          background: '#f9fafb',
          text: '#1f2937',
        },
        dark: {
          // Colores personalizados para el tema oscuro
          background: '#262626', //'#1f2937',
          text: '#f9fafb',

        },
      },
    },
  },
  darkMode: 'class', // Habilita el modo oscuro basado en la clase 'dark'
  plugins: [],
}