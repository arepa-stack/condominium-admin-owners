import { apiClient } from "@/lib/api/client";
import { APP_API_PREFIX } from "@/lib/utils/constants";
import type { Invoice, UnitBalance, Payment } from "@/types/models";

export const billingService = {
  /**
   * Obtiene la lista de recibos / facturas de un apartamento (unit)
   */
  async getUnitInvoices(unitId: string, status?: string): Promise<Invoice[]> {
    const params: Record<string, string> = {};
    if (status) params.status = status;

    const { data } = await apiClient.get<Invoice[]>(
      `${APP_API_PREFIX}/billing/units/${unitId}/invoices`,
      { params }
    );
    return data;
  },

  /**
   * Obtiene el balance total, deuda y desglose de un apartamento
   */
  async getUnitBalance(unitId: string): Promise<UnitBalance> {
    const { data } = await apiClient.get<UnitBalance>(
      `${APP_API_PREFIX}/billing/units/${unitId}/balance`
    );
    return data;
  },

  /**
   * Obtiene los detalles de una factura específica
   */
  async getInvoiceDetail(invoiceId: string): Promise<Invoice> {
    const { data } = await apiClient.get<Invoice>(
      `${APP_API_PREFIX}/billing/invoices/${invoiceId}`
    );
    return data;
  },

  /**
   * Lista los pagos aplicados a una factura
   */
  async getInvoicePayments(invoiceId: string): Promise<Payment[]> {
    const { data } = await apiClient.get<Payment[]>(
      `${APP_API_PREFIX}/billing/invoices/${invoiceId}/payments`
    );
    return data;
  },
};
