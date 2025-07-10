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
            if (this.errorReporter.hadRuntimeError) exit(70);
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
        const parser = new Parser(tokens, this.errorReporter);
        if (this.errorReporter.hadError) return;
        const expr = parser.parse();
        const interpreter = new Interpreter(this.errorReporter);
        interpreter.interpret(expr);
    }
}

export class ErrorReporter {
    hadError = false;
    hadRuntimeError = false;

    /**
     *
     * @param {number} line
     * @param {number} column
     * @param {string} message
     */
    error(line, column, message) {
        this.#report(line, column, "", message);
    }

    /**
     * 
     * @param {Token} token 
     * @param {string} message 
     */
    parseError(token, message) {
        if (token.type === TokenType.EOF) {
            this.error(token.line, token.column, message);
        } else {
            this.error(token.line, token.column, `[at ${token.lexeme}] Error: ${message}`);
        }
    }

    #report(line, column, where, message) {
        console.error(`[line ${line}, column ${column}] Error ${where}: ${message}`);
        this.hadError = true;
    }

    runtimeError(error) {
        console.error(`${error.message}\n[line ${error.token.line}]`);
        this.hadRuntimeError = true;
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
    PERCENT: "PERCENT",
    NEWLINE: "NEWLINE",

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
    SERIOUSLY: 'SERIOUSLY',
    WHICHIS: 'WHICHIS',
    ITU: 'ITU',

    SO: 'SO',
    ABOUT: 'ABOUT',
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
    ['seriously', TokenType.SERIOUSLY],
    ['whichis', TokenType.WHICHIS],
    ['itu', TokenType.ITU],
    ['so', TokenType.SO],
    ['about', TokenType.ABOUT],
    ['overthinking', TokenType.OVERTHINKING],
    ['call', TokenType.CALL],
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
    column = 0;

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
            case "%":
                this.#addToken(TokenType.PERCENT);
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
                this.column = 0;
                this.#addToken(TokenType.NEWLINE);
                break;
            case `"`:
            case `'`:
                this.#string(c);
                break;
            default:
                if (this.#isDigit(c)) {
                    this.#number();
                } else if (this.#isAlpha(c)) {
                    this.#identifier();
                } else {
                    this.errorReporter.error(this.line, this.column, "Unexpected character.");
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

    #string(quote) {
        while (this.#peek() !== quote && !this.#isAtEnd()) {
            if (this.#peek() === "\n") this.line++;
            this.#advance();
        }

        if (this.#isAtEnd()) {
            this.errorReporter.error(this.line, this.column, "Unterminated string.");
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
        const c = this.source.charAt(this.current++);
        this.column++;
        return c;
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

class Parser {
    /**
     * 
     * @param {Array<Token>} tokens 
     * @param {ErrorReporter} errorReporter
     */
    constructor(tokens, errorReporter) {
        this.tokens = tokens;
        this.current = 0;
        this.errorReporter = errorReporter;
    }

    parse() {
        try {
            return this.#expression();
        } catch (err) {
            return null;
        }
    }

    #expression() {
        return this.#equality();
    }

    #equality() {
        let expr = this.#comparison();
        while (this.#match(TokenType.BANG_EQUAL, TokenType.EQUAL_EQUAL)) {
            const operator = this.#previous();
            const right = this.#comparison();
            expr = new ExprBinary(expr, operator, right);
        }
        return expr;
    }

    #comparison() {
        let expr = this.#term();
        while (this.#match(TokenType.GREATER, TokenType.GREATER_EQUAL, TokenType.LESS, TokenType.LESS_EQUAL)) {
            const operator = this.#previous();
            const right = this.#term();
            expr = new ExprBinary(expr, operator, right);
        }
        return expr;
    }

    #term() {
        let expr = this.#factor();
        while (this.#match(TokenType.MINUS, TokenType.PLUS)) {
            const operator = this.#previous();
            const right = this.#factor();
            expr = new ExprBinary(expr, operator, right);
        }

        return expr;
    }

    #factor() {
        let expr = this.#unary();
        while (this.#match(TokenType.STAR, TokenType.SLASH, TokenType.PERCENT)) {
            const operator = this.#previous();
            const right = this.#unary();
            expr = new ExprBinary(expr, operator, right);
        }

        return expr;
    }

    #unary() {
        if (this.#match(TokenType.BANG, TokenType.MINUS)) {
            const operator = this.#previous();
            const right = this.#unary();
            return new ExprUnary(operator, right);
        }

        return this.#primary();
    }

    #primary() {
        if (this.#match(TokenType.FALSE)) return new ExprLiteral(false);
        if (this.#match(TokenType.TRUE)) return new ExprLiteral(true);
        if (this.#match(TokenType.NIL)) return new ExprLiteral(null);
        if (this.#match(TokenType.NUMBER, TokenType.STRING)) return new ExprLiteral(this.#previous().literal);
        if (this.#match(TokenType.LEFT_PAREN)) {
            const expr = this.#expression();
            this.#consume(TokenType.RIGHT_PAREN, "Expect ')' after expression.");
            return new ExprGrouping(expr);
        }

        throw this.#error(this.#peek(), "Expect expression.");
    }

    #match(...types) {
        for (const type of types) {
            if (this.#check(type)) {
                this.#advance();
                return true;
            }
        }
        return false;
    }

    #consume(type, message) {
        if (this.#check(type)) return this.#advance();
        throw error(this.#peek(), message);
    }

    #check(type) {
        if (this.#isAtEnd()) return false;
        return this.#peek().type === type;
    }

    #advance() {
        if (!this.#isAtEnd()) this.current++;
        return this.#previous();
    }

    #isAtEnd() {
        return this.#peek().type === TokenType.EOF;
    }

    #peek() {
        return this.tokens[this.current];
    }

    #previous() {
        return this.tokens[this.current - 1];
    }
    #error(token, message) {
        this.errorReporter.parseError(token, message);
        return new Error(message);
    }

    #synchronize() {
        this.#advance();

        while (!this.#isAtEnd()) {
            switch (this.#peek().type) {
                case TokenType.FOMO:
                case TokenType.THATS:
                case TokenType.SPILL:
                case TokenType.LITERALLY:
                case TokenType.SERIOUSLY:
                case TokenType.WHICHIS:
                case TokenType.CALL:
                    return;
                default:
                    break;
            }
        }

        this.#advance();
    }
}

