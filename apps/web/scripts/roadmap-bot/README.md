# 🤖 Roadmap Bot - Multi-Agent System

An intelligent GitHub bot system that monitors your technical roadmap and automatically helps manage progress through multiple AI agents.

## 🚀 Quick Setup

### 1. Required Configuration

Add these secrets to your GitHub repository:
```bash
# Required
OPENAI_API_KEY=sk-...  # Your OpenAI API key

# Already available in GitHub Actions
GITHUB_TOKEN=...  # Automatically provided by GitHub
```

### 2. Create Your Roadmap File

Create a `tech_roadmap.md` file in your repository root with markdown format:

```markdown
# Your Project Roadmap

## Step 1 — First Phase
- First task to complete
- Another task in this phase
- ~~Completed task~~ (crossed out when done)

## Step 2 — Second Phase
- Next set of tasks
- More work items
```

### 3. Repository Configuration

The bot works out of the box with minimal setup. It will:
- Analyze PRs automatically when opened/edited
- Suggest completions when PRs are merged
- Run maintenance checks twice daily (weekdays)

### 4. Customization (Optional)

Edit `scripts/roadmap-bot/config.js` to customize:
- Confidence threshold (default: 85%)
- Auto-fix settings
- File type restrictions
- Agent behavior

## 🧪 Testing & Safety

### Built-in Safety Features

**Auto-fix Limitations:**
- ✅ Only documentation, configs, simple imports
- ✅ Max 3 files, 20 lines per file
- ✅ No auth/security/database changes
- ❌ Blocks complex business logic

**File Type Restrictions:**
- ✅ Allowed: `.md`, `.json`, `.js`, `.ts`, `.tsx`, `.jsx`, `.yml`
- ❌ Blocked: Auth files, production configs, `.env`

**Pattern Blocking:**
- ❌ Files matching: `auth`, `security`, `database`, `migration`

### Test Commands

```bash
# Test roadmap analysis on current changes
node scripts/roadmap-bot/roadmap-bot-main.js analyze-pr

# Test completion suggestions
node scripts/roadmap-bot/roadmap-bot-main.js handle-completion

# Test maintenance (auto-fix check)
node scripts/roadmap-bot/roadmap-bot-main.js maintenance

# View help
node scripts/roadmap-bot/roadmap-bot-main.js help
```

### Manual Testing

1. **Create a test PR** with changes that match roadmap items
2. **Check the workflow runs** in Actions tab
3. **Review generated comments** on the PR
4. **Verify safety** - bot should only suggest/make safe changes

### Unit Tests

```bash
# Install test dependencies
npm install --save-dev jest

# Run roadmap bot tests
npm test -- scripts/roadmap-bot/
```

## 📁 File Structure

```
scripts/roadmap-bot/
├── config.js                 # Main configuration
├── roadmap-bot-main.js       # CLI orchestrator
├── agents/
│   ├── base-agent.js         # Shared agent functionality
│   ├── roadmap-analyzer.js   # PR → roadmap matching
│   ├── completion-suggester.js # Sub-item suggestions
│   └── auto-fixer.js         # Simple auto-fixes
├── results/                  # Generated analysis results
└── README.md                 # This file

.github/workflows/
├── roadmap-bot-pr-analysis.yml    # PR analysis workflow
├── roadmap-bot-pr-completion.yml  # PR completion workflow
└── roadmap-bot-maintenance.yml    # Scheduled maintenance
```

## 🔧 How It Works

### 1. PR Analysis (on PR open/edit)
- **RoadmapAnalyzer** examines code changes
- Matches changes to roadmap items (85%+ confidence)
- Comments with matches and completion suggestions
- Adds `roadmap-match` label

### 2. PR Completion (on PR merge)
- **CompletionSuggester** analyzes what was completed
- Suggests technical sub-items for remaining roadmap steps
- **AutoFixer** checks if next item can be automated
- Creates auto-fix PR if safe changes possible

### 3. Maintenance (scheduled)
- Periodic check for auto-fix opportunities
- Creates PRs for simple roadmap implementations
- Runs twice daily on weekdays

### 4. Safety & Controls
- Conservative AI prompts focus on technical accuracy
- Multi-layer safety validation for auto-fixes
- Human review required for all auto-generated PRs
- Detailed logging and audit trails

## 🎯 Agent Specialization

Each agent has specific expertise:

- **RoadmapAnalyzer**: Technical implementation detection
- **CompletionSuggester**: Strategic roadmap progression  
- **AutoFixer**: Safe, simple automation only

## 📊 Cost Management

**Optimization Features:**
- Uses `gpt-4o-mini` for most analysis (~$0.15/1M tokens)
- Limits context size and response length
- Batches operations where possible
- Only `gpt-4` for complex auto-fixes (rare)

**Estimated Costs:**
- ~$0.01-0.05 per PR analysis
- ~$0.10-0.50 per maintenance run
- Typical monthly cost: $5-20 for active projects

## 🔄 Cross-Codebase Portability

To copy to another repository:

1. **Copy the entire `scripts/roadmap-bot/` directory**
2. **Copy the 3 GitHub workflow files**
3. **Create `tech_roadmap.md` in the new repo**
4. **Add `OPENAI_API_KEY` secret**
5. **Customize `config.js` if needed**

The system is designed to work with any codebase structure and roadmap format.

## 🐛 Troubleshooting

**Common Issues:**

- **No roadmap file**: Bot skips if `tech_roadmap.md` not found
- **API key missing**: Check `OPENAI_API_KEY` secret is set
- **No matches found**: Lower confidence threshold in config
- **Auto-fix not working**: Check safety restrictions in config

**Debug Mode:**
```bash
# Run with debug output
DEBUG=1 node scripts/roadmap-bot/roadmap-bot-main.js analyze-pr
```

## 📝 Contributing

When adding features:
1. Maintain safety-first approach
2. Add comprehensive logging
3. Update configuration options
4. Test across multiple scenarios
5. Document any new environment requirements