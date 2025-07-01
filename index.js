import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { GoogleGenerativeAI } from '@google/generative-ai';
import path from 'path';
import chalk from 'chalk';

// Default prompt template with placeholders
const DEFAULT_PROMPT_TEMPLATE = `
You are analyzing a codebase represented in XML format. Your task is to identify files and directories that should be IGNORED based on the user's instruction.

User instruction: "{{instruction}}"

The XML content represents the entire codebase structure. Analyze it and return ONLY a comma-separated list of glob patterns for files/directories that should be ignored.

Examples of valid patterns:
- node_modules/**
- **/*.test.js
- build/**
- .git/**
- **/*.log
- cache/**
- dist/**

Return ONLY the comma-separated patterns, nothing else. For example:
node_modules/**,build/**,**/*.test.js

Here is the codebase XML:

{{codebase}}
`;

export async function smartRepomix(options) {
  const {
    instruction,
    outputPath,
    apiKey,
    model = 'gemini-2.5-flash',
    verbose = false,
    dryRun = false,
    spinner,
    repomixArgs = []
  } = options;

  try {
    // Step 1: Check for repomix config
    let config = {};
    const configPath = path.join(process.cwd(), 'repomix.config.json');
    if (existsSync(configPath)) {
      try {
        const configContent = readFileSync(configPath, 'utf-8');
        config = JSON.parse(configContent);
        if (verbose) {
          console.log(chalk.dim('\nFound repomix.config.json'));
        }
      } catch (error) {
        if (verbose) {
          console.warn(chalk.yellow('Warning: Could not parse repomix.config.json'));
        }
      }
    }

    // Extract smart-repomix config if present
    const smartConfig = config.smartRepomix || {};
    
    // Use API key from config if not provided
    const finalApiKey = apiKey || smartConfig.apiKey || process.env.GEMINI_API_KEY;
    if (!finalApiKey) {
      throw new Error('Gemini API key is required. Set it via -k option, GEMINI_API_KEY env var, or smartRepomix.apiKey in repomix.config.json');
    }

    // Use prompt template from config or default
    const promptTemplate = smartConfig.promptTemplate || DEFAULT_PROMPT_TEMPLATE;

    // Determine output path
    const finalOutputPath = outputPath || config.output?.filePath || 'repomix-output.xml';

    // Step 2: Run initial repomix to get full codebase (in memory using --stdout)
    if (spinner) spinner.text = 'Running initial repomix scan...';
    
    let xmlContent;
    try {
      // Check if repomix is available
      try {
        execSync('npx repomix --version', { stdio: 'pipe' });
      } catch {
        if (spinner) spinner.text = 'Installing repomix...';
        // This will trigger repomix installation
        execSync('npx repomix --help', { stdio: 'pipe' });
      }
      
      // Run repomix with --stdout to get in-memory output
      xmlContent = execSync(`npx repomix --stdout`, {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', verbose ? 'inherit' : 'pipe'],
        maxBuffer: 100 * 1024 * 1024 // 100MB buffer for large repos
      });
    } catch (error) {
      throw new Error(`Failed to run repomix: ${error.message}`);
    }

    if (!xmlContent) {
      throw new Error('Repomix did not generate output');
    }

    if (spinner) spinner.text = 'Analyzing codebase with AI...';
    
    // Step 3: Send to Gemini for analysis
    const genAI = new GoogleGenerativeAI(finalApiKey);
    const geminiModel = genAI.getGenerativeModel({ model });

    // Replace placeholders in prompt template
    const prompt = promptTemplate
      .replace('{{instruction}}', instruction)
      .replace('{{codebase}}', xmlContent);

    if (verbose) {
      console.log(chalk.dim('\nSending to Gemini for analysis...'));
    }

    let ignorePatterns;
    try {
      const result = await geminiModel.generateContent(prompt);
      const response = await result.response;
      ignorePatterns = response.text().trim();
      
      // Clean up the response - remove any extra text if present
      ignorePatterns = ignorePatterns.split('\n')[0].trim();
      
      if (verbose) {
        console.log(chalk.dim(`\nGemini suggested ignore patterns: ${ignorePatterns}`));
      }
    } catch (error) {
      throw new Error(`Gemini API error: ${error.message}`);
    }

    // Step 4: If dry run, return here
    if (dryRun) {
      return ignorePatterns;
    }

    // Step 5: Run repomix again with ignore patterns
    if (spinner) spinner.text = 'Creating filtered output...';
    
    // Build the second repomix command
    // Only include the output flag if explicitly provided, otherwise let repomix use its config
    let repomixCmd = 'npx repomix';
    
    // Add output flag only if provided
    if (outputPath) {
      repomixCmd += ` --output ${outputPath}`;
    }
    
    // Add ignore patterns
    if (ignorePatterns) {
      repomixCmd += ` --ignore "${ignorePatterns}"`;
    }
    
    // Add any additional repomix args passed through
    if (repomixArgs.length > 0) {
      repomixCmd += ' ' + repomixArgs.join(' ');
    }

    if (verbose) {
      console.log(chalk.dim(`\nRunning: ${repomixCmd}`));
    }

    try {
      execSync(repomixCmd, {
        stdio: verbose ? 'inherit' : 'pipe'
      });
    } catch (error) {
      throw new Error(`Failed to run filtered repomix: ${error.message}`);
    }

    return ignorePatterns;
  } catch (error) {
    throw error;
  }
}

// Export for programmatic use
export default smartRepomix;
export { DEFAULT_PROMPT_TEMPLATE };