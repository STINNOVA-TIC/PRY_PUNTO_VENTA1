

# 📘 CONTEXTO COMPLETO DEL SISTEMA: 
# "Sistema Integrado de Gestión de Entregas Internas y Compras (SIG)"

## 1. VISIÓN GENERAL DEL PROYECTO
El sistema es una **plataforma interna de control de inventario, solicitudes de bienes/servicios y descuentos por nómina** diseñada exclusivamente para los empleados de una empresa corporativa (como *STRIVE*). 

No es un e-commerce abierto al público. Su objetivo es **digitalizar y auditar** todo el ciclo de vida de un producto dentro de la empresa: desde que un empleado lo pide, pasando por la verificación del encargado de bodega, hasta el descuento automático en su salario (si aplica) y la reposición de inventario mediante órdenes de compra internas.

---

## 2. ACTORES (ROLES) Y SUS RESPONSABILIDADES
El sistema maneja **5 roles principales** con permisos estrictamente diferenciados:

| **Rol** | **Responsabilidad principal** | **Qué puede hacer en el sistema** |
| :--- | :--- | :--- |
| **1. Empleado (Comprador)** | Solicitar productos para su trabajo. | • Inicia sesión con su **cédula** (sin contraseña, solo validación). <br> • Visualiza el catálogo de productos. <br> • Genera una **solicitud de entrega** (selecciona productos y cantidades). <br> • Recibe un **código de retiro** único para reclamar en bodega. <br> • Puede solicitar una **devolución** de un producto ya entregado. |
| **2. Entregador (Bodega)** | Controlar la salida física de productos. | • Busca solicitudes por el **código de retiro** que le da el empleado. <br> • Verifica que el empleado coincida con la solicitud. <br> • **Toma una foto** como evidencia de que el producto fue entregado. <br> • Marca la solicitud como **"Entregado"**, **"No entregado"** (si el empleado no fue a retirar) o **"Cancelado"**. <br> • Recibe físicamente los productos cuando una devolución es aprobada (ejecuta la devolución). |
| **3. Encargado de Stock (Compras/Logística)** | Mantener el inventario y abastecerlo. | • **Actualiza el stock** de productos existentes. <br> • **Crea nuevos productos** que van a entrar al inventario. <br> • Detecta productos con stock bajo. <br> • **Genera Órdenes de Compra** (llenando el formato oficial de la empresa para solicitar bienes/servicios a proveedores externos). <br> • Al recibir la mercancía, confirma la recepción y actualiza el inventario automáticamente. |
| **4. Talento Humano (TTHH)** | Controlar gastos y aplicar descuentos. | • **Aprueba o rechaza** las solicitudes de devolución que hacen los empleados. <br> • Visualiza **reportes completos** de todo lo que compró cada empleado en un período (mes). <br> • Genera **descuentos de nómina** para descontar el valor de los productos solicitados del salario del empleado (a fin de mes). |
| **5. Administrador (Admin)** | Configurar el sistema. | • Acceso TOTAL a todas las tablas. <br> • Gestiona usuarios del sistema (crear, editar, desactivar). <br> • Gestiona roles y permisos. <br> • Gestiona parámetros maestros (Empresa, Sucursales, Departamentos, Centros de Costos). |

---

## 3. FLUJO DE TRABAJO COMPLETO (CICLO DE VIDA)

### 🔄 Flujo A: Solicitud y Entrega de Productos
1. **Login del Empleado:** El empleado ingresa su número de cédula en un "Kiosco" o interfaz web. El sistema valida que exista en la tabla `empleado`.
2. **Generación de Solicitud:** El empleado agrega productos al carrito y confirma. El sistema crea un registro en `solicitud_entrega` y genera un **código alfanumérico único** (`solicitud_entrega_codigo`). El estado inicial es `pendiente`.
3. **Retiro en Bodega:** El empleado va a bodega y le dice el código al **Entregador**.
4. **Verificación y Entrega:** El Entregador ingresa el código en el sistema. Si coincide y el empleado es el correcto, procede a entregar los productos físicamente, **toma una foto de la entrega** (o del empleado con los productos) y sube la imagen (`solicitud_entrega_foto_entrega`). Cambia el estado a `entregado`. 
5. **No entrega:** Si el empleado nunca aparece, el Entregador cambia el estado a `no_entregado` (esto notifica a TTHH para que no le descuenten).

