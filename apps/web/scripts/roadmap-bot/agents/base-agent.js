#!/usr/bin/env node

const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');

/**
 * Base Agent Class
 * Provides common functionality for all roadmap bot agents
 */
class BaseAgent {
  constructor(config, agentConfig) {
    this.config = config;
    this.agentConfig = agentConfig;
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    
    if (!this.openai.apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }
  }

  /**
   * Load the roadmap file
   */
  loadRoadmap() {
    try {
      const roadmapPath = path.resolve(this.config.roadmapFile);
      return fs.readFileSync(roadmapPath, 'utf8');
    } catch (error) {
      throw new Error(`Could not load roadmap file: ${this.config.roadmapFile}. ${error.message}`);
    }
  }

  /**
   * Make OpenAI API call with error handling
   */
  async callOpenAI(prompt, userContent, model = null) {
    try {
      const response = await this.openai.chat.completions.create({
        model: model || this.config.model.analysis,
        messages: [
          {
            role: 'system',
            content: prompt
          },
          {
            role: 'user',
            content: userContent
          }
        ],
        max_tokens: this.agentConfig.maxTokens || 800,
        temperature: this.agentConfig.temperature || 0.2
      });

      const content = response.choices[0].message.content.trim();
      
      // Clean up markdown code blocks if present
      let cleanContent = content;
      if (content.includes('```json')) {
        cleanContent = content.replace(/```json\s*/g, '').replace(/```\s*/g, '');
      } else if (content.includes('```')) {
        cleanContent = content.replace(/```/g, '');
      }
      
      return JSON.parse(cleanContent);
    } catch (error) {
      console.error(`Error calling OpenAI API: ${error.message}`);
      if (error.message.includes('JSON')) {
        console.error('Raw response:', error.response?.data || 'No response data');
      }
      throw error;
    }
  }

  /**
   * Get changed files from git diff
   */
  getChangedFiles() {
    const { execSync } = require('child_process');
    try {
      // Try HEAD~1 first
      const output = execSync('git diff --name-only HEAD~1 HEAD', { encoding: 'utf8' });
      const files = output.trim().split('\n').filter(file => file);
      
      return files.filter(file => 
        file.match(/\.(ts|tsx|js|jsx|md|json|yml|yaml)$/) && 
        !file.includes('node_modules') &&
        !file.includes('.git') &&
        !file.includes('pnpm-lock.yaml') &&
        !file.includes('package-lock.json')
      );
    } catch (error) {
      // Fallback to staged files if no previous commit
      try {
        const output = execSync('git diff --cached --name-only', { encoding: 'utf8' });
        return output.trim().split('\n').filter(file => file).filter(file => 
          file.match(/\.(ts|tsx|js|jsx|md|json|yml|yaml)$/) && 
          !file.includes('node_modules') &&
          !file.includes('.git') &&
          !file.includes('pnpm-lock.yaml') &&
          !file.includes('package-lock.json')
        );
      } catch {
        return [];
      }
    }
  }

  /**
   * Get diff content for changed files
   */
  getChangesContent(changedFiles) {
    const { execSync } = require('child_process');
    const changes = [];
    
    for (const file of changedFiles) {
      try {
        // Get the diff for this file
        const diff = execSync(`git diff HEAD~1 HEAD -- "${file}"`, { encoding: 'utf8' });
        
        // If no diff (new file), get full content
        let content = diff;
        if (!diff.trim()) {
          try {
            content = fs.readFileSync(file, 'utf8');
            content = `+++ NEW FILE: ${file}\n${content}`;
          } catch {
            continue;
          }
        }
        
        changes.push({
          file,
          content: content.slice(0, 4000) // Limit content length for API
        });
      } catch (error) {
        // Skip files that can't be read
        continue;
      }
    }
    
    return changes;
  }

  /**
   * Save analysis results to file
   */
  saveResults(filename, data) {
    try {
      const resultsDir = path.join(__dirname, '..', 'results');
      if (!fs.existsSync(resultsDir)) {
        fs.mkdirSync(resultsDir, { recursive: true });
      }
      
      const filepath = path.join(resultsDir, filename);
      fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf8');
      console.log(`📝 Saved results to ${filepath}`);
      return filepath;
    } catch (error) {
      console.warn(`Could not save results file: ${error.message}`);
    }
  }

  /**
   * Log agent activity
   */
  log(message) {
    console.log(`[${this.agentConfig.name}] ${message}`);
  }

  /**
   * Log error
   */
  logError(message, error) {
    console.error(`[${this.agentConfig.name}] ERROR: ${message}`);
    if (error) {
      console.error(error.stack || error.message);
    }
  }
}

module.exports = BaseAgent;