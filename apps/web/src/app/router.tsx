import { Navigate, createBrowserRouter, type RouteObject } from 'react-router-dom';
import { AuthLayout } from './layouts/AuthLayout';
import { CustomerLayout } from './layouts/CustomerLayout';
import { StaffLayout } from './layouts/StaffLayout';
import { TaskerLayout } from './layouts/TaskerLayout';
import { ForgotPasswordPage } from '@/features/auth/ForgotPasswordPage';
import { RegisterPage } from '@/features/auth/RegisterPage';
import { SignInPage } from '@/features/auth/SignInPage';
import {
  CustomerAddressesPage,
  CustomerDashboardPage,
  CustomerHelpPage,
  CustomerNewTaskPage,
  CustomerNotificationsPage,
  CustomerPaymentsPage,
  CustomerProfilePage,
} from '@/features/customer/pages';
import { NotFoundPage } from '@/features/not-found/NotFoundPage';
import {
  StaffAssignPage,
  StaffAuditPage,
  StaffCatalogPage,
  StaffExceptionsPage,
  StaffPaymentsPage,
  StaffQueuePage,
  StaffReportsPage,
  StaffReviewPage,
  StaffRolesPage,
  StaffSettingsPage,
  StaffTaskersPage,
  StaffTemplatesPage,
  StaffUsersPage,
} from '@/features/staff/pages';
import {
  TaskerAssignmentPage,
  TaskerEarningsPage,
  TaskerHomePage,
  TaskerJobPage,
  TaskerProfilePage,
} from '@/features/tasker/pages';
import { UiKitPage } from '@/features/ui-kit/UiKitPage';
import type { RouteHandle } from './types';

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <AuthLayout />,
    children: [
      {
        index: true,
        element: <Navigate to="/sign-in" replace />,
      },
      {
        path: 'sign-in',
        element: <SignInPage />,
        handle: { titleKey: 'auth.signInTitle' } satisfies RouteHandle,
      },
      {
        path: 'register',
        element: <RegisterPage />,
        handle: { titleKey: 'auth.registerTitle' } satisfies RouteHandle,
      },
      {
        path: 'forgot-password',
        element: <ForgotPasswordPage />,
        handle: { titleKey: 'auth.forgotPasswordTitle' } satisfies RouteHandle,
      },
    ],
  },
  {
    path: '/ui-kit',
    element: <UiKitPage />,
    handle: { titleKey: 'uiKit.title' } satisfies RouteHandle,
  },
  {
    path: '/app',
    element: <CustomerLayout />,
    children: [
      {
        index: true,
        element: <CustomerDashboardPage />,
        handle: { titleKey: 'pages.customer.dashboard' } satisfies RouteHandle,
      },
      {
        path: 'new-task',
        element: <CustomerNewTaskPage />,
        handle: { titleKey: 'pages.customer.newTask' } satisfies RouteHandle,
      },
      {
        path: 'addresses',
        element: <CustomerAddressesPage />,
        handle: { titleKey: 'pages.customer.addresses' } satisfies RouteHandle,
      },
      {
        path: 'payments',
        element: <CustomerPaymentsPage />,
        handle: { titleKey: 'pages.customer.payments' } satisfies RouteHandle,
      },
      {
        path: 'notifications',
        element: <CustomerNotificationsPage />,
        handle: { titleKey: 'pages.customer.notifications' } satisfies RouteHandle,
      },
      {
        path: 'help',
        element: <CustomerHelpPage />,
        handle: { titleKey: 'pages.customer.help' } satisfies RouteHandle,
      },
      {
        path: 'profile',
        element: <CustomerProfilePage />,
        handle: { titleKey: 'pages.customer.profile' } satisfies RouteHandle,
      },
    ],
  },
  {
    path: '/tasker',
    element: <TaskerLayout />,
    children: [
      {
        index: true,
        element: <TaskerHomePage />,
        handle: { titleKey: 'pages.tasker.home' } satisfies RouteHandle,
      },
      {
        path: 'assignment',
        element: <TaskerAssignmentPage />,
        handle: { titleKey: 'pages.tasker.assignment' } satisfies RouteHandle,
      },
      {
        path: 'job',
        element: <TaskerJobPage />,
        handle: { titleKey: 'pages.tasker.job' } satisfies RouteHandle,
      },
      {
        path: 'earnings',
        element: <TaskerEarningsPage />,
        handle: { titleKey: 'pages.tasker.earnings' } satisfies RouteHandle,
      },
      {
        path: 'profile',
        element: <TaskerProfilePage />,
        handle: { titleKey: 'pages.tasker.profile' } satisfies RouteHandle,
      },
    ],
  },
  {
    path: '/staff',
    element: <StaffLayout />,
    children: [
      {
        index: true,
        element: <Navigate to="/staff/queue" replace />,
      },
      {
        path: 'queue',
        element: <StaffQueuePage />,
        handle: { titleKey: 'pages.staff.queue' } satisfies RouteHandle,
      },
      {
        path: 'review',
        element: <StaffReviewPage />,
        handle: { titleKey: 'pages.staff.review' } satisfies RouteHandle,
      },
      {
        path: 'assign',
        element: <StaffAssignPage />,
        handle: { titleKey: 'pages.staff.assign' } satisfies RouteHandle,
      },
      {
        path: 'exceptions',
        element: <StaffExceptionsPage />,
        handle: { titleKey: 'pages.staff.exceptions' } satisfies RouteHandle,
      },
      {
        path: 'taskers',
        element: <StaffTaskersPage />,
        handle: { titleKey: 'pages.staff.taskers' } satisfies RouteHandle,
      },
      {
        path: 'reports',
        element: <StaffReportsPage />,
        handle: { titleKey: 'pages.staff.reports' } satisfies RouteHandle,
      },
      {
        path: 'payments',
        element: <StaffPaymentsPage />,
        handle: { titleKey: 'pages.staff.payments' } satisfies RouteHandle,
      },
      {
        path: 'catalog',
        element: <StaffCatalogPage />,
        handle: { titleKey: 'pages.staff.catalog' } satisfies RouteHandle,
      },
      {
        path: 'templates',
        element: <StaffTemplatesPage />,
        handle: { titleKey: 'pages.staff.templates' } satisfies RouteHandle,
      },
      {
        path: 'users',
        element: <StaffUsersPage />,
        handle: { titleKey: 'pages.staff.users' } satisfies RouteHandle,
      },
      {
        path: 'roles',
        element: <StaffRolesPage />,
        handle: { titleKey: 'pages.staff.roles' } satisfies RouteHandle,
      },
      {
        path: 'audit',
        element: <StaffAuditPage />,
        handle: { titleKey: 'pages.staff.audit' } satisfies RouteHandle,
      },
      {
        path: 'settings',
        element: <StaffSettingsPage />,
        handle: { titleKey: 'pages.staff.settings' } satisfies RouteHandle,
      },
    ],
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
];

export const router = createBrowserRouter(routes);
