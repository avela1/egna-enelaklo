import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  LocalizedText,
  ServiceDescription,
  TaskPayload,
  TemplateDefinition,
} from '@egna-enelaklo/shared';
import { apiRequest } from '@/lib/api';

export interface ServiceSummary {
  description: ServiceDescription;
  icon: string;
  id: string;
  key: string;
  name: LocalizedText;
  templateId: string;
  templateVersion: number;
}

export interface AddressSummary {
  contactName: string;
  contactPhone: string;
  directions: string;
  id: string;
  isDefault: boolean;
  label: string;
  landmark: string;
  subCity: string;
  woreda: string | null;
}

export interface TaskListItem {
  attachmentCount: number;
  budgetCapSantim: number | null;
  createdAt: string;
  deadlineAt: string | null;
  icon: string;
  id: string;
  ref: string;
  serviceKey: string;
  serviceName: LocalizedText;
  status: string;
  subCity: string | null;
  submittedAt: string | null;
  templateVersion: number;
  title: string;
  updatedAt: string;
}

export interface TaskAttachment {
  contentType: string;
  fileName: string;
  id: string;
  kind: string;
  sizeBytes: number;
}

export interface TaskHistoryEntry {
  actorRole: string;
  createdAt: string;
  fromStatus: string;
  id: string;
  note: string | null;
  toStatus: string;
}

export interface TaskDetail {
  attachments: TaskAttachment[];
  budgetCapSantim: number | null;
  cancelledAt: string | null;
  createdAt: string;
  deadlineAt: string | null;
  definition: TemplateDefinition;
  deliveryAddressId: string | null;
  history: TaskHistoryEntry[];
  id: string;
  payload: TaskPayload;
  pickupAddressId: string | null;
  ref: string;
  serviceKey: string;
  serviceName: LocalizedText;
  status: string;
  subCity: string | null;
  submittedAt: string | null;
  templateId: string;
  templateVersion: number;
  title: string;
  updatedAt: string;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

export const useServices = () =>
  useQuery({
    queryKey: ['services'],
    queryFn: () => apiRequest<ServiceSummary[]>('/services'),
    staleTime: 5 * 60_000,
  });

export const useAddresses = () =>
  useQuery({
    queryKey: ['addresses'],
    queryFn: () => apiRequest<AddressSummary[]>('/addresses'),
  });

export const useTasks = (group?: string, search?: string) =>
  useQuery({
    queryKey: ['tasks', group ?? 'all', search ?? ''],
    queryFn: () => {
      const params = new URLSearchParams();
      if (group) params.set('group', group);
      if (search) params.set('search', search);
      params.set('pageSize', '50');

      return apiRequest<Paginated<TaskListItem>>(`/tasks?${params.toString()}`);
    },
  });

export const useTask = (id: string | undefined) =>
  useQuery({
    queryKey: ['task', id],
    queryFn: () => apiRequest<TaskDetail>(`/tasks/${id}`),
    enabled: Boolean(id),
  });

export const useCreateTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (serviceKey: string) =>
      apiRequest<{ id: string; ref: string }>('/tasks', {
        method: 'POST',
        body: { serviceKey },
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
};

export const useSaveDraft = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { id: string; payload: TaskPayload }) =>
      apiRequest<{ id: string; savedAt: string }>(`/tasks/${input.id}`, {
        method: 'PATCH',
        body: { payload: input.payload },
      }),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ['task', data.id] });
    },
  });
};

export const useSubmitTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiRequest<{ id: string; status: string }>(`/tasks/${id}/submit`, { method: 'POST' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['tasks'] });
      void queryClient.invalidateQueries({ queryKey: ['task'] });
    },
  });
};

export const useCancelTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { id: string; reason?: string }) =>
      apiRequest<{ id: string; status: string }>(`/tasks/${input.id}/cancel`, {
        method: 'POST',
        body: { reason: input.reason },
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['tasks'] });
      void queryClient.invalidateQueries({ queryKey: ['task'] });
    },
  });
};

export interface UploadResult {
  attachmentId: string;
  headers: Record<string, string>;
  uploadUrl: string;
}

export interface AttachmentReadUrl {
  contentType: string;
  fileName: string;
  url: string;
}

/** Uploads a file to the private bucket with a presigned URL and verifies it. */
export async function uploadFile(input: {
  contentType: string;
  file: File;
  kind: string;
  taskId?: string;
}): Promise<UploadResult> {
  const sign = await apiRequest<UploadResult>('/uploads/sign', {
    method: 'POST',
    body: {
      contentType: input.contentType,
      fileName: input.file.name,
      kind: input.kind,
      sizeBytes: input.file.size,
      taskId: input.taskId,
    },
  });

  const response = await fetch(sign.uploadUrl, {
    method: 'PUT',
    body: input.file,
    headers: sign.headers,
  });

  if (!response.ok) {
    throw new Error('The file could not be uploaded');
  }

  // The server checks what really arrived in the bucket and marks the file
  // as verified. A file that does not follow the rules is removed.
  await apiRequest(`/attachments/${sign.attachmentId}/confirm`, { method: 'POST' });

  return sign;
}

/** Asks for a short lived URL to read an attachment. */
export function attachmentUrl(id: string) {
  return apiRequest<AttachmentReadUrl>(`/attachments/${id}/url`);
}

/** Removes an attachment of the signed in customer. */
export function removeAttachment(id: string) {
  return apiRequest<{ ok: boolean }>(`/attachments/${id}`, { method: 'DELETE' });
}
