#!/usr/bin/env node

const config = require('./config.js');
const RoadmapAnalyzer = require('./agents/roadmap-analyzer.js');
const CompletionSuggester = require('./agents/completion-suggester.js');
const AutoFixer = require('./agents/auto-fixer.js');
const fs = require('fs');
const { execSync } = require('child_process');

/**
 * Main Roadmap Bot Orchestrator
 * Coordinates the multi-agent system for roadmap monitoring
 */
class RoadmapBot {
  constructor() {
    this.config = config;
    this.analyzer = new RoadmapAnalyzer(config);
    this.suggester = new CompletionSuggester(config);
    this.fixer = new AutoFixer(config);
  }

  /**
   * Handle PR opened/updated events
   */
  async handlePRAnalysis() {
    console.log('🤖 Roadmap Bot: Analyzing PR for roadmap matches...\n');
    
    try {
      // Analyze PR changes
      const analysis = await this.analyzer.analyzePR();
      
      if (analysis.highConfidenceMatches.length === 0) {
        console.log('✅ No roadmap items matched with high confidence. No action needed.');
        return {
          action: 'none',
          matches: 0,
          comment: null
        };
      }

      // Generate PR comment
      const comment = this.generateMatchComment(analysis);
      
      console.log('📝 Generated PR comment for roadmap matches');
      return {
        action: 'comment',
        matches: analysis.highConfidenceMatches.length,
        comment,
        analysis
      };
      
    } catch (error) {
      console.error('❌ Error during PR analysis:', error.message);
      throw error;
    }
  }

  /**
   * Handle PR closed/merged events
   */
  async handlePRCompletion() {
    console.log('🤖 Roadmap Bot: Handling PR completion...\n');
    
    try {
      // Get completion suggestions
      const suggestions = await this.suggester.suggestSubItems();
      
      // Check for auto-fix opportunities
      let autoFixResult = null;
      if (this.config.autofix.enabled) {
        console.log('🔧 Checking for auto-fix opportunities...');
        autoFixResult = await this.fixer.analyzeForAutoFix();
      }

      const results = {
        suggestions: suggestions.suggestions.length,
        autoFix: autoFixResult?.canFix || false,
        comment: null,
        newPR: null
      };

      // Generate completion comment
      if (suggestions.suggestions.length > 0) {
        results.comment = this.generateCompletionComment(suggestions);
        console.log('📝 Generated completion suggestions comment');
      }

      // Execute auto-fix if possible
      if (autoFixResult?.canFix) {
        const branchName = `${this.config.github.branchPrefix}auto-fix-${Date.now()}`;
        const execution = await this.fixer.executeAutoFix(autoFixResult, branchName);
        
        if (execution.success) {
          results.newPR = await this.createAutoFixPR(branchName, autoFixResult, execution);
          console.log(`🚀 Created auto-fix PR: ${results.newPR.url}`);
        }
      }

      return results;
      
    } catch (error) {
      console.error('❌ Error during PR completion handling:', error.message);
      throw error;
    }
  }

  /**
   * Run maintenance tasks (scheduled)
   */
  async handleMaintenance() {
    console.log('🤖 Roadmap Bot: Running maintenance tasks...\n');
    
    try {
      // Check for auto-fix opportunities on next roadmap items
      const autoFixResult = await this.fixer.analyzeForAutoFix();
      
      if (autoFixResult.canFix) {
        console.log('🔧 Found maintenance auto-fix opportunity');
        
        const branchName = `${this.config.github.branchPrefix}maintenance-${Date.now()}`;
        const execution = await this.fixer.executeAutoFix(autoFixResult, branchName);
        
        if (execution.success) {
          const newPR = await this.createAutoFixPR(branchName, autoFixResult, execution);
          console.log(`🚀 Created maintenance PR: ${newPR.url}`);
          return { created: true, pr: newPR };
        }
      }

      console.log('✅ Maintenance complete - no actions needed');
      return { created: false };
      
    } catch (error) {
      console.error('❌ Error during maintenance:', error.message);
      throw error;
    }
  }

