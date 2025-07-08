import fs from "node:fs";
import { argv, exit } from "node:process";
import readline from "node:readline";
import process from "node:process";

export class Jaksel {
    constructor() {
        this.errorReporter = new ErrorReporter();
    }

    main() {
        if (argv.length > 3) {
            console.log("Usage: node jaksel.js [script]");
            exit(64);
        } else if (argv.length === 3) {
            this.runFile(argv[2]);
        } else {
            this.runPrompt();
        }
    }

    /**
     * 
     * @param {path} path relative path from where you execute the interpreter
     */
    runFile(path) {
        try {
            const code = fs.readFileSync(path, "utf-8");
            this.run(code);
            if (this.errorReporter.hadError) exit(65);
        } catch (err) {
            if (err?.code == "ENOENT") {
                console.error(`Error: ${path} doesn't exist.`);
            } else {
                console.error(err);
            }
        }
    }

    runPrompt() {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            prompt: "> ",
        });

        rl.prompt();
        rl.on("line", (text) => {
            this.run(text);
            this.errorReporter.hadError = false;
            rl.prompt();
        });
    }

    /**
     *
     * @param {string} source
     */
    run(source) {
        const scanner = new Scanner(source, this.errorReporter);
        const tokens = scanner.scanTokens();
        for (const token of tokens) {
            console.log(token.toString());
        }
    }
}

export class ErrorReporter {
    hadError = false;

    /**
     *
     * @param {number} line
     * @param {string} message
     */
    error(line, message) {
        this.#report(line, "", message);
    }

    #report(line, where, message) {
        console.error(`[line ${line}] Error ${where}: ${message}`);
        this.hadError = true;
    }
}

/**
 * @namespace
 */
const TokenType = Object.freeze({
    // Single-character tokens.
    LEFT_PAREN: "LEFT_PAREN",
    RIGHT_PAREN: "RIGHT_PAREN",
    COMMA: "COMMA",
    DOT: "DOT",
    MINUS: "MINUS",
    PLUS: "PLUS",
    SLASH: "SLASH",
    STAR: "STAR",

    // One or two character tokens.
    BANG: "BANG",
    BANG_EQUAL: "BANG_EQUAL",
    EQUAL: "EQUAL",
    EQUAL_EQUAL: "EQUAL_EQUAL",
    GREATER: "GREATER",
    GREATER_EQUAL: "GREATER_EQUAL",
    LESS: "LESS",
    LESS_EQUAL: "LESS_EQUAL",

    // Literals.
    IDENTIFIER: "IDENTIFIER",
    STRING: "STRING",
    NUMBER: "NUMBER",
    EOF: 'EOF',

    FOMO: 'FOMO',
    ENDUP: 'ENDUP',

    THATS: 'THATS',
    IT: 'IT',
    SIH: 'SIH',

    SPILL: 'SPILL',

    LITERALLY: 'LITERALLY',
    WHICHIS: 'WHICHIS',
    ITU: 'ITU',

    OVERTHINKING: 'OVERTHINKING',
    CALL: 'CALL',
});

const Keywords = new Map([
    ['fomo', TokenType.FOMO],
    ['endup', TokenType.ENDUP],
    ['thats', TokenType.THATS],
    ['it', TokenType.IT],
    ['sih', TokenType.SIH],
    ['spill', TokenType.SPILL],
    ['literally', TokenType.LITERALLY],
    ['whichis', TokenType.WHICHIS],
    ['itu', TokenType.ITU],
    ['overthinking', TokenType.OVERTHINKING],
])

class Token {
    /**
     *
     * @param {TokenType} type
     * @param {string} lexeme
     * @param {string} literal
     * @param {number} line
     */
    constructor(type, lexeme, literal, line) {
        this.type = type;
        this.lexeme = lexeme;
        this.literal = literal;
        this.line = line;
    }

    toString() {
        return `${this.type} ${this.lexeme} ${this.literal}`;
    }
}

