import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Register from "./pages/Register";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import EventDashboard from "./pages/EventDashboard";
import Guests from "./pages/Guests";
import Documents from "./pages/Documents";
import Inspirations from "./pages/Inspiration";
import Tasks from "./pages/Tasks";
import Vendors from "./pages/Vendors";
import Finance from "./pages/Finance";
import Reports from "./pages/Reports";
import Interview from "./pages/Interview";


function PrivateRoute({ children }: { children: JSX.Element }) {
  const token = localStorage.getItem("token");
  return token ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            localStorage.getItem("token") ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <Navigate to="/register" replace />
            )
          }
        />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/event/:id"
          element={
            <PrivateRoute>
              <EventDashboard />
            </PrivateRoute>
          }
        />

        <Route
  path="/event/:id/guests"
  element={
    <PrivateRoute>
      <Guests />
    </PrivateRoute>
  }
/>
<Route
  path="/event/:id/documents"
  element={
    <PrivateRoute>
      <Documents />
    </PrivateRoute>
  }
/>

<Route
  path="/event/:id/inspirations"
  element={
    <PrivateRoute>
      <Inspirations />
    </PrivateRoute>
  }
/>
<Route
  path="/event/:id/tasks"
  element={
    <PrivateRoute>
      <Tasks />
    </PrivateRoute>
  }
/>

<Route
  path="/event/:id/vendors"
  element={
    <PrivateRoute>
      <Vendors />
    </PrivateRoute>
  }
/>

<Route
  path="/event/:id/finance"
  element={
    <PrivateRoute>
      <Finance />
    </PrivateRoute>
  }
/>

<Route
  path="/event/:id/reports"
  element={
    <PrivateRoute>
      <Reports />
    </PrivateRoute>
  }
/>
  
<Route
  path="/event/:id/interview"
  element={
    <PrivateRoute>
      <Interview />
    </PrivateRoute>
  }
/>

<Route path="/event/:id/interview/edit" element={<Interview />} />

        
      </Routes>
    </BrowserRouter>
  );
}
