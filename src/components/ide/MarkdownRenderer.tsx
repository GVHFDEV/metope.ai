'use client';

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Layers, Globe, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';

interface MarkdownRendererProps {
  content: string;
}

/**
 * Preprocesses raw text from Gemini/User to normalize math block delimiters
 * and fix markdown table spacing for standard GFM parsing.
 */
function preprocessMarkdown(text: string): string {
  if (!text) return '';
  let processed = text;

  // Remove any legacy "### Fontes Consultadas..." brown markdown headings
  processed = processed.replace(/###\s*Fontes Consultadas[^\n]*/gi, '');

  // Strip duplicate horizontal dividers (---) that sit directly above source link lists
  processed = processed.replace(/\n\s*---\s*(\n\s*\d+\.\s*\[)/g, '\n$1');

  // Convert LaTeX display delimiters \[ ... \] to $$ ... $$
  processed = processed.replace(/\\\[([\s\S]*?)\\\]/g, '$$$$$1$$$$');

  // Convert LaTeX inline delimiters \( ... \) to $ ... $
  processed = processed.replace(/\\\(([\s\S]*?)\\\)/g, '$$$1$$');

  // Ensure Markdown tables have a blank line preceding them so GFM detects them
  processed = processed.replace(/([^\n])\n(\|[^\n]+\|\n\|[-:\s|]+\|)/g, '$1\n\n$2');

  return processed;
}

function CompactLinkPill({ href, children }: { href?: string; children: React.ReactNode }) {
  const isExternal = href?.startsWith('http://') || href?.startsWith('https://');
  if (isExternal) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#fdf5f2] dark:bg-[#27272a] hover:bg-[#fdf5f2]/80 dark:hover:bg-[#3f3f46] border border-[#BA4E20]/25 dark:border-[#BA4E20]/40 text-[10px] text-[#27272a] dark:text-[#f4f4f5] hover:text-[#BA4E20] dark:hover:text-[#BA4E20] rounded-md transition-all font-mono cursor-pointer shrink-0 shadow-2xs group align-middle my-0.5"
      >
        <Globe className="w-3 h-3 text-[#BA4E20] shrink-0" />
        <span className="truncate max-w-[160px] font-medium">{children}</span>
        <ExternalLink className="w-2.5 h-2.5 text-[#a1a1aa] group-hover:text-[#BA4E20] transition-colors shrink-0" />
      </a>
    );
  }
  return (
    <a href={href} className="text-[#BA4E20] underline hover:text-[#9c3f19] text-xs">
      {children}
    </a>
  );
}

