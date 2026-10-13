"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  Building2,
  Receipt,
  PlusCircle,
  LogOut,
  Home,
  User as UserIcon,
  ChevronDown,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Navbar() {
  const pathname = usePathname();
  const { user, activeUnit, setActiveUnit, logout } = useAuth();

  const navItems = [
    {
      label: "Recibos y Pagos",
      href: "/invoices",
      icon: Receipt,
      active: pathname.startsWith("/invoices"),
    },
    {
      label: "Cargar Pago",
      href: "/payments/new",
      icon: PlusCircle,
      active: pathname === "/payments/new",
    },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-card/95 backdrop-blur-md shadow-xs">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-6">
          <Link href="/invoices" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center transition-colors group-hover:bg-primary/20">
              <Building2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <span className="font-display font-bold text-xl text-foreground tracking-tight leading-none block">
                Apto
              </span>
              <span className="text-[11px] font-semibold text-primary uppercase tracking-wider block">
                Residentes
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                    item.active
                      ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right Controls: Unit Selector & User Menu */}
        <div className="flex items-center gap-3">
          {/* Unit selector (if multiple or display single) */}
          {user?.units && user.units.length > 0 && (
            <div className="hidden sm:block">
              {user.units.length > 1 ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2 bg-background border-border">
                      <Home className="w-3.5 h-3.5 text-primary" />
                      <span className="text-xs font-medium">
                        Unidad: {activeUnit?.unit_name || activeUnit?.unit_id.slice(0, 6)}
                      </span>
                      <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Selecciona tu apartamento</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {user.units.map((unit) => (
                      <DropdownMenuItem
                        key={unit.unit_id}
                        onClick={() => setActiveUnit(unit)}
                        className={activeUnit?.unit_id === unit.unit_id ? "bg-muted font-bold text-primary" : ""}
                      >
                        {unit.unit_name || `Apto ${unit.unit_id.slice(0, 6)}`}
                        {unit.is_primary && " (Principal)"}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-xs font-semibold text-primary">
                  <Home className="w-3.5 h-3.5" />
                  <span>Unidad {activeUnit?.unit_name || activeUnit?.unit_id.slice(0, 6)}</span>
                </div>
              )}
            </div>
          )}

          {/* User profile dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="gap-2 rounded-full pl-2 pr-3 py-1 bg-muted/60 hover:bg-muted"
              >
                <div className="w-7 h-7 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs">
                  {user?.name ? user.name.charAt(0).toUpperCase() : <UserIcon className="w-3.5 h-3.5" />}
                </div>
                <span className="text-xs font-medium max-w-[120px] truncate text-foreground hidden sm:inline">
                  {user?.name || user?.email || "Mi Cuenta"}
                </span>
                <ChevronDown className="w-3 h-3 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="font-semibold text-sm truncate">{user?.name || "Residente"}</div>
                <div className="text-xs text-muted-foreground truncate font-normal">{user?.email}</div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={logout}
                className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Cerrar Sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
