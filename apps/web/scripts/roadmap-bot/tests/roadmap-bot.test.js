const { describe, it, expect, beforeEach, afterEach, jest } = require('@jest/globals');
const fs = require('fs');
const path = require('path');

// Mock OpenAI
const mockOpenAI = {
  chat: {
    completions: {
      create: jest.fn()
    }
  }
};

jest.mock('openai', () => {
  return jest.fn(() => mockOpenAI);
});

// Import after mocking
const config = require('../config.js');
const RoadmapAnalyzer = require('../agents/roadmap-analyzer.js');
const CompletionSuggester = require('../agents/completion-suggester.js');
const AutoFixer = require('../agents/auto-fixer.js');

describe('Roadmap Bot System', () => {
  beforeEach(() => {
    // Reset mocks
    mockOpenAI.chat.completions.create.mockReset();
    
    // Mock environment
    process.env.OPENAI_API_KEY = 'test-key';
    
    // Mock file system operations
    jest.spyOn(fs, 'readFileSync').mockImplementation((path) => {
      if (path.includes('tech_roadmap.md')) {
        return `# Test Roadmap
## Step 1
- Set up authentication
- Build database structure
- ~~Completed item~~

## Step 2
- Implement user profiles
- Add payment processing`;
      }
      return 'test file content';
    });
    
    jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
    jest.spyOn(fs, 'existsSync').mockReturnValue(true);
    
    // Mock child_process
    const mockExecSync = jest.fn(() => 'file1.ts\nfile2.js');
    jest.doMock('child_process', () => ({
      execSync: mockExecSync
    }));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Configuration', () => {
    it('should have required configuration properties', () => {
      expect(config).toHaveProperty('roadmapFile');
      expect(config).toHaveProperty('confidenceThreshold');
      expect(config).toHaveProperty('autofix');
      expect(config).toHaveProperty('agents');
    });

    it('should have safe auto-fix limits', () => {
      expect(config.autofix.maxFilesChanged).toBeLessThanOrEqual(5);
      expect(config.autofix.maxLinesPerFile).toBeLessThanOrEqual(50);
      expect(config.autofix.disallowedPatterns).toContain(/auth/i);
      expect(config.autofix.disallowedPatterns).toContain(/security/i);
    });
  });

  describe('RoadmapAnalyzer', () => {
    let analyzer;

    beforeEach(() => {
      analyzer = new RoadmapAnalyzer(config);
    });

    it('should initialize with correct configuration', () => {
      expect(analyzer.config).toBe(config);
      expect(analyzer.agentConfig).toBe(config.agents.roadmapAnalyzer);
    });

    it('should analyze PR changes', async () => {
      mockOpenAI.chat.completions.create.mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify({
              matches: [{
                roadmapItem: 'Set up authentication',
                confidence: 90,
                reasoning: 'Added authentication middleware',
                completionLevel: 'full',
                suggestedMarkdown: '~~Set up authentication~~'
              }]
            })
          }
        }]
      });

      const result = await analyzer.analyzePR();
      
      expect(result.highConfidenceMatches).toHaveLength(1);
      expect(result.matches[0].confidence).toBe(90);
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: config.model.analysis,
          messages: expect.any(Array)
        })
      );
    });

    it('should filter matches by confidence threshold', async () => {
      mockOpenAI.chat.completions.create.mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify({
              matches: [
                { confidence: 90, roadmapItem: 'High confidence match' },
                { confidence: 70, roadmapItem: 'Low confidence match' }
              ]
            })
          }
        }]
      });

      const result = await analyzer.analyzePR();
      
      expect(result.allMatches).toHaveLength(2);
      expect(result.highConfidenceMatches).toHaveLength(1);
      expect(result.matches[0].confidence).toBe(90);
    });
  });

  describe('CompletionSuggester', () => {
    let suggester;

    beforeEach(() => {
      suggester = new CompletionSuggester(config);
    });

    it('should suggest sub-items for completed work', async () => {
      mockOpenAI.chat.completions.create.mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify({
              suggestions: [{
                parentItem: 'Build database structure',
                subItems: ['Add database migrations', 'Create user table schema'],
                priority: 'high',
                reasoning: 'Database work completed, need migrations'
              }]
            })
          }
        }]
      });

      const result = await suggester.suggestSubItems(['Set up authentication']);
      
      expect(result.suggestions).toHaveLength(1);
      expect(result.suggestions[0].subItems).toContain('Add database migrations');
    });

    it('should format suggestions for GitHub comments', () => {
      const suggestions = [{
        parentItem: 'Test Item',
        subItems: ['Sub-task 1', 'Sub-task 2'],
        priority: 'high',
        reasoning: 'Test reasoning'
      }];

      const formatted = suggester.formatSuggestionsForComment(suggestions);
      
      expect(formatted).toContain('🔴 Test Item');
      expect(formatted).toContain('- [ ] Sub-task 1');
      expect(formatted).toContain('Test reasoning');
    });
  });

  describe('AutoFixer', () => {
    let fixer;

    beforeEach(() => {
      fixer = new AutoFixer(config);
    });

    it('should analyze roadmap items for auto-fix potential', async () => {
      mockOpenAI.chat.completions.create.mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify({
              canFix: true,
              confidence: 85,
              changes: [{
                file: 'docs/auth.md',
                action: 'create',
                description: 'Create authentication documentation',
                content: '# Authentication\n\nBasic auth docs...'
              }],
              reasoning: 'Simple documentation creation'
            })
          }
        }]
      });

      const result = await fixer.analyzeForAutoFix('Document authentication setup');
      
      expect(result.canFix).toBe(true);
      expect(result.changes).toHaveLength(1);
      expect(result.changes[0].file).toBe('docs/auth.md');
    });

    it('should validate proposed changes for safety', () => {
      const safeChanges = [{
        file: 'docs/readme.md',
        action: 'create',
        content: 'Safe documentation'
      }];

      const unsafeChanges = [{
        file: 'src/auth/security.ts',
        action: 'modify',
        content: 'Unsafe security changes'
      }];

      const safeResult = fixer.validateProposedChanges(safeChanges);
      const unsafeResult = fixer.validateProposedChanges(unsafeChanges);

      expect(safeResult.valid).toBe(true);
      expect(unsafeResult.valid).toBe(false);
      expect(unsafeResult.reason).toContain('disallowed pattern');
    });

    it('should find next uncompleted roadmap item', () => {
      const roadmap = `# Test
- ~~Completed item~~
- Next uncompleted item
- Another item`;

      const nextItem = fixer.findNextRoadmapItem(roadmap);
      
      expect(nextItem).toBe('Next uncompleted item');
    });

    it('should reject changes exceeding limits', () => {
      const tooManyFiles = Array.from({ length: 6 }, (_, i) => ({
        file: `file${i}.md`,
        action: 'create',
        content: 'test'
      }));

      const result = fixer.validateProposedChanges(tooManyFiles);
      
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Too many files');
    });
  });

  describe('Safety Features', () => {
    it('should block dangerous file patterns', () => {
      const dangerousPatterns = [
        'src/auth/login.ts',
        'config/production.json',
        'database/migrations/001.sql',
        'security/keys.json'
      ];

      dangerousPatterns.forEach(file => {
        const isBlocked = config.autofix.disallowedPatterns.some(pattern => 
          pattern.test(file)
        );
        expect(isBlocked).toBe(true);
      });
    });

    it('should allow safe file types only', () => {
      const allowedFiles = ['docs.md', 'config.json', 'utils.ts', 'component.tsx'];
      const blockedFiles = ['script.py', 'binary.exe', 'secret.key'];

      allowedFiles.forEach(file => {
        const ext = path.extname(file);
        expect(config.autofix.allowedFileTypes).toContain(ext);
      });

      blockedFiles.forEach(file => {
        const ext = path.extname(file);
        expect(config.autofix.allowedFileTypes).not.toContain(ext);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle OpenAI API errors gracefully', async () => {
      const analyzer = new RoadmapAnalyzer(config);
      
      mockOpenAI.chat.completions.create.mockRejectedValueOnce(
        new Error('API Error')
      );

      await expect(analyzer.analyzePR()).rejects.toThrow('API Error');
    });

    it('should handle malformed JSON responses', async () => {
      const analyzer = new RoadmapAnalyzer(config);
      
      mockOpenAI.chat.completions.create.mockResolvedValueOnce({
        choices: [{
          message: {
            content: 'Invalid JSON response'
          }
        }]
      });

      await expect(analyzer.analyzePR()).rejects.toThrow();
    });
  });
});