# Quick Start Guide

## 1. Create your package directory
```bash
mkdir smart-repomix
cd smart-repomix
```

## 2. Save all the files
Save these files in your directory:
- `package.json`
- `cli.js`
- `index.js`
- `README.md`
- `.gitignore`
- `example-usage.js`
- `PUBLISHING.md`

## 3. Install dependencies
```bash
npm install
```

## 4. Get a Gemini API Key
1. Go to https://makersuite.google.com/app/apikey
2. Create a new API key
3. Set it using one of these methods:

### Option A: Environment variable
```bash
export GEMINI_API_KEY="your-key-here"
```

### Option B: In your repomix.config.json
```json
{
  "smartRepomix": {
    "apiKey": "your-key-here"
  }
}
```

### Option C: Command line option
```bash
node cli.js -I "ignore test files" -k "your-key-here"
```

## 5. Test locally
```bash
# Test the help command
node cli.js --help

# Test with dry run (won't create output file)
node cli.js -I "ignore test files" --dry-run

# Test the example
npm run example
```

## 6. Use with existing repomix config
If you already have a `repomix.config.json`:
```json
{
  "output": {
    "filePath": "my-output.xml"
  },
  "smartRepomix": {
    "apiKey": "your-gemini-key"
  }
}
```

Then just run:
```bash
npx smart-repomix -I "ignore test files"
```

## 7. Create a test project
```bash
# In another directory, create a test project
mkdir test-project
cd test-project
npm init -y
echo "console.log('hello');" > index.js
echo "test file" > test.spec.js
mkdir build
echo "build artifact" > build/output.js

# Test smart-repomix from source
node /path/to/smart-repomix/cli.js -I "ignore test files and build directory" -v
```

## 7. Publish to npm (optional)
If you want to publish to npm:
```bash
# Login to npm
npm login

# Publish
npm publish
```

## 8. Use with npx
Once published (or for local testing):
```bash
# From published package
npx smart-repomix -I "ignore unnecessary files"

# From local development
npx /path/to/smart-repomix -I "ignore unnecessary files"
```

## Common Issues

1. **"Gemini API key is required"**
   - Set `GEMINI_API_KEY` environment variable
   - Or use `-k` option: `node cli.js -I "..." -k "your-key"`
   - Or add to `repomix.config.json` under `smartRepomix.apiKey`

2. **"Cannot find module"**
   - Make sure you've run `npm install`
   - Check that `"type": "module"` is in package.json

3. **"repomix: command not found"**
   - The package will install repomix automatically via npx
   - Make sure you have internet connection

4. **Empty or invalid ignore patterns**
   - Try being more specific in your instruction
   - Use verbose mode (`-v`) to see what's happening
   - Try a different Gemini model with `-m gemini-2.5-pro`

5. **"stdout maxBuffer exceeded" error**
   - This happens with very large repositories
   - The tool supports up to 100MB by default
   - For larger repos, consider using specific include patterns in your repomix config