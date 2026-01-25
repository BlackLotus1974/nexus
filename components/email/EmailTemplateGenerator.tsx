'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  type: 'thank_you' | 'follow_up' | 'ask' | 'update' | 'invitation';
  placeholders: string[];
}

interface EmailTemplateGeneratorProps {
  donorId: string;
  donorName: string;
  projectId?: string;
  projectName?: string;
  engagementType?: string;
  onTemplateGenerated?: (template: EmailTemplate) => void;
  onTemplateSend?: (template: EmailTemplate) => void;
}

/**
 * Email Template Generator
 *
 * Generates personalized email templates based on donor and project context.
 */
export function EmailTemplateGenerator({
  donorId,
  donorName,
  projectId,
  projectName,
  engagementType,
  onTemplateGenerated,
  onTemplateSend,
}: EmailTemplateGeneratorProps) {
  const [selectedType, setSelectedType] = useState<EmailTemplate['type']>('follow_up');
  const [customContext, setCustomContext] = useState('');
  const [generatedTemplate, setGeneratedTemplate] = useState<EmailTemplate | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedSubject, setEditedSubject] = useState('');
  const [editedBody, setEditedBody] = useState('');

  const templateTypes = [
    { value: 'thank_you', label: 'Thank You', icon: '🙏' },
    { value: 'follow_up', label: 'Follow Up', icon: '📨' },
    { value: 'ask', label: 'The Ask', icon: '💝' },
    { value: 'update', label: 'Project Update', icon: '📊' },
    { value: 'invitation', label: 'Event Invitation', icon: '🎉' },
  ];

  const generateTemplate = async () => {
    setIsGenerating(true);

    try {
      // In production, this would call the AI orchestrator
      await new Promise((resolve) => setTimeout(resolve, 1200));

      const templates: Record<EmailTemplate['type'], EmailTemplate> = {
        thank_you: {
          id: '1',
          name: 'Thank You Letter',
          type: 'thank_you',
          subject: `Thank you for your generous support, ${donorName}`,
          body: `Dear ${donorName},

I wanted to personally reach out to express our heartfelt gratitude for your continued support of our organization.

Your generosity makes a real difference in our community. Because of donors like you, we are able to [specific impact].

${projectName ? `Your contribution to ${projectName} has helped us [project-specific impact].` : ''}

We are truly grateful to have you as part of our family of supporters. Your trust in our mission inspires us every day.

With sincere appreciation,
[Your Name]
[Your Title]`,
          placeholders: ['[specific impact]', '[project-specific impact]', '[Your Name]', '[Your Title]'],
        },
        follow_up: {
          id: '2',
          name: 'Follow Up Email',
          type: 'follow_up',
          subject: `Following up on our conversation, ${donorName}`,
          body: `Dear ${donorName},

I hope this email finds you well. I wanted to follow up on our recent conversation and provide you with some additional information.

${customContext || '[Add context about previous conversation]'}

${projectName ? `As we discussed, ${projectName} represents an exciting opportunity to [describe opportunity].` : 'I believe there are some exciting opportunities that align perfectly with your interests.'}

I would love to schedule a time to discuss this further. Would you have availability in the coming weeks for a brief call or meeting?

Looking forward to continuing our conversation.

Best regards,
[Your Name]
[Your Title]`,
          placeholders: ['[Add context about previous conversation]', '[describe opportunity]', '[Your Name]', '[Your Title]'],
        },
        ask: {
          id: '3',
          name: 'Donation Request',
          type: 'ask',
          subject: `An opportunity to make a lasting impact, ${donorName}`,
          body: `Dear ${donorName},

I'm reaching out because you've been such a valued supporter of our mission, and I wanted to share an exciting opportunity with you.

${projectName ? `${projectName} is a transformative initiative that will [describe transformation]. With your support, we can make this vision a reality.` : 'We have an opportunity to expand our impact significantly, and we immediately thought of you.'}

A gift of [suggested amount] would help us [specific use of funds]. Your investment in our work would directly benefit [beneficiaries].

${customContext || ''}

Would you consider joining us in this effort? I would be happy to discuss how your contribution would make a difference.

With gratitude,
[Your Name]
[Your Title]`,
          placeholders: ['[describe transformation]', '[suggested amount]', '[specific use of funds]', '[beneficiaries]', '[Your Name]', '[Your Title]'],
        },
        update: {
          id: '4',
          name: 'Project Update',
          type: 'update',
          subject: `Exciting updates on ${projectName || 'our progress'}, ${donorName}`,
          body: `Dear ${donorName},

I'm thrilled to share some exciting updates with you about the impact your support is making.

${projectName ? `${projectName} Update:` : 'Recent Achievements:'}
• [Achievement 1]
• [Achievement 2]
• [Achievement 3]

Your generosity has been instrumental in making these accomplishments possible. Here's what your support has helped us achieve:
• [Impact metric 1]
• [Impact metric 2]

Looking ahead, we're planning [upcoming initiatives]. We're excited about the possibilities and grateful to have supporters like you on this journey with us.

${customContext || ''}

Thank you for believing in our mission.

Warmly,
[Your Name]
[Your Title]`,
          placeholders: ['[Achievement 1]', '[Achievement 2]', '[Achievement 3]', '[Impact metric 1]', '[Impact metric 2]', '[upcoming initiatives]', '[Your Name]', '[Your Title]'],
        },
        invitation: {
          id: '5',
          name: 'Event Invitation',
          type: 'invitation',
          subject: `You're invited: Special event for valued supporters like you, ${donorName}`,
          body: `Dear ${donorName},

As one of our most valued supporters, I would like to personally invite you to [Event Name].

Event Details:
📅 Date: [Date]
🕐 Time: [Time]
📍 Location: [Location]

This exclusive gathering will bring together our community of donors for [event purpose]. You'll have the opportunity to:
• Meet fellow supporters and beneficiaries
• Learn about our latest initiatives
• See firsthand the impact of your generosity

${projectName ? `We'll also be highlighting ${projectName} and the incredible progress being made.` : ''}

${customContext || ''}

Please RSVP by [RSVP date] to secure your spot.

We hope to see you there!

Best regards,
[Your Name]
[Your Title]`,
          placeholders: ['[Event Name]', '[Date]', '[Time]', '[Location]', '[event purpose]', '[RSVP date]', '[Your Name]', '[Your Title]'],
        },
      };

      const template = templates[selectedType];
      setGeneratedTemplate(template);
      setEditedSubject(template.subject);
      setEditedBody(template.body);
      onTemplateGenerated?.(template);
    } catch (error) {
      console.error('Error generating template:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSend = () => {
    if (generatedTemplate) {
      const finalTemplate = {
        ...generatedTemplate,
        subject: editedSubject,
        body: editedBody,
      };
      onTemplateSend?.(finalTemplate);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Email Template Generator
          </h3>
          <p className="text-sm text-gray-500">
            Create personalized emails for {donorName}
          </p>
        </div>
      </div>

      {/* Template Type Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Email Type
        </label>
        <div className="flex flex-wrap gap-2">
          {templateTypes.map((type) => (
            <button
              key={type.value}
              onClick={() => setSelectedType(type.value as EmailTemplate['type'])}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                selectedType === type.value
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <span>{type.icon}</span>
              <span className="text-sm font-medium">{type.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Custom Context */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Additional Context (Optional)
        </label>
        <textarea
          value={customContext}
          onChange={(e) => setCustomContext(e.target.value)}
          placeholder="Add any specific details or context to personalize the email..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          rows={3}
        />
      </div>

      <Button
        variant="primary"
        onClick={generateTemplate}
        disabled={isGenerating}
        className="mb-6"
      >
        {isGenerating ? 'Generating...' : 'Generate Template'}
      </Button>

      {/* Generated Template */}
      {generatedTemplate && (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-b">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{generatedTemplate.name}</Badge>
              {generatedTemplate.placeholders.length > 0 && (
                <span className="text-xs text-gray-500">
                  {generatedTemplate.placeholders.length} placeholders to fill
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsEditing(!isEditing)}
              >
                {isEditing ? 'Preview' : 'Edit'}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => copyToClipboard(`Subject: ${editedSubject}\n\n${editedBody}`)}
              >
                Copy
              </Button>
            </div>
          </div>

          <div className="p-4">
            {isEditing ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Subject
                  </label>
                  <Input
                    value={editedSubject}
                    onChange={(e) => setEditedSubject(e.target.value)}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Body
                  </label>
                  <textarea
                    value={editedBody}
                    onChange={(e) => setEditedBody(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[300px] font-mono text-sm"
                  />
                </div>
              </div>
            ) : (
              <div>
                <div className="mb-4">
                  <span className="text-sm font-medium text-gray-500">Subject:</span>
                  <p className="text-gray-900 font-medium">{editedSubject}</p>
                </div>
                <div className="border-t pt-4">
                  <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans">
                    {editedBody}
                  </pre>
                </div>
              </div>
            )}
          </div>

          {onTemplateSend && (
            <div className="bg-gray-50 px-4 py-3 border-t flex justify-end gap-2">
              <Button variant="secondary" size="sm">
                Save as Draft
              </Button>
              <Button variant="primary" size="sm" onClick={handleSend}>
                Send Email
              </Button>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
