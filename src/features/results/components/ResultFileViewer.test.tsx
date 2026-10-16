import { describe, expect, it } from 'vitest';
import { render, screen } from '../../../test/render';
import { ResultFileViewer, kindForResultFileUrl } from './ResultFileViewer';

describe('kindForResultFileUrl', () => {
  it('detects PDFs regardless of case or query string', () => {
    expect(kindForResultFileUrl('https://example.com/r.PDF')).toBe('pdf');
    expect(kindForResultFileUrl('https://example.com/r.pdf?token=abc')).toBe('pdf');
  });

  it('detects common image extensions', () => {
    expect(kindForResultFileUrl('https://example.com/scan.png')).toBe('image');
    expect(kindForResultFileUrl('https://example.com/scan.JPG')).toBe('image');
    expect(kindForResultFileUrl('https://example.com/scan.webp')).toBe('image');
  });

  it('falls back to unknown instead of guessing', () => {
    expect(kindForResultFileUrl('https://example.com/result')).toBe('unknown');
    expect(kindForResultFileUrl('https://example.com/result.tiff')).toBe('unknown');
  });
});

describe('ResultFileViewer', () => {
  it('renders a PDF with the built-in viewer, no CDN script, and a download link', () => {
    render(<ResultFileViewer fileUrl="https://example.com/results/r.pdf" testName="CBC" />);

    const frame = screen.getByTitle('CBC result (PDF)');
    expect(frame).toBeInTheDocument();
    expect(frame.tagName).toBe('IFRAME');

    // Native-only: no third-party viewer script is ever injected.
    expect(document.querySelectorAll('script[src]').length).toBe(0);

    const download = screen.getByRole('link', { name: /download result/i });
    expect(download).toHaveAttribute('href', 'https://example.com/results/r.pdf');
    expect(download).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('renders images lazily with alt text and a download link', () => {
    render(<ResultFileViewer fileUrl="https://example.com/results/scan.jpg" testName="X-ray" />);

    const img = screen.getByAltText('X-ray result');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('loading', 'lazy');
    expect(screen.getByRole('link', { name: /download result/i })).toBeInTheDocument();
  });

  it('falls back to download-only for unknown file types', () => {
    render(<ResultFileViewer fileUrl="https://example.com/results/blob" testName="CBC" />);

    expect(screen.getByText(/preview isn/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /download result/i })).toBeInTheDocument();
  });
});
