import {
  BarChart3,
  LayoutDashboard,
  Package,
  FileText,
  Warehouse,
  Users,
  History,
  Settings,
  LogOut,
  ArrowLeftRight,
  BookOpen,
  ShoppingCart,
} from "lucide-react";
import honeydewLogo from "@/assets/honeydew-bbi-logo.png";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/hooks/useAuth";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

export function AppSidebar() {
  const { profile, role, signOut, isAdmin, isExecutive, isWarehouse } = useAuth();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  const mainNav = [
    { title: "Dashboard", url: "/", icon: LayoutDashboard, show: isExecutive },
    { title: "Analytics", url: "/analytics", icon: BarChart3, show: isExecutive },
    { title: "Financial Reports", url: "/financial-reports", icon: FileText, show: isExecutive },
    { title: "Customers", url: "/customers", icon: Users, show: isExecutive },
    { title: "Orders", url: "/orders", icon: ShoppingCart, show: isExecutive },
  ].filter((i) => i.show);

  const inventoryNav = [
    { title: "Warehouse", url: "/warehouse", icon: Warehouse, show: isWarehouse },
    { title: "Products", url: "/products", icon: Package, show: isAdmin || isWarehouse },
    { title: "Advanced Inventory", url: "/advanced-inventory", icon: ArrowLeftRight, show: isWarehouse },
    { title: "Inventory History", url: "/inventory-history", icon: History, show: isAdmin || isWarehouse || isExecutive },
  ].filter((i) => i.show);

  const adminNav = [
    { title: "User Management", url: "/users", icon: Users, show: isAdmin },
    { title: "Settings", url: "/settings", icon: Settings, show: isAdmin },
    { title: "Admin Guide", url: "/admin-guide", icon: BookOpen, show: isAdmin },
    { title: "Warehouse Guide", url: "/warehouse-guide", icon: BookOpen, show: isWarehouse },
  ].filter((i) => i.show);

  const renderGroup = (label: string, items: typeof mainNav) =>
    items.length > 0 ? (
      <SidebarGroup key={label}>
        <SidebarGroupLabel>{label}</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {items.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton asChild>
                  <NavLink to={item.url} end={item.url === "/"} className="hover:bg-sidebar-accent/50" activeClassName="bg-sidebar-accent text-sidebar-primary-foreground font-medium">
                    <item.icon className="h-4 w-4" />
                    {!collapsed && <span>{item.title}</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    ) : null;

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <img src={honeydewLogo} alt="Honeydew BBI" className="w-8 h-8 rounded-lg" />
          {!collapsed && (
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-bold text-sidebar-foreground">Honeydew BBI</span>
              <span className="text-[10px] text-sidebar-foreground/50">Bird's Eye Intelligence</span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        {renderGroup("Overview", mainNav)}
        {renderGroup("Inventory", inventoryNav)}
        {renderGroup("Administration", adminNav)}
      </SidebarContent>

      <SidebarFooter className="p-4">
        {!collapsed && profile && (
          <div className="mb-3 px-2">
            <p className="text-sm font-medium text-sidebar-foreground truncate">{profile.full_name || profile.email}</p>
            <p className="text-xs text-sidebar-foreground/60 capitalize">{role || "No role"}</p>
          </div>
        )}
        <Button variant="ghost" size={collapsed ? "icon" : "default"} onClick={signOut} className="w-full text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent">
          <LogOut className="h-4 w-4" />
          {!collapsed && <span className="ml-2">Sign out</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
