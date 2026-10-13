export const API_BASE_URL =
  process.env.NEXT_PUBLIC_ENVIOREMENT === "DEV"
    ? "http://localhost:3000"
    : process.env.NEXT_PUBLIC_API_URL || "https://condominium-api.nibs-tech.com";

export const APP_NAME = "Apto Residentes";

export const APP_API_PREFIX = "/api/v1/app";

export const PAYMENT_METHODS = [
  { value: "PAGO_MOVIL", label: "Pago Móvil" },
  { value: "TRANSFER", label: "Transferencia Bancaria" },
  { value: "CASH", label: "Efectivo / Zelle" },
] as const;

export const INVOICE_STATUSES = {
  PENDING: { label: "Pendiente", variant: "warning" },
  PARTIAL: { label: "Abonado Parcial", variant: "info" },
  PAID: { label: "Pagado", variant: "success" },
  CANCELLED: { label: "Cancelado", variant: "secondary" },
} as const;

export const PAYMENT_STATUSES = {
  PENDING: { label: "En Revisión", variant: "warning" },
  APPROVED: { label: "Aprobado", variant: "success" },
  REJECTED: { label: "Rechazado", variant: "destructive" },
} as const;
