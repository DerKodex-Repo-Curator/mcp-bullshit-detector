# MCP Bullshit Detector

A Model Context Protocol (MCP) server that provides systematic bullshit detection for response validation.

## What It Does

This tool analyzes text for common indicators of bullshit including:
- Unsupported statistics and percentages
- Absolute claims (always, never, perfect, solved)
- Comparative claims without evidence (better than, superior to)
- Unverified capability claims about own systems
- Confident future predictions
- False consensus assumptions (obviously, everyone knows)
- Vague appeals to authority without citations
- Performance multiplier claims without evidence

## Installation

```bash
git clone <repo>
cd mcp-bullshit-detector
npm install
```

## Usage

The server provides three MCP tools:

### `detect_bullshit`
Analyzes text for bullshit indicators and provides detailed feedback.

**Parameters:**
- `text` (string): Text to analyze

**Example output:**
```
🚨 Bullshit Level: HIGH (Score: 8/15)
Found 3 issues: 2 high severity, 1 medium severity

## Detected Issues
1. "90% success rate" (HIGH) - Specific percentage without source
2. "we have solved" (HIGH) - Unverified capability claim  
3. "obviously" (MEDIUM) - Assumed agreement

## Recommendations
- Add sources for statistics or qualify as estimates
- Acknowledge uncertainty about capabilities
- Remove assumptions about what is obvious
```

### `get_validation_questions`
Returns self-validation questions to ask before making claims.

### `get_bullshit_patterns`
Shows all patterns the detector looks for with explanations.

## Running as MCP Server

Add to your MCP client configuration:

```json
{
  "servers": {
    "bullshit-detector": {
      "command": "node",
      "args": ["/path/to/mcp-bullshit-detector/src/index.js"]
    }
  }
}
```

## Testing

Test the bullshit detector on this very README:

```bash
node src/index.js
```

Then use the `detect_bullshit` tool with this text to see what it finds!

## Purpose

This tool implements a systematic approach to catching overconfident claims, unsupported statistics, and misleading language patterns that commonly appear in AI-generated responses. It's designed to be used as a pre-response validation step to improve accuracy and honesty.
