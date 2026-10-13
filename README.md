# Apto - Portal Web de Residentes (`condominium-user`)

Portal web oficial para residentes y propietarios de condominios de **Apto**, diseñado como alternativa accesible para usuarios en cualquier navegador de escritorio y dispositivos móviles (iOS / Android).

## 🚀 Características Principales

1. **Autenticación Unificada (Mismo Login que la APK)**:
   - Los residentes inician sesión con las mismas credenciales (correo y contraseña) que utilizan en la app móvil.
   - Manejo de JWT con refresco automático de tokens.
   - Soporte para residentes con una o múltiples unidades/apartamentos.

2. **Consulta de Recibos de Condominio**:
   - Listado de recibos por periodo (Enero, Febrero, etc.).
   - Estado de solvencia e indicadores en tiempo real: Pagado, Pendiente, Abono Parcial.
   - Detalle desglosado de cada recibo con los pagos aprobados aplicados.
   - Acceso con un solo clic a pagar recibos pendientes.

3. **Historial de Pagos Reportados**:
   - Lista cronológica de todos los pagos reportados por el residente.
   - Estados: *Aprobado*, *En Revisión*, *Rechazado*.
   - Detalle del pago con método, banco, referencia y visualización del comprobante adjunto.

4. **Carga y Reporte de Pagos**:
   - Selección y asociación de recibos pendientes a liquidar o abono general.
   - Métodos soportados: **Pago Móvil**, **Transferencia Bancaria** y **Efectivo / Zelle**.
   - Campos contextuales según método (Banco, Número de referencia, Teléfono).
   - Subida y vista previa de comprobantes / capture bancario (imágenes y PDF).
   - Envío a través del endpoint `/api/v1/app/payments`.

5. **Diseño y Experiencia de Usuario (UI/UX)**:
   - Sigue el mismo design system de `condominium-admin` (*Warm Architecture Palette*).
   - Navegación móvil optimizada (Mobile Bottom Nav) con diseño responsive para usuarios de iPhone y navegadores móviles.

## 🛠️ Tecnologías

- **Framework**: Next.js 16 (App Router)
- **Lenguaje**: TypeScript
- **Estilos**: Tailwind CSS v4
- **Componentes**: Radix UI + Lucide Icons + Sonner (Notificaciones toast)
- **Cliente HTTP**: Axios con interceptores de autenticación y refresh token

## 📦 Configuración y Ejecución

### Variables de entorno (`.env`)
```bash
NEXT_PUBLIC_API_URL=https://condominium-api.nibs-tech.com
NEXT_PUBLIC_ENVIOREMENT=DEV # O PROD para producción
```

### Comandos
```bash
# Instalar dependencias
npm install

# Modo desarrollo
npm run dev

# Compilar para producción
npm run build

# Iniciar servidor de producción
npm start
```
