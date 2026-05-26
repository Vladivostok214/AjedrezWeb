# ♟️ Ajedrez 1v1 P2P (Chess + Videollamada WebRTC)

Una plataforma web minimalista de alto rendimiento y estética *Noir-Tech* que permite a dos usuarios jugar ajedrez en tiempo real mientras sostienen una videollamada P2P directa, integrada en la misma pantalla.

---

## 🚀 Arquitectura del Proyecto

- **Frontend**: React 19, Vite y Tailwind CSS v4.
- **Motor de Juego**: `chess.js` (reglas y turnos) y `react-chessboard` v5 (UI arrastrable).
- **Audio/Video P2P**: WebRTC nativo (`RTCPeerConnection` con procesamiento de audio: cancelación de eco, reducción de ruido y ganancia automática).
- **Señalización**: Servidor en Node.js ligero usando WebSockets (`ws`).
- **Orquestación**: Arquitectura completamente desacoplada mediante patrón orquestador (`RoomPage`) para evitar acoplamiento directo entre WebSockets y WebRTC.

---

## 🛠️ Ejecución Local

Para probar el proyecto completo en tu máquina:

### 1. Iniciar el Servidor de Señalización
Entra en la carpeta del servidor, instala dependencias e inícialo:
```bash
cd server
npm install
npm start
```
El servidor de señalización se levantará por defecto en el puerto `3001` (`ws://localhost:3001`).

### 2. Iniciar el Frontend (Vite)
Abre otra terminal en la raíz del proyecto e inicia el servidor de desarrollo:
```bash
npm run dev
```
El cliente se abrirá en `http://localhost:5173`. 
- Haz clic en **"Crear Partida"** para entrar a una sala (ej: `http://localhost:5173/room/85fa0dbe-8df7-44bc-a8f8-b39b1e9ea29f`).
- Abre una segunda pestaña con el mismo enlace para simular el oponente negro y activar tanto la videollamada como la sincronización de las piezas.

---

## 📦 Guía de Despliegue en Producción

### 1. Frontend (Vercel)
Este frontend está optimizado para compilarse estáticamente y desplegarse en Vercel:
- **Enrutador de SPA**: Incluye un archivo [vercel.json](file:///C:/Users/WLADI/Antigravity_Tests/AjedrezWeb/vercel.json) en la raíz que redirige todas las rutas al `index.html` para evitar errores `404` al refrescar rutas como `/room/:id`.
- **Variable de Entorno**: En el panel de control de tu proyecto en Vercel, añade la siguiente variable apuntando a tu backend en producción:
  ```env
  VITE_SIGNALING_URL = wss://tu-servidor-signaling.onrender.com
  ```

### 2. Servidor de Señalización (Render / Railway / Fly.io)
El backend en la carpeta `/server` requiere un entorno de ejecución continuo y persistente compatible con WebSockets:
- **Health Check**: El servidor incluye un endpoint `/health` que responde con `200 OK` (requerido para los chequeos de salud de Render y Railway).
- **Instalación y Arranque**: Las plataformas detectarán automáticamente el `package.json` en `/server` y arrancarán con `npm start`.
