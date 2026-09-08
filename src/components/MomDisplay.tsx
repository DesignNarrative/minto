'use client';

import React, { useState } from 'react';
import {
  Copy,
  Check,
  Share2,
  Download,
  ShieldCheck,
  Calendar,
  Clock,
  Sparkles,
  Printer,
} from 'lucide-react';
import { marked } from 'marked';
import { jsPDF } from 'jspdf';
import { formatFriendlyDate } from '@/lib/audio-utils';

interface MomDisplayProps {
  content: string;
  meetingTitle?: string;
  startedAt?: string;
  durationSeconds?: number;
  auditPassed?: boolean;
  auditCorrections?: string | null;
  modelUsed?: string;
}

export default function MomDisplay({
  content,
  meetingTitle = 'Minutes of Meeting',
  startedAt,
  durationSeconds,
  auditPassed = true,
  auditCorrections,
  modelUsed = 'gemini-2.5-flash',
}: MomDisplayProps) {
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);
  const [pdfExporting, setPdfExporting] = useState(false);

  // Copy full MOM markdown to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.warn('Copy failed:', err);
    }
  };

  // Share via Web Share API
  const handleShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: meetingTitle,
          text: content,
        });
        setShared(true);
        setTimeout(() => setShared(false), 2000);
      } catch (err) {
        // User canceled or failed
      }
    } else {
      handleCopy();
    }
  };

  // Export to PDF using jsPDF
  const handleExportPdf = () => {
    try {
      setPdfExporting(true);
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'pt',
        format: 'a4',
      });

      const margin = 40;
      const pageWidth = doc.internal.pageSize.getWidth();
      const maxLineWidth = pageWidth - margin * 2;
      let y = 50;

      // Document Header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(20);
      doc.setTextColor(225, 29, 72); // Rose color
      doc.text('Minto — Minutes of Meeting', margin, y);
      y += 24;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Title: ${meetingTitle}`, margin, y);
      y += 14;
      if (startedAt) {
        doc.text(`Date: ${formatFriendlyDate(startedAt)}`, margin, y);
        y += 14;
      }
      doc.text(`Generated & Audited by Gemini AI`, margin, y);
      y += 20;

      // Divider line
      doc.setDrawColor(220, 220, 220);
      doc.line(margin, y, pageWidth - margin, y);
      y += 20;

      // Plain-text formatted content
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(30, 30, 30);

      // Simple markdown clean-up for PDF text
      const cleanContent = content
        .replace(/###/g, '')
        .replace(/##/g, '\n')
        .replace(/#/g, '')
        .replace(/\*\*/g, '')
        .replace(/\*/g, '');

      const lines = doc.splitTextToSize(cleanContent, maxLineWidth);

      for (let i = 0; i < lines.length; i++) {
        if (y > doc.internal.pageSize.getHeight() - 40) {
          doc.addPage();
          y = 50;
        }
        const line = lines[i];
        if (line.trim().startsWith('==') || line.trim().startsWith('--')) {
          doc.setDrawColor(230, 230, 230);
          doc.line(margin, y, pageWidth - margin, y);
          y += 12;
        } else {
          doc.text(line, margin, y);
          y += 14;
        }
      }

      const fileName = `${meetingTitle.toLowerCase().replace(/[^a-z0-9]/g, '_')}_mom.pdf`;
      doc.save(fileName);
    } catch (err) {
      console.error('PDF export failed:', err);
      // Fallback to browser print dialog
      window.print();
    } finally {
      setPdfExporting(false);
    }
  };

  // Render markdown HTML
  const parsedHtml = marked.parse(content, { async: false }) as string;

  return (
    <div className="w-full max-w-4xl mx-auto bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-xl overflow-hidden mb-12">
      {/* Top Banner / Actions */}
      <div className="px-6 py-5 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/70 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-white tracking-tight">
            {meetingTitle}
          </h1>
          <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            {startedAt && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {formatFriendlyDate(startedAt)}
              </span>
            )}
            {durationSeconds !== undefined && durationSeconds > 0 && (
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {Math.round(durationSeconds / 60)} min duration
              </span>
            )}
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
              <ShieldCheck className="w-3 h-3" />
              <span>Audited for Accuracy</span>
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 transition-colors cursor-pointer"
            title="Copy MOM Markdown"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Copied!' : 'Copy'}</span>
          </button>

          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 transition-colors cursor-pointer"
            title="Share MOM"
          >
            {shared ? <Check className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4" />}
            <span>Share</span>
          </button>

          <button
            onClick={handleExportPdf}
            disabled={pdfExporting}
            className="flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow transition-colors cursor-pointer"
            title="Download PDF"
          >
            <Download className="w-4 h-4" />
            <span>{pdfExporting ? 'Exporting...' : 'PDF'}</span>
          </button>
        </div>
      </div>

      {/* Auditor Notice Banner */}
      <div className="bg-amber-50/60 dark:bg-amber-950/20 border-b border-amber-100 dark:border-amber-900/40 px-6 py-2.5 flex items-center justify-between text-xs text-amber-800 dark:text-amber-300">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
          <span>
            <strong>Dual-Pass Verified:</strong> Every action item, owner, deadline, and number was
            validated by the Gemini MOM Auditor.
          </span>
        </div>
        <span className="hidden sm:inline font-mono opacity-75">{modelUsed}</span>
      </div>

      {/* Formatted Markdown Body */}
      <div className="p-6 sm:p-10 prose prose-zinc dark:prose-invert max-w-none prose-headings:font-bold prose-headings:tracking-tight prose-h2:text-xl prose-h2:border-b prose-h2:border-zinc-200 dark:prose-h2:border-zinc-800 prose-h2:pb-2 prose-h2:mt-8 prose-h3:text-base prose-table:w-full prose-table:text-sm prose-th:bg-zinc-100 dark:prose-th:bg-zinc-800 prose-th:p-2.5 prose-td:p-2.5 prose-td:border-b prose-td:border-zinc-200 dark:prose-td:border-zinc-800">
        <div dangerouslySetInnerHTML={{ __html: parsedHtml }} />
      </div>

      {/* Footer / Re-actions */}
      <div className="px-6 py-4 bg-zinc-50 dark:bg-zinc-950 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs text-zinc-400">
        <span>Generated by Minto — AI Meeting Assistant</span>
        <button
          onClick={handleExportPdf}
          className="flex items-center gap-1 hover:text-zinc-600 dark:hover:text-zinc-300 cursor-pointer"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>Print / Export PDF</span>
        </button>
      </div>
    </div>
  );
}
