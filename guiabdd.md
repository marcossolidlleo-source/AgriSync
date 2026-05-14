#### Guía de comunicación con la Base de Datos (para desarrolladores)

La base de datos de Osiris está alojada en un servidor Odoo accesible en `osiris.tfp.duckdns.org`. Odoo expone una API **JSON-RPC** que permite realizar todas las operaciones sobre la base de datos mediante peticiones HTTP estándar en formato JSON. A continuación se detalla cómo utilizar esta API desde el frontend de Osiris.

##### Datos de conexión

| Parámetro | Valor |

| URL del servidor | `http://osiris.tfp.duckdns.org` |
| Endpoint de la API | `/jsonrpc` |
| Nombre de la base de datos | `Osiris_agri` |
| Método HTTP | POST |
| Content-Type | `application/json` |

##### Paso 1: Autenticación

Antes de realizar cualquier operación, es necesario autenticarse para obtener un identificador de sesión (`uid`). Este identificador se utilizará en todas las peticiones posteriores.

```javascript
async function loginOdoo(email, password) {
    const response = await fetch('http://osiris.tfp.duckdns.org/jsonrpc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            jsonrpc: "2.0",
            method: "call",
            params: {
                service: "common",
                method: "login",
                args: ["Osiris_agri", email, password]
            }
        })
    });
    const data = await response.json();
    return data.result; // Devuelve el uid (número entero) o false si falla
}

// Uso:
const uid = await loginOdoo("admin@osiris.com", "contraseña");
if (uid) {
    console.log("Login correcto, UID:", uid);
} else {
    console.log("Credenciales incorrectas");
}
```

##### Paso 2: Función auxiliar para operaciones CRUD

Para simplificar las llamadas, se recomienda crear una función auxiliar reutilizable:

```javascript
async function odooExecute(uid, password, modelo, metodo, args, kwargs = {}) {
    const response = await fetch('http://osiris.tfp.duckdns.org/jsonrpc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            jsonrpc: "2.0",
            method: "call",
            params: {
                service: "object",
                method: "execute_kw",
                args: ["Osiris_agri", uid, password, modelo, metodo, args],
                kwargs: kwargs
            }
        })
    });
    const data = await response.json();
    return data.result;
}
```

##### Operaciones disponibles

**Leer registros (equivalente a SELECT):**

```javascript
// Obtener todas las fincas de un usuario
const fincas = await odooExecute(uid, password,
    "x_osiris_finca", "search_read",
    [[["x_propietario_id", "=", userId]]],        // Filtro (WHERE)
    { fields: ["x_name", "x_hectareas", "x_cultivo", "x_sector"] }  // Campos
);
// Resultado: [{ id: 1, x_name: "Hacienda El Sol", x_hectareas: 10.5, ... }, ...]

// Obtener sensores de una finca
const sensores = await odooExecute(uid, password,
    "x_osiris_sensor", "search_read",
    [[["x_finca_id", "=", fincaId]]],
    { fields: ["x_name", "x_metrica", "x_valor_actual"] }
);

// Obtener lecturas de un sensor entre dos fechas
const lecturas = await odooExecute(uid, password,
    "x_osiris_lectura", "search_read",
    [[
        ["x_sensor_id", "=", sensorId],
        ["x_fecha", ">=", "2026-04-01 00:00:00"],
        ["x_fecha", "<=", "2026-04-30 23:59:59"]
    ]],
    { fields: ["x_valor", "x_fecha"], order: "x_fecha desc" }
);
```

**Crear registros (equivalente a INSERT):**

```javascript
// Registrar una nueva lectura de sensor
const nuevaLecturaId = await odooExecute(uid, password,
    "x_osiris_lectura", "create",
    [{
        x_sensor_id: 1,
        x_finca_id: 1,
        x_valor: 25.3,
        x_fecha: "2026-04-26 18:30:00"
    }]
);

// Registrar un nuevo usuario
const nuevoUsuarioId = await odooExecute(uid, password,
    "x_osiris_usuario", "create",
    [{
        x_name: "Juan García",
        x_email: "juan@ejemplo.com",
        x_password: "contraseña123",
        x_rol: "usuario"
    }]
);

// Registrar una alerta
const nuevaAlertaId = await odooExecute(uid, password,
    "x_alerta_agricola", "create",
    [{
        x_finca_id: 1,
        x_sensor_id: 3,
        x_tipo: "sequia",
        x_mensaje: "La humedad ha bajado al 18%, riesgo de sequía",
        x_valor: 18.0,
        x_fecha: "2026-04-26 18:30:00",
        x_enviada: false
    }]
);
```

**Actualizar registros (equivalente a UPDATE):**

