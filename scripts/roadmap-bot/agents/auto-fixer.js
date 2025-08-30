#!/usr/bin/env node

const BaseAgent = require('./base-agent.js');
const fs = require('fs');
const path = require('path');

/**
 * AutoFixer Agent
 * Attempts to automatically fix simple roadmap items
 */
class AutoFixer extends BaseAgent {
  constructor(config) {
    super(config, config.agents.autoFixer);
  }

  /**
   * Analyze if next roadmap item can be auto-fixed
   */
  async analyzeForAutoFix(targetItem = null) {
    this.log('Analyzing roadmap for auto-fixable items...');
    
    try {
      if (!this.config.autofix.enabled) {
        this.log('Auto-fix is disabled in configuration');
        return { canFix: false, reasoning: 'Auto-fix disabled in configuration' };
      }

      // Load roadmap
      const roadmap = this.loadRoadmap();
      
      // Find next item to work on
      const nextItem = targetItem || this.findNextRoadmapItem(roadmap);
      if (!nextItem) {
        this.log('No suitable roadmap item found for auto-fixing');
        return { canFix: false, reasoning: 'No uncompleted roadmap items found' };
      }

      this.log(`Analyzing roadmap item for auto-fix: "${nextItem}"`);
      
      // Get current codebase context
      const codebaseContext = await this.getCodebaseContext();
      
      // Build analysis prompt
      const userContent = this.buildAutoFixPrompt(roadmap, nextItem, codebaseContext);
      
      // Call OpenAI for analysis
      const result = await this.callOpenAI(
        this.agentConfig.systemPrompt,
        userContent,
        this.config.model.autofix
      );

      // Validate the proposed changes
      if (result.canFix) {
        const validation = this.validateProposedChanges(result.changes);
        if (!validation.valid) {
          result.canFix = false;
          result.reasoning = `Safety validation failed: ${validation.reason}`;
        }
      }

      // Save results
      this.saveResults('auto-fix-analysis.json', result);
      
      this.log(`Auto-fix analysis complete. Can fix: ${result.canFix}`);
      
      return result;
      
    } catch (error) {
      this.logError('Failed to analyze for auto-fix', error);
      throw error;
    }
  }

  /**
   * Execute the auto-fix changes
   */
  async executeAutoFix(fixAnalysis, branchName = null) {
    if (!fixAnalysis.canFix || !fixAnalysis.changes) {
      throw new Error('Invalid fix analysis provided');
    }

    this.log('Executing auto-fix changes...');
    
    try {
      const { execSync } = require('child_process');
      
      // Create new branch if specified
      if (branchName) {
        execSync(`git checkout -b "${branchName}"`, { stdio: 'inherit' });
        this.log(`Created and switched to branch: ${branchName}`);
      }

      const changedFiles = [];
      
      // Execute each change
      for (const change of fixAnalysis.changes) {
        await this.executeChange(change);
        changedFiles.push(change.file);
      }

      // Stage the changes
      for (const file of changedFiles) {
        execSync(`git add "${file}"`, { stdio: 'inherit' });
      }

      const executionResult = {
        success: true,
        changedFiles,
        branchName,
        reasoning: fixAnalysis.reasoning
      };

      this.saveResults('auto-fix-execution.json', executionResult);
      this.log(`Auto-fix execution complete. Changed ${changedFiles.length} files.`);
      
      return executionResult;
      
    } catch (error) {
      this.logError('Failed to execute auto-fix', error);
      throw error;
    }
  }

