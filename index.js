import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { GoogleGenerativeAI } from '@google/generative-ai';
import path from 'path';
import chalk from 'chalk';

// Default prompt template with placeholders
const DEFAULT_PROMPT_TEMPLATE = `
Role
You are a Repo‑Trimming Assistant with full visibility of the supplied codebase.

Goal
Produce a **comma‑separated list of additional glob patterns** that can be excluded when packaging the repo for downstream LLMs—enough to shrink token count while preserving all material relevant to the current request.

Constraints
- Consider only files/directories **not already ignored** by the existing Repomix config or ".gitignore".
- Keep anything that:
  • Implements or configures functionality referenced in <request>,  
  • Demonstrates reusable patterns or architecture,  
  • Defines shared utilities, domain models, or core APIs.
- It is safe to drop:
  • Large demo/sample data, build artefacts, generated docs, vendored assets, unused legacy modules.  
  • Non‑essential scripts, test fixtures, screenshots, coverage reports, etc., *unless* directly relevant to <request>.
- Do not drop files that are relevant for the end-to-end flow.
- Leave all files that are necessary to understand the bigger picture.
- Use standard glob syntax ("**/path/**", "*.ext", etc.).
- **Output only the comma‑separated glob list—no prose, no newlines.**

Steps
1. Read and understand <request>.  
2. Scan <codebase> and mark modules/files irrelevant to fulfilling the request.  
3. Deduplicate and optimise the glob patterns to avoid overlap.  
4. Return the final pattern list.

<request>
{{instruction}}
</request>

<codebase>
{{codebase}}
</codebase>
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
        stdio: 'inherit'
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