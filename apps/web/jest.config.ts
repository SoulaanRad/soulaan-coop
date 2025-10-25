/** @type {import('ts-jest').JestConfigWithTsJest} */
import nextJest from 'next/jest.js';

const createJestConfig = nextJest({
    dir: './',
});
const customJestConfig = {
    coverageReporters: ['json'],
    moduleDirectories: ['node_modules', '<rootDir>/'],
    testEnvironment: 'jest-environment-jsdom',
    setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
    // Use @swc/jest transformer to avoid Next.js SWC binary issues
    transform: {
        '^.+\\.(js|jsx|ts|tsx)$': '@swc/jest',
    },
    // Handle ES modules
    extensionsToTreatAsEsm: ['.ts', '.tsx'],
    globals: {
        'ts-jest': {
            useESM: true,
        },
    },
    // Transform node_modules that use ES modules
    transformIgnorePatterns: [
        'node_modules/(?!(@t3-oss/env-nextjs|@t3-oss/env-core)/)',
    ],
    moduleNameMapper: {
        '^@/hooks/(.*)$': '<rootDir>/hooks/$1',
        '^@/(.*)$': '<rootDir>/$1',
    },
};
/*module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
};*/
module.exports = createJestConfig(customJestConfig);