  /**
   * Find the next uncompleted roadmap item
   */
  findNextRoadmapItem(roadmap) {
    // Look for items that are not crossed out
    const lines = roadmap.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      // Find bullet points that aren't crossed out
      if (trimmed.match(/^[-*]\s+/) && !trimmed.includes('~~') && !trimmed.match(/^[-*]\s+\[x\]/i)) {
        return trimmed.replace(/^[-*]\s+/, '').trim();
      }
    }
    return null;
  }

  /**
   * Get codebase context for the AI
   */
  async getCodebaseContext() {
    try {
      // Get package.json for dependencies context
      const packageJsonPath = path.resolve('package.json');
      let packageInfo = '';
      if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        packageInfo = `Dependencies: ${Object.keys(packageJson.dependencies || {}).join(', ')}\n`;
      }

      // Get basic project structure
      const { execSync } = require('child_process');
      let projectStructure = '';
      try {
        projectStructure = execSync('find . -type f -name "*.js" -o -name "*.ts" -o -name "*.jsx" -o -name "*.tsx" | head -20', 
          { encoding: 'utf8' }).trim();
      } catch {
        projectStructure = 'Could not determine project structure';
      }

      return `${packageInfo}
Project Structure (sample):
${projectStructure}

Current working directory: ${process.cwd()}`;
    } catch (error) {
      return 'Could not gather codebase context';
    }
  }

  /**
   * Build the auto-fix analysis prompt
   */
  buildAutoFixPrompt(roadmap, targetItem, codebaseContext) {
    return `TECHNICAL ROADMAP:
${roadmap}

TARGET ROADMAP ITEM TO IMPLEMENT:
"${targetItem}"

CURRENT CODEBASE CONTEXT:
${codebaseContext}

Your task is to determine if this roadmap item can be safely implemented through simple, automated changes. 

ONLY consider auto-fixing if the task involves:
- Creating/updating documentation files
- Adding simple configuration files
- Creating basic TypeScript interfaces/types
- Adding simple utility functions
- Creating basic test files
- Adding imports/exports
- Simple dependency updates in package.json

DO NOT attempt to auto-fix if it involves:
- Authentication or security logic
- Database schemas or migrations
- Complex business logic
- API endpoint implementations
- State management setup
- UI component implementations
- Build configuration changes
- Environment-specific configs

If you can auto-fix, provide specific file changes. Be conservative - when in doubt, return canFix: false.`;
  }

  /**
   * Validate proposed changes for safety
   */
  validateProposedChanges(changes) {
    for (const change of changes) {
      // Check file type restrictions
      const ext = path.extname(change.file);
      if (!this.config.autofix.allowedFileTypes.includes(ext)) {
        return { valid: false, reason: `File type ${ext} not allowed for auto-fix` };
      }

      // Check disallowed patterns
      for (const pattern of this.config.autofix.disallowedPatterns) {
        if (pattern.test(change.file)) {
          return { valid: false, reason: `File matches disallowed pattern: ${change.file}` };
        }
      }

      // Check if file content length is reasonable
      if (change.content && change.content.length > this.config.autofix.maxLinesPerFile * 100) {
        return { valid: false, reason: 'File content too large for auto-fix' };
      }
    }

    // Check total number of files
    if (changes.length > this.config.autofix.maxFilesChanged) {
      return { valid: false, reason: `Too many files to change: ${changes.length} > ${this.config.autofix.maxFilesChanged}` };
    }

    return { valid: true };
  }

  /**
   * Execute a single file change
   */
  async executeChange(change) {
    const { file, action, content, description } = change;
    
    this.log(`Executing ${action} on ${file}: ${description}`);
    
    try {
      if (action === 'create' || action === 'modify') {
        if (!content) {
          throw new Error(`No content provided for ${action} on ${file}`);
        }
        
        // Ensure directory exists
        const dir = path.dirname(file);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        
        fs.writeFileSync(file, content, 'utf8');
      } else if (action === 'delete') {
        if (fs.existsSync(file)) {
          fs.unlinkSync(file);
        }
      } else {
        throw new Error(`Unknown action: ${action}`);
      }
    } catch (error) {
      throw new Error(`Failed to execute ${action} on ${file}: ${error.message}`);
    }
  }
}

module.exports = AutoFixer;