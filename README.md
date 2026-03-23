# Guía de Uso: AgriSync 🚜🌱

Bienvenido a **AgriSync**, tu Plataforma Inteligente de Agricultura (versión 2026). Esta aplicación web te permite monitorear en tiempo real las condiciones de tu cultivo a través de un panel de control interactivo.

---

## 🔒 1. Acceso al Sistema (Login)

La plataforma cuenta con dos niveles de acceso diseñados para proteger la integridad de la configuración de los sensores:

1. **Abre el archivo** `index.html` en cualquier navegador web moderno (Chrome, Edge, Safari, Firefox).
2. Verás la pantalla de bienvenida con el logotipo de AgriSync.
3. Ingresa una de las siguientes contraseñas según tu rol:

### Perfil Administrador (Acceso Total)
* **Contraseña:** `adminAgri2026`
* **Privilegios:** Visualización en tiempo real + Acceso al botón de "Configuración de Sensores".

### Perfil Usuario (Solo Lectura)
* **Contraseña:** `userSync123`
* **Privilegios:** Solo visualización en tiempo real del panel de monitoreo.

> **Nota:** Si ingresas una contraseña incorrecta, el sistema te avisará con una alerta visual en rojo.

---

## 📊 2. Panel de Monitoreo (Dashboard)

Una vez iniciada la sesión, entrarás al panel principal. Los datos se actualizan automáticamente cada 4 segundos simulando hardware real IoT.

### Indicadores Principales:
* **Humedad del Suelo:** Muestra el porcentaje de agua en la tierra (0% - 100%).
* **Temperatura Ambiental:** Temperatura en grados centígrados (°C).
* **Nivel de pH (Suelo):** Acidez/Alcalinidad del suelo (escalas normales 6.0 - 8.0 para agricultura).
* **Iluminación Solar:** Nivel de luz en lux, vital para la fotosíntesis.

### 🚨 Alerta de Sequía (Regla Visual de Negocio)
El sistema cuenta con prevención inteligente. **Si la humedad del suelo cae por debajo del 30%**, la tarjeta de humedad cambiará drásticamente:
* El fondo se tornará rojo claro.
* Aparecerá una insignia indicando **"Riesgo de Sequía"**.
* El icono cambiará a un estado de alerta.

---

## ⚙️ 3. Funciones Adicionales y Soporte

* **Cerrar Sesión:** En la esquina superior derecha, puedes hacer clic en "Salir" para regresar de forma segura a la pantalla de inicio.
* **Configuración de Sensores (Solo Admin):** Si entraste como administrador, verás un botón negro en la parte superior derecha del panel llamado "Configuración de Sensores". En la versión actual este botón es un marcador visual para futuras expansiones modulares.
* **Soporte IA (Chatbot):** En la esquina inferior derecha siempre tendrás accesible el botón flotante negro con un robot. Al hacer clic, el sistema invoca la integración pre-codificada con DialogFlow/Landbot para brindarte asistencia técnica inmediata.

---

## 🔗 4. Integración TFP Pro (Google Sheets)

La aplicación está preparada para sincronizar automáticamente cada lectura (cada 4 segundos) con una base de datos en Google Sheets a través de una API.
* *Para los desarrolladores:* La función `mockSendToGoogleSheets()` en `app.js` contiene el modelo de esquema (Payload JSON). Solo requiere descomentar la sección de `fetch` y colocar la URL del Web App de Google Apps Script.
