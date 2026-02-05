import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./Layout";
import Login from "./pages/Login";
import Register from "./pages/Register";
import AuthCallback from "./pages/AuthCallback";
import RecipeList from "./pages/RecipeList";
import RecipeDetail from "./pages/RecipeDetail";
import CookMode from "./pages/CookMode";
import ImportRecipe from "./pages/ImportRecipe";
import CreateRecipe from "./pages/CreateRecipe";
import MyCookingSessions from "./pages/MyCookingSessions";
import MyCookingSessionDetail from "./pages/MyCookingSessionDetail";

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<RecipeList />} />
          <Route path="recipes/:slug" element={<RecipeDetail />} />
          <Route path="recipes/:slug/cook" element={<CookMode />} />
          <Route path="import" element={<ImportRecipe />} />
          <Route path="create" element={<CreateRecipe />} />
          <Route path="sessions" element={<MyCookingSessions />} />
          <Route path="sessions/:id" element={<MyCookingSessionDetail />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
