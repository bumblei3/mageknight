import js from "@eslint/js";
import globals from "globals";

export default [
    {
        ignores: [
            "**/node_modules/",
            "**/coverage/",
            "js/vendor/",
            "tests/",
            "**/*.min.js"
        ]
    },
    js.configs.recommended,
    {
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: "module",
            globals: {
                ...globals.browser,
                ...globals.node
            }
        },
        rules: {
            "no-unused-vars": [
                "warn",
                {
                    "argsIgnorePattern": "^_",
                    "caughtErrorsIgnorePattern": "^_"
                }
            ],
            "no-console": "off",
            "semi": ["error", "always"],
            "quotes": ["warn", "single", { "avoidEscape": true }],
            "indent": ["warn", 4],
            "no-trailing-spaces": "warn",
            "eol-last": "warn"
        }
    }
];
