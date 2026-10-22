import { PlaceholderPage } from '@/features/shared/PlaceholderPage';
import { ProfilePage } from '@/features/profile/ProfilePage';

export function CustomerNewTaskPage() {
  return <PlaceholderPage titleKey="pages.customer.newTask" />;
}

export function CustomerPaymentsPage() {
  return <PlaceholderPage titleKey="pages.customer.payments" />;
}

export function CustomerNotificationsPage() {
  return <PlaceholderPage titleKey="pages.customer.notifications" />;
}

export function CustomerHelpPage() {
  return <PlaceholderPage titleKey="pages.customer.help" />;
}

export function CustomerProfilePage() {
  return <ProfilePage />;
}
