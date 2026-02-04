import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const isActive = (path) =>
    location.pathname === path || location.pathname.startsWith(path + "/");

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-stone-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link
            to="/"
            className="font-display font-semibold text-xl text-stone-800 hover:text-amber-700 transition-colors"
          >
            ForkLog
          </Link>
          <nav className="flex items-center gap-4">
            <Link
              to="/"
              className={`text-sm font-medium ${
                isActive("/") &&
                !location.pathname.match(/\/cook\/|\/import|\/create/)
                  ? "text-amber-600"
                  : "text-stone-500 hover:text-stone-700"
              }`}
            >
              My recipes
            </Link>
            <Link
              to="/import"
              className={`text-sm font-medium ${
                isActive("/import")
                  ? "text-amber-600"
                  : "text-stone-500 hover:text-stone-700"
              }`}
            >
              Import
            </Link>
            {user && (
              <span className="text-sm text-stone-500">{user.username}</span>
            )}
            <button
              type="button"
              onClick={handleLogout}
              className="text-sm font-medium text-stone-500 hover:text-stone-700"
            >
              Log out
            </button>
          </nav>
        </div>
      </header>
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
