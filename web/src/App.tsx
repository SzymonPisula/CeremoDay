import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import AppLayout from "./layout/AppLayout";
import AuthGuard from "./routes/AuthGuard";

import Login from "./pages/Login";
import Register from "./pages/Register";

// Pages (existing modules)
import Dashboard from "./pages/Dashboard";
import EventDashboard from "./pages/EventDashboard";
import Guests from "./pages/Guests";
import Documents from "./pages/Documents";
import Inspirations from "./pages/Inspiration";
import Tasks from "./pages/Tasks";
import Vendors from "./pages/Vendors";
import Finance from "./pages/Finance";
import Reports from "./pages/Reports";
import Notifications from "./pages/Notifications";
import Schedule from "./pages/Schedule";
import WeddingDay from "./pages/WeddingDay";
import Interview from "./pages/Interview";
import InterviewWizard from "./pages/InterviewWizard";
import RequireInterview from "./components/RequireInterview";
import RequireAdmin from "./routes/RequireAdmin";
import Admin from "./pages/Admin";

import EventUsers from "./pages/EventUsers";
import Profile from "./pages/Profile";

/**
 * Nowy routing (2025 redesign):
 * - Start aplikacji: zawsze /login
 * - Rejestracja: /register -> po sukcesie wraca na /login
 * - Wszystko inne pod AuthGuard + AppLayout
 */
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Start zawsze na logowaniu */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* Public */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Private (App Shell) */}
        <Route
          element={
            <AuthGuard>
              <AppLayout />
            </AuthGuard>
          }
        >
        <Route element={<RequireAdmin />}>
          <Route path="/admin" element={<Admin />} />
        </Route>

          <Route path="/dashboard" element={<Dashboard />} />

          {/* Profil użytkownika */}
          <Route path="/profile" element={<Profile />} />

          {/* ✅ WYWIAD: startowy wizard (pierwsze przejście) */}
          <Route path="/event/:id/interview/start" element={<InterviewWizard />} />

          {/* ✅ WYWIAD: edycja odpowiedzi (zawsze dostępna) */}
          <Route path="/event/:id/interview" element={<Interview />} />
          <Route path="/event/:id/interview/edit" element={<Interview />} />

          {/* ✅ EVENT: reszta modułów z blokadą, dopóki nie ma zapisanego wywiadu */}
          <Route
            path="/event/:id"
            element={
              <RequireInterview>
                <EventDashboard />
              </RequireInterview>
            }
          />

          <Route
            path="/event/:id/guests"
            element={
              <RequireInterview>
                <Guests />
              </RequireInterview>
            }
          />
          <Route
            path="/event/:id/documents"
            element={
              <RequireInterview>
                <Documents />
              </RequireInterview>
            }
          />
          <Route
            path="/event/:id/inspirations"
            element={
              <RequireInterview>
                <Inspirations />
              </RequireInterview>
            }
          />
          <Route
            path="/event/:id/tasks"
            element={
              <RequireInterview>
                <Tasks />
              </RequireInterview>
            }
          />
          <Route
            path="/event/:id/vendors"
            element={
              <RequireInterview>
                <Vendors />
              </RequireInterview>
            }
          />

          <Route
            path="/event/:id/schedule"
            element={
              <RequireInterview>
                <Schedule />
              </RequireInterview>
            }
          />

          <Route
            path="/event/:id/notifications"
            element={
              <RequireInterview>
                <Notifications />
              </RequireInterview>
            }
          />

          <Route
            path="/event/:id/wedding-day"
            element={
              <RequireInterview>
                <WeddingDay />
              </RequireInterview>
            }
          />

          <Route
            path="/event/:id/finance"
            element={
              <RequireInterview>
                <Finance />
              </RequireInterview>
            }
          />
          <Route
            path="/event/:id/reports"
            element={
              <RequireInterview>
                <Reports />
              </RequireInterview>
            }
          />

          <Route
            path="/event/:id/users"
            element={
              <RequireInterview>
                <EventUsers />
              </RequireInterview>
            }
          />

        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
