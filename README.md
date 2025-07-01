# Smart Repomix

An AI-powered wrapper for [repomix](https://github.com/yamadashy/repomix) that intelligently filters unnecessary files from your codebase using Google's Gemini AI.

## What it does

Smart Repomix enhances the standard repomix tool by:
1. Running repomix in-memory to scan your entire codebase
2. Using AI to analyze which files are unnecessary based on your instruction
3. Re-running repomix with intelligent ignore patterns
4. Producing a cleaner, more focused output

## Installation

### Option 1: Use directly with npx (recommended)
```bash
npx smart-repomix -I "ignore test files and build artifacts"
```

### Option 2: Install globally
```bash
npm install -g smart-repomix
smart-repomix -I "ignore test files and build artifacts"
```

### Option 3: Install as a dev dependency
```bash
npm install --save-dev smart-repomix
```

## Prerequisites

- Node.js >= 14.0.0
- A Google Gemini API key ([get one here](https://makersuite.google.com/app/apikey))
- `npx` (comes with npm 5.2+)

## Quick Start

For local development:
```bash
# Clone/download the package files
git clone <your-repo-url>
cd smart-repomix
npm install

# Set API key
export GEMINI_API_KEY="your-api-key"

# Test locally
node cli.js -I "ignore test files" --dry-run
```

See [QUICKSTART.md](./QUICKSTART.md) for detailed setup instructions.

## Configuration

Smart Repomix can be configured through your existing `repomix.config.json` file:

```json
{
  // Your regular repomix config...
  "output": {
    "filePath": "my-output.xml"
  },
  
  // Smart Repomix specific config
  "smartRepomix": {
    "apiKey": "your-gemini-api-key",
    "promptTemplate": "Custom prompt with {{instruction}} and {{codebase}} placeholders"
  }
}
```

### Configuration Options

- `smartRepomix.apiKey`: Your Gemini API key (alternative to env var or CLI option)
- `smartRepomix.promptTemplate`: Custom prompt template with placeholders:
  - `{{instruction}}`: Will be replaced with your -I instruction
  - `{{codebase}}`: Will be replaced with the XML codebase content

### Custom Prompt Template Example

```json
{
  "smartRepomix": {
    "promptTemplate": "Analyze this {{codebase}} and identify files to ignore based on: {{instruction}}. Return only comma-separated glob patterns."
  }
}
```

## Usage

### Basic usage
```bash
# Uses your repomix.config.json for output settings
npx smart-repomix -I "ignore test files, documentation, and build outputs"

# Or specify output explicitly
npx smart-repomix -I "ignore test files" -o my-output.xml
```

### Advanced options
```bash
# Use a different Gemini model
npx smart-repomix -I "ignore test files" -m gemini-1.5-pro

# Verbose output
npx smart-repomix -I "ignore test files" -v

# Dry run (see what would be ignored without creating output)
npx smart-repomix -I "ignore test files" --dry-run

# Pass API key directly
npx smart-repomix -I "ignore test files" -k "your-api-key"
```

## Command Line Options

- `-I, --instruction <instruction>` - **Required**. Instruction for AI to determine which files to ignore
- `-o, --output <path>` - Output file path (defaults to repomix config or `repomix-output.xml`)
- `-k, --api-key <key>` - Gemini API key (or use `GEMINI_API_KEY` env var or config)
- `-m, --model <model>` - Gemini model to use (default: `gemini-1.5-flash`)
- `-v, --verbose` - Show verbose output
- `--dry-run` - Show what files would be ignored without creating final output

## API Key Priority

The API key is resolved in this order:
1. `-k` command line option
2. `GEMINI_API_KEY` environment variable
3. `smartRepomix.apiKey` in `repomix.config.json`

## Example Instructions

Here are some effective instruction examples:

```bash
# For sharing code for review
npx smart-repomix -I "ignore test files, build artifacts, and documentation"

# For production code analysis
npx smart-repomix -I "ignore development files, tests, examples, and build outputs"

# For debugging
npx smart-repomix -I "keep only source code and configuration files"

# For documentation
npx smart-repomix -I "ignore node_modules, build directories, and temporary files"
```

## How it Works

1. **Initial Scan**: Runs `repomix --stdout` to capture your entire codebase in memory
2. **AI Analysis**: Sends the codebase to Gemini with your instruction
3. **Pattern Generation**: AI returns glob patterns for files to ignore
4. **Filtered Output**: Runs `repomix` again with the ignore patterns, respecting your config

## Programmatic Usage

You can also use smart-repomix in your Node.js code:

```javascript
import smartRepomix from 'smart-repomix';

const ignorePatterns = await smartRepomix({
  instruction: 'ignore test files and build artifacts',
  outputPath: 'output.xml', // optional, uses repomix config if not specified
  apiKey: 'your-api-key',
  model: 'gemini-1.5-flash',
  verbose: true
});

console.log('Ignored patterns:', ignorePatterns);
```

## Tips

- Be specific in your instructions for better results
- Use `--dry-run` first to preview what will be ignored
- The `gemini-1.5-flash` model is fast and works well for most cases
- For very large codebases, consider using `gemini-1.5-pro` for better analysis
- Smart Repomix respects your existing `repomix.config.json` settings

## License

MIT