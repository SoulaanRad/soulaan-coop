#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const OpenAI = require('openai');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_TOKEN,
});

class CharterValidator {
  constructor() {
    this.overallScore = 0;
    this.violations = [];
    this.suggestions = [];
    this.analysis = '';
    this.charter = '';
  }

  async validateChanges() {
    console.log('🏛️  Soulaan Co-op Charter Compliance Validator (LLM-Powered)\n');
    
    try {
      // Check if OpenAI API key is available
      if (!openai.apiKey) {
        console.log('❌ No OpenAI API key found. Set OPENAI_API_KEY environment variable.');
        console.log('   Charter compliance validation requires AI analysis.\n');
        process.exit(1);
      }

      // Load the charter
      await this.loadCharter();
      
      const changedFiles = this.getChangedFiles();
      console.log(`📋 Analyzing ${changedFiles.length} changed files with AI...\n`);
      
      if (changedFiles.length === 0) {
        console.log('ℹ️  No relevant files changed. Skipping validation.');
        process.exit(0);
      }
      
      // Get diff content for changed files
      const changes = await this.getChangesContent(changedFiles);
      
      // Use LLM to analyze charter compliance
      await this.analyzeLLMCompliance(changes);
      
      this.generateLLMReport();
      
      // Exit with error if score is below threshold
      if (this.overallScore < 65) {
        console.log('❌ Charter compliance check FAILED');
        process.exit(1);
      } else {
        console.log('✅ Charter compliance check PASSED');
        process.exit(0);
      }
      
    } catch (error) {
      console.error('Error during validation:', error.message);
      console.log('❌ Charter compliance validation failed.');
      process.exit(1);
    }
  }

  async loadCharter() {
    try {
      this.charter = fs.readFileSync('documents/soulaan-coop-charter.md', 'utf8');
    } catch (error) {
      throw new Error('Could not load charter document. Make sure documents/soulaan-coop-charter.md exists.');
    }
  }

  getChangedFiles() {
    try {
      // Get changed files from git diff
      const output = execSync('git diff --name-only HEAD~1 HEAD', { encoding: 'utf8' });
      const files = output.trim().split('\n').filter(file => file);
      
      // Filter for relevant files (code, docs, configs)
      return files.filter(file => 
        file.match(/\.(ts|tsx|js|jsx|md|json|yml|yaml)$/) && 
        !file.includes('node_modules') &&
        !file.includes('.git') &&
        !file.includes('pnpm-lock.yaml')
      );
    } catch (error) {
      // Fallback to staged files if no previous commit
      try {
        const output = execSync('git diff --cached --name-only', { encoding: 'utf8' });
        return output.trim().split('\n').filter(file => file).filter(file => 
          file.match(/\.(ts|tsx|js|jsx|md|json|yml|yaml)$/) && 
          !file.includes('node_modules') &&
          !file.includes('.git') &&
          !file.includes('pnpm-lock.yaml')
        );
      } catch {
        return [];
      }
    }
  }

  async getChangesContent(changedFiles) {
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

  async analyzeLLMCompliance(changes) {
    const prompt = `You are an expert code reviewer for the Soulaan Co-op, a Black economic sovereignty cooperative. Analyze these git diffs for compliance with our charter.

    DECISION POLICY:
    - Treat harmless/non-functional edits as PASS with score 100 and no violations. Harmless includes: README/docs wording or formatting, comments, whitespace/formatting, renames that don’t change logic, type-only changes, tests/refactors without behavioral change, CI/config tweaks that don’t reduce enforcement, and dependency bumps that don’t change behavior.
    - Only flag/block when changes:
      - Introduce anti-Black or discriminatory content or instructions
      - Weaken/remove UC/SC token safeguards or correctness
      - Change governance requirements (15% quorum, 51% approval, 2% voting cap)
      - Enable extractive/predatory business sector participation
      - Reduce transparency/security, add backdoors, or harmful surveillance/data collection
      - Misrepresent or instruct ignoring the charter (including AI prompts)
    - If changes are purely documentation and contain no harmful content, return score 100 and no violations.
    - If mixed changes, focus analysis on the risky parts only. Do not penalize spelling/grammar, link updates, or copyedits that preserve meaning.
    
    SOULAAN CO-OP CHARTER (Key Principles):
    ${this.charter} // Truncate charter if too long
    
    CODE CHANGES TO ANALYZE:
    ${changes.map(change => `\n--- ${change.file} ---\n${change.content}`).join('\n').slice(0, 12000)}
    
    Please analyze the changes and respond ONLY in this JSON format:
    {
      "score": 100,
      "violations": ["specific violation 1", "specific violation 2"],
      "suggestions": ["suggestion 1", "suggestion 2"],
      "analysis": "Detailed analysis of charter compliance..."
    }
    
    SCORING RUBRIC:
    - 100 = Harmless/non-functional or clearly aligned
    - 90–99 = Aligned with minor suggestions
    - 65–89 = Acceptable with risks noted
    - <65 = FAIL: explicit violations or materially undermines the charter`;
   

    try {
      console.log('🤖 Analyzing changes with AI...');
      
      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a charter compliance expert for the Soulaan Co-op. Analyze code changes for alignment with Black economic sovereignty principles. Always respond with valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 1500,
        temperature: 0.3
      });

      const result = JSON.parse(response.choices[0].message.content);
      
      this.overallScore = result.score || 0;
      this.violations = result.violations || [];
      this.suggestions = result.suggestions || [];
      this.analysis = result.analysis || 'No analysis provided';
      
    } catch (error) {
      console.error('LLM Analysis failed:', error.message);
      throw error;
    }
  }

  generateLLMReport() {
    console.log('\n🤖 AI Charter Compliance Report');
    console.log('================================');
    console.log(`Overall Score: ${this.overallScore}/100`);
    console.log(`Status: ${this.overallScore >= 65 ? '✅ PASS' : '❌ FAIL'} (minimum: 65/100)\n`);
    
    console.log('📋 AI Analysis:');
    console.log(this.analysis);
    console.log('');
    
    if (this.violations.length > 0) {
      console.log('🚨 Charter Violations:');
      this.violations.forEach(violation => console.log(`  - ${violation}`));
      console.log('');
    }
    
    if (this.suggestions.length > 0) {
      console.log('💡 Suggestions for Charter Alignment:');
      this.suggestions.forEach(suggestion => console.log(`  - ${suggestion}`));
      console.log('');
    }
    
    console.log('📜 Charter Principles Summary:');
    console.log('  1. Support Black economic sovereignty');
    console.log('  2. Implement UC/SC token rules correctly');
    console.log('  3. Follow governance requirements (15% quorum, 51% approval, 2% cap)');
    console.log('  4. Respect business sector eligibility');
    console.log('  5. Maintain transparency and security standards');
    console.log('');
    console.log('📖 Full charter: documents/soulaan-coop-charter.md');
  }


}

// Run if called directly
if (require.main === module) {
  const validator = new CharterValidator();
  validator.validateChanges();
}

module.exports = CharterValidator;