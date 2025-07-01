 # Advanced Usage

## Configuration in repomix.config.json

Smart Repomix can be configured directly in your `repomix.config.json` file:

```json
{
  // Your existing repomix configuration
  "output": {
    "filePath": "output.xml",
    "style": "xml"
  },
  "include": ["src/**/*"],
  
  // Smart Repomix specific configuration
  "smartRepomix": {
    // API key (alternative to env var or CLI option)
    "apiKey": "your-gemini-api-key",
    
    // Custom prompt template with placeholders
    "promptTemplate": "You are analyzing a codebase. User wants to: {{instruction}}\n\nCodebase:\n{{codebase}}\n\nReturn only comma-separated glob patterns to ignore."
  }
}
```

### Prompt Template Customization

The prompt template supports two placeholders:
- `{{instruction}}`: Replaced with the user's -I instruction
- `{{codebase}}`: Replaced with the XML codebase content

Example custom prompts:

```json
{
  "smartRepomix": {
    // For focusing on security
    "promptTemplate": "Security audit request: {{instruction}}\n\nAnalyze this codebase and identify files to exclude:\n{{codebase}}\n\nReturn glob patterns that match files NOT relevant for security analysis."
  }
}
```

```json
{
  "smartRepomix": {
    // For documentation purposes
    "promptTemplate": "Documentation task: {{instruction}}\n\nFrom this codebase:\n{{codebase}}\n\nIdentify and return glob patterns for files that are not needed for documentation."
  }
}
```

## Custom Ignore Instructions

### For Different Project Types

**React/Next.js Projects:**
```bash
npx smart-repomix -I "ignore node_modules, build outputs, test files, .next directory, and coverage reports"
```

**Python Projects:**
```bash
npx smart-repomix -I "ignore __pycache__, .pytest_cache, venv, dist, *.pyc files, and test directories"
```

**Monorepo:**
```bash
npx smart-repomix -I "ignore all node_modules, build directories, test files, but keep configuration files"
```

### Purpose-Specific Filtering

**For Code Review:**
```bash
npx smart-repomix -I "keep only source code, ignore tests, docs, build files, and dependencies"
```

**For Documentation:**
```bash
npx smart-repomix -I "ignore everything except markdown files, source code comments, and API definitions"
```

**For Security Audit:**
```bash
npx smart-repomix -I "ignore test files and documentation, focus on configuration and source files"
```

## Using Different Models

```bash
# Fast mode (default)
npx smart-repomix -I "..." -m gemini-2.5-flash

# More accurate for large codebases
npx smart-repomix -I "..." -m gemini-2.5-pro

# Latest model
npx smart-repomix -I "..." -m gemini-2.5-pro-latest
```

## Scripting and Automation

### Bash Script Example
```bash
#!/bin/bash
# smart-filter.sh

export GEMINI_API_KEY="your-key"
INSTRUCTION="ignore test files, build artifacts, and dependencies"
OUTPUT="filtered-$(date +%Y%m%d-%H%M%S).xml"

npx smart-repomix -I "$INSTRUCTION" -o "$OUTPUT" -v

echo "Filtered codebase saved to: $OUTPUT"
```

### Node.js Automation
```javascript
// analyze-multiple-repos.js
import smartRepomix from 'smart-repomix';
import { readdirSync } from 'fs';
import { join } from 'path';

const repos = ['repo1', 'repo2', 'repo3'];

for (const repo of repos) {
  process.chdir(join('/path/to', repo));
  
  await smartRepomix({
    instruction: 'ignore test files and build artifacts',
    outputPath: `${repo}-filtered.xml`,
    apiKey: process.env.GEMINI_API_KEY,
    verbose: true
  });
}
```

### CI/CD Integration
```yaml
# .github/workflows/analyze.yml
name: Analyze Codebase

on:
  push:
    branches: [main]

jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Setup Node
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      
      - name: Run Smart Repomix
        env:
          GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
        run: |
          npx smart-repomix -I "ignore test files and CI/CD configs" -o codebase.xml
      
      - name: Upload Artifact
        uses: actions/upload-artifact@v2
        with:
          name: codebase-analysis
          path: codebase.xml
```

## Performance Tips

1. **Use specific instructions**: More specific instructions lead to better results
   ```bash
   # Good
   npx smart-repomix -I "ignore test files (*.test.js, *.spec.js), build directories, and node_modules"
   
   # Less effective
   npx smart-repomix -I "ignore unnecessary files"
   ```

2. **Model selection**: 
   - Use `gemini-2.5-flash` for most cases (fast and effective)
   - Use `gemini-2.5-pro` for very large codebases or complex filtering needs

3. **Dry run first**: Always test with `--dry-run` to see what will be ignored
   ```bash
   npx smart-repomix -I "..." --dry-run
   ```

## Debugging

### Verbose Mode
```bash
# See all operations
npx smart-repomix -I "..." -v

# Check what repomix commands are being run
npx smart-repomix -I "..." -v 2>&1 | grep "Running:"
```

### Manual Testing
```bash
# See what the initial scan produces
npx repomix --output test-full.xml

# Test ignore patterns manually
npx repomix --output test-filtered.xml --ignore "node_modules/**,*.test.js"
```

### API Key Issues
```bash
# Test API key
export GEMINI_API_KEY="your-key"
curl -X POST "https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=$GEMINI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"contents":[{"parts":[{"text":"Hello"}]}]}'
```

## Custom Integration

### As a Library
```javascript
import smartRepomix from 'smart-repomix';
import ora from 'ora';

async function analyzeCodebase(projectPath, instruction) {
  const spinner = ora('Analyzing codebase...').start();
  
  try {
    process.chdir(projectPath);
    
    const ignorePatterns = await smartRepomix({
      instruction,
      outputPath: 'analysis.xml',
      apiKey: process.env.GEMINI_API_KEY,
      model: 'gemini-2.5-pro',
      verbose: false,
      spinner
    });
    
    spinner.succeed('Analysis complete');
    return ignorePatterns;
  } catch (error) {
    spinner.fail('Analysis failed');
    throw error;
  }
}
```

### Custom Prompts
You can modify the source code to customize the AI prompt for specific needs:

```javascript
// In index.js, modify the prompt template
const prompt = `
You are analyzing a codebase for a ${projectType} project.
Additional context: ${context}

User instruction: "${instruction}"
...
`;
```