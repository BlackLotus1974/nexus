# AI Service Integration Layer

Production-ready AI service integration for the Nexus Fundraising Intelligence Platform. Provides donor intelligence generation, relationship analysis, engagement strategies, and project alignment using Google Gemini (primary) with OpenAI fallback.

## Features

- **Dual Provider Support**: Gemini (primary) with automatic OpenAI fallback
- **Comprehensive Error Handling**: Typed errors with retry logic and exponential backoff
- **Type Safety**: Full TypeScript support with strict typing
- **Structured Responses**: JSON-based responses parsed into typed data structures
- **Production Ready**: Logging, monitoring, timeout handling, and rate limiting
- **Testing Support**: Mock services and sample data for development

## Quick Start

### Basic Usage

```typescript
import { aiService } from '@/lib/ai';

// Generate donor intelligence
const intelligence = await aiService.generateDonorIntelligence({
  name: 'John Doe',
  location: 'San Francisco, CA',
  context: 'Technology entrepreneur interested in education',
});

console.log(intelligence.data.summary);
console.log(`Giving capacity: ${intelligence.data.givingCapacity}`);
console.log(`Provider used: ${intelligence.provider}`);
console.log(`Response time: ${intelligence.latencyMs}ms`);
```

### Environment Setup

Required environment variables in `.env.local`:

```bash
GOOGLE_GEMINI_API_KEY=your-gemini-api-key
OPENAI_API_KEY=your-openai-api-key

# Optional configuration
AI_TIMEOUT_MS=120000
AI_MAX_RETRIES=3
AI_VERBOSE_LOGGING=true
```

## API Reference

### Core Services

#### `aiService.generateDonorIntelligence(request)`

Generate comprehensive donor intelligence profile.

```typescript
const result = await aiService.generateDonorIntelligence({
  name: 'Jane Smith',
  location: 'New York, NY',
  context: 'Philanthropist focused on education',
  organizationContext: 'K-12 education nonprofit',
});

// Returns: AIResponse<DonorIntelligence>
```

**Response Structure:**
- `summary`: Comprehensive overview (2-3 paragraphs)
- `keyInsights`: Array of actionable insights
- `givingCapacity`: 'high' | 'medium' | 'low' | 'unknown'
- `preferredCauses`: Array of cause areas
- `connectionPoints`: Array of connection opportunities with strength scores
- `recommendedApproach`: Engagement strategy
- `confidence`: 0.0-1.0 confidence score
- `dataSources`: Array of data sources used

#### `aiService.analyzeRelationships(request)`

Analyze relationship strength and identify warm introduction paths.

```typescript
const result = await aiService.analyzeRelationships({
  donorData: donorProfile,
  emailData: emailInteractions,
  linkedinData: linkedinConnections,
});

// Returns: AIResponse<RelationshipAnalysis>
```

**Response Structure:**
- `connectionStrength`: 1-10 scale
- `relationshipType`: 'direct' | 'indirect' | 'potential' | 'none'
- `warmPathRecommendations`: Array of introduction paths with strategies
- `introductionStrategies`: Detailed introduction approaches
- `communicationPatterns`: Communication frequency and preferences

#### `aiService.generateEngagementStrategy(request)`

Generate personalized donor engagement strategy.

```typescript
const result = await aiService.generateEngagementStrategy({
  donorData: donorProfile,
  projectData: projectDetails,
  relationshipData: relationships,
});

// Returns: AIResponse<EngagementStrategy>
```

**Response Structure:**
- `recommendedApproach`: 'email' | 'call' | 'event' | 'linkedin' | 'in-person'
- `timing`: Best timeframe, day, and time recommendations
- `messagingTone`: 'formal' | 'casual' | 'professional' | 'personal'
- `talkingPoints`: Array of key talking points
- `emailTemplate`: Complete email template (if email approach)
- `followUpCadence`: Follow-up timing strategy

#### `aiService.analyzeProjectAlignment(request)`

Assess alignment between donor and project.

```typescript
const result = await aiService.analyzeProjectAlignment({
  donorIntelligence: intelligence.data,
  projectDetails: project,
});

// Returns: AIResponse<ProjectAlignment>
```

**Response Structure:**
- `alignmentScore`: 0.0-1.0 compatibility score
- `connectionPoints`: Specific alignment areas
- `pitchRecommendations`: How to position the project
- `potentialConcerns`: Risks and mitigation strategies
- `strengths`: Why this is a good match

### Advanced Usage

#### Using Specific Providers

```typescript
import { GeminiService, OpenAIService } from '@/lib/ai';

// Use Gemini directly
const gemini = new GeminiService();
const result = await gemini.generateDonorIntelligence(request);

// Use OpenAI directly
const openai = new OpenAIService();
const result = await openai.generateDonorIntelligence(request);
```

#### Custom Configuration

```typescript
import { AIOrchestrator, GeminiService, OpenAIService } from '@/lib/ai';

const gemini = new GeminiService(
  process.env.CUSTOM_GEMINI_KEY,
  'gemini-1.5-flash' // Faster model
);

const openai = new OpenAIService(
  process.env.CUSTOM_OPENAI_KEY,
  'gpt-3.5-turbo' // More cost-effective model
);

const orchestrator = new AIOrchestrator(gemini, openai);
const result = await orchestrator.generateDonorIntelligence(request);
```

