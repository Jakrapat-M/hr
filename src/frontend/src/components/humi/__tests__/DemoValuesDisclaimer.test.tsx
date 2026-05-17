import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DemoValuesDisclaimer } from '../DemoValuesDisclaimer';

vi.mock('lucide-react', () => ({
  Info: (props: React.SVGProps<SVGSVGElement>) => <svg {...props} />,
}));

describe('DemoValuesDisclaimer', () => {
  it('renders the Thai/English illustrative-number caveat for demo surfaces', () => {
    render(<DemoValuesDisclaimer />);

    const note = screen.getByRole('note', { name: 'Demo values disclaimer' });
    expect(note).toHaveTextContent('ข้อมูลตัวเลขในเดโมเป็นตัวอย่างเพื่อการนำเสนอ');
    expect(note).toHaveTextContent('Demo values are illustrative until backend integration.');
  });
});