class Interpreter extends Visitor {
    /**
     * 
     * @param {ErrorReporter} errorReporter 
     */
    constructor(errorReporter) {
        super();
        this.errorReporter = errorReporter;
    }

    /**
     * 
     * @param {Expr} expr 
     */
    interpret(expr) {
        try {
            const value = this.#evaluate(expr);
            console.log(value);
        } catch (err) {
            this.errorReporter.runtimeError(err);
        }
    }
    /**
     * 
     * @param {Expr} expr 
     */
    #evaluate(expr) {
        return expr.accept(this);
    }
    /**
     * @override
     * @param {ExprLiteral} expr 
     */
    visitLiteral(expr) {
        return expr.value;
    }

    /**
     * @override
     * @param {ExprGrouping} expr 
     */
    visitGrouping(expr) {
        return this.#evaluate(expr.expr);
    }

    /**
     * @override
     * @param {ExprUnary} expr 
     */
    visitUnary(expr) {
        const right = this.#evaluate(expr.right);
        switch (expr.operator.type) {
            case TokenType.MINUS:
                this.#checkNumberOperand(expr.operator, right);
                return - parseFloat(right);
            case TokenType.BANG:
                return !this.#isTruthy(right);
        }

        return null;
    }

    #checkNumberOperand(operator, operand) {
        if (typeof operand === 'number') return;
        throw new RuntimeError(operator, "Operand must be a number.");
    }

    #isTruthy(value) {
        if (value === null) return false;
        if (typeof value === 'boolean') return value;
        return true;
    }

    /**
     * @override
     * @param {ExprBinary} expr 
     */
    visitBinary(expr) {
        const left = this.#evaluate(expr.left);
        const right = this.#evaluate(expr.right);
        switch (expr.operator.type) {
            case TokenType.GREATER:
                this.#checkNumberOperand(expr.operator, left);
                this.#checkNumberOperand(expr.operator, right);
                return parseFloat(left) > parseFloat(right);
            case TokenType.GREATER_EQUAL:
                this.#checkNumberOperand(expr.operator, left);
                this.#checkNumberOperand(expr.operator, right);
                return parseFloat(left) >= parseFloat(right);
            case TokenType.LESS:
                return parseFloat(left) < parseFloat(right);
            case TokenType.LESS_EQUAL:
                return parseFloat(left) <= parseFloat(right);
            case TokenType.SLASH:
                return parseFloat(left) / parseFloat(right);
            case TokenType.STAR:
                return parseFloat(left) * parseFloat(right);
            case TokenType.PLUS:
                if (typeof left === 'number' && typeof right === 'number') {
                    return parseFloat(left) + parseFloat(right);
                }
                if (typeof left === 'string' && typeof right === 'string') {
                    return left + right;
                }
                throw new RuntimeError(expr.operator, "Operands must be two numbers or two strings.");
                break;
            case TokenType.PERCENT:
                return parseFloat(left) % parseFloat(right);
            case TokenType.BANG_EQUAL:
                return !this.#isEqual(left, right);
            case TokenType.EQUAL_EQUAL:
                return !this.#isEqual(left, right);
        }
    }

    #isEqual(a, b) {
        if (a === null && b === null) return true;
        if (a === null) return false;
        return a === b;
    }
}

