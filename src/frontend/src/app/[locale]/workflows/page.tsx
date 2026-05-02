'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { usePathname } from 'next/navigation';
import {
  Plus,
  Calendar,
  Clock,
  ArrowRightLeft,
  DollarSign,
  FileText,
  Briefcase,
  ChevronDown,
  ChevronRight,
  CheckCircle,
  RotateCcw,
  XCircle,
  User,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { Button, Modal, Card, EmptyState } from '@/components/humi';
import { FormField } from '@/components/ui/form-field';
import { Badge } from '@/components/ui/badge';
import { WorkflowDetailModal } from '@/components/workflows/workflow-detail-modal';
import { ApprovalTimelineChain } from '@/components/quick-approve/ApprovalChain';
import { useWorkflows } from '@/hooks/use-workflows';
import { formatDate } from '@/lib/date';
import type { WorkflowItem, WorkflowType, WorkflowStatus } from '@/hooks/use-workflows';

type TabKey = 'forApproval' | 'sentBack' | 'approved' | 'rejected';

const STATUS_BADGE_VARIANT: Record<WorkflowStatus, 'warning' | 'success' | 'error' | 'info' | 'neutral'> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'error',
  sent_back: 'info',
};

const TYPE_ICONS: Record<WorkflowType, React.ReactNode> = {
  leave: <Calendar className="h-4 w-4" />,
  overtime: <Clock className="h-4 w-4" />,
  time_correction: <Clock className="h-4 w-4" />,
  transfer: <ArrowRightLeft className="h-4 w-4" />,
  payroll_change: <DollarSign className="h-4 w-4" />,
  personal_info: <FileText className="h-4 w-4" />,
  resignation: <Briefcase className="h-4 w-4" />,
};

function daysWaiting(submittedDate: string): number {
  return Math.floor((Date.now() - new Date(submittedDate).getTime()) / 86400000);
}

