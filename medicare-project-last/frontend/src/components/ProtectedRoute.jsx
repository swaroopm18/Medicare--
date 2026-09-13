import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function ProtectedRoute({ children }) {
  const { user, initializing } = useAuth();
  const location = useLocation();

  // Still checking a stored token against the backend — avoid bouncing a
  // logged-in user to /signin before we know the token is valid.
  if (initializing) return null;

  if (!user) {
    return <Navigate to="/signin" state={{ from: location }} replace />;
  }
  return children;
}
