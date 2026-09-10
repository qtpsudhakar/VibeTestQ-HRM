module.exports = {
  preset: '@vue/cli-plugin-unit-jest/presets/typescript-and-babel',
  transform: {
    '^.+\\.vue$': '@vue/vue3-jest',
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@ohrm/core/(.*)$': '<rootDir>/src/core/$1',
    '^@ohrm/components/(.*)$': '<rootDir>/src/core/components/$1',
    '^@ohrm/(.*)$': '<rootDir>/src/$1',
  },
  coverageReporters: ['html'],
};