### 🔄 Flujo B: Devoluciones
1. **Solicitud:** El empleado (desde su perfil) selecciona una entrega anterior y solicita devolución, llenando un motivo (`devolucion_motivo`). Estado: `pendiente`.
2. **Revisión TTHH:** El usuario de Talento Humano revisa la solicitud. Si la acepta, cambia estado a `aprobado`; si no, a `rechazado`.
3. **Ejecución Física:** Si está `aprobado`, el **Entregador** recibe físicamente el producto devuelto, registra la fecha de ejecución (`devolucion_fecha_ejecucion`) y actualiza el inventario (se genera un movimiento de tipo `devolucion_entrada`).

### 🔄 Flujo C: Gestión de Stock y Órdenes de Compra (Formato Real)
1. **Detección:** El Encargado de Stock visualiza productos cuyo stock está bajo.
2. **Creación de OC:** Llena el formulario **exacto** que usa la empresa (basado en el formato "Requerimiento de Bienes y/o Servicios"). Incluye:
   - Justificación (`orden_compra_justificacion`).
   - Tipo de artículo (Materia Prima, Servicio, etc.).
   - Forma de Pago y Plazos.
   - Checkboxes (¿Requiere contrato? ¿Requiere seguro? ¿Requiere mantenimiento? ¿Se asigna a un trabajador?).
3. **Aprobación Jerárquica:** El sistema registra quién aprueba (Gerencia Administrativa) y quién recibe (Compras) mediante campos como `usuario_aprobador_id` y `usuario_comprador_id`.
4. **Recepción:** Cuando llega la mercancía, el Encargado de Stock recibe la orden, y el sistema **aumenta el stock** de los productos automáticamente (movimiento tipo `orden_compra`).

### 🔄 Flujo D: Descuentos por Nómina
1. **Cierre de Mes:** El usuario de TTHH genera un reporte filtrando por `empleado_id` y `periodo_descuento` (Ej: 2026-07).
2. **Generación de Descuento:** El sistema suma el total de los productos entregados a ese empleado en el mes y genera un registro en `descuento_nomina` (con estado `pendiente`).
3. **Aplicación:** Una vez aplicado en nómina, el usuario cambia el estado a `aplicado`.

---

## 4. MÓDULOS FUNCIONALES Y SEGURIDAD

### Seguridad y Accesos (RBAC)
- El acceso al sistema (Backoffice) es mediante **usuario y contraseña** (`usuario_email`, `usuario_password`).
- **NOTA IMPORTANTE:** No todos los empleados tienen usuario. Solo aquellos que van a operar el sistema (Admin, Stock, Entregador, TTHH) tienen un registro en la tabla `usuario`. El `empleado_id` en la tabla `usuario` puede ser **NULL** porque un operador del sistema podría ser un externo (consultor) o simplemente no estar en la nómina como empleado común.
- Los permisos están granulares: divididos por **Módulos** (Productos, Stock, Órdenes, Solicitudes, Devoluciones, Reportes, Usuarios) y por **Acciones** (Ver, Crear, Editar, Eliminar, Aprobar).

### Trazabilidad Total (Auditoría)
Todas las tablas principales tienen campos de auditoría:
- `fecha_creacion`, `fecha_modificacion`, `fecha_desactivacion`.
- Registro de **quién** hizo cada acción (mediante FKs a `usuario_id` o `empleado_id`).

---

## 5. ESTRUCTURA DE DATOS PRINCIPAL (RESUMEN)
La base de datos está diseñada en **PostgreSQL** con 25 tablas interrelacionadas. 

*Para entenderla rápidamente, piensa en estos 3 ejes:*

| **Eje** | **Tablas clave** | **Propósito** |
| :--- | :--- | :--- |
| **Maestros** | `empresa`, `sucursal`, `departamento`, `centro_costos`, `proveedor`, `categoria`, `producto` | Definen la estructura organizacional y el catálogo de productos. |
| **Transacciones de Consumo** | `solicitud_entrega`, `solicitud_entrega_detalle`, `venta`, `venta_detalle` | Registran las peticiones de los empleados. |
| **Control de Inventario** | `movimiento_inventario`, `orden_compra`, `orden_compra_detalle` | Controlan las entradas (compras) y salidas (entregas) físicas. |
| **Post-Venta y Finanzas** | `devolucion`, `descuento_nomina`, `descuento_nomina_detalle` | Controlan devoluciones y los descuentos salariales. |
| **Seguridad** | `usuario`, `rol`, `permiso`, `modulo`, `usuario_rol`, `rol_permiso` | Controlan quién hace qué en el sistema. |

