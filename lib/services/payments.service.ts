import { apiClient } from "@/lib/api/client";
import { APP_API_PREFIX } from "@/lib/utils/constants";
import type { Payment, CreatePaymentRequest } from "@/types/models";

export const paymentsService = {
  /**
   * Obtiene el historial de pagos del residente
   */
  async getPayments(unitId?: string, year?: number): Promise<Payment[]> {
    const params: Record<string, string> = {};
    if (unitId) params.unit_id = unitId;
    if (year) params.year = year.toString();

    const { data } = await apiClient.get<Payment[]>(`${APP_API_PREFIX}/payments`, {
      params,
    });
    return data;
  },

  /**
   * Obtiene el resumen de solvencia y últimos pagos
   */
  async getPaymentSummary(): Promise<any> {
    const { data } = await apiClient.get(`${APP_API_PREFIX}/payments/summary`);
    return data;
  },

  /**
   * Obtiene el detalle de un pago
   */
  async getPaymentDetail(paymentId: string): Promise<Payment> {
    const { data } = await apiClient.get<Payment>(`${APP_API_PREFIX}/payments/${paymentId}`);
    return data;
  },

  /**
   * Reporta un nuevo pago (soporta multipart/form-data para comprobante o JSON)
   */
  async reportPayment(payload: CreatePaymentRequest): Promise<Payment> {
    const formData = new FormData();

    formData.append("amount", payload.amount.toString());
    formData.append("unit_id", payload.unit_id);
    formData.append("method", payload.method);
    formData.append("date", payload.date);

    if (payload.building_id) {
      formData.append("building_id", payload.building_id);
    }
    if (payload.reference) {
      formData.append("reference", payload.reference);
    }
    if (payload.bank) {
      formData.append("bank", payload.bank);
    }
    if (payload.notes) {
      formData.append("notes", payload.notes);
    }
    if (payload.allocations && payload.allocations.length > 0) {
      formData.append("allocations", JSON.stringify(payload.allocations));
    }
    if (payload.proof_image) {
      formData.append("proof_image", payload.proof_image, payload.proof_image.name);
    }

    const { data } = await apiClient.post<Payment>(`${APP_API_PREFIX}/payments`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return data;
  },
};
