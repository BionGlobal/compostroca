import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { LoteProvider } from "./contexts/LoteContext";
import Dashboard from "./pages/Dashboard";
import Voluntarios from "./pages/Voluntarios";
import EntregasOptimized from "./pages/EntregasOptimized";
import Lotes from "./pages/Lotes";
import Auth from "./pages/Auth";
import PendingUsers from "./pages/PendingUsers";
import NotFound from "./pages/NotFound";
import { AdminRoute } from "./components/AdminRoute";
import LotePublico from "./pages/LotePublico";
import ProductionBeltPublic from "./pages/ProductionBeltPublic";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LoteProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/" element={
            <ProtectedRoute>
              <Layout>
                <Dashboard />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/voluntarios" element={
            <ProtectedRoute>
              <Layout>
                <Voluntarios />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/entregas" element={
            <ProtectedRoute>
              <Layout>
                <EntregasOptimized />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/lotes" element={
            <ProtectedRoute>
              <Layout>
                <Lotes />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/admin/usuarios" element={
            <ProtectedRoute>
              <Layout>
                <AdminRoute requireSuperAdmin={true}>
                  <PendingUsers />
                </AdminRoute>
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/lote-publico" element={<LotePublico />} />
          <Route path="/:unitCode" element={<ProductionBeltPublic />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
    </LoteProvider>
  </QueryClientProvider>
);

export default App;
