# Memoria del Proyecto: Trabajo Final de Sistemas de Información
## Osiris - Tecnología Agrícola Inteligente

---

### 1. Introducción
En la actualidad, la agricultura se enfrenta al reto de maximizar su eficiencia y sostenibilidad bajo condiciones climáticas cada vez más impredecibles. **Osiris** surge como una respuesta tecnológica orientada a la monitorización agrícola inteligente. Esta aplicación ha sido desarrollada para facilitar a los agricultores y gestores de fincas el seguimiento en tiempo real de los parámetros críticos de sus cultivos, mejorando la toma de decisiones y previniendo pérdidas. La relevancia de este proyecto radica en la integración de diferentes tecnologías (IoT, visualización 3D y web moderna) para crear un panel de control intuitivo y profesional que centraliza datos vitales del entorno agrícola.

### 2. Antecedentes
El control de cosechas se ha realizado tradicionalmente mediante métodos manuales, requiriendo un gran esfuerzo físico y siendo propenso al error humano. Con el auge del Internet de las Cosas (IoT), han surgido soluciones comerciales (como FieldView, CropX o John Deere Operations Center) que ofrecen telemetría avanzada. 

**Ventajas de aplicaciones comerciales:**
- Alta precisión con hardware propietario.
- Integración con maquinaria agrícola pesada.

**Desventajas respecto a Osiris:**
- Suelen tener costes de licenciamiento y hardware muy elevados, innaccesibles para medianos y pequeños agricultores.
- Curvas de aprendizaje pronunciadas debido a interfaces excesivamente complejas.

**Osiris** propone una alternativa ligera, con una interfaz web responsiva y amigable, que no depende estrictamente de ecosistemas cerrados y se integra mediante protocolos estándar de comunicación web, como Socket.io, ofreciendo alertas críticas automáticas y visualización 3D.

### 3. Objetivos de la propuesta

**Objetivo principal:**
Desarrollar un sistema de información web interactivo y en tiempo real para la monitorización, análisis y gestión de variables agrícolas (temperatura, humedad, pH e iluminación).

**Objetivos específicos:**
- Implementar una interfaz de usuario *(Frontend)* interactiva y responsiva.
- Integrar la recepción de datos telemétricos en tiempo real a través de WebSockets (Socket.io).
- Visualizar la distribución espacial de los sensores mediante la renderización de un mapa 3D de las parcelas.
- Proveer un sistema de alertas críticas (vía correo electrónico) ante variaciones perjudiciales en los cultivos (ej. riesgo de sequía).
- Incluir un panel de administración con control de acceso basado en roles predefinidos.

### 4. Diseño de la arquitectura
El análisis del proyecto revela una arquitectura distribuida orientada a microservicios e IoT, compuesta principalmente por:

- **Frontend (Cliente Web):** Desarrollado en HTML, CSS (TailwindCSS) y JavaScript Vanilla. Representa la capa de presentación y maneja la lógica de la interfaz.
- **Backend / Middleware (Servidor Externo):** Aunque no presente directamente en el repositorio local, se infiere la existencia de un servidor alojado en una Máquina Virtual (IP: `158.158.108.187:3001`) gestionando conexiones a través de **Node.js + Socket.io** para emitir/recibir eventos hacia el cliente.
- **Capa Física / IoT (ESP32):** El código infiere la integración con un microcontrolador (ESP32) para la captura física de los datos climatológicos y geográficos reales, apoyado en el GPS del cliente.
- **Servicios de Terceros (APIs):** Integración con `formsubmit.co` para el envío de alertas por correo electrónico, y `Landbot.io` para asistencia automatizada.

**Diagrama Funcional / Textual de Despliegue:**
```text
[ Cliente Web (Navegador) ] 
      |   (HTTP/HTTPS / Socket.io)
      |---------------> [ Servidor Node.js (VM: 158.158.108.187:3001) ]
      |                        |
      |   (Telemetría JSON)    |   (Socket)
      |                        |
[ Landbot API ]             [ ESP32 / Sensores Físicos ]
[ FormSubmit API ]          (Toma de Temp, Humedad, pH, Lux)
```

### 5. Implementación
El desarrollo detectado se compone de los siguientes elementos:

