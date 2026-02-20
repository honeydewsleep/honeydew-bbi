import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import AppLayout from "@/components/AppLayout";
import Auth from "@/pages/Auth";
import Dashboard from "@/pages/Dashboard";
import ProductManagement from "@/pages/ProductManagement";
import WarehouseInventory from "@/pages/WarehouseInventory";
import FinancialReports from "@/pages/FinancialReports";
import CustomerManagement from "@/pages/CustomerManagement";
import AdvancedAnalytics from "@/pages/AdvancedAnalytics";
import AdvancedInventory from "@/pages/AdvancedInventory";
import InventoryHistory from "@/pages/InventoryHistory";
import UserManagement from "@/pages/UserManagement";
import SettingsPage from "@/pages/SettingsPage";
import AdminGuide from "@/pages/AdminGuide";
import WarehouseGuide from "@/pages/WarehouseGuide";
import OrdersPage from "@/pages/OrdersPage";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

function AuthenticatedApp() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <Auth />;

  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/products" element={<ProductManagement />} />
        <Route path="/warehouse" element={<WarehouseInventory />} />
        <Route path="/financial-reports" element={<FinancialReports />} />
        <Route path="/customers" element={<CustomerManagement />} />
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/analytics" element={<AdvancedAnalytics />} />
        <Route path="/advanced-inventory" element={<AdvancedInventory />} />
        <Route path="/inventory-history" element={<InventoryHistory />} />
        <Route path="/users" element={<UserManagement />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/admin-guide" element={<AdminGuide />} />
        <Route path="/warehouse-guide" element={<WarehouseGuide />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AppLayout>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AuthenticatedApp />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
