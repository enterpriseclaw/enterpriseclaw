import React from 'react';
import { cn } from '@/lib/utils';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  // Enhanced GitHub Flavored Markdown parser
  const parseMarkdown = (text: string): React.ReactElement => {
    const lines = text.split('\n');
    const elements: React.ReactElement[] = [];
    let currentParagraph: string[] = [];
    let listItems: string[] = [];
    let inCodeBlock = false;
    let codeBlockContent: string[] = [];
    let codeBlockLang = '';

    const flushParagraph = () => {
      if (currentParagraph.length > 0) {
        elements.push(
          <p key={elements.length} className="mb-4 text-sm leading-relaxed text-foreground">
            {formatInlineMarkdown(currentParagraph.join(' '))}
          </p>
        );
        currentParagraph = [];
      }
    };

    const flushList = () => {
      if (listItems.length > 0) {
        elements.push(
          <ul key={elements.length} className="mb-4 space-y-1 text-sm">
            {listItems.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-muted-foreground mt-1.5 text-xs">•</span>
                <span className="flex-1">{formatInlineMarkdown(item)}</span>
              </li>
            ))}
          </ul>
        );
        listItems = [];
      }
    };

    const flushCodeBlock = () => {
      if (codeBlockContent.length > 0) {
        elements.push(
          <div key={elements.length} className="mb-4">
            <pre className="rounded-md bg-muted border p-3 overflow-x-auto">
              <code className={cn(
                "text-xs font-mono text-foreground",
                codeBlockLang && `language-${codeBlockLang}`
              )}>
                {codeBlockContent.join('\n')}
              </code>
            </pre>
          </div>
        );
        codeBlockContent = [];
        codeBlockLang = '';
      }
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Handle code blocks
      if (trimmed.startsWith('```')) {
        if (inCodeBlock) {
          flushCodeBlock();
          inCodeBlock = false;
        } else {
          flushParagraph();
          flushList();
          inCodeBlock = true;
          codeBlockLang = trimmed.slice(3).trim();
        }
        continue;
      }

      if (inCodeBlock) {
        codeBlockContent.push(line);
        continue;
      }

      // Handle headings
      if (trimmed.startsWith('### ')) {
        flushParagraph();
        flushList();
        elements.push(
          <h3 key={elements.length} className="mb-3 mt-6 first:mt-0 text-sm font-semibold text-foreground">
            {trimmed.slice(4)}
          </h3>
        );
        continue;
      }

      if (trimmed.startsWith('## ')) {
        flushParagraph();
        flushList();
        elements.push(
          <h2 key={elements.length} className="mb-3 mt-6 first:mt-0 text-base font-semibold text-foreground border-b border-border pb-2">
            {trimmed.slice(3)}
          </h2>
        );
        continue;
      }

      if (trimmed.startsWith('# ')) {
        flushParagraph();
        flushList();
        elements.push(
          <h1 key={elements.length} className="mb-4 mt-8 first:mt-0 text-lg font-bold text-foreground border-b border-border pb-2">
            {trimmed.slice(2)}
          </h1>
        );
        continue;
      }

      // Handle blockquotes
      if (trimmed.startsWith('> ')) {
        flushParagraph();
        flushList();
        elements.push(
          <blockquote key={elements.length} className="mb-4 border-l-4 border-primary/30 pl-4 italic text-sm text-muted-foreground bg-muted/30 py-2 rounded-r">
            {formatInlineMarkdown(trimmed.slice(2))}
          </blockquote>
        );
        continue;
      }

      // Handle list items
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        flushParagraph();
        listItems.push(trimmed.slice(2));
        continue;
      }

      // Handle numbered lists
      if (/^\d+\. /.test(trimmed)) {
        flushParagraph();
        listItems.push(trimmed.replace(/^\d+\. /, ''));
        continue;
      }

      // Handle horizontal rules
      if (trimmed === '---' || trimmed === '***') {
        flushParagraph();
        flushList();
        elements.push(
          <hr key={elements.length} className="my-6 border-border" />
        );
        continue;
      }

      // Handle empty lines
      if (trimmed === '') {
        flushParagraph();
        flushList();
        continue;
      }

      // Regular text - add to current paragraph
      currentParagraph.push(line);
    }

    // Flush remaining content
    flushParagraph();
    flushList();
    flushCodeBlock();

    return (
      <div className={cn("prose prose-sm max-w-none dark:prose-invert", className)}>
        {elements.length > 0 ? elements : (
          <p className="text-sm text-foreground">{content}</p>
        )}
      </div>
    );
  };
  
  const formatInlineMarkdown = (text: string): React.ReactNode => {
    // Handle inline code first
    let parts = text.split(/(`[^`]+`)/g);
    
    return parts.map((part, index) => {
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code key={index} className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono text-foreground">
            {part.slice(1, -1)}
          </code>
        );
      }
      
      // Handle bold **text** and __text__
      const boldParts = part.split(/(\*\*[^*]+\*\*|__[^_]+__)/g);
      
      return boldParts.map((boldPart, boldIndex) => {
        if ((boldPart.startsWith('**') && boldPart.endsWith('**')) || 
            (boldPart.startsWith('__') && boldPart.endsWith('__'))) {
          return (
            <strong key={`${index}-${boldIndex}`} className="font-semibold text-foreground">
              {boldPart.slice(2, -2)}
            </strong>
          );
        }
        
        // Handle italic *text* and _text_
        const italicParts = boldPart.split(/(\*[^*]+\*|_[^_]+_)/g);
        return italicParts.map((italicPart, italicIndex) => {
          if ((italicPart.startsWith('*') && italicPart.endsWith('*') && !italicPart.startsWith('**')) ||
              (italicPart.startsWith('_') && italicPart.endsWith('_') && !italicPart.startsWith('__'))) {
            return (
              <em key={`${index}-${boldIndex}-${italicIndex}`} className="italic text-foreground">
                {italicPart.slice(1, -1)}
              </em>
            );
          }
          
          // Handle links [text](url)
          const linkParts = italicPart.split(/(\[[^\]]+\]\([^)]+\))/g);
          return linkParts.map((linkPart, linkIndex) => {
            const linkMatch = linkPart.match(/\[([^\]]+)\]\(([^)]+)\)/);
            if (linkMatch) {
              return (
                <a 
                  key={`${index}-${boldIndex}-${italicIndex}-${linkIndex}`}
                  href={linkMatch[2]}
                  className="text-primary underline underline-offset-2 hover:text-primary/80"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {linkMatch[1]}
                </a>
              );
            }
            return linkPart;
          });
        });
      });
    });
  };
  
  return parseMarkdown(content);
}