class AstPrinter extends Visitor {
    /**
     * 
     * @param {Expr} expr 
     * @returns 
     */
    print(expr) {
        return expr.accept(this);
    }

    visitBinary(expr) {
        return this.#parenthesize(expr.operator.lexeme, expr.left, expr.right);
    }

    visitGrouping(expr) {
        return this.#parenthesize("group", expr.expr);
    }

    visitLiteral(expr) {
        return expr.value.toString();
    }

    visitUnary(expr) {
        return this.#parenthesize(expr.operator.lexeme, expr.right);
    }

    #parenthesize(name, ...exprs) {
        const builder = [];
        builder.push(`(${name}`);
        for (const expr of exprs) {
            builder.push(" ");
            builder.push(expr.accept(this));
        }
        builder.push(")");
        return builder.join("");
    }
}

class Expr {
    /**
     * 
     * @param {Visitor} visitor 
     */
    accept(visitor) {
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

    /**
     * 
     * @param {Visitor} visitor 
     */
    accept(visitor) {
        return visitor.visitBinary(this);
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

    /**
     * 
     * @param {Visitor} visitor 
     */
    accept(visitor) {
        return visitor.visitAssign(this);
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

    /**
     * 
     * @param {Visitor} visitor 
     */
    accept(visitor) {
        return visitor.visitCall(this);
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

    /**
     * 
     * @param {Visitor} visitor 
     */
    accept(visitor) {
        return visitor.visitGrouping(this);
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

    /**
     * 
     * @param {Visitor} visitor 
     */
    accept(visitor) {
        return visitor.visitLiteral(this);
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

    /**
     * 
     * @param {Visitor} visitor 
     */
    accept(visitor) {
        return visitor.visitLogical(this);
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

    /**
     * 
     * @param {Visitor} visitor 
     */
    accept(visitor) {
        return visitor.visitUnary(this);
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

    /**
     * 
     * @param {Visitor} visitor 
     */
    accept(visitor) {
        return visitor.visitVariable(this);
    }
}

class RuntimeError extends Error {
    /**
     * 
     * @param {Token} token 
     * @param {string} message 
     */
    constructor(token, message) {
        super(message);
        this.token = token;
    }
}