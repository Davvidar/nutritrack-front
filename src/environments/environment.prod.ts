
const PORT = '';
const API_URL_BASE = 'https://nutritrack-back.onrender.com' + PORT;

export const environment = {
  production: true,
  PORT: PORT,
  API_URL_BASE: API_URL_BASE,
  API_URL_BASE_BACKEND: API_URL_BASE,
  API_URL: API_URL_BASE + '/api',
  lang: 'ES',
  firebaseConfig: {
    apiKey: "AIzaSyDO4cuzoa4MJgBTljx851Tw84kdQ6qSGKI",
    authDomain: "prototipo-nutritrack.firebaseapp.com",
    projectId: "prototipo-nutritrack",
    storageBucket: "prototipo-nutritrack.firebasestorage.app",
    messagingSenderId: "437054249533",
    appId: "1:437054249533:web:4fc4b2df574114f7af6854",
    measurementId: "G-4C6H1PB3PZ"
    }
};