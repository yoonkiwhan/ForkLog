import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { loginWithToken } = useAuth();
  const token = searchParams.get("token");
  const error = searchParams.get("error");

  useEffect(() => {
    if (error) {
      navigate("/login?error=" + encodeURIComponent(error), { replace: true });
      return;
    }
    if (token) {
      loginWithToken(token);
      navigate("/", { replace: true });
    } else {
      navigate("/login", { replace: true });
    }
  }, [token, error, loginWithToken, navigate]);

  return (
    <div className="flex justify-center py-16">
      <p className="text-stone-500">Signing you in…</p>
    </div>
  );
}
