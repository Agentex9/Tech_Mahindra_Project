import { useOutletContext } from "react-router";

import type { StoredUser } from "./auth";

export type DashboardContextValue = {
  handleLogout: () => Promise<void>;
  token: string;
  updateUser: (nextUser: StoredUser) => void;
  user: StoredUser;
};

export function useDashboardContext() {
  return useOutletContext<DashboardContextValue>();
}