---

## 6. REGLAS DE NEGOCIO CLAVE (IMPORTANTES)

1. **Validación de Cédula:** El empleado SOLO ingresa su cédula para comprar. Si no está en `empleado`, no puede solicitar.
2. **Código de Retiro / Autenticación de Bodega:** El código de retiro generado al realizar la compra tiene el formato `PRE-XXX` (donde `PRE` son las primeras 3 letras del departamento al que pertenece el empleado, ej. `VEN` para Ventas, `TEC` para Tecnología, y `XXX` son tres dígitos aleatorios). El guardia ingresa a un panel de verificación con tres opciones de códigos dinámicos y debe seleccionar el código correcto presentado por el empleado. Al verificar, se muestra instantáneamente la foto y perfil del empleado. No se permite confirmación rápida de entregas desde listados generales; el guardia debe navegar obligatoriamente a la vista de detalles del pedido.
3. **Evidencia Fotográfica Obligatoria:** El guardia de bodega debe capturar y registrar una fotografía física del empleado recibiendo la mercadería para marcar el estado como `entregado` (esta foto se sube y almacena en el servidor).
4. **Stock Negativo Prohibido:** Un empleado no puede solicitar más cantidad de un producto del que existe disponible en `producto_stock`.
5. **Jerarquía de Centro de Costos:** La orden de compra está atada a un `centro_costos` específico para imputar el gasto al área correcta.
6. **Devolución sin Stock y Motivo de Cancelación/Rechazo:** Cuando una devolución es ejecutada, el producto vuelve al stock automáticamente. Para solicitar la cancelación de un pedido en la bandeja del Guardia, o para rechazar una devolución desde la bandeja de Talento Humano (TTHH), el operador debe detallar el motivo mediante un modal emergente integrado en el sistema, habiendo eliminado los prompts/alerts nativos del navegador de todo el flujo post-venta.
7. **Inactividad de Sesión (10 Minutos):** Para usuarios operativos (Admin, TTHH, Bodega/Inventario, Guardia), la sesión se cerrará automáticamente tras 10 minutos de inactividad continuada para mantener la seguridad corporativa.
8. **Auditoría e Inactivación Blanda (Soft Deletes):** Las operaciones de borrado físico están deshabilitadas en las tablas clave. El sistema realiza una inactivación lógica cambiando el estado a `inactivo` y guardando la fecha de desactivación para mantener la integridad referencial y permitir auditorías.
9. **Identificación de Anaquel:** Los productos en los anaqueles están etiquetados en formato `código-nombre` (Ej. `023-yogurt toni`). Esta nomenclatura es visible tanto en el catálogo del empleado como en el despacho del guardia.

---

## 7. STACK TECNOLÓGICO Y ARQUITECTURA EN TIEMPO REAL
- **Base de Datos:** PostgreSQL (BD `test1`).
- **Backend:** Node.js + Express + TypeScript con WebSocket (Socket.io) para sincronización en tiempo real de transacciones, existencias y estados. Al crearse una venta, el servidor emite `entrega-pendiente`. Al confirmarse una entrega, emite `entrega-realizada`. Al solicitarse o aprobarse devoluciones, emite `devolucion-actualizada`. El frontend escucha estos eventos para recargar de forma reactiva e instantánea sus listados sin requerir refrescos manuales.
- **Frontend:** React + TypeScript + Tailwind CSS (Alineación premium, diseño neutro/limpio).
- **CRUD Genérico Dinámico:** Los catálogos principales (Empresa, Sucursal, Departamento, Centro de Costos, Categoría, Proveedor, Producto, Rol, Módulo, Permiso) son administrados mediante un controlador genérico parametrizado en el backend y una interfaz dinámica en el frontend que restringe accesos según rol y valida estructuras.
- **Almacenamiento de Imágenes:** Las fotos de empleados y productos se almacenan de forma local en la carpeta `backend/img/` (organizadas en `/empleados` y `/producto`) y se sirven de forma estática en la ruta `/img`.


---

