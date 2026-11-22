/**
 * For a detailed explanation regarding each configuration property, visit:
 * https://jestjs.io/docs/configuration
 */

import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest/presets/default-esm', // ESM-aware ts-jest preset (requires --experimental-vm-modules)
  testEnvironment: 'node',
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { useESM: true }],
  },
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1', // Resolve NodeNext-style `./foo.js` imports to their `.ts` sources
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  testPathIgnorePatterns: ['/node_modules/', '/backup/', '/dist/'],
  extensionsToTreatAsEsm: ['.ts'],
  setupFiles: ['<rootDir>/src/node_compat.ts'], // Node 23+ util shims needed by tfjs-node
};

export default config;