```javascript
// Actualizar el valor actual de un sensor
await odooExecute(uid, password,
    "x_osiris_sensor", "write",
    [[sensorId], { x_valor_actual: 26.7 }]
);

// Marcar una alerta como enviada
await odooExecute(uid, password,
    "x_alerta_agricola", "write",
    [[alertaId], { x_enviada: true }]
);
```

**Eliminar registros (equivalente a DELETE):**

```javascript
// Eliminar un sensor
await odooExecute(uid, password,
    "x_osiris_sensor", "unlink",
    [[sensorId]]
);
```

##### Resumen de métodos

| Operación | Método Odoo | Equivalente SQL | Ejemplo de uso |

| Leer | `search_read` | `SELECT ... WHERE ...` | Consultar fincas, lecturas, alertas |
| Crear | `create` | `INSERT INTO ...` | Nueva lectura, nuevo usuario |
| Actualizar | `write` | `UPDATE ... SET ...` | Actualizar valor de sensor |
| Eliminar | `unlink` | `DELETE FROM ...` | Borrar un sensor |
| Contar | `search_count` | `SELECT COUNT(*)` | Contar alertas activas |

##### Operadores de filtro disponibles

Los filtros en `search_read` utilizan la siguiente sintaxis: `["campo", "operador", "valor"]`

| Operador | Significado | Ejemplo |

| `=` | Igual a | `["x_rol", "=", "admin"]` |
| `!=` | Distinto de | `["x_tipo", "!=", "sequia"]` |
| `>` | Mayor que | `["x_valor", ">", 30]` |
| `<` | Menor que | `["x_valor", "<", 10]` |
| `>=` | Mayor o igual | `["x_fecha", ">=", "2026-01-01"]` |
| `<=` | Menor o igual | `["x_hectareas", "<=", 5.0]` |
| `like` | Contiene (con %) | `["x_name", "like", "Hacienda"]` |
| `in` | Dentro de lista | `["x_metrica", "in", ["temperatura", "humedad"]]` |

---

### Diseño e implementación de la Base de Datos Externa (Odoo)

#### Necesidad de una base de datos

El software Osiris, en su versión inicial, carece de una capa de persistencia de datos real. Toda la información que maneja la aplicación — usuarios, fincas, sensores y sus lecturas — se almacena de forma volátil: las credenciales de acceso están escritas directamente en el código fuente (`app.js`), los datos de fincas y sensores se guardan en el `localStorage` del navegador, y las lecturas de los sensores se generan dinámicamente en memoria sin quedar registradas en ningún momento.

Esto supone tres problemas fundamentales:

1. **Pérdida de datos:** Al cerrar el navegador o borrar los datos de navegación, toda la información de fincas y sensores desaparece. No existe un historial real de las lecturas, lo que impide realizar análisis a lo largo del tiempo.
2. **Seguridad:** Las contraseñas y roles de usuario están expuestos en texto plano dentro del código JavaScript, accesibles para cualquier persona que inspeccione la página web.
3. **Escalabilidad:** El sistema actual no permite que varios usuarios trabajen simultáneamente ni que los datos se compartan entre dispositivos, ya que `localStorage` es exclusivo de cada navegador.

Para resolver estas limitaciones, se ha diseñado e implementado una **base de datos relacional externa** alojada en un servidor Odoo. Esta base de datos centraliza toda la información del sistema y permite su acceso desde cualquier dispositivo a través de la API JSON-RPC que Odoo expone de forma nativa. De esta manera, el frontend de Osiris puede consultar y almacenar datos de forma persistente, segura y compartida.

#### Razonamiento del diseño de tablas

El diseño de la base de datos sigue el principio de **normalización**, evitando la duplicación de datos y estableciendo relaciones claras entre las entidades:

**1. Tabla de Usuarios (`x_osiris_usuario`):**
Se decidió crear una tabla independiente para los usuarios de Osiris, separada de los usuarios internos de Odoo. De esta forma, los agricultores que utilizan el software no necesitan tener acceso al panel de administración de Odoo. La tabla almacena las credenciales de forma centralizada, sustituyendo el sistema hardcodeado en `app.js`.

| Campo | Tipo | Requerido | Descripción |

| `x_name` | Carácter | Sí | Nombre del usuario |
| `x_email` | Carácter | Sí | Correo electrónico |
| `x_password` | Carácter | Sí | Contraseña |
| `x_rol` | Selección | Sí | Rol: Admin o Usuario |
| `x_telefono` | Caracter | Sí | Teléfono del usuario |
| `x_token` | Carácter | No | Token para envío de mensajes |

**2. Tabla de Fincas (`x_osiris_finca`):**
Cada finca pertenece a un usuario (relación Many2one). Se almacenan los datos principales que la aplicación necesita para representar una finca en el dashboard: nombre, extensión, tipo de cultivo y sector geográfico.

| Campo | Tipo | Requerido | Descripción |

