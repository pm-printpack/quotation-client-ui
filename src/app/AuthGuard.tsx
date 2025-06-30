"use client";
import { setAuthenticated } from "@/lib/features/auth.slice";
import { fetchUserById } from "@/lib/features/customers.slice";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { RootState } from "@/lib/store";
import { jwtDecode, JwtPayload } from "jwt-decode";
import { usePathname, useRouter } from "next/navigation";
import { PropsWithChildren, useEffect, useState } from "react";

/**
 * Decode a JWT and return its payload.
 * @param {string} token
 * @returns {{ exp: number }}  // exp is UNIX timestamp in seconds
 */
function getPayload(token: string): JwtPayload | null {
  try {
    return jwtDecode(token);
  } catch {
    return null;
  }
}

export default function AuthGuard({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const isAuthenticated: boolean = useAppSelector((state: RootState) => state.auth.isAuthenticated);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      return;
    }
    const token: string | null = localStorage.getItem("jwtToken");
    const isLoginPage = pathname === "/login";
    let isValid: boolean = false;

    if (token) {
      const payload: JwtPayload | null = getPayload(token);
      if (payload && payload.sub && payload.exp && payload.exp * 1000 > Date.now()) {
        isValid = true;
        dispatch(setAuthenticated(true));
        dispatch(fetchUserById(payload.sub));
      } else {
        // expired or bad token → remove it
        localStorage.removeItem("jwtToken");
      }
    }

    if (!isValid && !isLoginPage) {
      // no valid token and not already on login
      router.replace("/login");
    } else if (isValid && isLoginPage) {
      // already authenticated but on login page
      router.replace("/");
      dispatch(setAuthenticated(true));
    } else {
      // OK to render the children
      setAllowed(true)
    }
  }, [pathname, router, dispatch, isAuthenticated]);

  // prevent flicker
  if (!allowed) {
    return <div>Loading…</div>
  }

  return <>{children}</>;
}