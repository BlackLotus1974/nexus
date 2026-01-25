/**
 * Email Analyzer Service
 *
 * Analyzes email communications to extract relationship insights.
 */

export interface EmailMessage {
  id: string;
  from: string;
  to: string[];
  cc?: string[];
  subject: string;
  body: string;
  date: Date;
  threadId?: string;
  attachments?: Array<{ name: string; type: string }>;
}

export interface EmailAnalysis {
  sentiment: 'positive' | 'neutral' | 'negative';
  sentimentScore: number; // -1 to 1
  keyTopics: string[];
  actionItems: string[];
  relationshipIndicators: {
    warmth: number; // 0-100
    engagement: number; // 0-100
    interest: number; // 0-100
  };
  suggestedFollowUp?: string;
  importantDates?: Array<{ date: string; context: string }>;
}

export interface EmailThreadAnalysis {
  threadId: string;
  messageCount: number;
  participants: string[];
  duration: { start: Date; end: Date };
  overallSentiment: EmailAnalysis['sentiment'];
  responseMetrics: {
    averageResponseTime: number; // hours
    initiatedByUs: boolean;
    responseRate: number; // 0-1
  };
  topics: string[];
  relationshipProgress: 'strengthening' | 'stable' | 'declining';
}

export interface RelationshipFromEmails {
  contactEmail: string;
  contactName?: string;
  totalMessages: number;
  lastContact: Date;
  averageResponseTime: number;
  sentiment: EmailAnalysis['sentiment'];
  relationshipStrength: number;
  topics: string[];
  suggestedNextAction?: string;
}

/**
 * Extract email address from string like "Name <email@domain.com>"
 */
function extractEmail(emailString: string): string {
  const match = emailString.match(/<([^>]+)>/);
  return match ? match[1] : emailString.toLowerCase().trim();
}

/**
 * Extract name from email string
 */
function extractName(emailString: string): string | undefined {
  const match = emailString.match(/^([^<]+)</);
  return match ? match[1].trim() : undefined;
}

/**
 * Simple sentiment analysis based on keywords
 * In production, this would use AI/NLP services
 */
function analyzeSentiment(text: string): { sentiment: EmailAnalysis['sentiment']; score: number } {
  const positiveWords = [
    'thank', 'thanks', 'grateful', 'appreciate', 'excited', 'pleased',
    'delighted', 'wonderful', 'great', 'excellent', 'fantastic', 'happy',
    'looking forward', 'pleasure', 'opportunity', 'generous', 'kind',
  ];

  const negativeWords = [
    'unfortunately', 'sorry', 'regret', 'unable', 'difficult', 'problem',
    'issue', 'concern', 'disappointed', 'delay', 'cancel', 'decline',
  ];

  const lowerText = text.toLowerCase();
  let score = 0;

  positiveWords.forEach((word) => {
    if (lowerText.includes(word)) score += 0.1;
  });

  negativeWords.forEach((word) => {
    if (lowerText.includes(word)) score -= 0.1;
  });

  // Clamp score between -1 and 1
  score = Math.max(-1, Math.min(1, score));

  let sentiment: EmailAnalysis['sentiment'] = 'neutral';
  if (score > 0.2) sentiment = 'positive';
  if (score < -0.2) sentiment = 'negative';

  return { sentiment, score };
}

/**
 * Extract key topics from email text
 */
function extractTopics(text: string): string[] {
  const topicKeywords: Record<string, string[]> = {
    'Donation': ['donation', 'donate', 'gift', 'contribute', 'giving', 'pledge'],
    'Meeting': ['meeting', 'meet', 'schedule', 'call', 'coffee', 'lunch'],
    'Event': ['event', 'gala', 'fundraiser', 'auction', 'reception'],
    'Project': ['project', 'initiative', 'program', 'campaign'],
    'Follow-up': ['follow up', 'following up', 'check in', 'touching base'],
    'Thank You': ['thank', 'grateful', 'appreciation'],
    'Request': ['request', 'asking', 'would you', 'could you', 'hoping'],
    'Update': ['update', 'news', 'progress', 'status'],
  };

  const lowerText = text.toLowerCase();
  const foundTopics: string[] = [];

  Object.entries(topicKeywords).forEach(([topic, keywords]) => {
    if (keywords.some((keyword) => lowerText.includes(keyword))) {
      foundTopics.push(topic);
    }
  });

  return foundTopics;
}

