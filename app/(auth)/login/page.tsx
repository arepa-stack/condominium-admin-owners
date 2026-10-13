"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Mail, Lock, Loader2, Eye, EyeOff, ShieldCheck, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const { login, user } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user) {
      router.push("/invoices");
    }
  }, [user, router]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("expired") === "true") {
        toast.error("Tu sesión ha expirado. Por favor inicia sesión nuevamente.");
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      toast.error("Por favor completa tu correo y contraseña.");
      return;
    }

    setIsLoading(true);
    try {
      await login(email.trim(), password);
      toast.success("¡Bienvenido al portal de residentes!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al iniciar sesión");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Warm ambient glow — terracotta architectural light */}
      <div className="absolute top-[-200px] left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-primary/10 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-100px] right-[-100px] w-[400px] h-[400px] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="w-full max-w-md relative z-10 animate-threshold">
        {/* Brand header */}
        <div className="flex flex-col items-center mb-6 text-center">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 mb-3 shadow-sm">
            <Building2 className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-3xl font-display font-bold text-foreground tracking-tight">
            Apto
          </h1>
          <p className="text-sm font-medium text-primary mt-0.5">Portal Web de Residentes</p>
        </div>

        <Card className="border-border shadow-lg bg-card/90 backdrop-blur-sm">
          <CardHeader className="space-y-1 pb-4 text-center">
            <CardTitle className="text-xl font-bold">Iniciar Sesión</CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              Ingresa con las mismas credenciales que usas en tu teléfono
            </CardDescription>
          </CardHeader>

          <CardContent>
            {/* Notification banner about mobile app credentials */}
            <div className="mb-5 flex items-start gap-2.5 rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs text-foreground/80">
              <Smartphone className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <span>
                <strong>Misma cuenta de la app:</strong> Si ya tienes usuario en la aplicación móvil, tus datos de acceso son exactamente los mismos aquí.
              </span>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Correo Electrónico</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="ejemplo@correo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    className="pl-9 bg-background/50 h-11"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className="pl-9 pr-10 bg-background/50 h-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-auto h-11 text-base font-semibold shadow-md mt-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Validando acceso...
                  </>
                ) : (
                  "Entrar a mi Cuenta"
                )}
              </Button>
            </form>

            <div className="mt-6 pt-4 border-t border-border/60 text-center space-y-3">
              <div className="text-xs text-muted-foreground">
                ¿Aún no tienes cuenta registrada?{" "}
                <Link href="/register" className="font-semibold text-primary hover:underline">
                  Regístrate aquí
                </Link>
              </div>

              <p className="text-[11px] text-muted-foreground flex items-center justify-center gap-1.5 pt-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                Acceso seguro y cifrado para residentes y propietarios
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
