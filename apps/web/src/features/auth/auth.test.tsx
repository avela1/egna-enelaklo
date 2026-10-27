import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppProviders } from '@/app/providers';
import { routes } from '@/app/router';
import { apiRequest, ApiError } from '@/lib/api';
import type * as ApiModule from '@/lib/api';

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof ApiModule>();

  return {
    ...actual,
    apiRequest: vi.fn(),
  };
});

const mockedApiRequest = vi.mocked(apiRequest);

const CUSTOMER = {
  createdAt: '2026-03-01T00:00:00.000Z',
  email: 'customer@egna.test',
  emailVerified: true,
  id: 'user-customer',
  lastLoginAt: null,
  locale: 'en',
  name: 'Customer Test',
  permissions: [] as string[],
  phone: null,
  role: 'CUSTOMER',
  status: 'ACTIVE',
};

const OPERATIONS = {
  ...CUSTOMER,
  email: 'ops@egna.test',
  id: 'user-ops',
  name: 'Operations Test',
  permissions: ['tasks.view', 'quotes.edit'],
  role: 'OPERATIONS',
};

const ADMIN = {
  ...CUSTOMER,
  email: 'admin@egna.test',
  id: 'user-admin',
  name: 'Admin Test',
  permissions: ['users.manage', 'roles.manage', 'audit.view', 'tasks.view'],
  role: 'ADMIN',
};

/** Answers /auth/me with the given person, everything else with an empty object. */
function mockSession(user: typeof CUSTOMER | null) {
  mockedApiRequest.mockImplementation(async (path: string) => {
    if (path === '/auth/me') {
      if (!user)
        throw new ApiError({ status: 401, code: 'UNAUTHORIZED', message: 'Sign in to continue' });
      return { user };
    }

    return {};
  });
}

function renderApp(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });

  return render(
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>,
  );
}

describe('the sign in screen', () => {
  beforeEach(() => {
    mockedApiRequest.mockReset();
    mockSession(null);
  });

  it('asks for the email when it is empty and rejects a malformed one', async () => {
    const user = userEvent.setup();
    renderApp('/sign-in');

    // An empty field is a required error, not an email-format error.
    await user.click(screen.getByRole('button', { name: /^sign in$/i }));
    const requiredErrors = await screen.findAllByText('This field is required');
    expect(requiredErrors.length).toBeGreaterThan(0);

    const email = screen.getByLabelText('Email address');
    await user.clear(email);
    await user.type(email, 'not-an-email');
    await user.click(screen.getByRole('button', { name: /^sign in$/i }));

    expect(await screen.findByText('Enter a valid email address')).toBeInTheDocument();
  });

  it('shows the generic message when the password is wrong', async () => {
    const user = userEvent.setup();

    mockedApiRequest.mockImplementation(async (path: string) => {
      if (path === '/auth/me') {
        throw new ApiError({ status: 401, code: 'UNAUTHORIZED', message: 'Sign in to continue' });
      }
      if (path === '/auth/login') {
        throw new ApiError({
          status: 401,
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password',
        });
      }
      return {};
    });

    renderApp('/sign-in');

    await user.type(screen.getByLabelText('Email address'), 'customer@egna.test');
    await user.type(screen.getByLabelText('Password'), 'WrongPassword1');
    await user.click(screen.getByRole('button', { name: /^sign in$/i }));

    expect(await screen.findByText('Invalid email or password')).toBeInTheDocument();
  });

  it('shows the lockout message when there were too many attempts', async () => {
    const user = userEvent.setup();

    mockedApiRequest.mockImplementation(async (path: string) => {
      if (path === '/auth/me') {
        throw new ApiError({ status: 401, code: 'UNAUTHORIZED', message: 'Sign in to continue' });
      }
      if (path === '/auth/login') {
        throw new ApiError({
          status: 401,
          code: 'ACCOUNT_LOCKED',
          message: 'Invalid email or password',
          details: { retryAfterSeconds: 900 },
        });
      }
      return {};
    });

    renderApp('/sign-in');

    await user.type(screen.getByLabelText('Email address'), 'customer@egna.test');
    await user.type(screen.getByLabelText('Password'), 'WrongPassword1');
    await user.click(screen.getByRole('button', { name: /^sign in$/i }));

    expect(
      await screen.findByText('Too many attempts. Try again in 15 minutes.'),
    ).toBeInTheDocument();
  });

  it('shows and hides the password', async () => {
    const user = userEvent.setup();
    renderApp('/sign-in');

    const password = screen.getByLabelText('Password');
    expect(password).toHaveAttribute('type', 'password');

    await user.click(screen.getByRole('button', { name: /show password/i }));
    expect(password).toHaveAttribute('type', 'text');
  });
});

describe('the registration screen', () => {
  beforeEach(() => {
    mockedApiRequest.mockReset();
    mockSession(null);
  });

  it('shows the password rules as they are met', async () => {
    const user = userEvent.setup();
    renderApp('/register');

    const length = screen.getByText('At least 10 characters').closest('li');
    const letter = screen.getByText('At least one letter').closest('li');
    const number = screen.getByText('At least one number').closest('li');

    expect(length?.className).toContain('text-ink-500');

    await user.type(screen.getByLabelText('Password'), 'abcdefghij1');

    await waitFor(() => {
      expect(length?.className).toContain('text-brand-700');
      expect(letter?.className).toContain('text-brand-700');
      expect(number?.className).toContain('text-brand-700');
    });
  });

  it('asks for the terms to be accepted', async () => {
    const user = userEvent.setup();
    renderApp('/register');

    await user.type(screen.getByLabelText('Full name'), 'Tigist Girma');
    await user.type(screen.getByLabelText('Email address'), 'tigist@example.com');
    await user.type(screen.getByLabelText('Password'), 'StrongPassword1');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    expect(await screen.findByText('You must accept the terms to continue')).toBeInTheDocument();
  });
});

describe('the route guards', () => {
  beforeEach(() => {
    mockedApiRequest.mockReset();
  });

  it('sends a customer to the customer portal', async () => {
    mockSession(CUSTOMER);
    renderApp('/staff/queue');

    expect(await screen.findByRole('link', { name: /my tasks/i })).toBeInTheDocument();
  });

  it('sends a staff user to the staff console', async () => {
    mockSession(ADMIN);
    renderApp('/app');

    expect(await screen.findByRole('link', { name: /queue/i })).toBeInTheDocument();
  });

  it('hides the staff screens a person has no permission for', async () => {
    mockSession(OPERATIONS);
    renderApp('/staff/queue');

    expect(await screen.findByRole('link', { name: /review and quote/i })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /^users$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /roles and permissions/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /audit log/i })).not.toBeInTheDocument();
  });

  it('shows the forbidden screen when a person opens a screen they may not', async () => {
    mockSession(OPERATIONS);
    renderApp('/staff/users');

    expect(await screen.findByText('You cannot open this page')).toBeInTheDocument();
  });
});

describe('the language switch', () => {
  beforeEach(() => {
    mockedApiRequest.mockReset();
    mockSession(null);
    window.localStorage.clear();
  });

  it('remembers the chosen language', async () => {
    const user = userEvent.setup();
    renderApp('/sign-in');

    await user.click(screen.getByRole('button', { name: 'አማ' }));

    await waitFor(() => {
      expect(window.localStorage.getItem('egna.locale')).toBe('am');
    });
  });
});
