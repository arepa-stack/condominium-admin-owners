"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import { billingService } from "@/lib/services/billing.service";
import { paymentsService } from "@/lib/services/payments.service";
import type { Invoice, Payment, UnitBalance } from "@/types/models";
import { formatCurrency, formatDate, formatPeriod } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Receipt,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Clock,
  ExternalLink,
  PlusCircle,
  RefreshCw,
  Home,
  FileText,
  DollarSign,
  Building,
  Calendar,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

export default function InvoicesAndPaymentsPage() {
  const { user, activeUnit } = useAuth();
  const router = useRouter();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [balance, setBalance] = useState<UnitBalance | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filter state for invoices
  const [invoiceFilter, setInvoiceFilter] = useState<"ALL" | "PENDING" | "PAID">("ALL");

  // Invoice detail modal state
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [invoicePayments, setInvoicePayments] = useState<Payment[]>([]);
  const [isLoadingInvoicePayments, setIsLoadingInvoicePayments] = useState(false);

  // Payment detail modal state
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);

  const loadData = useCallback(async () => {
    if (!activeUnit?.unit_id) {
      setIsLoading(false);
      return;
    }

    try {
      const [invoicesData, paymentsData, balanceData] = await Promise.allSettled([
        billingService.getUnitInvoices(activeUnit.unit_id),
        paymentsService.getPayments(activeUnit.unit_id),
        billingService.getUnitBalance(activeUnit.unit_id),
      ]);

      if (invoicesData.status === "fulfilled") {
        setInvoices(invoicesData.value);
      }
      if (paymentsData.status === "fulfilled") {
        setPayments(paymentsData.value);
      }
      if (balanceData.status === "fulfilled") {
        setBalance(balanceData.value);
      }
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("No se pudieron cargar algunos datos del apartamento.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [activeUnit?.unit_id]);

  useEffect(() => {
    setIsLoading(true);
    loadData();
  }, [loadData]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    toast.success("Información actualizada");
  };

  const handleOpenInvoiceDetail = async (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setIsLoadingInvoicePayments(true);
    try {
      const paymentsApplied = await billingService.getInvoicePayments(invoice.id);
      setInvoicePayments(paymentsApplied);
    } catch {
      setInvoicePayments([]);
    } finally {
      setIsLoadingInvoicePayments(false);
    }
  };

  const filteredInvoices = invoices.filter((inv) => {
    if (invoiceFilter === "PENDING") {
      return inv.status !== "PAID" && inv.status !== "CANCELLED";
    }
    if (invoiceFilter === "PAID") {
      return inv.status === "PAID";
    }
    return true;
  });

  const totalDebt = balance?.total_debt ?? (
    invoices
      .filter((i) => i.status !== "PAID" && i.status !== "CANCELLED")
      .reduce((acc, curr) => acc + (curr.remaining ?? (curr.amount - (curr.paid_amount || 0))), 0)
  );

  const pendingCount = invoices.filter(
    (i) => i.status !== "PAID" && i.status !== "CANCELLED"
  ).length;

  return (
    <div className="space-y-6">
      {/* Top Banner: Welcome & Balance Summary */}
      <div className="bg-gradient-to-br from-card to-muted/40 border border-border rounded-2xl p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-border/60">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                Portal de Residente
              </span>
              {activeUnit && (
                <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-xs">
                  <Home className="w-3 h-3 mr-1" />
                  Unidad: {activeUnit.unit_name || activeUnit.unit_id.slice(0, 6)}
                </Badge>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground">
              ¡Hola, {user?.name?.split(" ")[0] || "Residente"}!
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Revisa tus recibos de condominio, reporta pagos y consulta tu historial.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="gap-2 bg-background shadow-xs h-9"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Actualizar</span>
            </Button>

            <Link href="/payments/new">
              <Button size="sm" className="gap-2 shadow-sm font-semibold h-9">
                <PlusCircle className="w-4 h-4" />
                Reportar Pago
              </Button>
            </Link>
          </div>
        </div>

        {/* Financial KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-5">
          {/* Card 1: Total Debt / Solvency */}
          <div className="bg-background rounded-xl p-4 border border-border/80 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Estado de Cuenta</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-bold font-sans text-foreground">
                  ${formatCurrency(totalDebt)}
                </span>
                {totalDebt <= 0 ? (
                  <span className="text-xs font-semibold text-emerald-600 flex items-center">
                    <CheckCircle2 className="w-3.5 h-3.5 mr-0.5 inline" /> Al día
                  </span>
                ) : (
                  <span className="text-xs font-semibold text-amber-600 flex items-center">
                    <AlertCircle className="w-3.5 h-3.5 mr-0.5 inline" /> Pendiente
                  </span>
                )}
              </div>
            </div>
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${
              totalDebt <= 0 ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"
            }`}>
              <DollarSign className="w-5 h-5" />
            </div>
          </div>

          {/* Card 2: Pending Invoices */}
          <div className="bg-background rounded-xl p-4 border border-border/80 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Recibos por Liquidar</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-bold text-foreground">{pendingCount}</span>
                <span className="text-xs text-muted-foreground">
                  {pendingCount === 1 ? "recibo pendiente" : "recibos pendientes"}
                </span>
              </div>
            </div>
            <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Receipt className="w-5 h-5" />
            </div>
          </div>

          {/* Card 3: Payments Reported */}
          <div className="bg-background rounded-xl p-4 border border-border/80 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Pagos Registrados</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-bold text-foreground">{payments.length}</span>
                <span className="text-xs text-muted-foreground">en el historial</span>
              </div>
            </div>
            <div className="w-11 h-11 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Tabs: Invoices vs Payment History */}
      <Tabs defaultValue="invoices" className="w-full space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-2">
          <TabsList className="bg-muted p-1 rounded-xl h-10">
            <TabsTrigger
              value="invoices"
              className="rounded-lg text-xs sm:text-sm font-medium gap-2 data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs"
            >
              <Receipt className="w-4 h-4 text-primary" />
              Recibos de Condominio
              {pendingCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-primary text-primary-foreground">
                  {pendingCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="history"
              className="rounded-lg text-xs sm:text-sm font-medium gap-2 data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs"
            >
              <Clock className="w-4 h-4 text-blue-600" />
              Historial de Pagos
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-muted-foreground/20 text-muted-foreground">
                {payments.length}
              </span>
            </TabsTrigger>
          </TabsList>

          {/* Quick filter for invoices when active */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-muted-foreground mr-1 hidden sm:inline">Filtrar recibos:</span>
            <Button
              variant={invoiceFilter === "ALL" ? "default" : "outline"}
              size="xs"
              onClick={() => setInvoiceFilter("ALL")}
              className="rounded-md"
            >
              Todos
            </Button>
            <Button
              variant={invoiceFilter === "PENDING" ? "default" : "outline"}
              size="xs"
              onClick={() => setInvoiceFilter("PENDING")}
              className="rounded-md"
            >
              Pendientes
            </Button>
            <Button
              variant={invoiceFilter === "PAID" ? "default" : "outline"}
              size="xs"
              onClick={() => setInvoiceFilter("PAID")}
              className="rounded-md"
            >
              Pagados
            </Button>
          </div>
        </div>

        {/* ──────── TAB 1: RECIBOS DE CONDOMINIO ──────── */}
        <TabsContent value="invoices" className="space-y-4 m-0">
          {isLoading ? (
            <div className="py-12 text-center text-muted-foreground text-sm flex flex-col items-center gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-primary" />
              Cargando recibos del apartamento...
            </div>
          ) : filteredInvoices.length === 0 ? (
            <Card className="border-dashed border-2 text-center py-12">
              <CardContent className="space-y-3">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
                  <Receipt className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-lg">No hay recibos para mostrar</h3>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                  {invoiceFilter === "PENDING"
                    ? "¡Excelente! No tienes recibos pendientes de pago."
                    : "No se encontraron recibos de condominio emitidos para este apartamento."}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredInvoices.map((inv) => {
                const isPaid = inv.status === "PAID";
                const isPartial = inv.status === "PARTIAL";
                const remaining = inv.remaining ?? (inv.amount - (inv.paid_amount || 0));

                return (
                  <Card
                    key={inv.id}
                    className="border-border hover:border-primary/40 transition-all card-hover shadow-xs overflow-hidden flex flex-col justify-between"
                  >
                    <CardHeader className="pb-3 bg-muted/20 border-b border-border/50">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-xs font-semibold text-primary uppercase tracking-wide">
                            {formatPeriod(inv.period)}
                          </div>
                          <CardTitle className="text-base font-bold text-foreground mt-0.5">
                            {inv.description || `Condominio ${inv.period}`}
                          </CardTitle>
                          {inv.receipt_number && (
                            <CardDescription className="text-xs">
                              Recibo N° {inv.receipt_number}
                            </CardDescription>
                          )}
                        </div>

                        <div>
                          {isPaid ? (
                            <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Pagado
                            </Badge>
                          ) : isPartial ? (
                            <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30 gap-1">
                              <Clock className="w-3 h-3" /> Abono Parcial
                            </Badge>
                          ) : (
                            <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 gap-1">
                              <AlertCircle className="w-3 h-3" /> Pendiente
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="pt-4 pb-4 space-y-3">
                      <div className="grid grid-cols-3 gap-2 text-center bg-background p-2.5 rounded-lg border border-border/60">
                        <div>
                          <span className="text-[11px] text-muted-foreground block">Monto Total</span>
                          <span className="font-semibold text-sm text-foreground">
                            ${formatCurrency(inv.amount)}
                          </span>
                        </div>
                        <div>
                          <span className="text-[11px] text-muted-foreground block">Abonado</span>
                          <span className="font-semibold text-sm text-emerald-600">
                            ${formatCurrency(inv.paid_amount || 0)}
                          </span>
                        </div>
                        <div>
                          <span className="text-[11px] text-muted-foreground block">Restante</span>
                          <span className={`font-semibold text-sm ${remaining > 0 ? "text-amber-600 font-bold" : "text-foreground"}`}>
                            ${formatCurrency(remaining)}
                          </span>
                        </div>
                      </div>

                      {inv.due_date && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>Vence: {formatDate(inv.due_date)}</span>
                        </div>
                      )}
                    </CardContent>

                    <div className="px-6 pb-4 pt-1 flex items-center justify-between gap-2 border-t border-border/40">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenInvoiceDetail(inv)}
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        <FileText className="w-3.5 h-3.5 mr-1.5" />
                        Ver Detalle
                      </Button>

                      {!isPaid && (
                        <Link href={`/payments/new?invoice_id=${inv.id}&amount=${remaining}`}>
                          <Button size="sm" className="text-xs gap-1.5 h-8">
                            <PlusCircle className="w-3.5 h-3.5" />
                            Pagar Ahora
                          </Button>
                        </Link>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ──────── TAB 2: HISTORIAL DE PAGOS REPORTADOS ──────── */}
        <TabsContent value="history" className="space-y-4 m-0">
          {isLoading ? (
            <div className="py-12 text-center text-muted-foreground text-sm flex flex-col items-center gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-primary" />
              Cargando historial de pagos...
            </div>
          ) : payments.length === 0 ? (
            <Card className="border-dashed border-2 text-center py-12">
              <CardContent className="space-y-3">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
                  <CreditCard className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-lg">No hay pagos registrados aún</h3>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                  Cuando reportes un pago mediante transferencia, pago móvil o efectivo, aparecerá en esta lista con su estado de validación.
                </p>
                <Link href="/payments/new" className="inline-block pt-2">
                  <Button size="sm">
                    <PlusCircle className="w-4 h-4 mr-2" />
                    Cargar mi primer pago
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {payments.map((p) => {
                const isApproved = p.status === "APPROVED";
                const isRejected = p.status === "REJECTED";

                const methodLabel =
                  p.method === "PAGO_MOVIL"
                    ? "Pago Móvil"
                    : p.method === "TRANSFER"
                    ? "Transferencia"
                    : "Efectivo / Zelle";

                return (
                  <Card
                    key={p.id}
                    className="border-border hover:border-primary/30 transition-all card-hover shadow-xs"
                  >
                    <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-start gap-3.5">
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                          isApproved
                            ? "bg-emerald-500/10 text-emerald-600"
                            : isRejected
                            ? "bg-destructive/10 text-destructive"
                            : "bg-amber-500/10 text-amber-600"
                        }`}>
                          <CreditCard className="w-5 h-5" />
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-base text-foreground">
                              ${formatCurrency(p.amount)} {p.currency && p.currency !== "USD" ? `(${p.currency})` : ""}
                            </span>
                            <Badge variant="outline" className="text-xs bg-muted/50">
                              {methodLabel}
                            </Badge>
                          </div>

                          <div className="text-xs text-muted-foreground flex items-center gap-3 flex-wrap">
                            <span>Fecha: {formatDate(p.payment_date)}</span>
                            {p.bank && <span>Banco: {p.bank}</span>}
                            {p.reference && <span>Ref: #{p.reference}</span>}
                          </div>

                          {p.notes && (
                            <p className="text-xs text-foreground/80 italic line-clamp-1">
                              &ldquo;{p.notes}&rdquo;
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/50">
                        <div>
                          {isApproved ? (
                            <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Aprobado
                            </Badge>
                          ) : isRejected ? (
                            <Badge className="bg-destructive/15 text-destructive border-destructive/30 gap-1">
                              <XCircle className="w-3 h-3" /> Rechazado
                            </Badge>
                          ) : (
                            <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 gap-1">
                              <Clock className="w-3 h-3" /> En Revisión
                            </Badge>
                          )}
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedPayment(p)}
                          className="h-8 text-xs gap-1"
                        >
                          Ver Detalle
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ──────── MODAL: DETALLE DE RECIBO ──────── */}
      <Dialog open={!!selectedInvoice} onOpenChange={(open) => !open && setSelectedInvoice(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-primary" />
              Detalle del Recibo
            </DialogTitle>
            <DialogDescription>
              {selectedInvoice ? formatPeriod(selectedInvoice.period) : ""}
            </DialogDescription>
          </DialogHeader>

          {selectedInvoice && (
            <div className="space-y-4 pt-2">
              <div className="bg-muted/40 p-4 rounded-xl border border-border/60 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Concepto:</span>
                  <span className="font-medium text-foreground">{selectedInvoice.description || "Cuota de Condominio"}</span>
                </div>
                {selectedInvoice.receipt_number && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">N° Recibo:</span>
                    <span className="font-mono text-foreground">{selectedInvoice.receipt_number}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Facturado:</span>
                  <span className="font-bold text-foreground">${formatCurrency(selectedInvoice.amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Monto Pagado:</span>
                  <span className="font-medium text-emerald-600">${formatCurrency(selectedInvoice.paid_amount || 0)}</span>
                </div>
                <div className="flex justify-between border-t border-border/80 pt-2 font-bold">
                  <span>Saldo Pendiente:</span>
                  <span className="text-primary">
                    ${formatCurrency(selectedInvoice.remaining ?? (selectedInvoice.amount - (selectedInvoice.paid_amount || 0)))}
                  </span>
                </div>
              </div>

              {/* Payments applied to this invoice */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                  Pagos Aplicados a este Recibo
                </h4>

                {isLoadingInvoicePayments ? (
                  <p className="text-xs text-muted-foreground py-2">Consultando pagos aplicados...</p>
                ) : invoicePayments.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-1 italic">
                    No se han registrado pagos aprobados para este recibo.
                  </p>
                ) : (
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {invoicePayments.map((p) => (
                      <div
                        key={p.id}
                        className="text-xs bg-card p-2.5 rounded-lg border border-border flex items-center justify-between"
                      >
                        <div>
                          <span className="font-semibold block">${formatCurrency(p.amount)}</span>
                          <span className="text-muted-foreground text-[11px]">
                            {formatDate(p.payment_date)} • {p.method} {p.reference ? `#${p.reference}` : ""}
                          </span>
                        </div>
                        <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                          {p.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {selectedInvoice.status !== "PAID" && (
                <div className="pt-2">
                  <Link
                    href={`/payments/new?invoice_id=${selectedInvoice.id}&amount=${
                      selectedInvoice.remaining ?? (selectedInvoice.amount - (selectedInvoice.paid_amount || 0))
                    }`}
                    className="w-full block"
                  >
                    <Button className="w-full">
                      <PlusCircle className="w-4 h-4 mr-2" />
                      Pagar este Recibo Ahora
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ──────── MODAL: DETALLE DE PAGO REPORTADO ──────── */}
      <Dialog open={!!selectedPayment} onOpenChange={(open) => !open && setSelectedPayment(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary" />
              Detalle del Pago Reportado
            </DialogTitle>
            <DialogDescription>
              {selectedPayment ? formatDate(selectedPayment.payment_date) : ""}
            </DialogDescription>
          </DialogHeader>

          {selectedPayment && (
            <div className="space-y-4 pt-2">
              <div className="bg-muted/40 p-4 rounded-xl border border-border/60 space-y-2.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Monto:</span>
                  <span className="font-bold text-lg text-foreground">
                    ${formatCurrency(selectedPayment.amount)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Método:</span>
                  <span className="font-medium">{selectedPayment.method}</span>
                </div>
                {selectedPayment.bank && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Banco:</span>
                    <span className="font-medium">{selectedPayment.bank}</span>
                  </div>
                )}
                {selectedPayment.reference && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Referencia:</span>
                    <span className="font-mono">{selectedPayment.reference}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Estado:</span>
                  <Badge variant="outline" className="font-semibold">
                    {selectedPayment.status}
                  </Badge>
                </div>
                {selectedPayment.notes && (
                  <div className="border-t border-border/60 pt-2">
                    <span className="text-muted-foreground block text-xs mb-1">Notas del residente:</span>
                    <p className="text-xs text-foreground/90 italic bg-background p-2 rounded border border-border/50">
                      {selectedPayment.notes}
                    </p>
                  </div>
                )}
              </div>

              {/* Comprobante / Proof image */}
              {selectedPayment.proof_url && (
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                    Comprobante Adjunto
                  </span>
                  <div className="relative rounded-xl border border-border overflow-hidden bg-black/5 aspect-video flex items-center justify-center">
                    <img
                      src={selectedPayment.proof_url}
                      alt="Comprobante de pago"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <a
                    href={selectedPayment.proof_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline font-medium"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Abrir comprobante en tamaño completo
                  </a>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