/**
 * Extract action items from email text
 */
function extractActionItems(text: string): string[] {
  const actionPatterns = [
    /please\s+([^.!?]+)[.!?]/gi,
    /could you\s+([^.!?]+)[.!?]/gi,
    /would you\s+([^.!?]+)[.!?]/gi,
    /let me know\s+([^.!?]+)[.!?]/gi,
    /can you\s+([^.!?]+)[.!?]/gi,
  ];

  const actions: string[] = [];

  actionPatterns.forEach((pattern) => {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const action = match[1].trim();
      if (action.length > 10 && action.length < 200) {
        actions.push(action);
      }
    }
  });

  return actions.slice(0, 5); // Limit to 5 action items
}

/**
 * Analyze a single email message
 */
export function analyzeEmail(email: EmailMessage): EmailAnalysis {
  const fullText = `${email.subject} ${email.body}`;
  const { sentiment, score } = analyzeSentiment(fullText);
  const topics = extractTopics(fullText);
  const actionItems = extractActionItems(email.body);

  // Calculate relationship indicators
  const warmth = Math.round((score + 1) * 50); // Convert -1...1 to 0...100
  const engagement = Math.min(100, 20 + topics.length * 15 + actionItems.length * 10);
  const interest = topics.includes('Meeting') || topics.includes('Donation') ? 80 : 50;

  // Generate follow-up suggestion based on content
  let suggestedFollowUp: string | undefined;
  if (actionItems.length > 0) {
    suggestedFollowUp = 'Address the action items mentioned in the email';
  } else if (topics.includes('Meeting')) {
    suggestedFollowUp = 'Confirm meeting details and send calendar invite';
  } else if (topics.includes('Thank You')) {
    suggestedFollowUp = 'Continue nurturing the relationship with periodic updates';
  }

  // Extract dates mentioned
  const datePattern = /\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2}(?:,?\s+\d{4})?\b/gi;
  const dateMatches = email.body.match(datePattern) || [];
  const importantDates = dateMatches.slice(0, 3).map((date) => ({
    date,
    context: 'Mentioned in email',
  }));

  return {
    sentiment,
    sentimentScore: score,
    keyTopics: topics,
    actionItems,
    relationshipIndicators: {
      warmth,
      engagement,
      interest,
    },
    suggestedFollowUp,
    importantDates: importantDates.length > 0 ? importantDates : undefined,
  };
}

/**
 * Analyze an email thread
 */
export function analyzeEmailThread(messages: EmailMessage[]): EmailThreadAnalysis {
  if (messages.length === 0) {
    throw new Error('No messages to analyze');
  }

  // Sort by date
  const sortedMessages = [...messages].sort(
    (a, b) => a.date.getTime() - b.date.getTime()
  );

  const firstMessage = sortedMessages[0];
  const lastMessage = sortedMessages[sortedMessages.length - 1];

  // Get unique participants
  const allEmails = new Set<string>();
  sortedMessages.forEach((m) => {
    allEmails.add(extractEmail(m.from));
    m.to.forEach((to) => allEmails.add(extractEmail(to)));
    m.cc?.forEach((cc) => allEmails.add(extractEmail(cc)));
  });

  // Analyze sentiments across thread
  const analyses = sortedMessages.map((m) => analyzeEmail(m));
  const avgSentimentScore =
    analyses.reduce((sum, a) => sum + a.sentimentScore, 0) / analyses.length;

  let overallSentiment: EmailAnalysis['sentiment'] = 'neutral';
  if (avgSentimentScore > 0.2) overallSentiment = 'positive';
  if (avgSentimentScore < -0.2) overallSentiment = 'negative';

  // Calculate response times (simplified)
  let totalResponseTime = 0;
  let responseCount = 0;
  for (let i = 1; i < sortedMessages.length; i++) {
    const timeDiff =
      (sortedMessages[i].date.getTime() - sortedMessages[i - 1].date.getTime()) /
      (1000 * 60 * 60); // hours
    if (timeDiff < 72) {
      // Only count responses within 3 days
      totalResponseTime += timeDiff;
      responseCount++;
    }
  }

  const averageResponseTime = responseCount > 0 ? totalResponseTime / responseCount : 0;

  // Collect all topics
  const allTopics = new Set<string>();
  analyses.forEach((a) => a.keyTopics.forEach((t) => allTopics.add(t)));

  // Determine relationship progress based on sentiment trend
  let relationshipProgress: EmailThreadAnalysis['relationshipProgress'] = 'stable';
  if (analyses.length >= 2) {
    const firstHalf = analyses.slice(0, Math.floor(analyses.length / 2));
    const secondHalf = analyses.slice(Math.floor(analyses.length / 2));
    const firstAvg =
      firstHalf.reduce((sum, a) => sum + a.sentimentScore, 0) / firstHalf.length;
    const secondAvg =
      secondHalf.reduce((sum, a) => sum + a.sentimentScore, 0) / secondHalf.length;

    if (secondAvg - firstAvg > 0.1) relationshipProgress = 'strengthening';
    if (secondAvg - firstAvg < -0.1) relationshipProgress = 'declining';
  }

  return {
    threadId: firstMessage.threadId || firstMessage.id,
    messageCount: sortedMessages.length,
    participants: Array.from(allEmails),
    duration: { start: firstMessage.date, end: lastMessage.date },
    overallSentiment,
    responseMetrics: {
      averageResponseTime,
      initiatedByUs: true, // Would need context to determine
      responseRate: responseCount / (sortedMessages.length - 1) || 1,
    },
    topics: Array.from(allTopics),
    relationshipProgress,
  };
}

