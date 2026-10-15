# Política de Privacidad de SnapPDF

**Última actualización:** 15 de octubre de 2026

SnapPDF es una extensión de navegador diseñada para la captura de pantalla de páginas web completas o recuadros seleccionados y la generación de documentos PDF y PNG de alta resolución.

La privacidad y seguridad de los usuarios es nuestra máxima prioridad. Esta política detalla el tratamiento de la información al utilizar la extensión.

---

### 1. Tratamiento y Recopilación de Datos

* **Sin recolección de datos personales:** SnapPDF **no recopila, no rastrea, no almacena ni transmite ningún dato de identificación personal**, historial de navegación, contraseñas ni contenido de las páginas web que visitas.
* **Procesamiento 100% Local (On-Device):** Toda la captura, recorte, análisis visual, soporte de enlaces y conversión a PDF o PNG se procesa de manera exclusiva en tu propio dispositivo (directamente dentro del motor de JavaScript de tu navegador).
* **Sin servidores externos:** Ninguna imagen, texto o fragmento capturado se envía a servidores de SnapPDF ni de terceros.

---

### 2. Justificación de los Permisos del Navegador

Para funcionar correctamente, SnapPDF solicita los siguientes permisos estrictamente necesarios:

* **`activeTab` y `scripting`:** Permiten inyectar la herramienta interactiva de selección de área y calcular las dimensiones del scroll en la pestaña activa cuando el usuario solicita una captura.
* **`storage` y `unlimitedStorage`:** Utilizado temporalmente en la memoria local de tu navegador (`chrome.storage.local`) para transferir los fragmentos de imagen capturados desde la página web hacia la pestaña de previsualización interna (`preview.html`). Los datos se sobrescriben o limpian según el uso del usuario.
* **`clipboardWrite`:** Permite que al hacer clic en el botón "Copiar Imagen" o "Copiar Enlaces", el resultado se transfiera al portapapeles del sistema operativo bajo tu consentimiento explícito.
* **`host_permissions` (`<all_urls>`):** Requerido únicamente para permitir que la herramienta de captura funcione en cualquier página web estándar que el usuario decida capturar. No recopila datos en segundo plano mientras no esté en uso.

---

### 3. Servicios de Terceros y Publicidad

* SnapPDF **no incluye publicidad**, **no incluye cookies de rastreo**, **ni utiliza herramientas de análisis de terceros (como Google Analytics)**.
* No vendemos, no transferimos ni licenciamos ningún tipo de información de usuario o datos de navegación.

---

### 4. Contacto

Si tienes cualquier duda o consulta sobre esta política de privacidad, puedes contactar al desarrollador a través del repositorio oficial de soporte o el formulario de contacto en la Chrome Web Store.
