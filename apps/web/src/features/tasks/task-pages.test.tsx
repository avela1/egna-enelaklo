import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TemplateDefinition } from '@egna-enelaklo/shared';
import { AppProviders } from '@/app/providers';
import { routes } from '@/app/router';
import { apiRequest } from '@/lib/api';
import type * as ApiModule from '@/lib/api';

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof ApiModule>();
  return { ...actual, apiRequest: vi.fn() };
});

const mockedApiRequest = vi.mocked(apiRequest);

const definition: TemplateDefinition = {
  requiredEvidence: [],
  sections: [
    {
      key: 'main',
      title: { en: 'Details' },
      fields: [{ key: 'name', type: 'text', label: { en: 'Name' }, required: true }],
    },
  ],
};

const task = {
  attachments: [],
  budgetCapSantim: null,
  cancelledAt: null,
  createdAt: new Date().toISOString(),
  deadlineAt: null,
  definition,
  deliveryAddressId: null,
  history: [],
  id: 'task-1',
  payload: {},
  pickupAddressId: null,
  ref: 'T-1001',
  serviceKey: 'buy_and_deliver',
  serviceName: { en: 'Buy and deliver' },
  status: 'DRAFT',
  subCity: null,
  submittedAt: null,
  templateId: 'template-1',
  templateVersion: 1,
  title: '',
  updatedAt: new Date().toISOString(),
};

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });

  return render(
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>,
  );
}

describe('the task pages', () => {
  beforeEach(() => {
    mockedApiRequest.mockReset();

    mockedApiRequest.mockImplementation(async (path: string, options?: { method?: string }) => {
      if (path === '/auth/me') {
        return {
          user: {
            createdAt: new Date().toISOString(),
            email: 'customer@egna.test',
            emailVerified: true,
            id: 'user-1',
            lastLoginAt: null,
            locale: 'en',
            name: 'Customer Test',
            permissions: [],
            phone: null,
            role: 'CUSTOMER',
            status: 'ACTIVE',
          },
        };
      }

      if (path === '/addresses') return [];
      if (path === '/prohibited-items') return [];
      if (path === '/tasks/task-1') return task;
      if (path.startsWith('/tasks/') && options?.method === 'PATCH') {
        return { id: 'task-1', savedAt: new Date().toISOString() };
      }

      return {};
    });
  });

  it('shows the autosave indicator while it saves a draft', async () => {
    const user = userEvent.setup();
    renderAt('/app/tasks/task-1/edit');

    const name = await screen.findByLabelText('Name');
    await user.type(name, 'Rice');

    // The indicator appears while the draft is on its way.
    expect(await screen.findByText('Saving...')).toBeInTheDocument();

    // And it settles on "Saved" once the server answered.
    expect(await screen.findByText('Saved', {}, { timeout: 5000 })).toBeInTheDocument();
  });

  it('shows every section of the review with a link to edit it', async () => {
    renderAt('/app/tasks/task-1/review');

    // The stepper and the section card both say "Details".
    expect((await screen.findAllByText('Details')).length).toBeGreaterThan(0);

    const edit = screen.getAllByRole('link', { name: /edit/i })[0];
    expect(edit).toHaveAttribute('href', '/app/tasks/task-1/edit');
  });

  it('asks for the confirmation before the request is sent', async () => {
    renderAt('/app/tasks/task-1/review');

    const confirm = await screen.findByLabelText('I confirm these details are correct');
    expect(confirm).not.toBeChecked();

    const submit = screen.getByRole('button', { name: /submit request/i });
    expect(submit).toBeDisabled();
  });
});
