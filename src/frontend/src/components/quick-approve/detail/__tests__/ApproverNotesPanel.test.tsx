import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { ApproverNotesPanel } from '../ApproverNotesPanel';

const messages = {
  quick_approve_detail: {
    approveSendBackCommentTitle: 'Approve / Send Back Comment',
    approveSendBackCommentPlaceholder: 'Add a comment for approval or send back…',
  },
};

function renderPanel(value = '', onChange = vi.fn()) {
  const utils = render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <ApproverNotesPanel value={value} onChange={onChange} />
    </NextIntlClientProvider>,
  );
  return { onChange, ...utils };
}

describe('ApproverNotesPanel', () => {
  it('renders the renamed Approve / Send Back Comment field', () => {
    renderPanel();
    expect(screen.getByText('Approve / Send Back Comment')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Add a comment for approval or send back…')).toBeInTheDocument();
  });

  it('reflects the controlled value', () => {
    renderPanel('check eligibility');
    const field = screen.getByPlaceholderText(
      'Add a comment for approval or send back…',
    ) as HTMLTextAreaElement;
    expect(field.value).toBe('check eligibility');
  });

  it('calls onChange when the approver types', () => {
    const { onChange } = renderPanel();
    const field = screen.getByPlaceholderText('Add a comment for approval or send back…');
    fireEvent.change(field, { target: { value: 'needs receipt' } });
    expect(onChange).toHaveBeenCalledWith('needs receipt');
  });

  it('no longer renders a read-only Send Back Comment box', () => {
    renderPanel();
    expect(screen.queryByText('Send Back Comment')).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue('-')).not.toBeInTheDocument();
  });
});