- **Lenguajes:** HTML5, CSS3, JavaScript (ES6+).
- **Frameworks y Librerías:** 
  - **TailwindCSS (vía CDN):** Para un diseño de interfaces ultrarrápido y altamente responsivo.
  - **THREE.js:** Utilizado para inicializar y controlar el entorno de mapeo tridimensional de la parcela (`init3DMap()`).
  - **Socket.io (Client):** Para posibilitar la comunicación asíncrona bidireccional con el hardware de monitorización.
  - **FontAwesome:** Para iconografía vectorial.
- **Organización del código:** El proyecto sigue una estructura simple tipo *Monolithic Frontend* dentro de una carpeta `Code/Frontend`. Toda la lógica imperativa recae sobre el archivo `app.js`, donde se agrupan el routing visual (SPA manual), el generador de simulaciones, el mapeo 3D y la conexión por Socket.
- **Flujo de trabajo:** Se detecta el uso de control de versiones **Git** (carpeta `.git` presente en el directorio base), lo que indica un flujo de desarrollo estructurado y versionado.

**Detalles de lógica relevantes:**
- El acceso se simula en el cliente mediante un objeto diccionario que empareja contraseñas con roles (ej. `adminAgri2026` para Admin).
- El sistema intercala datos reales provenientes de `socket.on('respuesta_clima')` y un generador local en `updateSensorsData()` para complementar los indicadores en caso de que los sensores físicos carezcan de alguna lectura.

### 6. Conclusiones y futuras mejoras

**Qué se ha conseguido:**
Se ha logrado construir un prototipo funcional robusto para el lado del cliente (Frontend). La aplicación destaca por su estética moderna, experiencia de usuario fluida y características avanzadas implementadas desde el navegador (Visualización 3D y conexión asíncrona real-time). La integración de alertas de correo electrónico directas sin necesidad de un backend complejo es una innovación pragmática destacable.

**Limitaciones detectadas:**
- **Seguridad:** Las credenciales y roles ('Admin' / 'Usuario') se encuentran *hardcodeadas* (en código plano) dentro de `app.js`, suponiendo una brecha de seguridad grave para despliegues en producción.
- **Arquitectura de Software:** Concentrar la totalidad de la lógica en un solo archivo de +400 líneas (`app.js`) compromete la escalabilidad a futuro. 
- **Persistencia de Datos:** El historial de sensores simula su poblado dinámicamente; de cerrarse la pestaña, se pierden los registros simulados no almacenados en base de datos.

**Futuras Mejoras:**
1. **Refactorización a un Framework SPA:** Migrar de Vanilla JS a React.js, Vue o Angular, para separar la lógica de negocio orientada a componentes.
2. **Implementación de un Backend Local/API REST con JWT:** Usar Node.js/Express y una base de datos (Ej., MongoDB o PostgreSQL) para el manejo de sesiones reales, la encriptación de claves, y el almacenamiento perpetuo del historial de sensores.
3. **Gestión Total Offline:** Incorporar Service Workers y consideraciones PWA (Progressive Web App) para permitir interacciones incluso cuando el agricultor se encuentre en zonas sin cobertura.

### 7. Bibliografía
- *THREE.js Documentation*. Obtenido de https://threejs.org/docs/
- *Socket.IO Documentation*. Obtenido de https://socket.io/docs/
- *Tailwind CSS Framework*. Obtenido de https://tailwindcss.com/docs
- *FormSubmit Service*. Obtenido de https://formsubmit.co/

### 8. Anexos
**Anexo A: Fragmento - Generación del Entorno 3D**
```javascript
// app.js (Fragmento de la lógica THREE.js)
scene3D = new THREE.Scene();
scene3D.background = new THREE.Color(0xf2f7f9);
camera3D = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
camera3D.position.set(0, 80, 120);

// Suelo del campo
const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(80, 60),
    new THREE.MeshPhongMaterial({ color: 0x8cc56d, opacity: 0.35, transparent: true })
);
ground.rotation.x = -Math.PI / 2;
scene3D.add(ground);
```

**Anexo B: Fragmento - Envío de Alertas Críticas**
```javascript
// app.js (Fragmento de la API Fetch FormSubmit)
function sendEmailAlert(data) {
    fetch("https://formsubmit.co/ajax/agrisyncsif@gmail.com", {
        method: "POST",
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
            _subject: "🚨 ALERTA CRÍTICA - Osiris",
            // ...
            Humedad: data.humedad + "%",
        })
    })
    // ...
}
```