class Scanner {
    /**
     * @type {Array<Token>}
     */
    tokens = [];
    start = 0;
    current = 0;
    line = 1;

    /**
     *
     * @param {string} source
     * @param {ErrorReporter} errorReporter
     */
    constructor(source, errorReporter) {
        this.source = source;
        this.errorReporter = errorReporter;
    }

    scanTokens() {
        while (!this.#isAtEnd()) {
            this.start = this.current;
            this.#scanToken();
        }

        this.tokens.push(new Token(TokenType.EOF, "", null, this.line));
        return this.tokens;
    }

    #scanToken() {
        const c = this.#advance();
        switch (c) {
            case "(":
                this.#addToken(TokenType.LEFT_PAREN);
                break;
            case ")":
                this.#addToken(TokenType.RIGHT_PAREN);
                break;
            case ",":
                this.#addToken(TokenType.COMMA);
                break;
            case ".":
                this.#addToken(TokenType.DOT);
                break;
            case "-":
                this.#addToken(TokenType.MINUS);
                break;
            case "+":
                this.#addToken(TokenType.PLUS);
                break;
            case "*":
                this.#addToken(TokenType.STAR);
                break;
            case "!":
                this.#addToken(this.#match("=") ? TokenType.BANG_EQUAL : TokenType.BANG);
                break;
            case "=":
                this.#addToken(this.#match("=") ? TokenType.EQUAL_EQUAL : TokenType.EQUAL);
                break;
            case "<":
                this.#addToken(this.#match("=") ? TokenType.LESS_EQUAL : TokenType.LESS);
                break;
            case ">":
                this.#addToken(this.#match("=") ? TokenType.GREATER_EQUAL : TokenType.GREATER);
                break;
            case "/":
                this.#addToken(TokenType.SLASH);
                break;
            case "#":
                while (this.#peek() != "\n" && !this.#isAtEnd()) this.#advance();
                break;
            case " ":
            case "\r":
            case "\t":
                // ignore whitespace
                break;
            case "\n":
                this.line++;
                break;
            case `"`:
                this.#string();
                break;
            default:
                if (this.#isDigit(c)) {
                    this.#number();
                } else if (this.#isAlpha(c)) {
                    this.#identifier();
                } else {
                    this.errorReporter.error(this.line, "Unexpected character.");
                }
                break;
        }
    }

    #identifier() {
        while (this.#isAlphaNumeric(this.#peek())) {
            this.#advance();
        }

        const text = this.source.substring(this.start, this.current);
        let type = Keywords.get(text);
        if (!type) {
            type = TokenType.IDENTIFIER;
        }
        this.#addToken(type);
    }

    #string() {
        while (this.#peek() !== '"' && !this.#isAtEnd()) {
            if (this.#peek() === "\n") this.line++;
            this.#advance();
        }

        if (this.#isAtEnd()) {
            this.errorReporter.error(this.line, "Unterminated string.");
        }

        this.#advance();

        const value = this.source.substring(this.start + 1, this.current - 1);
        this.#addToken(TokenType.STRING, value);
    }

    #match(expected) {
        if (this.#isAtEnd()) return false;
        if (this.source.charAt(this.current) != expected) return false;

        this.current++;
        return true;
    }

    #peek() {
        if (this.#isAtEnd()) {
            return "\0";
        }
        return this.source.charAt(this.current);
    }

    #peekNext() {
        if (this.current + 1 >= this.source.length) return '\0';
        return this.source.charAt(this.current + 1);
    }

    /**
     * 
     * @param {string} c 
     * @returns 
     */
    #isAlpha(c) {
        return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || (c == '_');
    }

    /**
     * 
     * @param {string} c 
     * @returns 
     */
    #isAlphaNumeric(c) {
        return this.#isAlpha(c) || this.#isDigit(c);
    }

    /**
     * 
     * @param {string} c 
     * @returns 
     */
    #isDigit(c) {
        return c >= '0' && c <= '9';
    }

    #number() {
        while (this.#isDigit(this.#peek())) this.#advance();

        // look fractional part
        if (this.#peek() == '.' && this.#isDigit(this.#peekNext())) {
            // consume the '.'
            this.#advance();

            while (this.#isDigit(this.#peek())) this.#advance();
        }

        this.#addToken(TokenType.NUMBER, Number.parseFloat(this.source.substring(this.start, this.current)));
    }

    #isAtEnd() {
        return this.current >= this.source.length;
    }

    #advance() {
        return this.source.charAt(this.current++);
    }

    /**
     *
     * @param {TokenType} type
     * @param {object} [literal]
     */
    #addToken(type, literal = null) {
        const text = this.source.substring(this.start, this.current);
        this.tokens.push(new Token(type, text, literal, this.line));
    }
}


