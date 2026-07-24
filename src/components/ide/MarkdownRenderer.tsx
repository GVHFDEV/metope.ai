'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

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

  // Convert LaTeX display delimiters \[ ... \] to $$ ... $$
  processed = processed.replace(/\\\[([\s\S]*?)\\\]/g, '$$$$$1$$$$');

  // Convert LaTeX inline delimiters \( ... \) to $ ... $
  processed = processed.replace(/\\\(([\s\S]*?)\\\)/g, '$$$1$$');

  // Ensure Markdown tables have a blank line preceding them so GFM detects them
  processed = processed.replace(/([^\n])\n(\|[^\n]+\|\n\|[-:\s|]+\|)/g, '$1\n\n$2');

  return processed;
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  const formattedContent = preprocessMarkdown(content);

  return (
    <div className="markdown-content text-xs md:text-[13px] leading-relaxed text-[#09090b] space-y-2">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-sm font-bold text-[#09090b] pt-2.5 pb-1 border-b border-[#e4e4e7] uppercase tracking-wide">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-xs font-bold text-[#09090b] pt-2 pb-1 border-b border-[#e4e4e7] uppercase tracking-wide">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-xs font-semibold text-[#BA4E20] pt-1.5 pb-0.5">
              {children}
            </h3>
          ),
          p: ({ children }) => (
            <p className="text-[#27272a] my-1 leading-relaxed">{children}</p>
          ),
          ul: ({ children }) => (
            <ul className="list-disc list-inside space-y-1 my-1 text-[#27272a] pl-2">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside space-y-1 my-1 text-[#27272a] pl-2">
              {children}
            </ol>
          ),
          li: ({ children }) => <li className="my-0.5">{children}</li>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-[#BA4E20] pl-3 py-1.5 my-2 text-[#52525b] bg-[#fdf5f2]/50 rounded-r-md italic">
              {children}
            </blockquote>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto my-2.5 rounded-lg border border-[#e4e4e7] bg-white">
              <table className="w-full text-left border-collapse text-xs">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-[#f8f9fa] border-b border-[#e4e4e7] text-[#09090b] font-semibold">
              {children}
            </thead>
          ),
          tbody: ({ children }) => (
            <tbody className="divide-y divide-[#e4e4e7] text-[#27272a]">
              {children}
            </tbody>
          ),
          tr: ({ children }) => (
            <tr className="hover:bg-[#f8f9fa] transition-colors">{children}</tr>
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
