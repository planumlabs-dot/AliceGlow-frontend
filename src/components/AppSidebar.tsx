import { useEffect, useState } from "react";
import { LayoutDashboard, Package, ShoppingCart, Users, LogOut, DollarSign, TrendingUp, ChevronRight, BarChart3, Wallet, ReceiptText } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";

const navItems: { title: string; url: string; icon: any }[] = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Produtos", url: "/products", icon: Package },
  { title: "Faturamento", url: "/revenue", icon: DollarSign },
  { title: "Lucro", url: "/profit", icon: TrendingUp },
  { title: "Caixa do Dia", url: "/cash-box", icon: Wallet },
];

const adminItems = [
  { title: "Usuários", url: "/users", icon: Users },
  { title: "Top Produtos", url: "/reports/top-products", icon: BarChart3 },
  { title: "Saídas", url: "/reports/cash-outflows", icon: ReceiptText },
  { title: "Compras", url: "/stock-purchases", icon: ReceiptText },
];

export function AppSidebar() {
  const { isAdmin, logout, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [salesOpen, setSalesOpen] = useState(() => location.pathname.startsWith("/sales"));

  // Mantém o submenu aberto quando estiver em /sales/*
  // (evita o usuário navegar para pendentes/pagas e o menu fechar)
  useEffect(() => {
    if (location.pathname.startsWith("/sales")) setSalesOpen(true);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <Sidebar className="border-r-0">
      <div className="p-5 border-b border-sidebar-border">
        <h2 className="text-lg font-display font-bold text-sidebar-foreground">AliceGlowStore</h2>
        <p className="text-xs text-sidebar-muted mt-0.5">{user?.email}</p>
      </div>
      <SidebarContent className="py-4">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}

              <Collapsible open={salesOpen} onOpenChange={setSalesOpen}>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to="/sales"
                      className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                      onClick={() => setSalesOpen((v) => !v)}
                    >
                      <ShoppingCart className="w-4 h-4" />
                      <span className="flex-1">Vendas</span>
                      <ChevronRight
                        className={cn(
                          "w-4 h-4 text-sidebar-foreground/60 transition-transform",
                          salesOpen && "rotate-90",
                        )}
                      />
                    </NavLink>
                  </SidebarMenuButton>

                  <CollapsibleContent>
                    <SidebarMenuSub>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton asChild>
                          <NavLink
                            to="/sales/pending"
                            className="flex items-center gap-2"
                            activeClassName="bg-sidebar-accent text-sidebar-accent-foreground"
                          >
                            <span>Vendas Pendentes</span>
                          </NavLink>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>

                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton asChild>
                          <NavLink
                            to="/sales/paid"
                            className="flex items-center gap-2"
                            activeClassName="bg-sidebar-accent text-sidebar-accent-foreground"
                          >
                            <span>Vendas Pagas</span>
                          </NavLink>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>

              {isAdmin && adminItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <div className="mt-auto p-4 border-t border-sidebar-border">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors w-full text-sm"
        >
          <LogOut className="w-4 h-4" />
          <span>Sair</span>
        </button>
      </div>
    </Sidebar>
  );
}
