import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Login from "./pages/Login";
import AppLayout from "./components/AppLayout";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import Sales from "./pages/Sales";
import SalesPending from "./pages/SalesPending";
import SalesPaid from "./pages/SalesPaid";
import UsersPage from "./pages/Users";
import Revenue from "./pages/Revenue";
import Profit from "./pages/Profit";
import TopProducts from "./pages/TopProducts";
import CashBox from "./pages/CashBox";
import CashOutflows from "./pages/CashOutflows";
import StockPurchases from "./pages/StockPurchases";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route element={<AppLayout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/products" element={<Products />} />
              <Route path="/sales" element={<Sales />} />
              <Route path="/sales/pending" element={<SalesPending />} />
              <Route path="/sales/paid" element={<SalesPaid />} />
              <Route path="/users" element={<UsersPage />} />
              <Route path="/revenue" element={<Revenue />} />
              <Route path="/profit" element={<Profit />} />
              <Route path="/reports/top-products" element={<TopProducts />} />
              <Route path="/cash-box" element={<CashBox />} />
              <Route path="/reports/cash-outflows" element={<CashOutflows />} />
              <Route path="/stock-purchases" element={<StockPurchases />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
