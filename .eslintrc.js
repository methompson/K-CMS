module.exports = {
    "env": {
        "node": true,
        "commonjs": true,
        "es6": true,
        "jest": true,
    },
    // "extends": "eslint:recommended",
    "extends": 'airbnb-base',
    "globals": {
        "Atomics": "readonly",
        "SharedArrayBuffer": "readonly"
    },
    "parserOptions": {
        "ecmaVersion": 2018
    },
    "rules": {
        'no-console': 'off', // I use it for debugging and information right now
        'no-plusplus': 'off', // I like ++ for iterating.
        'quotes': 'off', // I like using double quotes so that I can use an apostrophe
        'arrow-body-style': 'off', // Lets me be more explicit
        'class-methods-use-this': 'off', // Disabled to let me run actions without worrying about accessing this
        'space-in-parens': 'off', // Disabled to let me position long if statements
        'no-multi-spaces': 'off', // Disabled to let me position long if statements
        'no-underscore-dangle': 'off', // I like to use underscores for module-defined data right now
        'max-len': 'off', // I'm not worried about max-length right now
        'no-throw-literal': 'off', // I need to be able to throw an object
        'prefer-promise-reject-errors': 'off',
        'comma-dangle' : [
            "error", {
                "arrays": "always-multiline",
                "objects": "always-multiline",
                "imports": "always-multiline",
                "exports": "always-multiline",
                "functions": "never"
            }
        ],
    }
};