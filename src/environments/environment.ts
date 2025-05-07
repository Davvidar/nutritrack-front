// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

import { fi } from "date-fns/locale";

const PORT = '';
const API_URL_BASE = 'https://nutritrack-back.onrender.com' + PORT;

export const environment = {
  
  production: false,
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

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.

