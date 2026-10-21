import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import ExecutiveDashboard from "./pages/ExecutiveDashboard";
import ManagerDashboard from "./pages/ManagerDashboard";
import OperatorDashboard from "./pages/OperatorDashboard";
import OperatorStationLogin from "./pages/OperatorStationLogin";
import ActiveBatchJob from "./pages/ActiveBatchJob";
import "./App.css";
import { AuthProvider } from "./context/AuthContext";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/executive" element={<ExecutiveDashboard />} />
          <Route path="/manager" element={<ManagerDashboard />} />
          <Route path="/operator" element={<OperatorDashboard />} />
          <Route path="*" element={<Navigate to="/" replace />} />
          <Route path="/operator-login" element={<OperatorStationLogin />} />
          <Route path="/operator" element={<OperatorDashboard />} />
          <Route path="/operator/batch" element={<ActiveBatchJob />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
