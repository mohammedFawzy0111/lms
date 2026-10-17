import { lazy, Suspense, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "./stores/authStore";
import { useSettingsStore } from "./stores/settingsStore";
import TitleBar from "./components/TitleBar";
import Shell from "./components/Shell";
import Login from "./pages/Login";
import "./components/styles/AppFrame.css";
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Settings = lazy(() => import("./pages/Settings"));
const Users = lazy(() => import("./pages/Users"));
const Patients = lazy(() => import("./pages/Patients"));
const Investigations = lazy(() => import("./pages/Investigations"));
const Requests = lazy(() => import("./pages/Requests"));
const Results = lazy(() => import("./pages/Results"));
const PrintReport = lazy(() => import("./pages/PrintReports"));
const Billing = lazy(() => import("./pages/Billing"));
const PrintReceipt = lazy(() => import("./pages/PrintReceipt"));

const fallback = <div className="loading">Loading...</div>;

export default function App() {  
  const session = useAuthStore((s) => s.session);
  const loadSettings = useSettingsStore((s) => s.load);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);


  return (
    <Suspense fallback={fallback}>
      <Routes>
        {/* Print routes: no shell, no auth check */}
        <Route path="/print/:requestId" element={<PrintReport />} />
        <Route path="/receipt/:paymentId" element={<PrintReceipt />} />

       {/* Main app */}
        <Route
          path="*"
          element={
            <div className="app-frame">
              <TitleBar />
              <div className="app-body">
                <Routes>
                  {!session ? (
                    <>
                      <Route path="/login" element={<Login />} />
                      <Route path="*" element={<Navigate to="/login" replace />} />
                    </>
                  ) : (
                    <Route element={<Shell />}>
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/requests" element={<Requests />} />
                      <Route path="/results/:requestId" element={<Results />} />
                      <Route path="/patients" element={<Patients />} />
                      <Route path="/investigations" element={<Investigations />} />
                      <Route path="/billing" element={<Billing />} />
                      <Route path="/users" element={<Users />} />
                      <Route path="/settings" element={<Settings />} />
                      <Route path="*" element={<Navigate to="/" replace />} />
                    </Route>
                  )}
                </Routes>
              </div>
            </div>
          }
        />
      </Routes>
    </Suspense>
  );
}
