import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

// Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDO4cuzoa4MJgBTljx851Tw84kdQ6qSGKI",
  authDomain: "prototipo-nutritrack.firebaseapp.com",
  projectId: "prototipo-nutritrack",
  storageBucket: "prototipo-nutritrack.appspot.com",
  messagingSenderId: "437054249533",
  appId: "1:437054249533:web:4fc4b2df574114f7af6854",
  measurementId: "G-4C6H1PB3PZ"
};

// Inicializar Firebase
export const firebaseApp = initializeApp(firebaseConfig);
export const firebaseAnalytics = getAnalytics(firebaseApp);