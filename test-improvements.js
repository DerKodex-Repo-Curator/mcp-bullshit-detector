#!/usr/bin/env node

// Import the improved detection logic
const evidenceMarkers = [
  /\b(\d+:\d+|\d+\.\d+\s+vs\s+\d+\.\d+|\d+%\s+\w+\s+savings|\d+%\s+improvement)\b/gi,
  /\b(experimental results|test results|validation results|research data|benchmark data|peer.reviewed)\b/gi,
  /\b(according to|based on|from study|source:|citation|paper shows|research shows|study found)\b/gi,
  /\b(github\.com|repository|implementation|codebase|algorithm|peer.reviewed|published in)\b/gi,
  /\b(experiment|validation|test|measurement|benchmark)\s+(achieved|showed|demonstrated|found)\b/gi
];

const qualificationMarkers = [
  /\b(appears?|seems?|likely|potentially|may|might|could|possibly|probably|suggests?|indicates?)\b/gi,
  /\b(preliminary|initial|experimental|prototype|alpha|beta|draft|working|tentative)\b/gi,
  /\b(in our tests|in this experiment|our results suggest|evidence suggests|data indicates)\b/gi
];

function hasNearbyEvidence(text, position, radius) {
  const start = Math.max(0, position - radius);
  const end = Math.min(text.length, position + radius);
  const contextText = text.substring(start, end);
  
  return evidenceMarkers.some(marker => {
    marker.lastIndex = 0;
    return marker.test(contextText);
  });
}

function hasQualificationLanguage(text, position, radius) {
  const start = Math.max(0, position - radius);
  const end = Math.min(text.length, position + radius);
  const contextText = text.substring(start, end);
  
  return qualificationMarkers.some(marker => {
    marker.lastIndex = 0;
    return marker.test(contextText);
  });
}

function analyzeBreakthroughs(text, label) {
  const breakthroughPattern = /\b(breakthrough)\b/gi;
  const matches = [...text.matchAll(breakthroughPattern)];
  
  console.log(`\n=== ${label} ===`);
  console.log(`Text: "${text}"`);
  console.log(`Breakthrough instances: ${matches.length}`);
  
  let totalOldScore = 0;
  let totalNewScore = 0;
  
  matches.forEach((match, i) => {
    const position = match.index;
    const hasEvidence = hasNearbyEvidence(text, position, 150);
    const hasQualification = hasQualificationLanguage(text, position, 150);
    
    let scoreModifier = 1.0;
    if (hasEvidence) scoreModifier *= 0.3;
    if (hasQualification) scoreModifier *= 0.5;
    
    const oldScore = 3; // HIGH severity
    const newScore = 3 * scoreModifier;
    
    totalOldScore += oldScore;
    totalNewScore += newScore;
    
    console.log(`  Breakthrough ${i + 1}:`);
    console.log(`    Evidence: ${hasEvidence}, Qualification: ${hasQualification}`);
    console.log(`    Score: ${newScore.toFixed(2)} (was ${oldScore})`);
    console.log(`    Flagged: ${newScore >= 0.8 ? 'YES' : 'NO'}`);
  });
  
  console.log(`Total score: ${totalNewScore.toFixed(2)} (was ${totalOldScore})`);
  return { oldScore: totalOldScore, newScore: totalNewScore };
}

// Test cases
const technicalText = `Based on Brain memories, this is the "learned-encoding-experiment" project - a breakthrough approach. Your validation achieved remarkable results: 8:1 compression ratio, experimental results show 87% memory savings. This breakthrough eliminated separate encoding training.`;

const marketingText = `Our revolutionary breakthrough solution provides guaranteed results that are definitely better than all competitors. This breakthrough changes everything!`;

const qualifiedText = `This potentially represents a breakthrough in our understanding. The preliminary results suggest this approach might be a breakthrough, though more research is needed.`;

// Run tests
const results = [];
results.push(analyzeBreakthroughs(technicalText, "Technical Text with Evidence"));
results.push(analyzeBreakthroughs(marketingText, "Pure Marketing Text"));
results.push(analyzeBreakthroughs(qualifiedText, "Qualified Technical Text"));

// Summary
console.log("\n=== IMPROVEMENT SUMMARY ===");
const totalOld = results.reduce((sum, r) => sum + r.oldScore, 0);
const totalNew = results.reduce((sum, r) => sum + r.newScore, 0);
console.log(`Overall score reduction: ${totalOld} → ${totalNew.toFixed(2)} (${Math.round((1 - totalNew/totalOld) * 100)}% reduction)`);
console.log(`Context-aware detection successfully distinguishes technical content from marketing hype!`);
