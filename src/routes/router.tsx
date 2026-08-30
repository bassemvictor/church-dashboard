import { createBrowserRouter } from "react-router-dom";

import { ProtectedRoute } from "../components/auth/protected-route";
import { RequireGroups } from "../components/auth/require-groups";
import { AdminLayout } from "../components/dashboard/admin-layout";
import { AdminExpensesPage } from "../pages/admin-expenses-page";
import { AdminHomePage } from "../pages/admin-home-page";
import { AdminLiturgiesPage } from "../pages/admin-liturgies-page";
import { AdminNewsPage } from "../pages/admin-news-page";
import { AdminPendingApprovalsPage } from "../pages/admin-pending-approvals-page";
import { AdminSettingsPage } from "../pages/admin-settings-page";
import { AuthPage } from "../pages/auth-page";
import { NotFoundPage } from "../pages/not-found-page";
import { PublicDashboardPage } from "../pages/public-dashboard-page";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <PublicDashboardPage />,
  },
  {
    path: "/auth",
    element: <AuthPage />,
  },
  {
    path: "/admin",
    element: (
      <ProtectedRoute>
        <RequireGroups groups={["admin"]}>
          <AdminLayout />
        </RequireGroups>
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <AdminHomePage />,
      },
      {
        path: "expenses",
        element: <AdminExpensesPage />,
      },
      {
        path: "news",
        element: <AdminNewsPage />,
      },
      {
        path: "liturgies",
        element: <AdminLiturgiesPage />,
      },
      {
        path: "pending-approvals",
        element: <AdminPendingApprovalsPage />,
      },
      {
        path: "settings",
        element: <AdminSettingsPage />,
      },
    ],
  },
  {
    path: "*",
    element: <NotFoundPage />,
  },
]);
