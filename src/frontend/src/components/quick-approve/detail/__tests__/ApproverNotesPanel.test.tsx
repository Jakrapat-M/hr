import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { ApproverNotesPanel } from '../ApproverNotesPanel';

const messages = {
  quick_approve_detail: {
    noteTitle: 'Note',
    notePlaceholder: 'Add a note…',
    sendBackCommentTitle: 'Send Back Comment',
  },
};

function renderPanel(sendBackComment?: string) {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <ApproverNotesPanel sendBackComment={sendBackComment} />
    </NextIntlClientProvider>,
  );
}

describe('ApproverNotesPanel', () => {
  it('renders an editable Note textarea', () => {
    renderPanel();
    const note = screen.getByPlaceholderText('Add a note…') as HTMLTextAreaElement;
    fireEvent.change(note, { target: { value: 'check eligibility' } });
    expect(note.value).toBe('check eligibility');
  });

  it('shows "-" in the read-only Send Back Comment box when none is set', () => {
    renderPanel();
    const readOnly = screen.getByDisplayValue('-') as HTMLTextAreaElement;
    expect(readOnly.readOnly).toBe(true);
  });

  it('fills the read-only Send Back Comment box with the persisted reason', () => {
    renderPanel('เอกสารไม่ครบ');
    const readOnly = screen.getByDisplayValue('เอกสารไม่ครบ') as HTMLTextAreaElement;
    expect(readOnly.readOnly).toBe(true);
  });
});
