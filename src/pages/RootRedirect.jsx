import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export default function RootRedirect() {
  const [target, setTarget] = useState(null);

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setTarget(data.session ? "/dashboard" : "/auth");
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!target) return null;
  return <Navigate to={target} replace />;
}
