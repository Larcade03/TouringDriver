import React from "react";
import { Routes, Route } from "react-router-dom";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import StudentDashboard from "./pages/StudentDashboard.jsx";
import MyProgress from "./pages/MyProgress.jsx";
import ExamSimulation from "./pages/ExamSimulation.jsx";
import StudentFilePage from "./pages/StudentFilePage.jsx";
import InstructorDashboard from "./pages/InstructorDashboard.jsx";
import StudentsProgress from "./pages/StudentsProgress.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import StaffManagement from "./pages/StaffManagement.jsx";
import VehicleManagement from "./pages/VehicleManagement.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import Sidebar from "./components/Sidebar.jsx";
import { useAuth } from "./context/AuthContext.jsx";

function AppLayout({ children }) {
  return (
    <div className="app-shell">
      <Sidebar />
      <main className="app-content">{children}</main>
    </div>
  );
}

function HomeByRole() {
  const { user } = useAuth();
  if (user?.role === "instructor") return <InstructorDashboard />;
  if (user?.role === "admin") return <AdminDashboard />;
  return <StudentDashboard />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/ingresar" element={<Login />} />
      <Route path="/registro" element={<Register />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout>
              <HomeByRole />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      {/* Rutas exclusivas del Alumno */}
      <Route
        path="/mi-progreso"
        element={
          <ProtectedRoute roles={["student"]}>
            <AppLayout>
              <MyProgress />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/mi-expediente"
        element={
          <ProtectedRoute roles={["student"]}>
            <AppLayout>
              <StudentFilePage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/simulacro"
        element={
          <ProtectedRoute roles={["student"]}>
            <AppLayout>
              <ExamSimulation />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      {/* Rutas para Instructor y Admin */}
      <Route
        path="/alumnos"
        element={
          <ProtectedRoute roles={["instructor", "admin"]}>
            <AppLayout>
              <StudentsProgress />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/expedientes"
        element={
          <ProtectedRoute roles={["instructor", "admin"]}>
            <AppLayout>
              <StudentFilePage />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      {/* Rutas exclusivas de Admin */}
      <Route
        path="/personal"
        element={
          <ProtectedRoute roles={["admin"]}>
            <AppLayout>
              <StaffManagement />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/vehiculos"
        element={
          <ProtectedRoute roles={["admin"]}>
            <AppLayout>
              <VehicleManagement />
            </AppLayout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
