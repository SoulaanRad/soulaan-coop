#!/usr/bin/env node

const BaseAgent = require('./base-agent.js');

/**
 * CompletionSuggester Agent
 * Suggests sub-items for roadmap items when PRs are completed
 */
class CompletionSuggester extends BaseAgent {
  constructor(config) {
    super(config, config.agents.completionSuggester);
  }

  /**
   * Suggest sub-items based on completed work
   */
  async suggestSubItems(completedItems = []) {
    this.log('Generating sub-item suggestions for completed roadmap items...');
    
    try {
      // Load roadmap
      const roadmap = this.loadRoadmap();
      
      // Get recent changes for context
      const changedFiles = this.getChangedFiles();
      const changes = this.getChangesContent(changedFiles);
      
      // If no specific completed items provided, analyze what was just completed
      let itemsToAnalyze = completedItems;
      if (completedItems.length === 0) {
        // Try to infer from recent changes
        itemsToAnalyze = await this.inferCompletedItems(roadmap, changes);
      }

      if (itemsToAnalyze.length === 0) {
        this.log('No completed items to analyze for sub-item suggestions.');
        return { suggestions: [] };
      }

      this.log(`Analyzing ${itemsToAnalyze.length} completed items for sub-suggestions...`);
      
      // Build analysis prompt
      const userContent = this.buildSuggestionPrompt(roadmap, changes, itemsToAnalyze);
      
      // Call OpenAI for suggestions
      const result = await this.callOpenAI(
        this.agentConfig.systemPrompt,
        userContent
      );

      // Save results
      this.saveResults('completion-suggestions.json', result);
      
      this.log(`Generated ${result.suggestions.length} sub-item suggestions`);
      
      return result;
      
    } catch (error) {
      this.logError('Failed to generate completion suggestions', error);
      throw error;
    }
  }

  /**
   * Try to infer what items were just completed based on changes
   */
  async inferCompletedItems(roadmap, changes) {
    if (changes.length === 0) return [];

    const inferencePrompt = `Based on these code changes, what roadmap items appear to have been completed or significantly progressed?

ROADMAP:
${roadmap}

CHANGES:
${changes.map(c => `${c.file}:\n${c.content.slice(0, 1000)}`).join('\n')}

Return only the specific roadmap item text that appears completed, one per line. If nothing appears completed, return empty.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: this.config.model.analysis,
        messages: [
          { role: 'user', content: inferencePrompt }
        ],
        max_tokens: 300,
        temperature: 0.1
      });

      const items = response.choices[0].message.content
        .trim()
        .split('\n')
        .filter(line => line.trim())
        .map(line => line.replace(/^[-*]\s*/, '').trim());

      return items;
    } catch (error) {
      this.log('Could not infer completed items, continuing with empty list');
      return [];
    }
  }

  /**
   * Build the suggestion prompt for OpenAI
   */
  buildSuggestionPrompt(roadmap, changes, completedItems) {
    const changesText = changes.length > 0 
      ? changes.map(change => 
          `\n--- ${change.file} ---\n${change.content.slice(0, 2000)}`
        ).join('\n').slice(0, 8000)
      : 'No specific changes provided';

    const completedText = completedItems.join('\n- ');

    return `TECHNICAL ROADMAP:
${roadmap}

RECENTLY COMPLETED ITEMS:
- ${completedText}

RECENT CODE CHANGES (for context):
${changesText}

Based on the completed roadmap items and recent changes, suggest specific technical sub-items that should be added to remaining roadmap items. Focus on:

1. **Technical implementation gaps** revealed by the completed work
2. **Integration requirements** now needed between completed and remaining items
3. **Testing and validation** requirements for the completed functionality
4. **Documentation and monitoring** needs that emerged
5. **Performance and security** considerations now relevant

Be specific and technical. Suggest actionable sub-items that are obvious next steps given what was just completed.

For example, if "Set up authentication" was completed, you might suggest:
- Add authentication middleware to API routes
- Implement user session management
- Add authentication error handling
- Create user authentication tests

Focus on sub-items for roadmap steps that haven't been completed yet, but now have new requirements due to the completed work.`;
  }

  /**
   * Format suggestions for GitHub comment
   */
  formatSuggestionsForComment(suggestions) {
    if (suggestions.length === 0) {
      return 'No additional sub-items recommended at this time.';
    }

    return suggestions.map(suggestion => {
      const priorityEmoji = suggestion.priority === 'high' ? '🔴' : 
                           suggestion.priority === 'medium' ? '🟡' : '🟢';
      
      return `### ${priorityEmoji} ${suggestion.parentItem}

**Suggested sub-items:**
${suggestion.subItems.map(item => `- [ ] ${item}`).join('\n')}

**Reasoning:** ${suggestion.reasoning}`;
    }).join('\n\n');
  }
}

module.exports = CompletionSuggester;