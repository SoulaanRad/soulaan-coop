#!/usr/bin/env node

const BaseAgent = require('./base-agent.js');

/**
 * RoadmapAnalyzer Agent
 * Analyzes PR changes to determine if they match roadmap items
 */
class RoadmapAnalyzer extends BaseAgent {
  constructor(config) {
    super(config, config.agents.roadmapAnalyzer);
  }

  /**
   * Analyze PR changes against the roadmap
   */
  async analyzePR() {
    this.log('Starting roadmap analysis for PR changes...');
    
    try {
      // Load roadmap
      const roadmap = this.loadRoadmap();
      
      // Get changed files and their content
      const changedFiles = this.getChangedFiles();
      if (changedFiles.length === 0) {
        this.log('No relevant files changed. Skipping analysis.');
        return { matches: [] };
      }

      this.log(`Analyzing ${changedFiles.length} changed files...`);
      const changes = this.getChangesContent(changedFiles);
      
      // Prepare analysis prompt
      const userContent = this.buildAnalysisPrompt(roadmap, changes);
      
      // Call OpenAI for analysis
      const result = await this.callOpenAI(
        this.agentConfig.systemPrompt,
        userContent
      );

      // Filter matches by confidence threshold
      const highConfidenceMatches = result.matches.filter(
        match => match.confidence >= this.config.confidenceThreshold
      );

      const analysisResult = {
        totalMatches: result.matches.length,
        highConfidenceMatches: highConfidenceMatches.length,
        matches: highConfidenceMatches,
        allMatches: result.matches // Keep all for debugging
      };

      // Save results
      this.saveResults('roadmap-analysis.json', analysisResult);
      
      this.log(`Found ${highConfidenceMatches.length} high-confidence matches (${this.config.confidenceThreshold}% threshold)`);
      
      return analysisResult;
      
    } catch (error) {
      this.logError('Failed to analyze PR', error);
      throw error;
    }
  }

  /**
   * Build the analysis prompt for OpenAI
   */
  buildAnalysisPrompt(roadmap, changes) {
    const changesText = changes.map(change => 
      `\n--- ${change.file} ---\n${change.content}`
    ).join('\n').slice(0, 12000); // Limit total content

    return `TECHNICAL ROADMAP:
${roadmap}

PULL REQUEST CHANGES:
${changesText}

Analyze these code changes and determine if they technically implement or solve any roadmap items. Be precise and focus on actual technical implementation, not planning or documentation about future work.

Consider a match only if the changes:
1. Actually implement functionality described in roadmap
2. Add infrastructure/architecture mentioned in roadmap  
3. Complete technical milestones listed in roadmap
4. Solve technical requirements specified in roadmap

Do NOT match if changes only:
- Mention roadmap items in comments/docs without implementing
- Partially prepare for future work
- Make unrelated changes that coincidentally touch similar areas

For each match, specify if it's "full" completion or "partial" progress toward the roadmap item.`;
  }

  /**
   * Generate markdown for crossing out completed items
   */
  generateCompletionMarkdown(matches) {
    return matches
      .filter(match => match.completionLevel === 'full')
      .map(match => match.suggestedMarkdown)
      .join('\n');
  }
}

module.exports = RoadmapAnalyzer;