/**
 * Extract relationship data from email history with a contact
 */
export function extractRelationshipFromEmails(
  emails: EmailMessage[],
  contactEmail: string,
  ourDomain: string
): RelationshipFromEmails {
  const contactMessages = emails.filter((e) => {
    const from = extractEmail(e.from);
    const toEmails = e.to.map(extractEmail);
    return from === contactEmail || toEmails.includes(contactEmail);
  });

  if (contactMessages.length === 0) {
    return {
      contactEmail,
      totalMessages: 0,
      lastContact: new Date(0),
      averageResponseTime: 0,
      sentiment: 'neutral',
      relationshipStrength: 0,
      topics: [],
    };
  }

  const sortedMessages = [...contactMessages].sort(
    (a, b) => b.date.getTime() - a.date.getTime()
  );

  // Get contact name
  const contactMessage = contactMessages.find(
    (m) => extractEmail(m.from) === contactEmail
  );
  const contactName = contactMessage ? extractName(contactMessage.from) : undefined;

  // Analyze all messages
  const analyses = contactMessages.map((m) => analyzeEmail(m));
  const avgSentimentScore =
    analyses.reduce((sum, a) => sum + a.sentimentScore, 0) / analyses.length;

  let sentiment: EmailAnalysis['sentiment'] = 'neutral';
  if (avgSentimentScore > 0.2) sentiment = 'positive';
  if (avgSentimentScore < -0.2) sentiment = 'negative';

  // Collect topics
  const allTopics = new Set<string>();
  analyses.forEach((a) => a.keyTopics.forEach((t) => allTopics.add(t)));

  // Calculate relationship strength (0-100)
  const recencyScore = Math.max(
    0,
    100 -
      (Date.now() - sortedMessages[0].date.getTime()) / (1000 * 60 * 60 * 24 * 7) * 10
  ); // Decays over weeks
  const frequencyScore = Math.min(100, contactMessages.length * 5);
  const sentimentBonus = (avgSentimentScore + 1) * 25;

  const relationshipStrength = Math.round(
    (recencyScore * 0.4 + frequencyScore * 0.3 + sentimentBonus * 0.3)
  );

  // Generate next action suggestion
  let suggestedNextAction: string | undefined;
  const daysSinceLastContact =
    (Date.now() - sortedMessages[0].date.getTime()) / (1000 * 60 * 60 * 24);

  if (daysSinceLastContact > 30) {
    suggestedNextAction = 'Re-engage - it has been over a month since last contact';
  } else if (allTopics.has('Meeting') && daysSinceLastContact > 7) {
    suggestedNextAction = 'Follow up on meeting discussion';
  } else if (allTopics.has('Donation') && daysSinceLastContact > 14) {
    suggestedNextAction = 'Send donation-related update or thank you';
  }

  return {
    contactEmail,
    contactName,
    totalMessages: contactMessages.length,
    lastContact: sortedMessages[0].date,
    averageResponseTime: 0, // Would need thread analysis
    sentiment,
    relationshipStrength: Math.min(100, relationshipStrength),
    topics: Array.from(allTopics),
    suggestedNextAction,
  };
}
