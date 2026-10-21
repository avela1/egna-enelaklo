import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { routes } from './router';
import { AppProviders } from './providers';

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  return render(
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>,
  );
}

describe('application shell', () => {
  it('renders the sign in page for the public root', () => {
    renderAt('/');
    expect(screen.getByRole('heading', { name: /sign in/i })).toBeInTheDocument();
  });

  it('renders the customer portal layout with its navigation', () => {
    renderAt('/app');
    expect(screen.getAllByRole('heading', { name: /my tasks/i }).length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: /new task/i })).toBeInTheDocument();
  });

  it('renders the staff console navigation groups', () => {
    renderAt('/staff/queue');
    expect(screen.getByRole('link', { name: /review and quote/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /audit log/i })).toBeInTheDocument();
  });

  it('renders the UI kit with the status chips', () => {
    renderAt('/ui-kit');
    expect(screen.getAllByText(/quote ready/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/in progress/i).length).toBeGreaterThan(0);
  });
});