## Error Handling

The library provides typed errors for specific scenarios:

```typescript
import {
  aiService,
  RateLimitError,
  ServiceDownError,
  AuthenticationError,
  TimeoutError,
  InvalidResponseError,
} from '@/lib/ai';

try {
  const result = await aiService.generateDonorIntelligence(request);
} catch (error) {
  if (error instanceof RateLimitError) {
    console.log(`Rate limited. Retry after ${error.retryAfterMs}ms`);
  } else if (error instanceof ServiceDownError) {
    console.log(`Service unavailable (HTTP ${error.statusCode})`);
  } else if (error instanceof AuthenticationError) {
    console.log('Invalid API credentials');
  } else if (error instanceof TimeoutError) {
    console.log('Operation timed out');
  } else if (error instanceof InvalidResponseError) {
    console.log('AI returned invalid response format');
  }
}
```

### Automatic Retry and Fallback

The orchestrator automatically:
1. **Retries** failed operations up to 3 times with exponential backoff
2. **Falls back** from Gemini to OpenAI if rate limited or service down
3. **Logs** all operations for monitoring and debugging

```typescript
// This automatically retries and falls back as needed
const result = await aiService.generateDonorIntelligence(request);

// Check which provider was used
console.log(`Provider: ${result.provider}`); // 'gemini' or 'openai'
```

## Testing

### Using Mock Services

```typescript
import { MockAIService, mockDonorIntelligence } from '@/lib/ai';

const mockService = new MockAIService();
const result = await mockService.generateDonorIntelligence(request);

// Returns mock data without API calls
expect(result.data).toEqual(mockDonorIntelligence);
```

### Sample Data

```typescript
import {
  sampleDonorData,
  sampleProjectData,
  mockDonorIntelligence,
} from '@/lib/ai';

// Use in tests or development
const result = await aiService.generateDonorIntelligence(sampleDonorData);
```

## Performance

- **Donor Intelligence**: ~30-60 seconds (timeout: 2 minutes)
- **Relationship Analysis**: ~20-45 seconds (timeout: 1.5 minutes)
- **Engagement Strategy**: ~15-30 seconds (timeout: 1 minute)
- **Project Alignment**: ~10-20 seconds (timeout: 45 seconds)

All operations include:
- Automatic timeout protection
- Token usage tracking
- Latency monitoring
- Request ID tracking

## Monitoring and Logging

The library logs all AI operations:

```typescript
// Logs include:
{
  timestamp: "2024-10-08T12:00:00Z",
  service: "gemini",
  operation: "generateDonorIntelligence",
  duration: "2500ms",
  success: true,
  tokens: 1850,
  requestId: "req_1234567890_abc123"
}
```

Enable verbose logging in development:

```bash
AI_VERBOSE_LOGGING=true
```

## Architecture

```
lib/ai/
├── index.ts              # Main export file
├── types.ts              # TypeScript interfaces
├── config.ts             # Configuration and constants
├── errors.ts             # Error classes
├── prompts.ts            # Prompt templates
├── parser.ts             # Response parsing
├── utils.ts              # Utility functions
├── gemini.ts             # Gemini service implementation
├── openai.ts             # OpenAI service implementation
├── orchestrator.ts       # Fallback orchestration
├── test-helpers.ts       # Mock data and utilities
└── README.md             # This file
```

## Best Practices

1. **Always use the orchestrator** (`aiService`) for production - it handles fallback automatically
2. **Check confidence scores** - responses include confidence levels (0.0-1.0)
3. **Monitor token usage** - track costs via `result.tokensUsed`
4. **Handle errors gracefully** - use typed error handling
5. **Sanitize inputs** - the library automatically sanitizes sensitive data
6. **Use mock services in tests** - avoid consuming API credits during testing

## Troubleshooting

### Authentication Errors

```bash
Error: Authentication failed for gemini
```

**Solution**: Check your API keys in `.env.local`:
```bash
GOOGLE_GEMINI_API_KEY=your-actual-key-here
OPENAI_API_KEY=your-actual-key-here
```

### Rate Limit Errors

The library automatically handles rate limits with exponential backoff and fallback. If both providers are rate limited:

```typescript
try {
  await aiService.generateDonorIntelligence(request);
} catch (error) {
  if (error instanceof RateLimitError) {
    // Wait and retry manually
    await new Promise(resolve => setTimeout(resolve, error.retryAfterMs));
  }
}
```

### Timeout Errors

If operations consistently timeout, you can adjust the timeout in `.env.local`:

```bash
AI_TIMEOUT_MS=180000  # 3 minutes instead of 2
```

## Contributing

When adding new AI operations:

1. Add TypeScript types to `types.ts`
2. Create prompt template in `prompts.ts`
3. Add parser in `parser.ts`
4. Implement in both `gemini.ts` and `openai.ts`
5. Add to orchestrator in `orchestrator.ts`
6. Create mock data in `test-helpers.ts`
7. Export from `index.ts`

## License

Internal use only - Nexus Fundraising Intelligence Platform
