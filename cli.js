#!/usr/bin/env node

import { program } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { smartRepomix } from './index.js';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read package.json for version
const packageJson = JSON.parse(readFileSync(join(__dirname, 'package.json'), 'utf8'));

program
  .name('smart-repomix')
  .description('AI-powered wrapper for repomix that intelligently filters unnecessary files')
  .version(packageJson.version)
  .option('-I, --instruction <instruction>', 'Instruction for AI to determine which files to ignore')
  .option('-o, --output <path>', 'Output file path (defaults to repomix config or repomix-output.xml)')
  .option('-k, --api-key <key>', 'Gemini API key (or use GEMINI_API_KEY env var or smartRepomix.apiKey in repomix.config.json)')
  .option('-m, --model <model>', 'Gemini model to use', 'gemini-1.5-flash')
  .option('-v, --verbose', 'Show verbose output')
  .option('--dry-run', 'Show what files would be ignored without creating final output')
  .allowUnknownOption(true) // Allow passing through options to repomix
  .parse();

const options = program.opts();
const unknownArgs = program.args; // Capture any additional arguments

async function main() {
  try {
    // Check for instruction
    if (!options.instruction) {
      console.error(chalk.red('Error: Instruction is required. Use -I option to specify what to filter.'));
      process.exit(1);
    }

    // Try to load repomix config for API key
    let configApiKey;
    const configPath = join(process.cwd(), 'repomix.config.json');
    if (existsSync(configPath)) {
      try {
        const config = JSON.parse(readFileSync(configPath, 'utf8'));
        configApiKey = config.smartRepomix?.apiKey;
      } catch {}
    }

    // Check for API key
    const apiKey = options.apiKey || process.env.GEMINI_API_KEY || configApiKey;
    if (!apiKey) {
      console.error(chalk.red('Error: Gemini API key is required.'));
      console.error(chalk.yellow('Set it using one of these methods:'));
      console.error(chalk.yellow('  1. GEMINI_API_KEY environment variable'));
      console.error(chalk.yellow('  2. -k option'));
      console.error(chalk.yellow('  3. smartRepomix.apiKey in repomix.config.json'));
      process.exit(1);
    }

    console.log(chalk.blue('🤖 Smart Repomix - AI-powered codebase filtering\n'));

    const spinner = ora('Running initial repomix scan...').start();

    try {
      const ignorePatterns = await smartRepomix({
        instruction: options.instruction,
        outputPath: options.output,
        apiKey,
        model: options.model,
        verbose: options.verbose,
        dryRun: options.dryRun,
        spinner,
        repomixArgs: unknownArgs
      });

      if (options.dryRun) {
        spinner.succeed('Dry run complete!');
        console.log(chalk.green('\nFiles that would be ignored:'));
        console.log(chalk.yellow(ignorePatterns || '(none)'));
      } else {
        spinner.succeed('Smart repomix complete!');
        const outputFile = options.output || 'repomix config default';
        console.log(chalk.green(`\n✅ Output saved to: ${outputFile}`));
        if (options.verbose && ignorePatterns) {
          console.log(chalk.dim(`\nIgnored patterns: ${ignorePatterns}`));
        }
      }
    } catch (error) {
      spinner.fail('Smart repomix failed');
      throw error;
    }
  } catch (error) {
    console.error(chalk.red('\nError:'), error.message);
    if (options.verbose) {
      console.error(error);
    }
    process.exit(1);
  }
}

main();