function CollapsibleLinkList({ children }: { children: React.ReactNode }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const childArray = React.Children.toArray(children);
  const totalCount = childArray.length;

  if (totalCount === 0) return null;

  return (
    <div className="my-2 pt-2 border-t border-[#e4e4e7]/60 dark:border-[#27272a]">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-mono text-[#71717a] dark:text-[#a1a1aa] flex items-center gap-1.5 font-medium">
          <Globe className="w-3.5 h-3.5 text-[#BA4E20]" />
          <span>Fontes consultadas ({totalCount})</span>
        </span>
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-[11px] font-mono text-[#71717a] dark:text-[#a1a1aa] hover:text-[#BA4E20] dark:hover:text-[#BA4E20] flex items-center gap-1 transition-colors cursor-pointer"
        >
          <span>{isExpanded ? 'Recolher' : 'Expandir'}</span>
          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {isExpanded && (
        <div className="flex flex-wrap items-center gap-1.5 mt-2">
          {childArray}
        </div>
      )}
    </div>
  );
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  const formattedContent = preprocessMarkdown(content);

  return (
    <div className="markdown-content text-xs md:text-[13px] leading-relaxed text-[#09090b] dark:text-[#f4f4f5] space-y-2">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-sm font-bold text-[#09090b] dark:text-[#f4f4f5] pt-2.5 pb-1 border-b border-[#e4e4e7] dark:border-[#27272a] uppercase tracking-wide">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-xs font-bold text-[#09090b] dark:text-[#f4f4f5] pt-2 pb-1 border-b border-[#e4e4e7] dark:border-[#27272a] uppercase tracking-wide">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-xs font-semibold text-[#BA4E20] pt-1.5 pb-0.5">
              {children}
            </h3>
          ),
          p: ({ children }) => (
            <p className="text-[#27272a] dark:text-[#e4e4e7] my-1 leading-relaxed">{children}</p>
          ),
          a: ({ href, children }) => <CompactLinkPill href={href}>{children}</CompactLinkPill>,
          ul: ({ children }) => {
            const childArray = React.Children.toArray(children);
            // Check if list contains link pills
            const hasLinks = childArray.some(
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (c: any) => c?.props?.children && React.Children.toArray(c.props.children).some((sub: any) => sub?.props?.href)
            );
            if (hasLinks) {
              return <CollapsibleLinkList>{children}</CollapsibleLinkList>;
            }
            return (
              <ul className="list-disc list-inside space-y-1 my-1 text-[#27272a] dark:text-[#e4e4e7] pl-2">
                {children}
              </ul>
            );
          },
          ol: ({ children }) => {
            const childArray = React.Children.toArray(children);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const hasLinks = childArray.some(
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (c: any) => c?.props?.children && React.Children.toArray(c.props.children).some((sub: any) => sub?.props?.href)
            );
            if (hasLinks) {
              return <CollapsibleLinkList>{children}</CollapsibleLinkList>;
            }
            return (
              <ol className="list-decimal list-inside space-y-1 my-1 text-[#27272a] dark:text-[#e4e4e7] pl-2">
                {children}
              </ol>
            );
          },
          li: ({ children }) => <span className="inline-block shrink-0">{children}</span>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-[#BA4E20] pl-3 py-1.5 my-2 text-[#52525b] dark:text-[#a1a1aa] bg-[#fdf5f2]/50 dark:bg-[#27272a]/50 rounded-r-md italic">
              {children}
            </blockquote>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto my-2.5 rounded-lg border border-[#e4e4e7] dark:border-[#27272a] bg-white dark:bg-[#18181b]">
              <table className="w-full text-left border-collapse text-xs">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-[#f8f9fa] dark:bg-[#27272a] border-b border-[#e4e4e7] dark:border-[#3f3f46] text-[#09090b] dark:text-[#f4f4f5] font-semibold">
              {children}
            </thead>
          ),
          tbody: ({ children }) => (
            <tbody className="divide-y divide-[#e4e4e7] dark:divide-[#27272a] text-[#27272a] dark:text-[#e4e4e7]">
              {children}
            </tbody>
          ),
          tr: ({ children }) => (
            <tr className="hover:bg-[#f8f9fa] dark:hover:bg-[#27272a]/70 transition-colors">{children}</tr>
          ),
          th: ({ children }) => (
            <th className="px-3 py-2 font-semibold text-[#09090b] border-r last:border-r-0 border-[#e4e4e7]">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-3 py-2 border-r last:border-r-0 border-[#e4e4e7] text-[#27272a]">
              {children}
            </td>
          ),
          hr: () => <hr className="border-[#e4e4e7] my-2.5" />,
          code: ({ children, className }) => {
            if (className?.includes('language-floorplan_data')) {
              return (
                <div className="p-3.5 bg-[#fdf5f2] border border-[#BA4E20]/30 rounded-xl my-3 flex items-center justify-between shadow-2xs">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white border border-[#BA4E20]/20 rounded-lg text-[#BA4E20]">
                      <Layers className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-semibold text-xs text-[#09090b]">Planta Baixa Gerada (Estudo 2D)</div>
                      <div className="text-[11px] text-[#71717a]">Geometria validada sem sobreposição e com cotas reais</div>
                    </div>
                  </div>
                </div>
              );
            }
            const isBlock = className?.includes('language-');
            if (isBlock) {
              return (
                <pre className="bg-[#18181b] text-[#f4f4f5] p-3 rounded-lg overflow-x-auto text-[11px] font-mono my-2">
                  <code>{children}</code>
                </pre>
              );
            }
            return (
              <code className="bg-[#f4f4f5] text-[#09090b] px-1.5 py-0.5 rounded text-[11px] font-mono border border-[#e4e4e7]">
                {children}
              </code>
            );
          },
        }}
      >
        {formattedContent}
      </ReactMarkdown>
    </div>
  );
}
