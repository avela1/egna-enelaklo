import { Navigate, createBrowserRouter, type RouteObject } from 'react-router-dom';
import { AuthLayout } from './layouts/AuthLayout';
import { CustomerLayout } from './layouts/CustomerLayout';
import { StaffLayout } from './layouts/StaffLayout';
import { TaskerLayout } from './layouts/TaskerLayout';
import { RequirePermission, RequirePortal } from '@/features/auth/guards';
import { ForgotPasswordPage } from '@/features/auth/pages/ForgotPasswordPage';
import { PasswordFormPage } from '@/features/auth/pages/PasswordFormPage';
import { RegisterPage } from '@/features/auth/pages/RegisterPage';
import { SignInPage } from '@/features/auth/pages/SignInPage';
import { VerifyEmailPage } from '@/features/auth/pages/VerifyEmailPage';
import {
  CustomerHelpPage,
  CustomerNewTaskPage,
  CustomerNotificationsPage,
  CustomerPaymentsPage,
  CustomerProfilePage,
} from '@/features/customer/pages';
import { ErrorPage } from '@/features/errors/ErrorPage';
import { NotFoundPage } from '@/features/not-found/NotFoundPage';
import { ProfilePage } from '@/features/profile/ProfilePage';
import { StaffAuditPage } from '@/features/staff/pages/StaffAuditPage';
import { StaffRolesPage } from '@/features/staff/pages/StaffRolesPage';
import { StaffUsersPage } from '@/features/staff/pages/StaffUsersPage';
import { AddressesPage } from '@/features/addresses/AddressesPage';
import { ChooseServicePage } from '@/features/tasks/pages/ChooseServicePage';
import { TaskDetailPage } from '@/features/tasks/pages/TaskDetailPage';
import { TaskFormPage } from '@/features/tasks/pages/TaskFormPage';
import { TaskListPage } from '@/features/tasks/pages/TaskListPage';
import { TaskReviewPage } from '@/features/tasks/pages/TaskReviewPage';
import { StaffCatalogPage } from '@/features/staff/pages/StaffCatalogPage';
import { StaffQueuePage } from '@/features/staff/pages/StaffQueuePage';
import { TemplateEditorPage } from '@/features/staff/pages/TemplateEditorPage';
import {
  StaffAssignPage,
  StaffExceptionsPage,
  StaffPaymentsPage,
  StaffReportsPage,
  StaffReviewPage,
  StaffSettingsPage,
  StaffTaskersPage,
} from '@/features/staff/pages';
import {
  TaskerAssignmentPage,
  TaskerEarningsPage,
  TaskerHomePage,
  TaskerJobPage,
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
      {
        path: 'reset-password',
        element: <PasswordFormPage mode="reset" />,
        handle: { titleKey: 'auth.resetTitle' } satisfies RouteHandle,
      },
      {
        path: 'set-password',
        element: <PasswordFormPage mode="invite" />,
        handle: { titleKey: 'auth.inviteTitle' } satisfies RouteHandle,
      },
      {
        path: 'verify-email',
        element: <VerifyEmailPage />,
        handle: { titleKey: 'auth.verifyEmailTitle' } satisfies RouteHandle,
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
    element: (
      <RequirePortal portal="app">
        <CustomerLayout />
      </RequirePortal>
    ),
    children: [
      {
        index: true,
        element: <TaskListPage />,
        handle: { titleKey: 'pages.customer.dashboard' } satisfies RouteHandle,
      },
      {
        path: 'new',
        element: <ChooseServicePage />,
        handle: { titleKey: 'task.choose.title' } satisfies RouteHandle,
      },
      {
        path: 'tasks/:id',
        element: <TaskDetailPage />,
        handle: { titleKey: 'task.detail.title' } satisfies RouteHandle,
      },
      {
        path: 'tasks/:id/edit',
        element: <TaskFormPage />,
        handle: { titleKey: 'task.form.title' } satisfies RouteHandle,
      },
      {
        path: 'tasks/:id/review',
        element: <TaskReviewPage />,
        handle: { titleKey: 'task.review.title' } satisfies RouteHandle,
      },
      {
        path: 'addresses',
        element: <AddressesPage />,
        handle: { titleKey: 'pages.customer.addresses' } satisfies RouteHandle,
      },
      {
        path: 'new-task',
        element: <CustomerNewTaskPage />,
        handle: { titleKey: 'pages.customer.newTask' } satisfies RouteHandle,
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
    element: (
      <RequirePortal portal="tasker">
        <TaskerLayout />
      </RequirePortal>
    ),
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
        element: <ProfilePage />,
        handle: { titleKey: 'pages.tasker.profile' } satisfies RouteHandle,
      },
    ],
  },
  {
    path: '/staff',
    element: (
      <RequirePortal portal="staff">
        <StaffLayout />
      </RequirePortal>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/staff/queue" replace />,
      },
      {
        path: 'queue',
        element: (
          <RequirePermission permission="tasks.view">
            <StaffQueuePage />
          </RequirePermission>
        ),
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
        element: (
          <RequirePermission permission="catalog.edit">
            <StaffCatalogPage />
          </RequirePermission>
        ),
        handle: { titleKey: 'pages.staff.catalog' } satisfies RouteHandle,
      },
      {
        path: 'templates/:serviceId',
        element: (
          <RequirePermission permission="catalog.edit">
            <TemplateEditorPage />
          </RequirePermission>
        ),
        handle: { titleKey: 'pages.staff.templates' } satisfies RouteHandle,
      },
      {
        path: 'users',
        element: (
          <RequirePermission permission="users.manage">
            <StaffUsersPage />
          </RequirePermission>
        ),
        handle: { titleKey: 'pages.staff.users' } satisfies RouteHandle,
      },
      {
        path: 'roles',
        element: (
          <RequirePermission permission="roles.manage">
            <StaffRolesPage />
          </RequirePermission>
        ),
        handle: { titleKey: 'pages.staff.roles' } satisfies RouteHandle,
      },
      {
        path: 'audit',
        element: (
          <RequirePermission permission="audit.view">
            <StaffAuditPage />
          </RequirePermission>
        ),
        handle: { titleKey: 'pages.staff.audit' } satisfies RouteHandle,
      },
      {
        path: 'settings',
        element: <StaffSettingsPage />,
        handle: { titleKey: 'pages.staff.settings' } satisfies RouteHandle,
      },
      {
        path: 'profile',
        element: <ProfilePage />,
        handle: { titleKey: 'pages.staff.profile' } satisfies RouteHandle,
      },
    ],
  },
  {
    path: '/error',
    element: <ErrorPage />,
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
];

export const router = createBrowserRouter(routes);
