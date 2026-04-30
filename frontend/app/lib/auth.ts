export type StoredUser = {
  email: string;
  first_name: string;
  id: number;
  is_active: boolean;
  is_staff: boolean;
  last_name: string;
  points_balance: number;
  role: string;
  username: string;
};

export type UserRole = "Admin" | "PM" | "Developer" | string;

type StoredSession = {
  expiry: string | null;
  token: string;
  user: StoredUser;
};

const SESSION_KEY = "worktrack.session";

export function getActiveSession(): StoredSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(SESSION_KEY);
  if (!raw) {
    return null;
  }

  try {
    const session = JSON.parse(raw) as StoredSession;
    if (!session.token || !session.user) {
      clearSession();
      return null;
    }

    if (session.expiry && new Date(session.expiry).getTime() <= Date.now()) {
      clearSession();
      return null;
    }

    return session;
  } catch {
    clearSession();
    return null;
  }
}

export function storeSession(token: string, user: StoredUser, expiry: string | null) {
  if (typeof window === "undefined") {
    return;
  }

  const payload: StoredSession = { expiry, token, user };
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(payload));
}

export function clearSession() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(SESSION_KEY);
}

export function updateStoredUser(partialUser: Partial<StoredUser>) {
  const session = getActiveSession();
  if (!session || typeof window === "undefined") {
    return null;
  }

  const nextUser = { ...session.user, ...partialUser };
  window.localStorage.setItem(
    SESSION_KEY,
    JSON.stringify({ ...session, user: nextUser }),
  );

  return nextUser;
}

export function isDeveloper(user: Pick<StoredUser, "role"> | null | undefined) {
  return user?.role?.toLowerCase() === "developer";
}

export function isAdmin(user: Pick<StoredUser, "role"> | null | undefined) {
  return user?.role?.toLowerCase() === "admin";
}

export function isPrivilegedUser(user: Pick<StoredUser, "role"> | null | undefined) {
  const role = user?.role?.toLowerCase();
  return role === "admin" || role === "pm";
}

export function getDefaultDashboardPath(user: Pick<StoredUser, "role"> | null | undefined) {
  return isDeveloper(user) ? "/dashboard/issues" : "/dashboard";
}
