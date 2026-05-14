/**
 * AgriSync - Lógica Principal de la Aplicación
 * Sistema de monitoreo agrícola con integración Socket.io y GPS.
 */

// --- 1. NUEVA CONFIGURACIÓN SOCKET.IO ---
const socket = io();

document.addEventListener('DOMContentLoaded', () => {
    // Referencias al DOM originales (Sincronizadas con index.html)
    const loginScreen = document.getElementById('login-screen');
    const dashboardScreen = document.getElementById('dashboard-screen');
    const loginForm = document.getElementById('login-form');
    const passwordInput = document.getElementById('password');
    const loginError = document.getElementById('loginError'); // No existe en index.html, lo crearé o ignoraré
    const logoutBtn = document.getElementById('logout-btn-sidebar');
    const userRoleBadge = document.getElementById('user-role-display-side');
    const adminControls = document.getElementById('adminControls'); // No existe en index.html, lo ignoraré o crearé
    const sensorGrid = document.getElementById('sensor-cards-container');
    const exportSheetsBtn = document.getElementById('exportSheetsBtn');

    // --- 2. NUEVAS REFERENCIAS PARA CLIMA/SOCKET ---
    const tempDisplay = document.getElementById('temp');
    const statusMsg = document.getElementById('status-msg');
    const pingDisplay = document.getElementById('ping-time');

    // Mapeo de contraseñas a Roles de acceso
    const CREDENTIALS = {
        'adminAgri2026': 'Admin',
        'userSync123': 'Usuario'
    };

    // Estado global
    let currentUserRole = null;
    let selectedFarmId = null; // Finca seleccionada actualmente para el dashboard/mapa
    let sensorInterval = null;
    let lastEmailAlert = 0;
    let lastWhatsAppAlert = 0;
    let currentGlobalData = null;
    let myLandbot = null;

    // Base de datos local de fincas (Simulada)
    let fincas = JSON.parse(localStorage.getItem('agrisync_fincas')) || [
        { id: 1, nombre: 'Hacienda El Sol', hectareas: 10.5, propietario: 'Admin', cultivo: 'Maíz', sector: 'Norte' },
        { id: 2, nombre: 'Finca Los Olivos', hectareas: 5.2, propietario: 'Admin', cultivo: 'Olivos', sector: 'Sur' },
        { id: 3, nombre: 'Granja Verde', hectareas: 3.8, propietario: 'Usuario', cultivo: 'Tomate', sector: 'Este' }
    ];

    function saveFincas() {
        localStorage.setItem('agrisync_fincas', JSON.stringify(fincas));
    }

    /* --- 3. NUEVA LÓGICA DE ESCUCHA SOCKET.IO --- */
    socket.on('connect', () => {
        console.log('✅ Conectado al servidor de la VM');
        if (pingDisplay) pingDisplay.innerText = "Conectado";
    });

    socket.on('respuesta_clima', (data) => {
        console.log('☀️ Datos recibidos:', data);
        if (tempDisplay) {
            // Si viene del ESP32 procesado será data.temperatura
            // Si viene el JSON de OpenWeather será data.main.temp
            const valorTemp = data.temperatura || (data.main ? data.main.temp : '--');

            tempDisplay.innerText = valorTemp + " °C"; // Añadimos la unidad
            tempDisplay.classList.add('animate-pulse');
            setTimeout(() => tempDisplay.classList.remove('animate-pulse'), 1000);
        }
        if (statusMsg) statusMsg.innerText = "Clima actualizado desde el sensor";
    });



    /* --- GESTIÓN DE INICIO DE SESIÓN (LOGIN) --- Manteniendo tu lógica intacta */

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const pwd = passwordInput.value.trim();
        const role = CREDENTIALS[pwd];

        if (role) {
            login(role);
        } else {
            passwordInput.classList.add('border-red-500');
            // CAMBIO AQUÍ:
            if (loginError) {
                loginError.innerText = "Credenciales incorrectas";
                loginError.classList.remove('hidden');
            } else {
                alert("Credenciales incorrectas"); // Fallback si no hay div de error
            }
        }
    });

    passwordInput.addEventListener('input', () => {
        if (loginError) loginError.classList.add('hidden');
        passwordInput.classList.remove('border-red-500', 'focus:ring-red-500/20', 'focus:border-red-600');
        passwordInput.classList.add('focus:ring-green-500/20', 'focus:border-green-600');
    });

    logoutBtn.addEventListener('click', logout);

    function login(role) {
        currentUserRole = role;
        if (loginError) loginError.classList.add('hidden');
        passwordInput.value = '';

        if (userRoleBadge) {
            userRoleBadge.textContent = role;
        }

        // Si tuvieras controles de administrador específicos:
        if (adminControls) {
            role === 'Admin' ? adminControls.classList.remove('hidden') : adminControls.classList.add('hidden');
        }

        loginScreen.classList.add('hidden');
        dashboardScreen.classList.remove('hidden');

        // Seleccionar la primera finca del usuario por defecto
        const userFarms = fincas.filter(f => f.propietario === currentUserRole);
        if (userFarms.length > 0) {
            selectedFarmId = userFarms[0].id;
        }

        initDashboard();
    }

    function logout() {
        currentUserRole = null;
        selectedFarmId = null;
        if (sensorInterval) clearInterval(sensorInterval);
        dashboardScreen.classList.add('hidden');
        loginScreen.classList.remove('hidden');
    }

    /* --- LÓGICA DEL DASHBOARD DE SENSORES --- */

    function initDashboard() {
        renderFarmTabs();
        updateDashboardFarmInfo();
        populateFarmDropdowns();
        renderCustomSensors();
        updateSensorsData();
        if (sensorInterval) clearInterval(sensorInterval);
        sensorInterval = setInterval(updateSensorsData, 4000);
        initWeatherWidget();
        initAnalyticsCharts();
    }

    function renderFarmTabs() {
        const tabsContainer = document.getElementById('user-farms-tabs');
        if (!tabsContainer) return;

        const userFarms = fincas.filter(f => f.propietario === currentUserRole);
        tabsContainer.innerHTML = userFarms.map(farm => `
            <button onclick="window.selectFarm(${farm.id})" 
                class="px-4 py-2 rounded-xl border-2 transition-all whitespace-nowrap font-bold text-sm ${selectedFarmId === farm.id ? 'bg-emerald-600 border-emerald-600 text-white shadow-md' : 'bg-white border-gray-100 text-gray-500 hover:border-emerald-200'}">
                <i class="fas fa-leaf mr-2"></i>${farm.nombre}
            </button>
        `).join('');
    }

    window.selectFarm = function (id) {
        selectedFarmId = id;
        renderFarmTabs();
        updateDashboardFarmInfo();
        populateFarmDropdowns();
        // Opcional: refrescar sensores o mapa
        if (contentSections[1].classList.contains('active')) {
            init3DMap(true); // Forzar reinicio del mapa con nuevas dimensiones
        }
    };

    function updateDashboardFarmInfo() {
        const farm = fincas.find(f => f.id === selectedFarmId);
        if (!farm) return;

        const nameDisplay = document.getElementById('farm-name-display');
        const hectaresDisplay = document.getElementById('farm-hectares-display');
        const cropDisplay = document.getElementById('farm-crop-display');
        const locationDisplay = document.getElementById('farm-location-display');

        if (nameDisplay) nameDisplay.innerText = farm.nombre;
        if (hectaresDisplay) hectaresDisplay.innerText = `${farm.hectareas} ha`;
        if (cropDisplay) cropDisplay.innerText = farm.cultivo || 'No asignado';
        if (locationDisplay) locationDisplay.innerText = `Sector ${farm.sector || 'General'}`;
    }

    function populateFarmDropdowns() {
        const sensorFarmSelect = document.getElementById('sensor-farm-select');
        const mapFarmSelect = document.getElementById('map-farm-select');
        const userFarms = fincas.filter(f => f.propietario === currentUserRole);

        const optionsHtml = userFarms.map(f => `<option value="${f.id}" ${f.id === selectedFarmId ? 'selected' : ''}>${f.nombre}</option>`).join('');

        if (sensorFarmSelect) sensorFarmSelect.innerHTML = optionsHtml;
        if (mapFarmSelect) mapFarmSelect.innerHTML = optionsHtml;
    }

    // Registro de Nueva Finca
    const addFarmForm = document.getElementById('add-farm-form');
    if (addFarmForm) {
        addFarmForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('new-farm-name').value;
            const hectares = parseFloat(document.getElementById('new-farm-hectares').value);

            const newFarm = {
                id: Date.now(),
                nombre: name,
                hectareas: hectares,
                propietario: currentUserRole,
                cultivo: 'Pendiente',
                sector: 'Nuevo'
            };

            fincas.push(newFarm);
            saveFincas();
            selectedFarmId = newFarm.id;

            addFarmForm.reset();
            renderFarmTabs();
            updateDashboardFarmInfo();
            populateFarmDropdowns();

            alert(`Finca "${name}" registrada con éxito.`);
        });
    }

    function updateSensorsData() {
        const baseHumedad = Math.random() < 0.2 ? (15 + Math.random() * 14) : (35 + Math.random() * 50);
        const currentData = {
            temperatura: (21 + Math.random() * 8).toFixed(1),
            humedad: Math.floor(baseHumedad),
            ph: (6.0 + Math.random() * 2).toFixed(1),
            iluminacion: Math.floor(700 + Math.random() * 600)
        };

        renderSensorUI(currentData);
        currentGlobalData = currentData;
        handleDataInput(currentData);

        if (currentData.humedad < 30) {
            const now = Date.now();
            if (now - lastEmailAlert > 60000) {
                sendEmailAlert(currentData);
                lastEmailAlert = now;
            }
            if (now - lastWhatsAppAlert > 60000) {
                sendWhatsAppAlert(currentData);
                lastWhatsAppAlert = now;
            }
        }
    }

    function simularDatos() {
        const nuevosDatos = {
            humedad: Math.floor(Math.random() * 71) + 10, // Humedad entre 10% y 80%
            temperatura: (Math.random() * 20 + 15).toFixed(1), // Temperatura entre 15°C y 35°C
            ph: (Math.random() * 3 + 5).toFixed(1), // pH entre 5.0 y 8.0
            iluminacion: Math.floor(Math.random() * 1901) + 100 // Iluminación entre 100 y 2000 lux
        };

        renderSensorUI(nuevosDatos);
        currentGlobalData = nuevosDatos;
        handleDataInput(nuevosDatos);

        if (nuevosDatos.humedad < 30) {
            const now = Date.now();
            if (now - lastEmailAlert > 60000) {
                sendEmailAlert(nuevosDatos);
                lastEmailAlert = now;
            }
            if (now - lastWhatsAppAlert > 60000) {
                sendWhatsAppAlert(nuevosDatos);
                lastWhatsAppAlert = now;
            }
        }
    }

    const btnSimular = document.getElementById('btn-simular');
    if (btnSimular) {
        btnSimular.addEventListener('click', simularDatos);
    }

    function renderSensorUI(data) {
        const ruleHumedadBaja = data.humedad < 30;
        const cardsDef = [
            {
                title: 'Humedad del Suelo',
                value: `${data.humedad}%`,
                icon: 'fa-droplet',
                containerClasses: ruleHumedadBaja ? 'bg-red-50 border-red-300 ring-4 ring-red-100 shadow-red-200' : 'bg-white border-gray-100 shadow-sm',
                textClasses: ruleHumedadBaja ? 'text-red-700' : 'text-gray-900',
                iconContainer: ruleHumedadBaja ? 'bg-red-100 text-red-600' : 'bg-blue-50 text-blue-500',
                alertHtml: ruleHumedadBaja ? `<span class="mt-2 text-xs font-bold text-red-600 bg-red-100 px-2 py-1 rounded w-fit flex items-center"><i class="fa-solid fa-triangle-exclamation mr-1"></i> Riesgo de Sequía</span>` : ''
            },
            {
                title: 'Temperatura Ambiental',
                value: `${data.temperatura} °C`,
                icon: 'fa-temperature-half',
                containerClasses: 'bg-white border-gray-100 shadow-sm',
                textClasses: 'text-gray-900',
                iconContainer: 'bg-orange-50 text-orange-500',
                alertHtml: ''
            },
            {
                title: 'Nivel de pH (Suelo)',
                value: data.ph,
                icon: 'fa-flask',
                containerClasses: 'bg-white border-gray-100 shadow-sm',
                textClasses: 'text-gray-900',
                iconContainer: 'bg-purple-50 text-purple-500',
                alertHtml: ''
            },
            {
                title: 'Iluminación Solar',
                value: `${data.iluminacion} lux`,
                icon: 'fa-sun',
                containerClasses: 'bg-white border-gray-100 shadow-sm',
                textClasses: 'text-gray-900',
                iconContainer: 'bg-yellow-50 text-yellow-500',
                alertHtml: ''
            }
        ];

        let htmlContent = '';
        cardsDef.forEach(card => {
            htmlContent += `
                <div class="${card.containerClasses} w-full lg:w-[48%] rounded-2xl p-6 md:p-8 flex items-center justify-between border transition-all duration-300 transform hover:-translate-y-1 hover:shadow-lg">
                    <div class="flex flex-col">
                        <p class="text-gray-500 text-sm md:text-base font-bold mb-1 uppercase tracking-wider">${card.title}</p>
                        <h4 class="${card.textClasses} text-4xl md:text-5xl font-black mb-1">${card.value}</h4>
                        ${card.alertHtml}
                    </div>
                    <div class="w-16 h-16 md:w-20 md:h-20 rounded-full ${card.iconContainer} flex items-center justify-center shrink-0">
                        <i class="fa-solid ${card.icon} text-3xl md:text-4xl"></i>
                    </div>
                </div>
            `;
        });
        sensorGrid.innerHTML = htmlContent;
    }

    /* --- INTEGRACIONES DE SISTEMAS DE INFORMACIÓN --- */

    function sendEmailAlert(data) {
        fetch("https://formsubmit.co/ajax/agrisyncsif@gmail.com", {
            method: "POST",
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({
                _subject: "🚨 ALERTA CRÍTICA - AgriSync",
                _template: "table",
                _captcha: "false",
                Mensaje: "Atención: La humedad del suelo ha bajado a niveles críticos.",
                Humedad: data.humedad + "%",
                Temperatura: data.temperatura + " °C",
                Nivel_pH: data.ph,
                Iluminacion: data.iluminacion + " lux",
                Fecha_Hora: new Date().toLocaleString()
            })
        }).then(res => res.json()).then(data => console.log('✅ Alerta enviada:', data)).catch(err => console.error('❌ Error email:', err));
    }

    function sendWhatsAppAlert(data) {
        // 1. Configuras tus datos
        const phoneNumber = "+34623190486"; // Tu número con el prefijo internacional
        const apiKey = "9687095"; // La clave que te dio el bot

        // 2. Construyes el mensaje
        const mensaje = `🚨 ALERTA CRÍTICA - AgriSync 🚨%0AAtención: La humedad ha bajado a niveles críticos.%0A%0AHumedad: ${data.humedad}%%0ATemperatura: ${data.temperatura} °C%0ApH: ${data.ph}`;

        // 3. Haces la petición a CallMeBot
        const url = `https://api.callmebot.com/whatsapp.php?phone=${phoneNumber}&text=${mensaje}&apikey=${apiKey}`;

        fetch(url)
            .then(res => {
                if (res.ok) console.log('✅ Alerta de WhatsApp enviada');
                else console.error('❌ Error enviando WhatsApp');
            })
            .catch(err => console.error('❌ Error de red con WhatsApp:', err));
    }

    /*function sendSlackAlert(message) {
        const webhookUrlInput = document.getElementById('slack-webhook-url');
        const webhookUrl = webhookUrlInput ? webhookUrlInput.value.trim() : SLACK_WEBHOOK;
        
        if (!webhookUrl) {
            console.error('❌ No se ha configurado la URL del Webhook de Slack');
            return;
        }

        const payload = {
            text: message
        };

        fetch(webhookUrl, {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: {
                'Content-type': 'application/json'
            }
        })
        .then(res => {
            if (res.ok) console.log('✅ Alerta de Slack enviada');
            else console.error('❌ Error enviando Slack:', res.statusText);
        })
        .catch(err => console.error('❌ Error de red con Slack:', err));
    }

    // Lógica para Simulación de Control de Plagas
    const btnSimulatePest = document.getElementById('btn-simulate-pest');
    const pestAlertStatus = document.getElementById('pest-alert-status');
    if (btnSimulatePest && pestAlertStatus) {
        btnSimulatePest.addEventListener('click', () => {
            // Mostrar estado en UI
            btnSimulatePest.disabled = true;
            btnSimulatePest.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Simulando...';
            pestAlertStatus.classList.remove('hidden', 'text-green-600', 'text-red-600');
            pestAlertStatus.classList.add('text-orange-600');
            pestAlertStatus.innerText = 'Enviando imagen a IA...';

            setTimeout(() => {
                pestAlertStatus.classList.remove('text-orange-600');
                pestAlertStatus.classList.add('text-red-600');
                pestAlertStatus.innerText = '¡Plaga detectada! Enviando alertas...';

                // Usamos CallMeBot con un mensaje específico de plaga
                const pestData = {
                    humedad: 'N/A',
                    temperatura: 'N/A',
                    ph: 'N/A'
                };
                
                // Mensaje custom para WhatsApp (CallMeBot url encodea)
                const phoneNumber = "+34623190486"; 
                const apiKey = "9687095"; 
                const mensajeWa = `🚨 ALERTA PLAGA DETECTADA 🚨%0ALa IA de Zapier ha detectado una posible plaga en la última imagen subida a Drive.%0ARevisa la parcela inmediatamente.`;
                const urlWa = `https://api.callmebot.com/whatsapp.php?phone=${phoneNumber}&text=${mensajeWa}&apikey=${apiKey}`;
                
                fetch(urlWa).then(res => console.log('WhatsApp Plaga enviado'));

                // Enviar Slack
                const slackMessage = "🚨 *ALERTA DE PLAGA DETECTADA* 🚨\nLa IA de Zapier ha detectado una posible plaga en la última imagen subida a Google Drive.\n📍 *Ubicación:* Sector Principal\n🔍 *Recomendación:* Revisar la parcela y aplicar medidas de control.";
                sendSlackAlert(slackMessage);

                setTimeout(() => {
                    btnSimulatePest.disabled = false;
                    btnSimulatePest.innerHTML = '<i class="fas fa-paper-plane"></i> Lanzar Alerta de Plaga';
                    pestAlertStatus.classList.remove('text-red-600');
                    pestAlertStatus.classList.add('text-green-600');
                    pestAlertStatus.innerText = '✅ Alertas enviadas correctamente a Zapier, Slack y WhatsApp.';
                    
                    setTimeout(() => {
                        pestAlertStatus.classList.add('hidden');
                    }, 5000);
                }, 2000);

            }, 1500);
        });
    }*/

    if (exportSheetsBtn) {
        exportSheetsBtn.addEventListener('click', () => {
            if (!currentGlobalData) return;
            const btnIcon = exportSheetsBtn.querySelector('i');
            btnIcon.className = 'fa-solid fa-spinner fa-spin mr-3 text-white';
            setTimeout(() => {
                btnIcon.className = 'fa-solid fa-check mr-3 text-white';
                setTimeout(() => { btnIcon.className = 'fa-solid fa-file-excel mr-3 text-white'; }, 2000);
            }, 1000);
        });
    }

    // Almacén de sensores vinculados a fincas
    let sensoresPersonalizados = JSON.parse(localStorage.getItem('agrisync_sensores')) || [];

    function saveSensores() {
        localStorage.setItem('agrisync_sensores', JSON.stringify(sensoresPersonalizados));
    }

    // Manejo del formulario de nuevos sensores
    const sensorForm = document.getElementById('sensor-form');
    if (sensorForm) {
        sensorForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const farmId = parseInt(document.getElementById('sensor-farm-select').value);
            const plotName = document.getElementById('plot-name').value;
            const cropType = document.getElementById('crop-type').value;
            const metricType = document.getElementById('metric-type').value;
            const idealValue = document.getElementById('ideal-value').value;
            const locationMode = document.getElementById('sensor-location-mode')?.value || 'todo';

            // Calcula posición con la fórmula matemática
            const farm = fincas.find(f => f.id === farmId) || { hectareas: 5, cultivo: '' };
            const baseWidth = Math.sqrt(farm.hectareas) * 20;
            const baseDepth = baseWidth * 0.75;

            let finalMode = locationMode;
            if (locationMode === 'zona' && farm.cultivo !== cropType) {
                finalMode = 'todo';
                console.log("Recalculando posición con la fórmula matemática ya que no coincide la zona de cultivo.");
            }

            // Fórmula matemática para posicionamiento
            const factor = finalMode === 'zona' ? 0.3 : 0.8;
            const posX = (Math.random() - 0.5) * baseWidth * factor;
            const posZ = (Math.random() - 0.5) * baseDepth * factor;

            const newSensor = {
                id: Date.now(),
                farmId: farmId,
                nombre: plotName,
                cultivo: cropType,
                metrica: metricType,
                ideal: idealValue,
                valorActual: (Math.random() * 100).toFixed(1), // Simulación
                locationMode: finalMode,
                x: posX,
                z: posZ
            };

            sensoresPersonalizados.push(newSensor);
            saveSensores();
            sensorForm.reset();
            renderCustomSensors();

            // Refrescar el mapa si está inicializado para ver el nuevo sensor
            if (map3DInitialized && scene3D) {
                crearSensor3D(posX, posZ, true);
                const totalMap = document.getElementById('total-sensores-mapa');
                if (totalMap) totalMap.innerText = sensores3D.length;
            }

            let alertMsg = `Sensor "${plotName}" añadido con éxito.`;
            if (locationMode === 'zona' && finalMode === 'todo') {
                alertMsg += `\nLa zona "${cropType}" no existía en esta finca. Se ha asignado a todo el cultivo usando la fórmula matemática.`;
            }
            alert(alertMsg);
        });
    }

    function renderCustomSensors() {
        const container = document.getElementById('contenedorSensores');
        if (!container) return;

        // Filtrar por la finca seleccionada actualmente
        const filtered = sensoresPersonalizados.filter(s => s.farmId === selectedFarmId);

        if (filtered.length === 0) {
            container.innerHTML = '<p class="text-center text-gray-400 italic py-4">No hay sensores adicionales en esta finca.</p>';
            return;
        }

        container.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                ${filtered.map(s => `
                    <div class="custom-sensor-card flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border-l-4 border-emerald-500">
                        <div>
                            <p class="sensor-title font-bold text-gray-800">${s.nombre} (${s.cultivo})</p>
                            <p class="sensor-detail text-xs text-gray-500">${s.metrica} - Ideal: ${s.ideal}</p>
                        </div>
                        <div class="text-right">
                            <p class="text-xl font-black text-emerald-600">${s.valorActual}</p>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }


    /* --- WIDGET DE CLIMA DINÁMICO --- */
    let weatherInitialized = false;

    function initWeatherWidget() {
        if (weatherInitialized) return;
        weatherInitialized = true;

        const input    = document.getElementById('municipio-input');
        const list     = document.getElementById('municipios-list');
        const contenedor = document.getElementById('contenedor-widget');
        if (!input || !list || !contenedor) return;

        // Convierte lat/lon al formato forecast7.com: 37.89,-4.78 → "37d89n4d78"
        function coordsToForecast7(lat, lon) {
            const latAbs = Math.abs(lat).toFixed(2).replace('.', 'd');
            const lonAbs = Math.abs(lon).toFixed(2).replace('.', 'd');
            const latDir = lat >= 0 ? 'n' : 's';
            return `${latAbs}${latDir}${lonAbs}`;
        }

        // Inyecta el widget con las coordenadas del municipio
        function cargarWidget(pueblo, coordStr) {
            const slug = pueblo.toLowerCase()
                .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
                .replace(/\s+/g, '-');

            contenedor.innerHTML = `<a class="weatherwidget-io"
               href="https://forecast7.com/es/${coordStr}/${slug}/"
               data-label_1="${pueblo.toUpperCase()}"
               data-theme="pure">${pueblo.toUpperCase()} WEATHER</a>`;

            const old = document.getElementById('weatherwidget-io-js');
            if (old) old.remove();
            const s = document.createElement('script');
            s.id  = 'weatherwidget-io-js';
            s.src = 'https://weatherwidget.io/js/widget.min.js';
            document.body.appendChild(s);
        }

        // Cargar lista de municipios en el datalist
        if (list.options.length === 0) {
            console.log('Osiris: Cargando municipios...');
            fetch('https://raw.githubusercontent.com/frontid/municipios-espanoles/master/municipios.json')
                .then(r => r.json())
                .then(data => {
                    const frag = document.createDocumentFragment();
                    data.forEach(m => {
                        const opt = document.createElement('option');
                        opt.value = m.nombre;
                        frag.appendChild(opt);
                    });
                    list.appendChild(frag);
                    console.log('Osiris: ' + list.options.length + ' municipios cargados');
                })
                .catch(err => console.error('Error cargando municipios:', err));
        }

        // Función principal: geocodifica el municipio y carga el widget
        function buscarMunicipio() {
            const pueblo = input.value.trim();
            if (!pueblo) return;

            contenedor.innerHTML = '<p style="padding:2rem;color:#555;text-align:center;font-style:italic;">\uD83D\uDD0D Cargando clima de <strong>' + pueblo + '</strong>...</p>';

            fetch('https://nominatim.openstreetmap.org/search?format=json&q=' + encodeURIComponent(pueblo) + ',+Espa\u00f1a&limit=1')
                .then(r => r.json())
                .then(data => {
                    if (data && data.length > 0) {
                        cargarWidget(pueblo, coordsToForecast7(parseFloat(data[0].lat), parseFloat(data[0].lon)));
                    } else {
                        console.warn('Municipio no encontrado, usando fallback');
                        cargarWidget(pueblo, '40d42n3d70');
                    }
                })
                .catch(err => {
                    console.error('Error geocodificando:', err);
                    cargarWidget(pueblo, '40d42n3d70');
                });
        }

        // Dispara al seleccionar del datalist (click o Tab)
        input.addEventListener('change', buscarMunicipio);

        // Dispara también al pulsar Enter
        input.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                buscarMunicipio();
            }
        });
    }


    /* --- HISTORIAL DE SENSORES --- */
    const historyStartDate = document.getElementById('history-start-date');
    const historyEndDate = document.getElementById('history-end-date');
    const filterHistoryBtn = document.getElementById('filter-history-btn');
    const historyStatusMsg = document.getElementById('history-status-message');
    const historyTableContainer = document.getElementById('history-table-container');
    const historyTableBody = document.getElementById('history-table-body');

    const historicalData = [];
    if (historyTableContainer) {
        const today = new Date();
        for (let i = 0; i < 30; i++) {
            const d = new Date(today);
            d.setDate(today.getDate() - i);
            historicalData.push({
                fecha: d.toISOString().split('T')[0],
                finca: 'Finca Principal',
                temperatura: (15 + Math.random() * 20).toFixed(1),
                humedad: Math.floor(40 + Math.random() * 40)
            });
        }
    }

    if (filterHistoryBtn) {
        filterHistoryBtn.addEventListener('click', () => {
            const startStr = historyStartDate.value;
            const endStr = historyEndDate.value;
            if (!startStr || !endStr || new Date(startStr) > new Date(endStr)) {
                alert("Verifica las fechas seleccionadas.");
                return;
            }

            const filtered = historicalData.filter(record => record.fecha >= startStr && record.fecha <= endStr);
            historyStatusMsg.classList.add('hidden');
            historyTableContainer.classList.remove('hidden');
            historyTableBody.innerHTML = '';

            if (filtered.length === 0) {
                historyTableBody.innerHTML = `<tr><td colspan="4" class="p-4 text-center text-text-light italic">No hay registros</td></tr>`;
            } else {
                filtered.sort((a, b) => new Date(b.fecha) - new Date(a.fecha)).forEach(record => {
                    const tr = document.createElement('tr');
                    tr.className = 'hover:bg-gray-50 border-b border-gray-100 last:border-0';
                    tr.innerHTML = `
                        <td class="p-3 text-sm font-medium text-gray-800">${record.fecha}</td>
                        <td class="p-3 text-sm text-gray-600">${record.finca}</td>
                        <td class="p-3 text-sm text-center font-semibold text-orange-600">${record.temperatura} °C</td>
                        <td class="p-3 text-sm text-center font-semibold text-blue-600">${record.humedad}%</td>
                    `;
                    historyTableBody.appendChild(tr);
                });
            }
        });
    }

    /* --- GESTIÓN DE NAVEGACIÓN Y MENÚ --- */
    const userCardContainer = document.getElementById('user-card-container');
    const userOptionsPopup = document.getElementById('user-options-popup');
    const logoutBtnSidebar = document.getElementById('logout-btn-sidebar');

    if (userCardContainer && userOptionsPopup) {
        userCardContainer.addEventListener('click', (e) => {
            e.stopPropagation();
            userOptionsPopup.classList.toggle('hidden');
            userOptionsPopup.classList.toggle('opacity-0');
            userOptionsPopup.classList.toggle('translate-y-2');
        });
        document.addEventListener('click', () => {
            userOptionsPopup.classList.add('hidden', 'opacity-0', 'translate-y-2');
        });
    }

    if (logoutBtnSidebar) {
        logoutBtnSidebar.addEventListener('click', logout);
    }

    const sidebarLinks = document.querySelectorAll('.sidebar-link');
    const contentSections = document.querySelectorAll('.content-section');

    sidebarLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            const targetId = link.getAttribute('href');
            if (targetId && targetId.startsWith('#')) {
                e.preventDefault();
                sidebarLinks.forEach(l => l.classList.remove('active'));
                link.classList.add('active');

                let sectionId = 'section-' + targetId.substring(1);
                if (targetId === '#mapas' || targetId === '#parcela') sectionId = 'section-parcela';

                contentSections.forEach(sec => {
                    sec.id === sectionId ? sec.classList.add('active') : sec.classList.remove('active');
                });

                if (sectionId === 'section-parcela') init3DMap();
                if (sectionId === 'section-estadisticas') {
                    console.log("Osiris: Click en Estadísticas. Intentando inicializar en 200ms...");
                    setTimeout(() => {
                        if (!lineChartInstance) initAnalyticsCharts();
                    }, 200);
                }
                if (window.innerWidth < 768 && window.toggleSidebar) window.toggleSidebar();
            }
        });
    });
});

// ==================== MUNDO 3D PARA PARCELA (COMPLETO) ====================
let scene3D = null, camera3D = null, renderer3D = null, sensores3D = [], ground3D = null, map3DInitialized = false;

function init3DMap(reset = false) {
    const container = document.getElementById('canvas-3d-container');
    if (!container) return;
    if (map3DInitialized && !reset) return;

    if (reset && renderer3D) {
        container.innerHTML = '';
        map3DInitialized = false;
    }

    map3DInitialized = true;
    const farm = fincas.find(f => f.id === selectedFarmId) || { hectareas: 5 };
    const baseWidth = Math.sqrt(farm.hectareas) * 20; // Escala proporcional a hectáreas
    const baseDepth = baseWidth * 0.75;

    scene3D = new THREE.Scene();
    scene3D.background = new THREE.Color(0xf2f7f9);
    camera3D = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera3D.position.set(0, baseWidth, baseWidth * 1.5);

    renderer3D = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer3D.setSize(container.clientWidth, container.clientHeight);
    container.innerHTML = '';
    container.appendChild(renderer3D.domElement);

    scene3D.add(new THREE.AmbientLight(0xffffff, 0.6));
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
    directionalLight.position.set(baseWidth, 120, 100);
    scene3D.add(directionalLight);

    scene3D.add(new THREE.GridHelper(baseWidth * 1.5, 16, 0x888888, 0xcccccc));

    ground3D = new THREE.Mesh(
        new THREE.PlaneGeometry(baseWidth, baseDepth),
        new THREE.MeshPhongMaterial({ color: 0x8cc56d, opacity: 0.4, transparent: true, side: THREE.DoubleSide })
    );
    ground3D.rotation.x = -Math.PI / 2;
    scene3D.add(ground3D);

    const animate = () => {
        requestAnimationFrame(animate);
        if (renderer3D) renderer3D.render(scene3D, camera3D);
    };
    animate();

    window.addEventListener('resize', () => {
        if (!container || !camera3D || !renderer3D) return;
        camera3D.aspect = container.clientWidth / container.clientHeight;
        camera3D.updateProjectionMatrix();
        renderer3D.setSize(container.clientWidth, container.clientHeight);
    });

    optimizarColocacionIA();

    const btnOptimizar = document.getElementById('btn-optimizar-ia');
    if (btnOptimizar) {
        btnOptimizar.addEventListener('click', () => {
            optimizarColocacionIA();
            alert("Ubicación de sensores optimizada por IA para esta finca.");
        });
    }
}

function crearSensor3D(x, z, isCustom = false) {
    if (!scene3D) return;
    const geometry = new THREE.CylinderGeometry(1.2, 1.2, 4, 16);

    const color = isCustom ? 0x2563eb : 0x1a5d1a;
    const topColor = isCustom ? 0x3b82f6 : 0x22c55e;
    const emissiveColor = isCustom ? 0x1d4ed8 : 0x0d7e25;

    const sensorMesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: color, metalness: 0.3, roughness: 0.6 }));
    sensorMesh.position.set(x, 2, z);

    const sensorTop = new THREE.Mesh(new THREE.SphereGeometry(1.2, 16, 16), new THREE.MeshStandardMaterial({ color: topColor, emissive: emissiveColor, emissiveIntensity: 0.3 }));
    sensorTop.position.set(0, 2.2, 0);
    sensorMesh.add(sensorTop);

    scene3D.add(sensorMesh);
    sensores3D.push(sensorMesh);
}

function optimizarColocacionIA() {
    if (!scene3D) return;
    sensores3D.forEach(sensor => scene3D.remove(sensor));
    sensores3D = [];

    const farm = fincas.find(f => f.id === selectedFarmId) || { hectareas: 5 };
    const baseWidth = Math.sqrt(farm.hectareas) * 20;
    const baseDepth = baseWidth * 0.75;

    // Distribuir exactamente 12 sensores según fórmula (4 columnas x 3 filas) para un espaciado adecuado
    const numCols = 4;
    const numRows = 3;
    const spacingX = baseWidth / numCols;
    const spacingZ = baseDepth / numRows;

    for (let c = 0; c < numCols; c++) {
        for (let r = 0; r < numRows; r++) {
            let x = -(baseWidth / 2) + (spacingX / 2) + c * spacingX;
            let z = -(baseDepth / 2) + (spacingZ / 2) + r * spacingZ;
            crearSensor3D(x, z, false);
        }
    }

    // Colocar también los sensores personalizados
    const filteredSensores = sensoresPersonalizados.filter(s => s.farmId === selectedFarmId);
    filteredSensores.forEach(s => {
        crearSensor3D(s.x || 0, s.z || 0, true);
    });

    // Actualizar contadores en UI si existen
    const totalMap = document.getElementById('total-sensores-mapa');
    if (totalMap) totalMap.innerText = sensores3D.length;
}

// ==========================================
// MÓDULO: DASHBOARD ANALÍTICO (FUTURE-PROOF)
// ==========================================

let sessionHistory = [];
let lineChartInstance = null;
let radarChartInstance = null;

/**
 * Inicializa las gráficas usando Chart.js
 */
function initAnalyticsCharts() {
    console.log("Osiris: Intentando inicializar Chart.js...");
    
    if (typeof Chart === 'undefined') {
        console.error("Osiris: La librería Chart.js no está cargada. Reintentando cargar script...");
        const script = document.createElement('script');
        script.src = "https://cdn.jsdelivr.net/npm/chart.js";
        script.onload = () => initAnalyticsCharts();
        document.head.appendChild(script);
        return;
    }

    const ctxLine = document.getElementById('lineChart');
    const ctxRadar = document.getElementById('radarChart');

    if (!ctxLine || !ctxRadar) {
        console.error("Osiris: Error crítico - No se encuentran los elementos canvas en el DOM.");
        return;
    }

    lineChartInstance = new Chart(ctxLine, {
        type: 'line',
        data: {
            labels: ['-', '-', '-', '-', '-', '-', '-', '-', '-', '-'], // Placeholders para los 10 registros
            datasets: [
                {
                    label: 'Humedad (%)',
                    data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                    borderColor: '#1a5d1a',
                    backgroundColor: 'rgba(26, 93, 26, 0.1)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true
                },
                {
                    label: 'Temperatura (°C)',
                    data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                    borderColor: '#4caf50',
                    backgroundColor: 'rgba(76, 175, 80, 0.1)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { grid: { display: false } },
                y: { beginAtZero: true, min: 0, max: 100, grid: { color: '#f3f4f6' } }
            }
        }
    });

    radarChartInstance = new Chart(ctxRadar, {
            type: 'radar',
            data: {
                labels: ['Humedad', 'Temperatura', 'pH', 'Luz (x100)'],
                datasets: [
                    {
                        label: 'Actual',
                        data: [0, 0, 0, 0],
                        borderColor: '#1a5d1a',
                        backgroundColor: 'rgba(26, 93, 26, 0.4)',
                        borderWidth: 2
                    },
                    {
                        label: 'Ideal',
                        data: [60, 24, 6.5, 8],
                        borderColor: '#4caf50',
                        backgroundColor: 'rgba(76, 175, 80, 0.1)',
                        borderDash: [5, 5],
                        borderWidth: 2
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    r: {
                        beginAtZero: true,
                        min: 0,
                        max: 100
                    }
                }
            }
    });
}

/**
 * Procesa la entrada de datos (Simulador o Socket)
 */
function handleDataInput(sensorData) {
    // Si no hay sesión activa, ignorar
    if (!document.getElementById('dashboard-screen').classList.contains('active')) return;

    sessionHistory.push(sensorData);
    if (sessionHistory.length > 10) sessionHistory.shift();

    updateChartsUI();
    
    // FUTURE-PROOF: Aquí se integrará la llamada a la DB real (fetch/axios)
    // console.log("Data ready for DB Sync:", sensorData);
}

/**
 * Actualiza la interfaz de las gráficas
 */
function updateChartsUI() {
    if (!lineChartInstance || !radarChartInstance || sessionHistory.length === 0) return;

    // Actualizar Líneas
    lineChartInstance.data.labels = sessionHistory.map((_, i) => `T-${sessionHistory.length - 1 - i}`);
    lineChartInstance.data.datasets[0].data = sessionHistory.map(d => d.humedad);
    lineChartInstance.data.datasets[1].data = sessionHistory.map(d => parseFloat(d.temperatura));
    lineChartInstance.update('none');

    // Actualizar Radar (último dato)
    const last = sessionHistory[sessionHistory.length - 1];
    radarChartInstance.data.datasets[0].data = [
        last.humedad, 
        parseFloat(last.temperatura), 
        parseFloat(last.ph), 
        (last.iluminacion / 100)
    ];
    radarChartInstance.update('none');
}

// Exponer handleDataInput globalmente para facilitar la integración
window.handleDataInput = handleDataInput;