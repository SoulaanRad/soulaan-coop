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

      // Validate and filter suggestions before creating PR
      if (suggestions.suggestions.length > 0) {
        const validatedSuggestions = this.validateSuggestions(suggestions);
        
        if (validatedSuggestions.suggestions.length > 0) {
          console.log(`✅ Validated suggestions: ${validatedSuggestions.suggestions.length}/${suggestions.suggestions.length} passed validation`);
          
          const suggestionsPR = await this.createSuggestionsPR(validatedSuggestions);
          if (suggestionsPR.success) {
            results.newPR = suggestionsPR;
            console.log(`🚀 Created suggestions PR: ${suggestionsPR.url}`);
          } else {
            // Fallback to comment if PR creation fails
            results.comment = this.generateCompletionComment(validatedSuggestions);
            console.log('📝 Generated completion suggestions comment (PR creation failed)');
          }
        } else {
          console.log('ℹ️ No suggestions passed validation - skipping PR creation');
          results.suggestions = 0; // Update count to reflect filtered results
        }
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
   * Validate suggestions to prevent duplicates and ensure quality
   */
  validateSuggestions(suggestions) {
    console.log('🔍 Validating suggestions for duplicates and quality...');
    
    // Read current roadmap to check for duplicates
    const currentRoadmap = fs.readFileSync(this.config.roadmapFile, 'utf8').toLowerCase();
    
    const validatedSuggestions = {
      suggestions: []
    };

    for (const suggestion of suggestions.suggestions) {
      const validatedSuggestion = {
        ...suggestion,
        subItems: []
      };

      let itemsFiltered = 0;
      
      for (const subItem of suggestion.subItems) {
        if (this.isValidSubItem(subItem, currentRoadmap)) {
          validatedSuggestion.subItems.push(subItem);
        } else {
          itemsFiltered++;
        }
      }

      // Only keep suggestion groups that have at least 1 valid sub-item
      if (validatedSuggestion.subItems.length > 0) {
        validatedSuggestions.suggestions.push(validatedSuggestion);
        
        if (itemsFiltered > 0) {
          console.log(`   ⚠️ Filtered ${itemsFiltered} duplicate/low-quality items from "${suggestion.parentItem}"`);
        }
      } else {
        console.log(`   ❌ Rejected entire suggestion group "${suggestion.parentItem}" - all items were duplicates or low quality`);
      }
    }

    const totalOriginal = suggestions.suggestions.reduce((sum, s) => sum + s.subItems.length, 0);
    const totalValidated = validatedSuggestions.suggestions.reduce((sum, s) => sum + s.subItems.length, 0);
    
    console.log(`   📊 Validation complete: ${totalValidated}/${totalOriginal} sub-items passed`);
    
    return validatedSuggestions;
  }

  /**
   * Check if a sub-item is valid (not duplicate, meets quality standards)
   */
  isValidSubItem(subItem, currentRoadmap) {
    const itemLower = subItem.toLowerCase();
    
    // Quality checks - reject if too short or too vague
    if (subItem.length < 10) {
      return false; // Too short
    }
    
    if (this.isTooVague(subItem)) {
      return false; // Too vague
    }

    // Duplicate checks - look for similar existing content
    const keyWords = this.extractKeywords(itemLower);
    
    // If we find 3+ matching keywords in the roadmap, it's likely a duplicate
    let matchingKeywords = 0;
    for (const keyword of keyWords) {
      if (currentRoadmap.includes(keyword)) {
        matchingKeywords++;
      }
    }
    
    const duplicateThreshold = Math.min(3, keyWords.length - 1);
    if (matchingKeywords >= duplicateThreshold && keyWords.length >= 3) {
      return false; // Likely duplicate
    }

    return true;
  }

  /**
   * Check if suggestion is too vague
   */
  isTooVague(subItem) {
    const vaguePhrases = [
      'add more', 'improve', 'enhance', 'update', 'fix', 'better',
      'optimize', 'refactor', 'clean up', 'make sure', 'ensure',
      'check', 'review', 'consider', 'think about', 'maybe'
    ];
    
    const itemLower = subItem.toLowerCase();
    
    // Check if it starts with vague phrases without specifics
    for (const phrase of vaguePhrases) {
      if (itemLower.startsWith(phrase) && !this.hasSpecifics(itemLower)) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Check if item has specific technical details
   */
  hasSpecifics(itemLower) {
    const specificIndicators = [
      'api', 'endpoint', 'database', 'table', 'component', 'function',
      'class', 'method', 'service', 'middleware', 'validation', 'schema',
      'authentication', 'authorization', 'encryption', 'testing', 'unit test',
      'integration test', 'deployment', 'configuration', 'environment',
      'logging', 'monitoring', 'error handling', 'rate limiting'
    ];
    
    return specificIndicators.some(indicator => itemLower.includes(indicator));
  }

  /**
   * Extract meaningful keywords from suggestion text
   */
  extractKeywords(text) {
    const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should'];
    
    return text
      .split(/[^a-zA-Z0-9]+/)
      .filter(word => word.length > 2 && !stopWords.includes(word))
      .slice(0, 5); // Take first 5 meaningful words
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

  /**
   * Create a PR with roadmap suggestions added directly to tech_roadmap.md
   */
  async createSuggestionsPR(suggestions) {
    try {
      const branchName = `${this.config.github.branchPrefix}suggestions-${Date.now()}`;
      const timestamp = new Date().toISOString().split('T')[0];
      
      // Create new branch
      execSync(`git checkout -b "${branchName}"`, { stdio: 'inherit' });
      
      // Read current roadmap file
      const roadmapPath = this.config.roadmapFile;
      const currentRoadmap = fs.readFileSync(roadmapPath, 'utf8');
      
      // Add suggestions to roadmap file
      const updatedRoadmap = this.addSuggestionsToRoadmap(currentRoadmap, suggestions, timestamp);
      fs.writeFileSync(roadmapPath, updatedRoadmap);
      
      // Commit changes
      execSync(`git add "${roadmapPath}"`, { stdio: 'inherit' });
      execSync(`git commit -m "Add roadmap sub-items from completed work analysis

🤖 Generated by Roadmap Bot based on recently completed items
- Added ${suggestions.suggestions.length} technical sub-item groups
- Focus on implementation needs revealed by recent work"`, { stdio: 'inherit' });
      
      // Push branch
      execSync(`git push -u origin "${branchName}"`, { stdio: 'inherit' });
      
      // Create PR using gh CLI
      const title = `[Roadmap Bot] Add technical sub-items to roadmap`;
      const body = `## 🎯 Roadmap Sub-items Added

Based on recently completed work, the Roadmap Bot has added **${suggestions.suggestions.length}** groups of technical sub-items directly to \`documents/tech_roadmap.md\`.

### What's included:
- Technical sub-items added under relevant roadmap sections
- Each group includes priority indicators and implementation notes
- Suggestions focus on obvious technical needs revealed by recent work

### Changes Made:
${this.generateSuggestionsPreview(suggestions)}

### Next Steps:
1. Review the added sub-items in \`documents/tech_roadmap.md\`
2. Adjust priorities and wording as needed
3. Remove or modify items that don't fit current project direction
4. Merge to integrate the suggestions into the main roadmap

---
🤖 **Auto-generated by Roadmap Bot** - Review and merge when ready`;

      const prCommand = `gh pr create --title "${title}" --body "${body.replace(/"/g, '\\"')}" --label "${this.config.github.labels.autoGenerated},roadmap-update"`;
      const prUrl = execSync(prCommand, { encoding: 'utf8' }).trim();
      
      // Extract PR number from URL for commenting
      const prNumber = prUrl.split('/').pop();
      
      // Create detailed comment explaining the changes
      const detailedComment = this.generateDetailedSuggestionsComment(suggestions);
      const commentCommand = `gh pr comment ${prNumber} --body "${detailedComment.replace(/"/g, '\\"')}"`;
      
      try {
        execSync(commentCommand, { stdio: 'inherit' });
        console.log('📝 Added detailed comment to suggestions PR');
      } catch (commentError) {
        console.error('⚠️ Failed to add comment to PR:', commentError.message);
      }
      
      // Switch back to main branch
      execSync('git checkout main', { stdio: 'inherit' });
      
      return {
        success: true,
        url: prUrl,
        branch: branchName,
        title,
        suggestionsAdded: suggestions.suggestions.length,
        commentAdded: true
      };
      
    } catch (error) {
      console.error('Failed to create suggestions PR:', error.message);
      
      // Clean up: switch back to main if we're stuck on the new branch
      try {
        execSync('git checkout main', { stdio: 'inherit' });
      } catch (cleanupError) {
        console.error('Failed to switch back to main:', cleanupError.message);
      }
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Add suggestions directly to the existing roadmap sections
   */
  addSuggestionsToRoadmap(currentRoadmap, suggestions, timestamp) {
    let updatedRoadmap = currentRoadmap;
    
    for (const suggestion of suggestions.suggestions) {
      // Find the best matching section for this suggestion
      const targetSection = this.findBestMatchingSection(updatedRoadmap, suggestion.parentItem);
      
      if (targetSection) {
        // Add sub-items to the existing section
        updatedRoadmap = this.addSubItemsToSection(updatedRoadmap, targetSection, suggestion);
      } else {
        // Create a new subsection if no good match found
        updatedRoadmap = this.addNewSubsection(updatedRoadmap, suggestion);
      }
    }
    
    // Add a small note at the end indicating AI additions
    const aiNote = `

---
*🤖 Roadmap updated ${timestamp} - AI-generated sub-items added based on completed work analysis*
`;
    
    updatedRoadmap += aiNote;
    
    return updatedRoadmap;
  }

  /**
   * Find the best matching section for a suggestion
   */
  findBestMatchingSection(roadmap, parentItem) {
    const lines = roadmap.split('\n');
    const sections = [];
    
    // Extract all main sections (## headers)
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('## ') && !line.includes('🤖')) {
        sections.push({
          title: line.replace('## ', '').trim(),
          lineIndex: i,
          content: line
        });
      }
    }
    
    // Simple keyword matching to find best section
    const keywords = parentItem.toLowerCase().split(' ');
    let bestMatch = null;
    let bestScore = 0;
    
    for (const section of sections) {
      const sectionTitle = section.title.toLowerCase();
      let score = 0;
      
      for (const keyword of keywords) {
        if (sectionTitle.includes(keyword)) {
          score += keyword.length;
        }
      }
      
      if (score > bestScore) {
        bestScore = score;
        bestMatch = section;
      }
    }
    
    return bestMatch;
  }

  /**
   * Add sub-items to an existing section
   */
  addSubItemsToSection(roadmap, targetSection, suggestion) {
    const lines = roadmap.split('\n');
    const priorityIcon = suggestion.priority === 'high' ? '🔴' : 
                        suggestion.priority === 'medium' ? '🟡' : '🟢';
    
    // Find the end of the target section (next ## or end of file)
    let insertIndex = targetSection.lineIndex + 1;
    let foundContent = false;
    
    // Skip to find where the bullet points are or where to insert
    for (let i = targetSection.lineIndex + 1; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // If we hit another section, insert before it
      if (line.startsWith('##') || line.startsWith('---')) {
        break;
      }
      
      // If we find existing content, mark it
      if (line.startsWith('- ') || line.length > 0) {
        foundContent = true;
      }
      
      insertIndex = i + 1;
    }
    
    // Create the sub-items to insert
    const subItemsToAdd = [];
    
    // Add a comment about AI additions if this is the first addition to this section
    subItemsToAdd.push(`  <!-- 🤖 AI-generated sub-items based on completed work -->`);
    
    for (const subItem of suggestion.subItems) {
      subItemsToAdd.push(`  - [ ] ${subItem} ${priorityIcon}`);
    }
    
    // Insert the new sub-items
    lines.splice(insertIndex, 0, ...subItemsToAdd);
    
    return lines.join('\n');
  }

  /**
   * Add a new subsection for suggestions that don't match existing sections
   */
  addNewSubsection(roadmap, suggestion) {
    const priorityIcon = suggestion.priority === 'high' ? '🔴' : 
                        suggestion.priority === 'medium' ? '🟡' : '🟢';
    
    const newSubsection = `

---

## ${suggestion.parentItem} ${priorityIcon}
*AI-suggested based on recent work: ${suggestion.reasoning}*

`;
    
    let subItemsContent = newSubsection;
    for (const subItem of suggestion.subItems) {
      subItemsContent += `- [ ] ${subItem}\n`;
    }
    
    // Insert before the final section or at the end
    const lines = roadmap.split('\n');
    let insertIndex = lines.length;
    
    // Try to insert before any existing final notes or at the end
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i].trim();
      if (line.startsWith('*🤖') || line.includes('AI-generated') || line.startsWith('---')) {
        insertIndex = i;
        break;
      }
    }
    
    lines.splice(insertIndex, 0, ...subItemsContent.split('\n'));
    
    return lines.join('\n');
  }

  /**
   * Generate preview of suggestions for PR body
   */
  generateSuggestionsPreview(suggestions) {
    let preview = `\n### Preview of Suggestions:\n\n`;
    
    for (const suggestion of suggestions.suggestions.slice(0, 2)) { // Show first 2
      preview += `**${suggestion.parentItem}** (${suggestion.priority} priority)\n`;
      preview += `${suggestion.subItems.slice(0, 3).map(item => `- ${item}`).join('\n')}\n`;
      if (suggestion.subItems.length > 3) {
        preview += `- ... and ${suggestion.subItems.length - 3} more items\n`;
      }
      preview += `\n`;
    }
    
    if (suggestions.suggestions.length > 2) {
      preview += `*... and ${suggestions.suggestions.length - 2} more roadmap areas with suggestions*\n`;
    }
    
    return preview;
  }

  /**
   * Generate detailed comment for suggestions PR explaining changes and reasoning
   */
  generateDetailedSuggestionsComment(suggestions) {
    let comment = `## 🔍 Detailed Analysis: Suggested Roadmap Sub-items

This PR adds **${suggestions.suggestions.length}** groups of technical sub-items to the roadmap based on AI analysis of recently completed work.

### 📋 Complete Breakdown:

`;

    let groupIndex = 1;
    for (const suggestion of suggestions.suggestions) {
      const priorityIcon = suggestion.priority === 'high' ? '🔴' : 
                          suggestion.priority === 'medium' ? '🟡' : '🟢';
      
      comment += `#### ${groupIndex}. ${suggestion.parentItem} ${priorityIcon}

**Priority Level:** ${suggestion.priority.toUpperCase()}

**🤔 Why these suggestions?**  
${suggestion.reasoning}

**📝 Suggested Sub-items:**
`;
      
      for (let i = 0; i < suggestion.subItems.length; i++) {
        comment += `${i + 1}. \`[ ]\` ${suggestion.subItems[i]}\n`;
      }
      
      comment += `\n---\n\n`;
      groupIndex++;
    }

    comment += `### 🎯 How to Review:

1. **Check the file changes** in \`documents/tech_roadmap.md\`
2. **Review each suggested sub-item** for relevance to your current priorities
3. **Consider the AI reasoning** - does it make sense given recent work?
4. **Adjust priorities** if needed (🔴 High | 🟡 Medium | 🟢 Low)
5. **Move items** from the AI-generated section to main roadmap sections as appropriate

### 🤖 AI Analysis Notes:

- **Total sub-items suggested:** ${suggestions.suggestions.reduce((total, s) => total + s.subItems.length, 0)}
- **High priority groups:** ${suggestions.suggestions.filter(s => s.priority === 'high').length}
- **Medium priority groups:** ${suggestions.suggestions.filter(s => s.priority === 'medium').length}
- **Low priority groups:** ${suggestions.suggestions.filter(s => s.priority === 'low').length}

The AI focused on technical implementation needs that became apparent from recently completed work. All suggestions are designed to be actionable and specific to avoid vague roadmap items.

---

💡 **Tip:** You can edit the roadmap file directly in this PR before merging to customize the suggestions to your needs.`;

    return comment;
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