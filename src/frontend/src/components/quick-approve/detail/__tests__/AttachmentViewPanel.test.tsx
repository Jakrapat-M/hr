import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { AttachmentViewPanel } from '../AttachmentViewPanel';

const messages = {
  quick_approve_detail: {
    attachmentsTitle: 'Attachment View',
    attachmentsView: 'View',
    attachmentsHide: 'Hide',
    attachmentsDownload: 'Download',
    attachmentsEmpty: 'No attachments',
  },
};

function renderPanel(attachments: string[]) {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <AttachmentViewPanel attachments={attachments} />
    </NextIntlClientProvider>,
  );
}

describe('AttachmentViewPanel', () => {
  it('renders one row per attachment with a Download anchor', () => {
    renderPanel(['opd-receipt.pdf', 'doctor-note.pdf', 'hospital-invoice.pdf']);
    expect(screen.getByText('opd-receipt.pdf')).toBeInTheDocument();
    expect(screen.getByText('doctor-note.pdf')).toBeInTheDocument();
    expect(screen.getByText('hospital-invoice.pdf')).toBeInTheDocument();

    const downloads = screen.getAllByText('Download');
    expect(downloads).toHaveLength(3);
    const firstAnchor = downloads[0].closest('a');
    expect(firstAnchor).toHaveAttribute('href', '/sample-claims/opd-receipt.pdf');
    expect(firstAnchor).toHaveAttribute('download', 'opd-receipt.pdf');
  });

  it('is list-only until View is clicked, then renders the PDF inline', () => {
    renderPanel(['opd-receipt.pdf']);
    expect(document.querySelector('iframe')).toBeNull();

    fireEvent.click(screen.getByText('View'));
    const frame = document.querySelector('iframe');
    expect(frame).not.toBeNull();
    expect(frame).toHaveAttribute('src', '/sample-claims/opd-receipt.pdf');

    // Toggling Hide removes the inline viewer.
    fireEvent.click(screen.getByText('Hide'));
    expect(document.querySelector('iframe')).toBeNull();
  });

  it('shows the empty hint when there are no attachments', () => {
    renderPanel([]);
    expect(screen.getByText('No attachments')).toBeInTheDocument();
  });
});
