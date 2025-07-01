 // Example usage of smart-repomix as a library

import smartRepomix from './index.js';

async function example() {
  try {
    // Method 1: Using environment variable for API key
    console.log('Running smart-repomix...\n');
    
    const ignorePatterns = await smartRepomix({
      instruction: 'ignore test files, build artifacts, node_modules, and documentation',
      // outputPath is optional - will use repomix config if not specified
      apiKey: process.env.GEMINI_API_KEY, // or pass your key directly
      model: 'gemini-1.5-flash',
      verbose: true
    });
    
    console.log('\nIgnored patterns:', ignorePatterns);
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Example with custom configuration
async function exampleWithConfig() {
  // First, create a repomix.config.json with smartRepomix settings:
  /*
  {
    "output": {
      "filePath": "my-codebase.xml"
    },
    "smartRepomix": {
      "apiKey": "your-api-key-here",
      "promptTemplate": "Analyze {{codebase}} and find files to ignore based on: {{instruction}}. Return glob patterns only."
    }
  }
  */
  
  try {
    // The API key and prompt will be loaded from config
    const ignorePatterns = await smartRepomix({
      instruction: 'ignore all test and development files',
      verbose: true
    });
    
    console.log('Output saved based on repomix config');
    console.log('Ignored patterns:', ignorePatterns);
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Run the example
example();