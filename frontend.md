# 📊 Dashboard UI/UX Specification (LLM Design Input)

## 🧭 General Layout

- Aplicación tipo **dashboard corporativo**.
- Usuarios:
  - **Admin / PM** → acceden al dashboard (landing principal).
  - **Developer** → redirigidos directamente al tab de **Issues**.
- Layout:
  - **Sidebar lateral fijo** (izquierda):
    - Contiene navegación entre tabs
    - Incluye iconos para acceso rápido
    - Incluye botón de **logout**
  - **Main content area**:
    - Renderiza dinámicamente el contenido del tab seleccionado
- Estilo:
  - **Formal / corporativo**
  - Diseño limpio, estructurado y profesional

---

## 📁 Tabs del Dashboard

### 1. 📦 Proyectos

#### 📌 Vista
- Lista de proyectos en formato **cards**
- Cada card contiene:
  - Título
  - Descripción (máximo 150 caracteres, truncar con `...`)
  - Tipo (libre)
  - Estado
  - Responsable

#### 🔎 Filtros
- Estado
- Responsable
- Nombre
- Descripción
- Tipo

#### ⚡ Acciones Masivas (Mass Actions)
- Cambiar estado
- Eliminar proyectos
- Reglas:
  - Selección múltiple
  - Requiere **confirmación obligatoria** antes de ejecutar

---

#### 🔍 Detalle de Proyecto

- Al abrir un proyecto se debe mostrar:
  - Toda la información del proyecto
  - Lista de **módulos** asociados al proyecto

#### 📦 Módulos
- Mostrar todos los módulos existentes del proyecto
- Si no existen módulos:
  - Mostrar opción clara para **crear módulos nuevos**
- Permitir:
  - Crear módulos
  - Visualizar módulos

---

#### ✏️ Edición de Proyecto

- Permitir:
  - Editar información general
  - Crear y gestionar **labels**
- Labels:
  - Se pueden asignar posteriormente a issues

---

### 2. 🐞 Issues

#### 📌 Vista
- Lista de todos los issues

#### 🔐 Permisos
- **Admin / PM**:
  - Pueden ver todos los issues
- **Developer**:
  - Solo puede ver issues asignados a él

#### 🔎 Filtros
- Por proyecto

---

#### 🔍 Detalle de Issue

- Mostrar:
  - Información completa del issue
  - Módulos asociados

#### 📦 Módulos en Issues
- Mostrar todos los módulos relacionados al issue
- Permitir visualizar su relación con el proyecto

---

#### 🔗 Relación entre Issues

- Permitir:
  - Vincular un issue con otro
  - Vincular múltiples issues entre sí
- Tipo de relación:
  - No restringido (flexible)

---

### 3. 💰 Subasta

#### 📌 Vista
- Lista de issues:
  - En subasta
  - No completados

#### 🎯 Funcionalidad
- Usuarios pueden:
  - Realizar ofertas (bids)

#### ⚙️ Reglas de negocio
- Sistema en **tiempo real**
- Restricción:
  - La nueva oferta **no puede ser menor que la oferta más alta actual**

#### 🔐 Permisos
- **Admin / PM**:
  - Pueden cerrar subastas

---

### 4. 🎰 Ruleta

#### 📌 Vista
- Ruleta tipo casino (visual e interactiva)

#### 🎯 Funcionalidad
- Usuario puede:
  - Seleccionar opción de apuesta
  - Definir cantidad
- Sistema:
  - Registra apuestas
  - Aplica lógica real (probabilidades y resultados)

---

### 5. 🤖 Agente (Admin / PM only)

#### 📌 Vista
- Interfaz tipo chat

#### 🎯 Funcionalidad
- Conversación con un **LLM**
- Uso orientado a productividad (consultas, soporte, etc.)

---

### 6. 👤 Perfil

#### 📌 Vista
- Información del usuario:
  - Nombre
  - Email
  - Rol
  - Otros datos relevantes

---

### 7. 👥 Usuarios (Admin only)

#### 📌 Vista
- Gestión de usuarios

#### 🎯 Funcionalidad
- Crear usuarios
- Asignar roles:
  - Admin
  - PM
  - Developer

---

## 🎨 Diseño Visual

### 🎯 Paleta de colores
- Color principal:
  - Rojo → RGB `(208, 52, 62)`
- Uso:
  - Botones
  - Contornos
  - Sidebar

### 🌗 Modos
- **Light Mode**
  - Fondo claro
- **Dark Mode**
  - Fondo negro o gris oscuro

### 🧩 Estilo
- Corporativo
- Formal
- Uso de **iconos en navegación**
- Componentes consistentes (cards, tablas, botones)

---

## 🧠 UX/UI Guidelines

- Navegación clara y predecible
- Feedback visual en:
  - Hover
  - Click
  - Loading
- Confirmaciones obligatorias:
  - Acciones destructivas
- Diseño basado en:
  - Cards
  - Listas estructuradas
- Jerarquía visual clara
- Accesibilidad básica (contraste, legibilidad)

---

## ⚙️ Reglas de Sistema

- Roles:
  - Admin
  - PM
  - Developer
- Permisos:
  - **PM tiene los mismos permisos que Admin**, excepto donde se indique lo contrario
- Acceso:
  - Dashboard → solo Admin / PM
  - Issues → todos (con restricciones por rol)

---

## 💻 Plataforma

- Prioridad:
  - **Desktop**
- Ideal:
  - Compatible con **responsive (tablet opcional)**

---

## 📌 Notas adicionales

- Tipos de proyecto: **libres / dinámicos**
- Sistema de subastas:
  - En tiempo real
  - Basado en la mejor oferta actual
- Ruleta:
  - Implementación con lógica real (no solo visual)

---