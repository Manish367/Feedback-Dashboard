import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./lib/AuthContext";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import MyFeedback from "./pages/MyFeedback";
import GiveFeedback from "./pages/GiveFeedback";
import HRTracker from "./pages/HRTracker";
import Forbidden from "./pages/Forbidden";
import NotFound from "./pages/NotFound";

function ProtectedLayout() {
  const { user, loading } = useAuth();
  if (loading) return <p className="empty-state">Loading...</p>;
  if (!user) return <Navigate to="/login" replace />;
  return <Layout />;
}

function RequireManager({ children }: { children: JSX.Element }) {
  const { user } = useAuth();
  if (!user?.isManager) return <Forbidden requiredRole="manager" />;
  return children;
}

function RequireHR({ children }: { children: JSX.Element }) {
  const { user } = useAuth();
  if (!user?.isHR) return <Forbidden requiredRole="HR" />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedLayout />}>
        <Route path="/" element={<MyFeedback />} />
        <Route
          path="/give"
          element={
            <RequireManager>
              <GiveFeedback />
            </RequireManager>
          }
        />
        <Route
          path="/hr"
          element={
            <RequireHR>
              <HRTracker />
            </RequireHR>
          }
        />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
