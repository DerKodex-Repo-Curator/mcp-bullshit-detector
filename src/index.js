#!/usr/bin/env node
const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} = require('@modelcontextprotocol/sdk/types.js');

const server = new Server(
  {
    name: 'mcp-bullshit-detector',
    version: '0.1.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Define evidence markers that reduce bullshit scores (refined for better precision)
const evidenceMarkers = [
  /\b(\d+:\d+|\d+\.\d+\s+vs\s+\d+\.\d+|\d+%\s+\w+\s+savings|\d+%\s+improvement)\b/gi, // Specific numeric comparisons
  /\b(experimental results|test results|validation results|research data|benchmark data|peer.reviewed)\b/gi, // Specific scientific phrases
  /\b(according to|based on|from study|source:|citation|paper shows|research shows|study found)\b/gi, // Attribution phrases  
  /\b(github\.com|repository|implementation|codebase|algorithm|peer.reviewed|published in)\b/gi, // Technical/academic artifacts
  /\b(experiment|validation|test|measurement|benchmark)\s+(achieved|showed|demonstrated|found)\b/gi // Scientific action phrases
];

// Define qualification markers that reduce certainty
const qualificationMarkers = [
  /\b(appears?|seems?|likely|potentially|may|might|could|possibly|probably|suggests?|indicates?)\b/gi,
  /\b(preliminary|initial|experimental|prototype|alpha|beta|draft|working|tentative)\b/gi,
  /\b(in our tests|in this experiment|our results suggest|evidence suggests|data indicates)\b/gi
];

// Define marketing/hype indicators that increase suspicion
const hypeIndicators = [
  /\b(revolutionary|breakthrough|game.changing|industry.leading|world.class|cutting.edge)\b/gi,
  /\b(guaranteed|proven|certified|award.winning|#1|best.in.class|unmatched|unparalleled)\b/gi,
  /\b(amazing|incredible|fantastic|phenomenal|extraordinary|remarkable|outstanding)\b/gi
];

// Define context-aware bullshit detection patterns
const bullshitFlags = [
  {
    pattern: /\b\d+\.?\d*%\b/g,
    type: 'statistics',
    severity: 'HIGH',
    message: 'Specific percentage without source or evidence',
    contextAware: true, // Check for nearby evidence markers
    evidenceRadius: 100 // Characters to check around match
  },
  {
    pattern: /\b(revolutionary|breakthrough|solved|never|always|all|best|perfect|guaranteed|definitely|absolutely|completely|totally)\b/gi,
    type: 'absolutes',
    severity: 'HIGH',
    message: 'Absolute claim - rarely accurate in reality',
    contextAware: true,
    evidenceRadius: 150,
    technicalExceptions: ['solved', 'all'] // These can be technical terms
  },
  {
    pattern: /\b(better than|superior to|outperforms|more effective than|faster than|smarter than)\b/gi,
    type: 'comparatives',
    severity: 'MEDIUM',
    message: 'Comparative claim without supporting data'
  },
  {
    pattern: /\b(we achieve|our system|we have solved|we provide|we deliver|we ensure)\b/gi,
    type: 'unverified_claims',
    severity: 'HIGH',
    message: 'Unverified capability claim about own system'
  },
  {
    pattern: /\b(will|shall|going to)\b/gi,
    type: 'future_predictions',
    severity: 'MEDIUM',
    message: 'Confident prediction about uncertain future'
  },
  {
    pattern: /\b(obviously|clearly|of course|everyone knows|it's well known|needless to say)\b/gi,
    type: 'false_consensus',
    severity: 'MEDIUM',
    message: 'Assumed agreement or obviousness'
  },
  {
    pattern: /\b(studies show|research proves|scientists say|experts agree)\b/gi,
    type: 'vague_authority',
    severity: 'MEDIUM',
    message: 'Vague appeal to authority without specific citation'
  },
  {
    pattern: /\b\d+x\s+(faster|better|more)\b/gi,
    type: 'multiplier_claims',
    severity: 'HIGH',
    message: 'Specific multiplier claim (2x faster, 10x better) without evidence'
  }
];

const validationQuestions = [
  'What evidence do I actually have for this claim?',
  'Am I guessing and presenting it as fact?',
  'Could this be easily disproven?',
  'Am I confusing "possible" with "proven"?',
  'Would I stake my reputation on this being true?',
  'Is this what I hope is true vs what I know is true?'
];

function getContext(text, match, matchIndex) {
  const start = Math.max(0, matchIndex - 40);
  const end = Math.min(text.length, matchIndex + match.length + 40);
  const context = text.substring(start, end);
  return start > 0 ? '...' + context : context + (end < text.length ? '...' : '');
}

function hasNearbyEvidence(text, position, radius) {
  const start = Math.max(0, position - radius);
  const end = Math.min(text.length, position + radius);
  const contextText = text.substring(start, end);
  
  return evidenceMarkers.some(marker => marker.test(contextText));
}

function hasQualificationLanguage(text, position, radius) {
  const start = Math.max(0, position - radius);
  const end = Math.min(text.length, position + radius);
  const contextText = text.substring(start, end);
  
  return qualificationMarkers.some(marker => marker.test(contextText));
}

function analyzeText(text) {
  const detectedIssues = [];
  let bullshitScore = 0;

  // Scan for each type of bullshit pattern
  bullshitFlags.forEach(flag => {
    const matches = [...text.matchAll(flag.pattern)];
    matches.forEach(match => {
      if (match.index !== undefined) {
        let severity = flag.severity;
        let scoreModifier = 1.0;
        let contextualNotes = [];
        
        // Context-aware analysis
        if (flag.contextAware) {
          const hasEvidence = hasNearbyEvidence(text, match.index, flag.evidenceRadius || 100);
          const hasQualification = hasQualificationLanguage(text, match.index, flag.evidenceRadius || 100);
          
          if (hasEvidence) {
            scoreModifier *= 0.3; // Reduce score significantly if evidence present
            contextualNotes.push('Evidence markers found nearby');
          }
          
          if (hasQualification) {
            scoreModifier *= 0.5; // Reduce score if qualified language present
            contextualNotes.push('Qualification language detected');
          }
          
          // Technical exceptions
          if (flag.technicalExceptions && flag.technicalExceptions.some(exc => 
            match[0].toLowerCase().includes(exc.toLowerCase())
          )) {
            const technicalContext = /\b(function|algorithm|equation|proof|test|code|implementation)\b/gi.test(
              text.substring(Math.max(0, match.index - 50), Math.min(text.length, match.index + 50))
            );
            if (technicalContext) {
              scoreModifier *= 0.2;
              contextualNotes.push('Technical context detected');
            }
          }
        }
        
        // Only add to issues if score is significant after modifiers
        const adjustedScore = (flag.severity === 'HIGH' ? 3 : flag.severity === 'MEDIUM' ? 2 : 1) * scoreModifier;
        
        if (adjustedScore >= 0.8) { // Threshold for inclusion
          // Adjust severity based on context
          if (scoreModifier <= 0.3) {
            severity = flag.severity === 'HIGH' ? 'MEDIUM' : 'LOW';
          } else if (scoreModifier <= 0.6) {
            severity = flag.severity === 'HIGH' ? 'MEDIUM' : flag.severity;
          }
          
          detectedIssues.push({
            text: match[0],
            type: flag.type,
            severity: severity,
            message: flag.message,
            context: getContext(text, match[0], match.index),
            position: match.index,
            contextualNotes: contextualNotes,
            scoreModifier: scoreModifier
          });
        }
        
        // Add adjusted score to total
        bullshitScore += adjustedScore;
      }
    });
  });

  // Determine overall rating
  const rating = 
    bullshitScore === 0 ? 'CLEAN' : 
    bullshitScore <= 2 ? 'LOW' : 
    bullshitScore <= 5 ? 'MEDIUM' : 'HIGH';

  // Generate recommendations
  const recommendations = generateRecommendations(detectedIssues);

  // Create summary
  const summary = generateSummary(detectedIssues, rating, bullshitScore);

  return {
    issues: detectedIssues,
    score: bullshitScore,
    rating,
    recommendations,
    summary
  };
}

function generateRecommendations(issues) {
  const recommendations = [];
  const issueTypes = [...new Set(issues.map(i => i.type))];
  
  if (issueTypes.includes('statistics')) {
    recommendations.push('Add sources for statistics or qualify them as estimates');
  }
  if (issueTypes.includes('absolutes')) {
    recommendations.push('Replace absolute terms (always, never, perfect) with qualified language');
  }
  if (issueTypes.includes('comparatives')) {
    recommendations.push('Provide evidence for comparative claims or remove them');
  }
  if (issueTypes.includes('unverified_claims')) {
    recommendations.push('Acknowledge uncertainty about own capabilities and performance');
  }
  if (issueTypes.includes('future_predictions')) {
    recommendations.push('Add uncertainty language to future predictions (might, could, possibly)');
  }
  if (issueTypes.includes('false_consensus')) {
    recommendations.push('Remove assumptions about what is obvious or universally agreed upon');
  }
  if (issueTypes.includes('vague_authority')) {
    recommendations.push('Provide specific citations or remove vague appeals to authority');
  }
  if (issueTypes.includes('multiplier_claims')) {
    recommendations.push('Support performance multiplier claims with concrete evidence');
  }
  
  if (recommendations.length === 0) {
    recommendations.push('Text appears clean, but still review the validation questions');
  }
  
  return recommendations;
}

function generateSummary(issues, rating, score) {
  if (issues.length === 0) {
    return `✅ Clean text with no obvious bullshit detected. Score: ${score}/15`;
  }
  
  const highCount = issues.filter(i => i.severity === 'HIGH').length;
  const mediumCount = issues.filter(i => i.severity === 'MEDIUM').length;
  const lowCount = issues.filter(i => i.severity === 'LOW').length;
  
  let summary = `🚨 Bullshit Level: ${rating} (Score: ${score}/15)\n`;
  summary += `Found ${issues.length} issues: `;
  
  const parts = [];
  if (highCount > 0) parts.push(`${highCount} high severity`);
  if (mediumCount > 0) parts.push(`${mediumCount} medium severity`);
  if (lowCount > 0) parts.push(`${lowCount} low severity`);
  
  summary += parts.join(', ');
  
  return summary;
}

// Tool handlers
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'detect_bullshit',
        description: 'Analyze text for bullshit indicators like unsupported claims, absolute statements, and misleading language',
        inputSchema: {
          type: 'object',
          properties: {
            text: {
              type: 'string',
              description: 'Text to analyze for bullshit indicators',
            },
          },
          required: ['text'],
        },
      },
      {
        name: 'get_validation_questions',
        description: 'Get list of self-validation questions to ask before making claims',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_bullshit_patterns',
        description: 'Get list of bullshit patterns and indicators the detector looks for',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'help',
        description: 'Get comprehensive documentation for all bullshit detector functions',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      }
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === 'detect_bullshit') {
    const { text } = request.params.arguments;
    
    if (!text || text.trim().length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: 'Error: No text provided to analyze',
          },
        ],
      };
    }
    
    const analysis = analyzeText(text);
    
    let result = `# Bullshit Detection Analysis\n\n`;
    result += `${analysis.summary}\n\n`;
    
    if (analysis.issues.length > 0) {
      result += `## Detected Issues (${analysis.issues.length})\n\n`;
      analysis.issues.forEach((issue, index) => {
        result += `### Issue ${index + 1}: "${issue.text}" (${issue.severity})\n`;
        result += `**Type:** ${issue.type}\n`;
        result += `**Problem:** ${issue.message}\n`;
        result += `**Context:** ${issue.context}\n`;
        
        if (issue.contextualNotes && issue.contextualNotes.length > 0) {
          result += `**Context Notes:** ${issue.contextualNotes.join(', ')}\n`;
        }
        
        if (issue.scoreModifier !== undefined && issue.scoreModifier < 1.0) {
          result += `**Score Reduced:** ${Math.round((1 - issue.scoreModifier) * 100)}% due to context\n`;
        }
        
        result += `\n`;
      });
    }
    
    if (analysis.recommendations.length > 0) {
      result += `## Recommendations\n\n`;
      analysis.recommendations.forEach((rec, index) => {
        result += `${index + 1}. ${rec}\n`;
      });
      result += `\n`;
    }
    
    result += `## Self-Validation Questions\n\n`;
    validationQuestions.forEach((question, index) => {
      result += `${index + 1}. ${question}\n`;
    });
    
    return {
      content: [
        {
          type: 'text',
          text: result,
        },
      ],
    };
  }
  
  if (request.params.name === 'get_validation_questions') {
    let result = `# Self-Validation Questions\n\n`;
    result += `Ask yourself these questions before making claims:\n\n`;
    validationQuestions.forEach((question, index) => {
      result += `${index + 1}. ${question}\n`;
    });
    
    return {
      content: [
        {
          type: 'text',
          text: result,
        },
      ]
    };
  }
  
  if (request.params.name === 'get_bullshit_patterns') {
    let result = `# Bullshit Detection Patterns\n\n`;
    result += `The detector looks for these types of problematic language:\n\n`;
    
    bullshitFlags.forEach((flag, index) => {
      result += `## ${index + 1}. ${flag.type.toUpperCase()} (${flag.severity})\n`;
      result += `**Pattern:** ${flag.pattern.source}\n`;
      result += `**Problem:** ${flag.message}\n\n`;
    });
    
    return {
      content: [
        {
          type: 'text',
          text: result,
        },
      ]
    };
  }
  
  if (request.params.name === 'help') {
    const helpText = `
# 🚨 Bullshit Detector - Response Validation System

## Purpose
MCP server providing bullshit detection capabilities for response validation. Helps identify potentially misleading, exaggerated, or unsupported claims in text.

## Available Tools

### detect_bullshit
Analyze text for bullshit indicators:
- **text**: Text to analyze for bullshit indicators
- Returns bullshit level score, detected issues, and recommendations
- Flags problematic language patterns like absolutes, vague terms, and unsupported claims

### get_validation_questions
Get list of self-validation questions to ask before making claims:
- No parameters required
- Returns questions to help validate accuracy and avoid overstatement
- Use these to self-check before making strong claims

### get_bullshit_patterns
Get list of bullshit patterns and indicators the detector looks for:
- No parameters required
- Returns comprehensive list of language patterns that often indicate problematic claims
- Helps understand what triggers the detector

## Detection Categories

### Absolutes (HIGH severity)
- Words like "always", "never", "perfect", "revolutionary"
- Problem: Absolute claims are rarely accurate in reality
- Triggers overconfident statements

### Vague Terms (MEDIUM severity)  
- Words like "significant", "substantial", "considerable"
- Problem: Imprecise language that sounds impressive but lacks specificity
- Often used to make weak claims sound stronger

### Weasel Words (MEDIUM severity)
- Phrases like "many experts", "studies show", "it's widely known"
- Problem: Appeals to unnamed authority without evidence
- Creates false impression of support

### Techno-babble (MEDIUM severity)
- Unnecessary technical jargon or buzzwords
- Problem: May be used to sound authoritative without substance
- Often obscures rather than clarifies

### Self-Aggrandizing (LOW severity)
- Excessive self-promotion or inflated achievements
- Problem: May indicate bias or lack of objectivity
- Can undermine credibility

## Self-Validation Process

Before making claims, ask:
1. What evidence do I actually have for this claim?
2. Am I guessing and presenting it as fact?
3. Could this be easily disproven?
4. Am I confusing "possible" with "proven"?
5. Would I stake my reputation on this being true?
6. Is this what I hope is true vs what I know is true?

## Use Cases

### Content Review
- Analyze marketing copy for exaggerated claims
- Review technical documentation for accuracy
- Check proposals for unsupported assertions

### Writing Improvement
- Identify weak language patterns
- Strengthen claims with specific evidence
- Remove unnecessary absolutes and vague terms

### Quality Assurance
- Validate AI-generated content for accuracy
- Check presentations for overstatement
- Review communications for credibility

## Integration Benefits
- **Credibility**: Helps maintain honest, evidence-based communication
- **Quality Control**: Catches problematic language before publication
- **Self-Awareness**: Develops better writing and claim-making habits
- **Trust Building**: More accurate statements build long-term credibility

The bullshit detector promotes honest, evidence-based communication by identifying and flagging potentially misleading language patterns.
`;
    
    return {
      content: [
        {
          type: 'text',
          text: helpText
        }
      ]
    };
  }
  
  throw new Error(`Unknown tool: ${request.params.name}`);
});

// Start the server
const transport = new StdioServerTransport();
server.connect(transport);
console.error('mcp-bullshit-detector MCP server running on stdio');
