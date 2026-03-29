import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import { WalletProvider } from "@/context/WalletContext";
import { Layout } from "@/components/Layout";
import { Dashboard } from "@/pages/Dashboard";
import { KycPage } from "@/pages/KycPage";
import { FraudPage } from "@/pages/FraudPage";
import { GovernancePage } from "@/pages/GovernancePage";
import { AdminPage } from "@/pages/AdminPage";

export default function App() {
  return (
    <WalletProvider>
      <BrowserRouter>
        <Toaster richColors closeButton theme="dark" position="top-right" />
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="kyc" element={<KycPage />} />
            <Route path="fraud" element={<FraudPage />} />
            <Route path="governance" element={<GovernancePage />} />
            <Route path="admin" element={<AdminPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </WalletProvider>
  );
}
