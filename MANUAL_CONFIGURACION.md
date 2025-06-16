# Manual de Configuración y Funcionamiento - NutriTrack

## Tecnologías Utilizadas

- **Framework**: Ionic 8 + Angular 19
- **Backend**: Firebase (Authentication, Firestore, Hosting)
- **Plataforma Móvil**: Capacitor 7
- **Gráficos**: Chart.js + ng2-charts
- **Autenticación**: Auth0 JWT
- **Escáner**: Capacitor Barcode Scanner
- **Lenguaje**: TypeScript
- **Estilos**: SCSS

## Requisitos del Sistema

### Requisitos Previos

1. **Node.js** (versión 18 o superior)
2. **npm** (incluido con Node.js)
3. **Ionic CLI**
4. **Angular CLI**
5. **Capacitor CLI**
6. **Android Studio** (para desarrollo Android)
7. **Cuenta de Firebase**

### Instalación de Herramientas Globales

```bash
# Instalar Ionic CLI
npm install -g @ionic/cli

# Instalar Angular CLI
npm install -g @angular/cli

# Instalar Capacitor CLI
npm install -g @capacitor/cli
```

## Configuración del Proyecto

### 1. Clonar e Instalar Dependencias

```bash
# Navegar al directorio del proyecto
# Instalar dependencias
npm install
```

### 2. Configuración de Firebase

El proyecto ya incluye la configuración de Firebase en `src/environments/firebase.config.ts`. Sin embargo, para un entorno de producción, deberías:

1. **Crear un nuevo proyecto en Firebase Console**
2. **Obtener las credenciales de tu proyecto**
3. **Actualizar el archivo de configuración**:

```typescript
// src/environments/firebase.config.ts
const firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "tu-proyecto.firebaseapp.com",
  projectId: "tu-proyecto-id",
  storageBucket: "tu-proyecto.appspot.com",
  messagingSenderId: "123456789",
  appId: "tu-app-id",
  measurementId: "tu-measurement-id"
};
```

### 3. Configuración de Capacitor

Actualizar `capacitor.config.ts` con tu información:

```typescript
const config: CapacitorConfig = {
  appId: 'com.tuempresa.nutricrack', // Cambiar por tu ID único
  appName: 'NutriCrack',
  webDir: 'www',
  server: {
    androidScheme: 'https',
  },
};
```

## Comandos de Desarrollo

### Desarrollo Web

```bash
# Iniciar servidor de desarrollo
npm start
# o
ionic serve

# El servidor estará disponible en http://localhost:8100
```

### Construcción del Proyecto

```bash
# Construcción para desarrollo
npm run build

# Construcción para producción
npm run build --prod
```

### Desarrollo Móvil (Android)

```bash
# Construir y sincronizar con Android
npm run build:android

# O paso a paso:
ionic build --prod
npx cap sync android
npx cap open android
```

### Testing

```bash
# Ejecutar tests unitarios
npm test

# Linting del código
npm run lint
```

## Estructura del Proyecto

### Arquitectura Modular

```
src/
├── app/
│   ├── auth/                    # Módulo de autenticación
│   │   ├── login/
│   │   ├── register/
│   │   └── forgot-password/
│   ├── components/              # Componentes reutilizables
│   │   ├── ingredient-selector/
│   │   ├── meal-accordion/
│   │   ├── nutrition-stats-card/
│   │   ├── weight-chart/
│   │   └── ...
│   ├── guards/                  # Guardias de ruta
│   │   ├── auth.guard.ts
│   │   ├── already-auth.guard.ts
│   │   └── connection.guard.ts
│   ├── interceptors/            # Interceptores HTTP
│   ├── services/                # Servicios de la aplicación
│   │   ├── auth.service.ts
│   │   ├── daily-log.service.ts
│   │   └── open-food-facts.service.ts
│   └── tabs/                    # Páginas principales
│       ├── inicio/              # Página principal
│       ├── estadisticas/        # Estadísticas y gráficos
│       └── perfil/              # Perfil de usuario
├── assets/                      # Recursos estáticos
├── environments/                # Configuraciones de entorno
└── theme/                       # Estilos globales
```

