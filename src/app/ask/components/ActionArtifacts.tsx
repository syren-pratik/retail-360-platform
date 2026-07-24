'use client';

import { FileSpreadsheet, Mail, Download, ExternalLink } from 'lucide-react';

export interface SerializedArtifact {
  id: string;
  type: 'xlsx' | 'email' | 'csv';
  filename: string;
  description: string;
  mailto_href?: string;
  download_id?: string;
}

interface Props {
  artifacts?: SerializedArtifact[];
}

export default function ActionArtifacts({ artifacts }: Props) {
  if (!artifacts || artifacts.length === 0) return null;

  return (
    <div className="mt-3 space-y-2">
      {artifacts.map((a) => {
        const isEmail = a.type === 'email';
        const href = isEmail ? a.mailto_href : a.download_id ? `/api/ask/download/${a.download_id}` : undefined;
        return (
          <a
            key={a.id}
            href={href}
            target={isEmail ? undefined : '_blank'}
            rel="noopener noreferrer"
            className="flex items-center gap-3 border border-[var(--border-default)] rounded-lg bg-white px-3 py-2.5 hover:border-[var(--accent-primary)] transition-colors group"
          >
            <div className="w-8 h-8 rounded-md bg-[var(--accent-primary-light)] text-[var(--accent-primary)] flex items-center justify-center flex-shrink-0">
              {isEmail ? <Mail size={16} /> : <FileSpreadsheet size={16} />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-[var(--text-primary)] truncate">
                {a.description}
              </div>
              <div className="text-[10px] text-[var(--text-tertiary)] truncate">
                {a.filename}
              </div>
            </div>
            <div className="text-[var(--text-tertiary)] group-hover:text-[var(--accent-primary)]">
              {isEmail ? <ExternalLink size={14} /> : <Download size={14} />}
            </div>
          </a>
        );
      })}
    </div>
  );
}
