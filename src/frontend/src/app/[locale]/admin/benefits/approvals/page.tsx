'use client';

// ════════════════════════════════════════════════════════════
// /admin/benefits/approvals — Humi-styled manager approval queue.
// Replaces Camunda Tasklist for the benefit-request workflow.
// Polls the hr-workflow Fastify gateway every 10s for tasks assigned
// to the logged-in manager (dev fallback: mgr-default).
// TODO(phase-2): wire RBAC via session.user.role === 'manager'
// NOTE: spec asked for /admin/benefits/page.tsx but that path is
// already taken by the benefit-administration master-data page;
// this queue lives one level deeper to avoid clobbering it.
// ════════════════════════════════════════════════════════════

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Inbox } from 'lucide-react';
import {
  Button,
  Card,
  CardTitle,
  EmptyState,
  Modal,
  Textarea,
} from '@/components/humi';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/stores/auth-store';
import {
  listPendingTasks,
  completeTask,
  type PendingTaskSummary,
} from '@/lib/workflow-api';

const POLL_INTERVAL_MS = 10_000;

type ModalState =
  | { open: false }
  | { open: true; task: PendingTaskSummary; mode: 'approve' | 'reject' };

function formatTHB(amount: number): string {
  try {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${amount} THB`;
  }
}

export default function AdminBenefitApprovalsPage() {
  const t = useTranslations('adminBenefits');
  const userId = useAuthStore((s) => s.userId);
  const assignee = userId ?? 'mgr-default';

  const [tasks, setTasks] = useState<PendingTaskSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>({ open: false });
  const [comment, setComment] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [toast, setToast] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const next = await listPendingTasks({ assignee });
      setTasks(next);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [assignee]);

  // Initial load + 10s polling.
  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      if (cancelled) return;
      await refresh();
    };
    void tick();
    const handle = window.setInterval(tick, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(handle);
    };
  }, [refresh]);

  const openModal = (task: PendingTaskSummary, mode: 'approve' | 'reject') => {
    setComment('');
    setModal({ open: true, task, mode });
  };

  const closeModal = () => {
    if (submitting) return;
    setModal({ open: false });
    setComment('');
  };

  const onConfirm = async () => {
    if (!modal.open) return;
    const { task, mode } = modal;
    const approved = mode === 'approve';
    setSubmitting(true);
    // Optimistic remove.
    const previous = tasks;
    setTasks((curr) => curr.filter((x) => x.id !== task.id));
    try {
      await completeTask(task.id, {
        approved,
        reviewerComment: comment.trim() || undefined,
      });
      setToast(approved ? t('toast.approved') : t('toast.rejected'));
      setModal({ open: false });
      setComment('');
      // Refetch to reconcile with server state.
      void refresh();
    } catch (e) {
      // Roll back optimistic removal on error.
      setTasks(previous);
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  };

  // Auto-dismiss toast after 3s.
  useEffect(() => {
    if (!toast) return;
    const handle = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(handle);
  }, [toast]);

  const modalTitle = useMemo(() => {
    if (!modal.open) return '';
    return modal.mode === 'approve' ? t('modal.approveTitle') : t('modal.rejectTitle');
  }, [modal, t]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-display text-[length:var(--text-display-h2)] font-semibold tracking-tight text-ink">
          {t('title')}
        </h1>
        <p className="mt-1 text-body text-ink-muted">{t('subtitle')}</p>
      </div>

      {/* Error banner */}
      {error && (
        <div
          role="alert"
          className="mb-4 rounded-md border border-danger bg-danger-tint px-4 py-3 text-small text-danger"
        >
          {error}
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div
          role="status"
          className="mb-4 rounded-md border border-hairline bg-accent-soft px-4 py-3 text-small text-accent"
        >
          {toast}
        </div>
      )}

      {/* Task list */}
      {loading ? (
        <p className="py-12 text-center text-body text-ink-muted">…</p>
      ) : tasks.length === 0 ? (
        <EmptyState
          icon={Inbox}
          titleTh={t('empty')}
          titleEn={t('empty')}
          descTh=""
          descEn=""
        />
      ) : (
        <div className="flex flex-col gap-3">
          {tasks.map((task) => (
            <Card key={task.id} variant="raised">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle className="text-[length:var(--text-display-h4)]">
                      {task.variables.requesterId}
                    </CardTitle>
                    <Badge variant="info">{task.variables.benefitType}</Badge>
                  </div>
                  <p className="text-body font-semibold text-ink">
                    {formatTHB(task.variables.amount)}
                  </p>
                  <p className="text-small text-ink-muted">
                    {task.variables.description}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => openModal(task, 'reject')}
                  >
                    {t('action.reject')}
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => openModal(task, 'approve')}
                  >
                    {t('action.approve')}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Approve / Reject modal */}
      <Modal open={modal.open} onClose={closeModal} title={modalTitle}>
        <div className="flex flex-col gap-4">
          <div>
            <label
              htmlFor="reviewer-comment"
              className="mb-1 block text-small font-medium text-ink"
            >
              {t('modal.commentLabel')}
            </label>
            <Textarea
              id="reviewer-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={t('modal.commentPlaceholder')}
              rows={3}
              disabled={submitting}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              onClick={closeModal}
              disabled={submitting}
            >
              {t('modal.cancel')}
            </Button>
            <Button
              variant={modal.open && modal.mode === 'reject' ? 'danger' : 'primary'}
              loading={submitting}
              onClick={onConfirm}
            >
              {t('modal.confirm')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
