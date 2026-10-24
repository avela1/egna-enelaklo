import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FileText, Paperclip } from 'lucide-react';
import { attachmentUrl, type TaskAttachment } from './api';

/** Formats a byte count for a human. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 102.4) / 10} KB`;

  return `${Math.round((bytes / (1024 * 1024)) * 10) / 10} MB`;
}

/**
 * Lists the attachments of a task with a view button for each.
 *
 * The files live in a private bucket: viewing asks the API for a short
 * lived signed URL and opens it.
 */
export function AttachmentList({
  attachments,
  onRemove,
}: {
  attachments: TaskAttachment[];
  onRemove?: (attachmentId: string) => void;
}) {
  const { t } = useTranslation();
  const [errorId, setErrorId] = useState<string | null>(null);

  const open = async (id: string) => {
    try {
      const read = await attachmentUrl(id);
      window.open(read.url, '_blank', 'noopener');
    } catch {
      setErrorId(id);
    }
  };

  return (
    <ul className="flex flex-col divide-y divide-line">
      {attachments.map((attachment) => (
        <li key={attachment.id} className="flex items-center gap-3 py-2">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-brand-50 text-brand-700">
            {attachment.contentType === 'application/pdf' ? (
              <FileText aria-hidden="true" className="h-4 w-4" />
            ) : (
              <Paperclip aria-hidden="true" className="h-4 w-4" />
            )}
          </span>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-sm font-semibold text-ink-900">
              {attachment.fileName}
            </span>
            <span className="text-xs text-ink-500">{formatBytes(attachment.sizeBytes)}</span>
          </span>
          {errorId === attachment.id ? (
            <span role="alert" className="text-xs font-semibold text-danger-text">
              {t('task.attachments.viewFailed')}
            </span>
          ) : null}
          <button
            type="button"
            onClick={() => void open(attachment.id)}
            className="h-control rounded-control border border-line bg-surface px-3 text-sm font-semibold text-brand-700 transition-colors hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            {t('task.attachments.view')}
          </button>
          {onRemove ? (
            <button
              type="button"
              onClick={() => onRemove(attachment.id)}
              className="h-control rounded-control border border-line bg-surface px-3 text-sm font-semibold text-danger-text transition-colors hover:bg-danger-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              {t('task.attachments.remove')}
            </button>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