class Expr {
    accept() {
        throw new Error('Accept should be implemented.');
    }
}

class Visitor {
    /**
     * 
     * @param {ExprBinary} expr 
     */
    visitBinary(expr) {
		throw new Error('Method visitBinary not implemented yet.')
    }
    /**
     * 
     * @param {ExprAssign} expr 
     */
    visitAssign(expr) {
		throw new Error('Method visitAssign not implemented yet.')
    }
    /**
	 *
	 * @param {ExprCall} expr
	 */
	visitCall(expr) {
		throw new Error('Method visitCall not implemented yet.')
	}
    /**
	 *
	 * @param {ExprGrouping} expr
	 */
	visitGrouping(expr) {
		throw new Error('Method visitGrouping not implemented yet.')
	}
    /**
	 *
	 * @param {ExprLiteral} expr
	 */
	visitLiteral(expr) {
		throw new Error('Method visitLiteral not implemented yet.')
	}
    /**
	 *
	 * @param {ExprLogical} expr
	 */
	visitLogical(expr) {
		throw new Error('Method visitLogical not implemented yet.')
	}
    /**
	 *
	 * @param {ExprUnary} expr
	 */
	visitUnary(expr) {
		throw new Error('Method visitUnary not implemented yet.')
	}
    /**
	 *
	 * @param {ExprVariable} expr
	 */
	visitVariable(expr) {
		throw new Error('Method visitVariable not implemented yet.')
	}
}

class ExprBinary extends Expr {

    /**
     * 
     * @param {Expr} left 
     * @param {Token} operator 
     * @param {Expr} right 
     */
    constructor(left, operator, right) {
        super();
        this.left = left;
        this.operator = operator;
        this.right = right;
    }

    accept(visitor) {

    }
}

class ExprAssign extends Expr {
    /**
     * 
     * @param {Token} name 
     * @param {Expr} value 
     */
    constructor(name, value) {
        super();
        this.name = name;
        this.value = value;
    }
}

class ExprCall extends Expr {
    /**
     * 
     * @param {Expr} callee 
     * @param {Token} parent 
     * @param {Array} args 
     * 
     */
    constructor(callee, parent, args) {
        super();
        this.callee = callee;
        this.parent = parent;
        this.arguments = args;
    }
}


class ExprGrouping extends Expr {
    /**
     * 
     * @param {Expr} expr 
     */
    constructor(expr) {
        super();
        this.expr = expr;
    }
}

class ExprLiteral extends Expr {
    /**
     * 
     * @param {object} value 
     */
    constructor(value) {
        super();
        this.value = value;
    }
}

class ExprLogical extends Expr {
    /**
     * 
     * @param {Expr} left 
     * @param {Token} operator 
     * @param {Expr} right 
     */
    constructor(left, operator, right) {
        super();
        this.left = left;
        this.operator = operator;
        this.right = right;
    }
}

class ExprUnary extends Expr {
    /**
     * 
     * @param {Token} operator 
     * @param {Expr} right 
     */
    constructor(operator, right) {
        super();
        this.operator = operator;
        this.right = right;
    }
}

class ExprVariable extends Expr {
    /**
     * 
     * @param {Token} name 
     */
    constructor(name) {
        super();
        this.name = name;
    }
}