function WorkflowRow({
  workflow,
  locale,
  showActions,
  onViewDetail,
  onApprove,
  onReject,
  onSendBack,
}: {
  workflow: WorkflowItem;
  locale: string;
  showActions: boolean;
  onViewDetail: (w: WorkflowItem) => void;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  onSendBack?: (id: string) => void;
}) {
  const t = useTranslations('workflow');
  const [expanded, setExpanded] = useState(false);
  const isPending = workflow.status === 'pending';
  const days = daysWaiting(workflow.submittedDate);
  const icon = TYPE_ICONS[workflow.type] ?? <FileText className="h-4 w-4" />;

  // Map WorkflowStep → ApprovalStep shape for ApprovalTimelineChain
  const chainSteps = workflow.steps.map((s) => ({
    step: s.step,
    approver: s.approverName,
    status: (s.status === 'sent_back' ? 'rejected' : s.status) as 'approved' | 'pending' | 'rejected',
    date: s.actionDate,
    comment: s.comment,
  }));

  const activeStep = workflow.currentStep - 1;

  const getStatusLabel = (status: WorkflowStatus) => {
    switch (status) {
      case 'pending': return locale === 'th' ? 'รอดำเนินการ' : 'Pending';
      case 'approved': return locale === 'th' ? 'อนุมัติแล้ว' : 'Approved';
      case 'rejected': return locale === 'th' ? 'ปฏิเสธ' : 'Rejected';
      case 'sent_back': return locale === 'th' ? 'ส่งคืน' : 'Sent Back';
      default: return status;
    }
  };

  return (
    <div className="divide-y divide-hairline">
      {/* Main row */}
      <div
        className="group px-4 py-3 hover:bg-surface-raised/50 transition-colors cursor-pointer"
        onClick={() => onViewDetail(workflow)}
      >
        <div className="flex items-start gap-3">
          {/* Type icon */}
          <div className="w-8 h-8 rounded-[var(--radius-sm)] bg-surface-raised flex items-center justify-center text-ink-muted shrink-0 mt-0.5">
            {icon}
          </div>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            {/* Row 1: type label + status badge + days waiting */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-ink">{workflow.typeLabel}</span>
              <Badge variant={STATUS_BADGE_VARIANT[workflow.status]}>
                {getStatusLabel(workflow.status)}
              </Badge>
              <span className={`text-xs font-mono ${days > 3 ? 'text-warning font-semibold' : 'text-ink-muted'}`}>
                {days} {locale === 'th' ? 'ด.' : 'd.'}
              </span>
            </div>

            {/* Row 2: description */}
            <p className="text-xs text-ink-muted truncate mt-0.5">{workflow.description}</p>

            {/* Row 3: approval chain (compact, single line) */}
            <div className="mt-1.5">
              <ApprovalTimelineChain
                steps={chainSteps}
                activeStep={isPending ? activeStep : undefined}
                size="sm"
              />
            </div>

            {/* Row 4: requester + date */}
            <div className="flex items-center gap-3 mt-1 text-xs text-ink-muted flex-wrap">
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {workflow.requesterName}
              </span>
              <span>{formatDate(workflow.submittedDate, 'medium', locale)}</span>
              {workflow.department && <span className="text-ink-faint">{workflow.department}</span>}
            </div>
          </div>

          {/* Right: expand toggle */}
          <button
            className="p-1 rounded-[var(--radius-sm)] hover:bg-surface-raised text-ink-muted shrink-0"
            onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v); }}
            aria-label={expanded ? 'Collapse history' : 'Expand history'}
          >
            {expanded
              ? <ChevronDown className="h-4 w-4" />
              : <ChevronRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
            }
          </button>
        </div>

        {/* Inline action buttons — pending only */}
        {showActions && isPending && (onApprove || onReject || onSendBack) && (
          <div className="hidden group-hover:flex gap-2 mt-2 ml-11">
            {onApprove && (
              <Button
                size="sm"
                className="bg-success hover:bg-success/90 text-white h-7 text-xs"
                onClick={(e) => { e.stopPropagation(); onApprove(workflow.id); }}
              >
                <CheckCircle className="h-3 w-3 mr-1" />
                {t('approve')}
              </Button>
            )}
            {onSendBack && (
              <Button
                size="sm"
                variant="secondary"
                className="border-warning text-warning hover:bg-warning-tint h-7 text-xs"
                onClick={(e) => { e.stopPropagation(); onSendBack(workflow.id); }}
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                {t('sendBack')}
              </Button>
            )}
            {onReject && (
              <Button
                size="sm"
                variant="secondary"
                className="border-danger text-danger hover:bg-danger-tint h-7 text-xs"
                onClick={(e) => { e.stopPropagation(); onReject(workflow.id); }}
              >
                <XCircle className="h-3 w-3 mr-1" />
                {t('reject')}
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Collapsible history timeline */}
      {expanded && (
        <div className="px-4 py-3 bg-surface-raised/30 ml-11">
          <p className="text-xs font-medium text-ink-muted mb-2 uppercase tracking-wide">
            {locale === 'th' ? 'ประวัติการดำเนินการ' : 'Audit History'}
          </p>
          <ol className="space-y-2">
            {/* Submitted entry */}
            <li className="flex gap-3 text-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-soft mt-1.5 shrink-0" />
              <div>
                <span className="font-medium text-ink">{workflow.requesterName}</span>
                {' '}
                <span className="text-ink-muted">{locale === 'th' ? 'ส่งคำขอ' : 'Submitted'}</span>
                <span className="ml-2 text-ink-faint">{formatDate(workflow.submittedDate, 'medium', locale)}</span>
              </div>
            </li>
            {/* Each step that has been actioned */}
            {workflow.steps.filter((s) => s.actionDate).map((s) => {
              const isApproved = s.status === 'approved';
              const isRejected = s.status === 'rejected';
              const isSentBack = s.status === 'sent_back';
              const dotColor = isApproved ? 'bg-success' : isRejected ? 'bg-danger' : 'bg-warning';
              const actionLabel = isApproved
                ? (locale === 'th' ? 'อนุมัติ' : 'Approved')
                : isRejected
                ? (locale === 'th' ? 'ปฏิเสธ' : 'Rejected')
                : isSentBack
                ? (locale === 'th' ? 'ส่งคืน' : 'Sent Back')
                : s.status;
              return (
                <li key={s.step} className="flex gap-3 text-xs">
                  <span className={`w-1.5 h-1.5 rounded-full ${dotColor} mt-1.5 shrink-0`} />
                  <div>
                    <span className="font-medium text-ink">{s.approverName}</span>
                    {' '}
                    <span className="text-ink-muted">{actionLabel}</span>
                    {s.actionDate && (
                      <span className="ml-2 text-ink-faint">{formatDate(s.actionDate, 'medium', locale)}</span>
                    )}
                    {s.comment && (
                      <p className="text-ink-muted mt-0.5 italic">&ldquo;{s.comment}&rdquo;</p>
                    )}
                  </div>
                </li>
              );
            })}
            {/* Pending steps */}
            {workflow.steps.filter((s) => !s.actionDate && s.status === 'pending').map((s) => (
              <li key={s.step} className="flex gap-3 text-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-surface-raised border border-hairline mt-1.5 shrink-0" />
                <div>
                  <span className="font-medium text-ink-muted">{s.approverName}</span>
                  {' '}
                  <span className="text-ink-faint">{locale === 'th' ? 'รอดำเนินการ' : 'Awaiting'}</span>
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

export default function WorkflowsPage() {
  const t = useTranslations('workflow');
  const pathname = usePathname();
  const locale = pathname.startsWith('/th') ? 'th' : 'en';
  const currentUserId = useAuthStore((s) => s.userId) ?? 'EMP000';
  const currentUserName = useAuthStore((s) => s.username) ?? 'ผู้ใช้';

  const [activeTab, setActiveTab] = useState<TabKey>('forApproval');
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowItem | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newRequest, setNewRequest] = useState({ type: 'leave' as WorkflowType, description: '' });

  const { workflows, pending, sentBack, approved, rejected, loading, approveWorkflow, rejectWorkflow, sendBackWorkflow, createWorkflow } =
    useWorkflows();

  const handleCreateRequest = async () => {
    if (!newRequest.description.trim()) return;
    const typeLabels: Record<string, string> = {
      leave: 'Leave Request',
      overtime: 'Overtime Request',
      time_correction: 'Time Correction Request',
      payroll_change: 'Expense Request',
      personal_info: 'Change Request',
    };
    const newWorkflow: WorkflowItem = {
      id: `WF-${String(workflows.length + 1).padStart(3, '0')}`,
      type: newRequest.type,
      typeLabel: typeLabels[newRequest.type] || newRequest.type,
      requesterName: currentUserName,
      requesterId: currentUserId,
      department: 'My Department',
      description: newRequest.description,
      submittedDate: new Date().toISOString(),
      urgency: 'normal',
      status: 'pending',
      currentStep: 1,
      totalSteps: 2,
      steps: [
        { step: 1, approverName: 'Manager', approverId: 'MGR001', status: 'pending' },
        { step: 2, approverName: 'HR', approverId: 'HR001', status: 'pending' },
      ],
    };
    await createWorkflow(newWorkflow);
    setCreateModalOpen(false);
    setNewRequest({ type: 'leave', description: '' });
    setActiveTab('forApproval');
  };

  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: 'forApproval', label: t('forApproval'), count: pending.length },
    { key: 'sentBack', label: t('sentBack'), count: sentBack.length },
    { key: 'approved', label: t('approved'), count: approved.length },
    { key: 'rejected', label: t('rejected'), count: rejected.length },
  ];

  const currentWorkflows = {
    forApproval: pending,
    sentBack: sentBack,
    approved: approved,
    rejected: rejected,
  }[activeTab];

  const isPendingTab = activeTab === 'forApproval';

  return (
    <>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-ink">{t('title')}</h1>
            <p className="text-sm text-ink-muted mt-0.5">
              {locale === 'th' ? 'ตรวจสอบและดำเนินการคำขอ workflow' : 'Review and action pending workflow requests'}
            </p>
          </div>
          <Button size="sm" onClick={() => setCreateModalOpen(true)}>
            <Plus className="h-4 w-4 mr-1.5" />
            {t('createRequest')}
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-4 border-b border-hairline">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition ${
                activeTab === tab.key
                  ? 'border-accent text-accent'
                  : 'border-transparent text-ink-muted hover:text-ink-soft hover:border-hairline'
              }`}
            >
              {tab.label}
              <span className={`ml-1.5 px-1.5 py-0.5 text-xs rounded-full ${
                activeTab === tab.key ? 'bg-accent-tint text-accent' : 'bg-surface-raised text-ink-muted'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Workflow list */}
        {loading ? (
          <Card className="divide-y divide-hairline">
            {[1, 2, 3].map((i) => (
              <div key={i} className="px-4 py-3 animate-pulse flex gap-3">
                <div className="w-8 h-8 bg-surface-raised rounded-[var(--radius-sm)]" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-surface-raised rounded w-1/3" />
                  <div className="h-3 bg-surface-raised rounded w-2/3" />
                  <div className="h-3 bg-surface-raised rounded w-1/2" />
                </div>
              </div>
            ))}
          </Card>
        ) : currentWorkflows.length === 0 ? (
          <EmptyState
            icon={FileText}
            titleTh="ไม่มีคำขอ"
            titleEn="No requests"
            descTh="ยังไม่มีรายการในแท็บนี้"
            descEn="There are no items in this tab yet."
          />
        ) : (
          <Card className="divide-y divide-hairline overflow-hidden">
            {currentWorkflows.map((wf) => (
              <WorkflowRow
                key={wf.id}
                workflow={wf}
                locale={locale}
                showActions={isPendingTab}
                onViewDetail={(w) => { setSelectedWorkflow(w); setModalOpen(true); }}
                onApprove={isPendingTab ? (id) => approveWorkflow(id) : undefined}
                onReject={isPendingTab ? (id) => rejectWorkflow(id) : undefined}
                onSendBack={isPendingTab ? (id) => sendBackWorkflow(id) : undefined}
              />
            ))}
          </Card>
        )}
      </div>

      {/* Detail modal */}
      <WorkflowDetailModal
        workflow={selectedWorkflow}
        open={modalOpen}
        onClose={() => { setModalOpen(false); setSelectedWorkflow(null); }}
        onApprove={isPendingTab ? (id: string, comment?: string) => approveWorkflow(id, comment) : undefined}
        onReject={isPendingTab ? (id: string, comment?: string) => rejectWorkflow(id, comment) : undefined}
        onSendBack={isPendingTab ? (id: string, comment?: string) => sendBackWorkflow(id, comment) : undefined}
      />

      {/* Create Request modal */}
      <Modal open={createModalOpen} onClose={() => setCreateModalOpen(false)} title="Create New Request">
        <div className="space-y-4">
          <FormField
            label="Request Type"
            name="requestType"
            type="combobox"
            value={newRequest.type}
            onChange={(v) => setNewRequest((p) => ({ ...p, type: v as WorkflowType }))}
            options={[
              { value: 'leave', label: 'Leave' },
              { value: 'payroll_change', label: 'Expense' },
              { value: 'overtime', label: 'Overtime' },
              { value: 'time_correction', label: 'Time Correction' },
              { value: 'personal_info', label: 'Change Request' },
            ]}
          />
          <FormField
            label="Description"
            name="requestDesc"
            type="textarea"
            value={newRequest.description}
            onChange={(v) => setNewRequest((p) => ({ ...p, description: v }))}
            placeholder="Describe your request..."
            required
          />
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={() => setCreateModalOpen(false)}>Cancel</Button>
          <Button onClick={handleCreateRequest} disabled={!newRequest.description.trim()}>Submit Request</Button>
        </div>
      </Modal>
    </>
  );
}
