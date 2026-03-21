/**
 * Safe Markdown renderer — sanitizes LLM-generated markdown.
 * Blocks images (exfiltration vector) and validates link URLs.
 */
import ReactMarkdown, { type Components } from 'react-markdown';

function isSafeUrl(href: string): boolean {
  try {
    const url = new URL(href, window.location.origin);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

const safeComponents: Components = {
  // Block images — can be used for data exfiltration via URL params
  img: () => null,
  // Validate link URLs — block javascript: and other dangerous schemes
  a: ({ href, children, ...props }) => {
    if (!href || !isSafeUrl(href)) {
      return <span>{children}</span>;
    }
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
        {children}
      </a>
    );
  },
};

export function SafeMarkdown({ children }: { children: string }) {
  return <ReactMarkdown components={safeComponents}>{children}</ReactMarkdown>;
}
