/**
 * AgriSync - Lógica Principal de la Aplicación
 * Sistema de monitoreo agrícola.
 */

document.addEventListener('DOMContentLoaded', () => {
    // Referencias al DOM
    const loginScreen = document.getElementById('loginScreen');
    const dashboardScreen = document.getElementById('dashboardScreen');
    const loginForm = document.getElementById('loginForm');
    const passwordInput = document.getElementById('password');
    const loginError = document.getElementById('loginError');
    const logoutBtn = document.getElementById('logoutBtn');
    const userRoleBadge = document.getElementById('userRole');
    const adminControls = document.getElementById('adminControls');
    const sensorGrid = document.getElementById('sensorGrid');
    const exportSheetsBtn = document.getElementById('exportSheetsBtn');

    // Mapeo de contraseñas a Roles de acceso
    const CREDENTIALS = {
        'adminAgri2026': 'Admin',
        'userSync123': 'Usuario'
    };

    // Estado global
    let currentUserRole = null;
    let sensorInterval = null;
    let lastEmailAlert = 0;
    let currentGlobalData = null;
    let myLandbot = null;

    /* --- GESTIÓN DE INCIO DE SESIÓN (LOGIN) --- */

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const pwd = passwordInput.value.trim();
        const role = CREDENTIALS[pwd];

        if (role) {
            login(role);
        } else {
            // Mostrar error visual
            loginError.classList.remove('hidden');
            passwordInput.classList.add('border-red-500', 'focus:ring-red-500/20', 'focus:border-red-600');
            passwordInput.classList.remove('focus:ring-green-500/20', 'focus:border-green-600');
        }
    });

    passwordInput.addEventListener('input', () => {
        // Limpiar estilos de error al escribir de nuevo
        loginError.classList.add('hidden');
        passwordInput.classList.remove('border-red-500', 'focus:ring-red-500/20', 'focus:border-red-600');
        passwordInput.classList.add('focus:ring-green-500/20', 'focus:border-green-600');
    });

    logoutBtn.addEventListener('click', logout);

    function login(role) {
        currentUserRole = role;

        // Limpiar formulario y errores
        loginError.classList.add('hidden');
        passwordInput.value = '';

        // Actualizar UI del Dashboard según nivel de acceso
        userRoleBadge.textContent = role;
        userRoleBadge.className = role === 'Admin'
            ? 'text-sm font-bold bg-purple-50 border border-purple-200 text-purple-800 px-4 py-1.5 rounded-full shadow-sm'
            : 'text-sm font-bold bg-green-50 border border-green-200 text-green-800 px-4 py-1.5 rounded-full shadow-sm';

        if (role === 'Admin') {
            adminControls.classList.remove('hidden'); // Dar acceso a configuración
        } else {
            adminControls.classList.add('hidden');    // Acceso solo lectura
        }

        // Transición de pantallas
        loginScreen.classList.add('hidden');
        dashboardScreen.classList.remove('hidden');

        // Inicializar el Dashboard
        initDashboard();
    }

    function logout() {
        currentUserRole = null;

        // Detener actualizaciones de sensores
        if (sensorInterval) clearInterval(sensorInterval);

        // Transición de pantallas
        dashboardScreen.classList.add('hidden');
        loginScreen.classList.remove('hidden');
    }

    /* --- LÓGICA DEL DASHBOARD DE SENSORES --- */

    function initDashboard() {
        // 1. Cargar datos DENTRO DE INMEDIATO para evitar pantalla blanca
        updateSensorsData();

        // 2. Establecer actualización periódica simulando tiempo real (cada 4 seg)
        sensorInterval = setInterval(updateSensorsData, 4000);

        // 3. Inicializar Landbot (Soporte IA)
        initLandbot();
    }

    function updateSensorsData() {
        // Simular lecturas de hardware IoT
        // Humedad puede bajar del 30% esporádicamente para activar regla visual
        const baseHumedad = Math.random() < 0.2 ? (15 + Math.random() * 14) : (35 + Math.random() * 50);

        const currentData = {
            temperatura: (21 + Math.random() * 8).toFixed(1),  // 21.0 - 29.0 °C
            humedad: Math.floor(baseHumedad),                  // 15 - 85 %
            ph: (6.0 + Math.random() * 2).toFixed(1),          // 6.0 - 8.0
            iluminacion: Math.floor(700 + Math.random() * 600) // 700 - 1300 lux
        };

        renderSensorUI(currentData);

        // Guardar dato actual para posible exportación manual
        currentGlobalData = currentData;

        // Alerta Crítica por Email (Humedad < 30%)
        if (currentData.humedad < 30) {
            const now = Date.now();
            if (now - lastEmailAlert > 60000) { // Limitar a 1 alerta cada 60 seg
                sendEmailAlert(currentData);
                lastEmailAlert = now;
            }
        }
    }

    function renderSensorUI(data) {
        // REGLA VISUAL DE NEGOCIO: Si humedad < 30%, destacar en rojo.
        const ruleHumedadBaja = data.humedad < 30;

        const cardsDef = [
            {
                title: 'Humedad del Suelo',
                value: `${data.humedad}%`,
                icon: 'fa-droplet',
                // Logica de resaltado según regla
                containerClasses: ruleHumedadBaja
                    ? 'bg-red-50 border-red-300 ring-4 ring-red-100 shadow-red-200'
                    : 'bg-white border-gray-100 shadow-sm',
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

        // Construir HTML de las tarjetas
        let htmlContent = '';
        cardsDef.forEach(card => {
            // Diseño simétrico (45% de ancho en pantallas grandes) usando w-[48%] flex-grow
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

    /* --- INTEGRACIONES DE SISTEMAS DE INFORMACIÓN (TFP Nivel Pro) --- */

    /**
     * Enviar Correo de Alerta Crítica vía FormSubmit
     */
    function sendEmailAlert(data) {
        console.warn('⚠️ ENVIANDO CORREO DE ALERTA: Humedad Crítica detectada!', data.humedad + '%');

        fetch("https://formsubmit.co/ajax/agrisyncsif@gmail.com", {
            method: "POST",
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
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
        })
        .then(response => response.json())
        .then(data => console.log('✅ Alerta enviada correctamente por correo:', data))
        .catch(err => console.error('❌ Error al enviar el correo:', err));
    }

    /**
     * Exportar a Google Sheets (Solo Admin)
     */
    if (exportSheetsBtn) {
        exportSheetsBtn.addEventListener('click', () => {
            if (!currentGlobalData) return;

            const btnIcon = exportSheetsBtn.querySelector('i');
            btnIcon.className = 'fa-solid fa-spinner fa-spin mr-3 text-white';

            console.log('[Google Sheets] Exportando datos actuales...', currentGlobalData);

            // Simular retraso de red
            setTimeout(() => {
                btnIcon.className = 'fa-solid fa-check mr-3 text-white';

                // Fetch real a Google Apps Script Web App iría aquí

                setTimeout(() => {
                    btnIcon.className = 'fa-solid fa-file-excel mr-3 text-white';
                }, 2000);
            }, 1000);
        });
    }

    /**
     * Inicializar Chatbot Landbot.io (Flotante)
     */
    function initLandbot() {
        if (myLandbot) return; // ya inicializado
        if (window.Landbot) {
            myLandbot = new Landbot.Livechat({
                configUrl: 'https://storage.googleapis.com/landbot.online/v3/H-1490234-X7XX/index.json', // URL de demo
            });
            console.log('[Landbot] Chatbot Livechat inicializado e inyectado en la vista.');
        }
    }

    /* --- HISTORIAL DE SENSORES (RANGO DE FECHAS) --- */
    const historyStartDate = document.getElementById('history-start-date');
    const historyEndDate = document.getElementById('history-end-date');
    const filterHistoryBtn = document.getElementById('filter-history-btn');
    const historyStatusMsg = document.getElementById('history-status-message');
    const historyTableContainer = document.getElementById('history-table-container');
    const historyTableBody = document.getElementById('history-table-body');

    // 1. Crear Array simulado (mock) de los últimos 30 días
    const historicalData = [];
    if (historyTableContainer) {
        const today = new Date();
        for (let i = 0; i < 30; i++) {
            const d = new Date(today);
            d.setDate(today.getDate() - i);
            // Formato YYYY-MM-DD
            const dateStr = d.toISOString().split('T')[0];
            
            // Simular datos diarios: Temperatura 15-35, Humedad 40-80
            const temp = (15 + Math.random() * 20).toFixed(1);
            const hum = Math.floor(40 + Math.random() * 40);
            
            historicalData.push({
                fecha: dateStr,
                finca: 'Finca Principal',
                temperatura: temp,
                humedad: hum
            });
        }
    }

    // 2. Lógica de Filtrado
    if (filterHistoryBtn) {
        filterHistoryBtn.addEventListener('click', () => {
            const startStr = historyStartDate.value;
            const endStr = historyEndDate.value;

            // A) Validación
            if (!startStr || !endStr) {
                alert("Por favor, selecciona fecha de inicio y fin.");
                return;
            }
            if (new Date(startStr) > new Date(endStr)) {
                alert("La fecha de inicio no puede ser mayor que la fecha final.");
                return;
            }

            // B) Filtrado
            const filtered = historicalData.filter(record => {
                return record.fecha >= startStr && record.fecha <= endStr;
            });

            // C y D) Mostrar Resultados
            historyStatusMsg.classList.add('hidden');
            historyTableContainer.classList.remove('hidden');
            historyTableBody.innerHTML = '';

            if (filtered.length === 0) {
                historyTableBody.innerHTML = `
                    <tr>
                        <td colspan="4" class="p-4 text-center text-text-light italic">
                            No hay registros para estas fechas
                        </td>
                    </tr>
                `;
            } else {
                // Ordenar mostrando las más recientes primero
                filtered.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

                filtered.forEach(record => {
                    const tr = document.createElement('tr');
                    tr.className = 'hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0';
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

});
