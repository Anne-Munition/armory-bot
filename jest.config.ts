/**
 * For a detailed explanation regarding each configuration property, visit:
 * https://jestjs.io/docs/configuration
 */

import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest', // Use ts-jest preset for TypeScript support
  testEnvironment: 'node', // Use Node.js environment for testing
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { useESM: true }], // Move ts-jest config here
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'], // Recognize these file extensions
  testPathIgnorePatterns: ['/node_modules/', '/backup/'], // Ignore these paths
  extensionsToTreatAsEsm: ['.ts'], // Treat .ts files as ES modules
};

export default config;
