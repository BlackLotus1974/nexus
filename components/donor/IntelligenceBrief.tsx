'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import type { Donor, IntelligenceData } from '@/types';

export interface IntelligenceBriefProps {
  donor: Donor;
  onExportPDF?: () => void;
  className?: string;
}

interface SectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function CollapsibleSection({ title, children, defaultOpen = true }: SectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-gray-200 dark:border-gray-700 last:border-0">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between py-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors px-1"
      >
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {title}
        </h3>
        <svg
          className={`h-5 w-5 text-gray-500 transition-transform ${isOpen ? 'transform rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && (
        <div className="pb-4 px-1">
          {children}
        </div>
      )}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-sm text-gray-500 dark:text-gray-400 italic">
      {message}
    </div>
  );
}

function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
    >
      {copied ? (
        <>
          <svg className="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          Copied!
        </>
      ) : (
        <>
          <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          {label}
        </>
      )}
    </button>
  );
}

export function IntelligenceBrief({ donor, onExportPDF, className = '' }: IntelligenceBriefProps) {
  const intelligence = donor.intelligenceData || {} as IntelligenceData;
  const formattedDate = new Date(donor.lastUpdated).toLocaleString();

  return (
    <Card className={className} padding={false}>
      <CardHeader className="px-6 pt-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {donor.name}
            </h2>
            {donor.location && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 flex items-center">
                <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {donor.location}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={onExportPDF}
            >
              <svg className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export PDF
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-4 text-xs text-gray-500 dark:text-gray-400">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Last updated: {formattedDate}
        </div>
      </CardHeader>

      <CardBody className="px-6 pb-6">
        <div className="space-y-0">
          {/* Overview Section */}
          <CollapsibleSection title="Overview">
            {intelligence.background ? (
              <div className="space-y-2">
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {intelligence.background}
                </p>
                <CopyButton text={intelligence.background} />
              </div>
            ) : (
              <EmptyState message="No background information available" />
            )}
          </CollapsibleSection>

          {/* Interests & Causes Section */}
          <CollapsibleSection title="Cause Interests">
            {intelligence.interests && intelligence.interests.length > 0 ? (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {intelligence.interests.map((interest, index) => (
                    <Badge key={index} variant="info">
                      {interest}
                    </Badge>
                  ))}
                </div>
                <CopyButton
                  text={intelligence.interests.join(', ')}
                  label="Copy Interests"
                />
              </div>
            ) : (
              <EmptyState message="No cause interests identified" />
            )}
          </CollapsibleSection>

          {/* Giving History Section */}
          <CollapsibleSection title="Donation History">
            {intelligence.givingHistory && intelligence.givingHistory.length > 0 ? (
              <div className="space-y-3">
                <div className="space-y-2">
                  {intelligence.givingHistory.map((record, index) => (
                    <div
                      key={index}
                      className="flex items-start justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {record.organization}
                        </p>
                        {record.cause && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {record.cause}
                          </p>
                        )}
                        {record.date && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {record.date}
                          </p>
                        )}
                      </div>
                      {record.amount && (
                        <div className="text-sm font-semibold text-green-600 dark:text-green-400">
                          ${record.amount.toLocaleString()}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <CopyButton
                  text={intelligence.givingHistory.map(r =>
                    `${r.organization}${r.amount ? ` - $${r.amount.toLocaleString()}` : ''}${r.date ? ` (${r.date})` : ''}`
                  ).join('\n')}
                  label="Copy History"
                />
              </div>
            ) : (
              <EmptyState message="No donation history available" />
            )}
          </CollapsibleSection>

          {/* Connections Section */}
          <CollapsibleSection title="Connections & Network">
            {intelligence.connections && intelligence.connections.length > 0 ? (
              <div className="space-y-3">
                <div className="space-y-2">
                  {intelligence.connections.map((connection, index) => (
                    <div
                      key={index}
                      className="flex items-start p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg"
                    >
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {connection.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {connection.relationship}
                        </p>
                      </div>
                      <Badge
                        variant={
                          connection.source === 'linkedin' ? 'info' :
                          connection.source === 'email' ? 'success' :
                          'default'
                        }
                        size="sm"
                      >
                        {connection.source}
                      </Badge>
                    </div>
                  ))}
                </div>
                <CopyButton
                  text={intelligence.connections.map(c =>
                    `${c.name} (${c.relationship}) - ${c.source}`
                  ).join('\n')}
                  label="Copy Connections"
                />
              </div>
            ) : (
              <EmptyState message="No connections identified" />
            )}
          </CollapsibleSection>

          {/* Public Profile Section */}
          <CollapsibleSection title="Public Profile & Links">
            {intelligence.publicProfile && Object.keys(intelligence.publicProfile).length > 0 ? (
              <div className="space-y-2">
                {intelligence.publicProfile.bio && (
                  <div className="mb-3">
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      {intelligence.publicProfile.bio}
                    </p>
                  </div>
                )}
                <div className="flex flex-wrap gap-3">
                  {intelligence.publicProfile.linkedin && (
                    <a
                      href={intelligence.publicProfile.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-sm text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      <svg className="h-4 w-4 mr-1.5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                      </svg>
                      LinkedIn
                    </a>
                  )}
                  {intelligence.publicProfile.twitter && (
                    <a
                      href={intelligence.publicProfile.twitter}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-sm text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      <svg className="h-4 w-4 mr-1.5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                      </svg>
                      Twitter
                    </a>
                  )}
                  {intelligence.publicProfile.website && (
                    <a
                      href={intelligence.publicProfile.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-sm text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      <svg className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                      </svg>
                      Website
                    </a>
                  )}
                </div>
              </div>
            ) : (
              <EmptyState message="No public profile information available" />
            )}
          </CollapsibleSection>

          {/* Data Sources */}
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-start gap-2">
              <svg className="h-5 w-5 text-gray-400 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                <p className="font-medium mb-1">Data Sources</p>
                <p>This intelligence brief is generated from publicly available information including professional networks, news sources, and public records. Information accuracy depends on source availability and should be verified before use.</p>
              </div>
            </div>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
