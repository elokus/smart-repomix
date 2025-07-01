 # Publishing to npm

## Initial Setup

1. Create an npm account at https://www.npmjs.com if you don't have one
2. Login to npm:
   ```bash
   npm login
   ```

## Before Publishing

1. Update version in `package.json`
2. Test locally:
   ```bash
   # Install dependencies
   npm install
   
   # Test the CLI
   node cli.js -I "test instruction" --dry-run
   ```

## Publishing

```bash
# First time publish
npm publish

# Update version and publish
npm version patch  # or minor/major
npm publish
```

## Testing the Published Package

After publishing, test it:

```bash
# Clear npm cache
npm cache clean --force

# Test with npx
npx smart-repomix@latest -I "ignore test files" --dry-run

# Or install globally
npm install -g smart-repomix
smart-repomix -I "ignore test files" --dry-run
```

## Updating

When making changes:

1. Make your changes
2. Test locally
3. Update version: `npm version patch`
4. Publish: `npm publish`
5. Tag release: `git tag v1.0.1 && git push --tags`