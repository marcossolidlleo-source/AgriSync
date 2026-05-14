Funcionamiento (Mirarse solo el login)


1. Acceso al Sistema (Login)
La plataforma cuenta con dos niveles de acceso diseñados para proteger la integridad de las configuraciones de los sensores:
Abre el archivo index.html en cualquier navegador web moderno (Chrome, Edge, Safari, Firefox).
Verás la pantalla de bienvenida con el logotipo de AgriSync.
Ingresa una de las siguientes contraseñas según tu rol:
Perfil Administrador (Acceso Total)
Contraseña: adminAgri2026
Privilegios: Visualización en tiempo real + Acceso al botón de "Configuración de Sensores". El sistema te designará un badge morado de Administrador.
Perfil Usuario (Solo Lectura)
Contraseña: userSync123
Privilegios: Solo visualización en tiempo real del panel de monitoreo. La configuración del Dashboard estará bloqueada para proteger la instrumentación.
 Nota: Si ingresas una contraseña incorrecta, el sistema no recargará la página, simplemente te avisará con una elegante alerta visual en rojo.

2. Panel de Monitoreo (Dashboard)
Una vez iniciada la sesión, entrarás al panel principal. Gracias a la optimización (cero pantallas en blanco), los datos se cargan inmediatamente en cuanto entras. Posteriormente, se actualizan silenciosamente cada 4 segundos simulando una lectura de hardware IoT.
Indicadores Principales:
Humedad del Suelo: Porcentaje de agua en la tierra.
Temperatura Ambiental: Temperatura en grados centígrados (°C).
Nivel de pH (Suelo): Acidez o alcalinidad del sustrato.
Iluminación Solar: Nivel de luz en lux, vital para la fotosíntesis.
 Alerta de Sequía (Regla Visual Automática)
El sistema cuenta con prevención inteligente y visual. Si la humedad del suelo cae por debajo del 30%, la tarjeta de humedad reacciona dinámicamente:
El fondo en blanco puro se tornará rojo claro.
Aparecerá un badge indicando "Riesgo de Sequía".
El icono cambiará a un estado de alerta y el contorno resaltará fuertemente.

 3. Funciones Adicionales y Soporte
Cerrar Sesión: En la esquina superior derecha del Navbar pulsa "Salir" para la desautenticación inmediata a la pantalla de inicio.
Soporte IA (Chatbot - TFP Pro): En la esquina inferior derecha siempre tendrás accesible un botón flotante negro con un robot. Al posicionar el ratón, te invita a chatear. Al pulsarlo el código está preparado para abrir la capa visual (Modal/Window) de DialogFlow o Landbot.

 4. Integraciones (TFP Pro: Google Sheets)
Para evitar silos de información, la aplicación está fuertemente acoplada a exportar tus datos:
La función mockSendToGoogleSheets() incluida en el motor app.js encapsula cada lectura en formato JSON estándar (incluyendo un Timestamp automático).
Ésta función está codificada con la Fetch API (HTTP POST) lista para que un administrador agregue su API Key / URL de Google Apps Script. Una vez agregada la URL, insertará cada lectura del sensor directamente en una fila de tu hoja de cálculo elegida.

