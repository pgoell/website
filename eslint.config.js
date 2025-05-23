import js from '@eslint/js';
import typescript from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';

export default [
    {
        ignores: ['**/*.astro', '*.config.{js,cjs,mjs}', 'dist/**', 'node_modules/**']
    },
    {
        ...js.configs.recommended,
        files: ['**/*.{js,mjs,ts,tsx}'],
        languageOptions: {
            parser: typescriptParser,
            ecmaVersion: 2021,
            sourceType: 'module',
            globals: {
                console: 'readonly',
                process: 'readonly',
                Buffer: 'readonly',
                window: 'readonly',
                document: 'readonly',
                navigator: 'readonly',
                location: 'readonly'
            }
        },
        plugins: {
            '@typescript-eslint': typescript
        },
        rules: {
            ...typescript.configs.recommended.rules
        }
    },
    {
        files: ['**/*.cjs'],
        languageOptions: {
            ecmaVersion: 2021,
            sourceType: 'commonjs',
            globals: {
                module: 'readonly',
                require: 'readonly',
                exports: 'readonly',
                __dirname: 'readonly',
                __filename: 'readonly',
                process: 'readonly'
            }
        }
    }
]; 