| `x_name` | Carácter | Sí | Nombre de la finca |
| `x_hectareas` | Número flotante | Sí | Extensión en hectáreas |
| `x_cultivo` | Carácter | Sí | Cultivo principal |
| `x_sector` | Carácter | No | Sector o zona geográfica |
| `x_propietario_id` | Many2one → Usuario | Sí | Propietario de la finca |

**3. Tabla de Sensores (`x_osiris_sensor`):**
Cada sensor está vinculado a una finca (relación Many2one). Un sensor mide una única métrica (temperatura, humedad, pH o iluminación). Se incluyen también las coordenadas de posición para la representación en el mapa 3D de la aplicación.

| Campo | Tipo | Requerido | Descripción |

| `x_name` | Carácter | Sí | Nombre del sensor |
| `x_finca_id` | Many2one → Finca | Sí | Finca donde está instalado |
| `x_cultivo` | Carácter | Sí | Cultivo que monitoriza |
| `x_metrica` | Selección | Sí | Tipo de medición: temperatura, humedad, pH o iluminación |
| `x_valor_ideal` | Número flotante | No | Valor ideal de referencia |
| `x_valor_actual` | Número flotante | No | Última lectura registrada |
| `x_pos_x` | Número flotante | No | Posición X en el mapa 3D |
| `x_pos_y` | Número flotante | No | Posición Y en el mapa 3D |

**4. Tabla de Lecturas (`x_osiris_lectura`):**
Esta es la tabla con mayor volumen de datos, ya que almacena cada lectura individual de cada sensor a lo largo del tiempo. Se optó por un diseño simplificado con un único campo de valor y una fecha, en lugar de columnas separadas para cada tipo de medición. Esto se debe a que cada sensor mide una sola métrica, por lo que el tipo de dato se infiere directamente del sensor asociado, evitando redundancia.

| Campo | Tipo | Requerido | Descripción |

| `x_sensor_id` | Many2one → Sensor | Sí | Sensor que tomó la lectura |
| `x_finca_id` | Many2one → Finca | Sí | Finca de la lectura |
| `x_valor` | Número flotante | Sí | Valor registrado |
| `x_fecha` | Fecha y hora | Sí | Fecha y hora de la lectura |

**5. Tabla de Alertas (`x_alerta_agricola`):**
Registra las alertas que se generan cuando los valores de los sensores superan umbrales críticos (por ejemplo, humedad por debajo del 30%). Se incluyó una referencia al sensor que originó la alerta para poder detectar patrones, como un sensor defectuoso que genera alertas repetidamente.

| Campo | Tipo | Requerido | Descripción |

| `x_finca_id` | Many2one → Finca | Sí | Finca afectada |
| `x_sensor_id` | Many2one → Sensor | Sí | Sensor que originó la alerta |
| `x_tipo` | Selección | Sí | Tipo: sequía, temperatura o pH |
| `x_mensaje` | Texto | Sí | Descripción de la alerta |
| `x_valor` | Número flotante | Sí | Valor registrado en el momento |
| `x_fecha` | Fecha y hora | Sí | Fecha y hora de la alerta |
| `x_enviada` | Booleano | No | Si se envió notificación por email |


#### Diagrama relacional (texto)


x_osiris_usuario
       │
       │ 1:N  
       ▼
x_osiris_finca
       │
       ├── 1:N ──▶ x_osiris_sensor
       │                  │
       │                  │ 1:N
       │                  ▼
       │           x_osiris_lectura
       │
       └── 1:N ──▶ x_alerta_agricola 

---

#### Acceso a las tablas de datos desde Odoo

Para poder visualizar, crear, modificar o eliminar datos de forma manual directamente desde el panel de administración de Odoo, se ha configurado una interfaz visual para cada tabla.

**Pasos para acceder a las tablas:**

1. **Inicia sesión en Odoo:** Accede a la URL de administración (`http://osiris-tfp.duckdns.org`) e inicia sesión.
2. **Abre el Menú Principal:** Haz clic en el icono de los **9 cuadraditos** situado arriba a la izquierda.
3. **Selecciona la aplicación (tabla):** En el panel principal verás los iconos correspondientes a cada tabla de la base de datos de Osiris:
   - **Usuarios osiris**
   - **Fincas**
   - **Sensores**
   - **Lecturas**
   - **Alertas**
4. **Gestión de datos:** Haz clic en cualquiera de ellas para entrar a la vista de "lista" (tabla). Desde ahí puedes:
   - Ver todos los registros actuales con todas sus columnas configuradas.
   - Hacer clic en el botón morado **"Nuevo"** (arriba a la izquierda) para añadir datos a mano (por ejemplo, para generar datos de prueba).
   - Hacer clic sobre cualquier registro existente para abrir su "ficha" (vista de formulario) y editar sus valores o borrarlo.