## Funcionalidades Principales

### 1. Autenticación
- **Login/Registro** con Firebase Authentication
- **Recuperación de contraseña**
- **Guardias de ruta** para proteger páginas
- **Gestión de tokens JWT**

### 2. Seguimiento Nutricional
- **Búsqueda de alimentos** (integración con Open Food Facts)
- **Registro de comidas** (desayuno, almuerzo, cena, snacks)
- **Creación de productos personalizados**
- **Gestión de recetas**
- **Escáner de códigos de barras**

### 3. Estadísticas y Progreso
- **Gráficos de peso** con Chart.js
- **Resumen nutricional diario/semanal**
- **Comparación de progreso**
- **Métricas de macronutrientes**

### 4. Gestión de Perfil
- **Edición de información personal**
- **Configuración de objetivos nutricionales**
- **Ajustes de la aplicación**

## Configuración de Firebase

### Servicios Utilizados

1. **Authentication**: Gestión de usuarios
2. **Firestore**: Base de datos NoSQL
3. **Hosting**: Despliegue web
4. **Analytics**: Seguimiento de uso

### Configuración de Firestore

Estructura de datos sugerida:

```
users/
  {userId}/
    profile: { name, email, age, weight, height, goals }
    dailyLogs/
      {date}/
        meals: [{ food, quantity, calories, macros }]
        weight: number
        water: number
```

### Reglas de Seguridad

```javascript
// Firestore Security Rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## Despliegue

### Despliegue Web (Firebase Hosting)

```bash
# Instalar Firebase CLI
npm install -g firebase-tools

# Iniciar sesión en Firebase
firebase login

# Construir la aplicación
ionic build --prod

# Desplegar
firebase deploy
```

### Despliegue Android

1. **Configurar Android Studio**
2. **Generar APK de debug**:
   ```bash
   ionic build --prod
   npx cap sync android
   npx cap open android
   ```
3. **Para producción**: Configurar signing keys y generar APK/AAB

## Solución de Problemas Comunes

### Error de Dependencias
```bash
# Limpiar caché de npm
npm cache clean --force

# Eliminar node_modules y reinstalar
rm -rf node_modules
npm install
```

### Problemas con Capacitor
```bash
# Sincronizar cambios
npx cap sync

# Limpiar y reconstruir
npx cap clean android
npx cap sync android
```

### Errores de Firebase
- Verificar configuración en `firebase.config.ts`
- Comprobar reglas de Firestore
- Validar configuración de Authentication

## Scripts Disponibles

| Comando | Descripción |
|---------|-------------|
| `npm start` | Inicia servidor de desarrollo |
| `npm run build` | Construye la aplicación |
| `npm test` | Ejecuta tests unitarios |
| `npm run lint` | Analiza el código |
| `npm run build:android` | Construye y prepara para Android |

## Consideraciones de Seguridad

1. **No exponer credenciales** en el código fuente
2. **Usar variables de entorno** para configuraciones sensibles
3. **Implementar reglas de Firestore** apropiadas
4. **Validar datos** tanto en frontend como backend
5. **Usar HTTPS** en producción

## Recursos Adicionales

- [Documentación de Ionic](https://ionicframework.com/docs)
- [Documentación de Angular](https://angular.io/docs)
- [Documentación de Firebase](https://firebase.google.com/docs)
- [Documentación de Capacitor](https://capacitorjs.com/docs)

## Contacto y Soporte

Para soporte técnico o consultas sobre el proyecto, contactar al equipo de desarrollo.

---

**Versión del Manual**: 1.0  
**Última Actualización**: Diciembre 2024  
**Versión de la Aplicación**: 0.0.1