  /**
   * Generate PR comment for roadmap matches
   */
  generateMatchComment(analysis) {
    const matches = analysis.highConfidenceMatches;
    
    let comment = `## 🎯 Roadmap Match Detected!\n\n`;
    comment += `This PR appears to implement **${matches.length}** roadmap item${matches.length > 1 ? 's' : ''}:\n\n`;
    
    for (const match of matches) {
      const completionIcon = match.completionLevel === 'full' ? '✅' : '🔄';
      comment += `${completionIcon} **${match.roadmapItem}** (${match.confidence}% confidence)\n`;
      comment += `   - ${match.reasoning}\n`;
      comment += `   - Completion: ${match.completionLevel}\n\n`;
    }

    const fullCompletions = matches.filter(m => m.completionLevel === 'full');
    if (fullCompletions.length > 0) {
      comment += `### 📋 Suggested Roadmap Updates\n\n`;
      comment += `Consider adding this commit to mark items as complete:\n\n`;
      comment += `\`\`\`markdown\n`;
      comment += fullCompletions.map(m => m.suggestedMarkdown).join('\n');
      comment += `\n\`\`\`\n\n`;
    }

    comment += `---\n*🤖 This analysis was performed by the Roadmap Bot with ${this.config.confidenceThreshold}% confidence threshold*`;
    
    return comment;
  }

  /**
   * Generate completion comment for finished PRs
   */
  generateCompletionComment(suggestions) {
    let comment = `## 🚀 Great Progress! Sub-item Suggestions\n\n`;
    comment += `Based on this completed work, here are suggested technical sub-items for remaining roadmap items:\n\n`;
    
    comment += this.suggester.formatSuggestionsForComment(suggestions.suggestions);
    
    comment += `\n\n---\n*🤖 Generated by Roadmap Bot - These suggestions focus on technical implementation needs revealed by your recent work*`;
    
    return comment;
  }

  /**
   * Create auto-fix PR
   */
  async createAutoFixPR(branchName, fixAnalysis, execution) {
    try {
      // Push branch
      execSync(`git push -u origin "${branchName}"`, { stdio: 'inherit' });
      
      // Create PR using gh CLI
      const title = `[Roadmap Bot] Auto-fix: Next roadmap item implementation`;
      const body = `## 🤖 Automated Roadmap Implementation

This PR was automatically generated by the Roadmap Bot to implement the next roadmap item.

### Changes Made
${execution.changedFiles.map(file => `- Modified: \`${file}\``).join('\n')}

### AI Analysis
${fixAnalysis.reasoning}

### Safety Checks
✅ Only safe, simple changes
✅ No security or authentication modifications  
✅ Limited scope (${execution.changedFiles.length} files changed)
✅ Follows auto-fix safety rules

---
**Please review carefully before merging!**

🤖 Generated with Roadmap Bot`;

      const prCommand = `gh pr create --title "${title}" --body "${body}" --label "${this.config.github.labels.autoGenerated},${this.config.github.labels.needsReview}"`;
      const prUrl = execSync(prCommand, { encoding: 'utf8' }).trim();
      
      return {
        url: prUrl,
        branch: branchName,
        title,
        files: execution.changedFiles
      };
      
    } catch (error) {
      console.error('Failed to create auto-fix PR:', error.message);
      throw error;
    }
  }
}

// CLI Interface
async function main() {
  const command = process.argv[2] || 'help';
  const bot = new RoadmapBot();

  try {
    switch (command) {
      case 'analyze-pr':
        const analysis = await bot.handlePRAnalysis();
        console.log('\n📊 Analysis Results:', JSON.stringify(analysis, null, 2));
        
        // Write comment to file for GitHub Actions to use
        if (analysis.comment) {
          fs.writeFileSync('roadmap-bot-comment.md', analysis.comment);
          console.log('💬 Comment saved to roadmap-bot-comment.md');
        }
        
        process.exit(analysis.matches > 0 ? 0 : 1); // Exit with error if no matches for CI
        break;

      case 'handle-completion':
        const completion = await bot.handlePRCompletion();
        console.log('\n📊 Completion Results:', JSON.stringify(completion, null, 2));
        
        if (completion.comment) {
          fs.writeFileSync('roadmap-completion-comment.md', completion.comment);
          console.log('💬 Completion comment saved to roadmap-completion-comment.md');
        }
        break;

      case 'maintenance':
        const maintenance = await bot.handleMaintenance();
        console.log('\n📊 Maintenance Results:', JSON.stringify(maintenance, null, 2));
        break;

      case 'help':
      default:
        console.log(`
🤖 Roadmap Bot - Multi-Agent Roadmap Monitoring System

Commands:
  analyze-pr       - Analyze current PR for roadmap matches
  handle-completion - Handle PR completion (suggestions + auto-fix)
  maintenance      - Run maintenance tasks (check for auto-fixes)
  help            - Show this help message

Environment Variables Required:
  OPENAI_API_KEY   - OpenAI API key for AI agents
  GITHUB_TOKEN     - GitHub token for PR operations

Configuration:
  Edit scripts/roadmap-bot/config.js to customize behavior
        `);
        break;
    }
  } catch (error) {
    console.error('❌ Roadmap Bot Error:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = RoadmapBot;