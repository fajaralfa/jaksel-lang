import fs from "node:fs";
import { argv, exit } from "node:process";
import readline from "node:readline";
import process from "node:process";

export class Jaksel {
    private errorReporter: ErrorReporter

    constructor() {
        this.errorReporter = new ErrorReporterConsole();
    }

    main() {
        if (argv.length > 3) {
            console.log("Usage: node jaksel.js [script]");
            exit(64);
        } else if (argv.length === 3) {
            this.runFile(argv[2]!);
        } else {
            this.runPrompt();
        }
    }

    /**
     * 
     * @param {string} path relative path from where you execute the interpreter
     */
    runFile(path: string) {
        try {
            const code = fs.readFileSync(path, "utf-8");
            this.run(code);
            if (this.errorReporter.hadError) exit(65);
            if (this.errorReporter.hadRuntimeError) exit(70);
        } catch (err) {
            if (typeof err === 'object' && err !== null && "code" in err && err.code == "ENOENT") {
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

    run(source: string) {
        const scanner = new Scanner(source, this.errorReporter);
        const tokens = scanner.scanTokens();
        const parser = new Parser(tokens, this.errorReporter);
        if (this.errorReporter.hadError) return;
        const statements = parser.parse();
        const interpreter = new Interpreter(this.errorReporter);
        interpreter.interpret(statements);
    }
}

interface ErrorReporter {
    hadError: boolean;
    hadRuntimeError: boolean;
    error(line: number, message: string): void
    error(line: number, column: number, message: string): void
    error(line: number, columnOrMessage: number|string, message?: string): void
    parseError(token: Token, message: string): void
    runtimeError(error: RuntimeError): void
}

class ErrorReporterConsole implements ErrorReporter {
    hadError = false;
    hadRuntimeError = false;

    error(line: number, message: string): void
    error(line: number, column: number, message: string): void
    error(line: number, columnOrMessage: number|string, message?: string): void {
        if (typeof columnOrMessage === 'string') {
            this.#report(line, null, "", columnOrMessage);
        } else {
            this.#report(line, columnOrMessage, "", message);
        }
    }

    parseError(token: Token, message: string) {
        if (token.type === TokenType.EOF) {
            this.error(token.line, message);
        } else {
            this.error(token.line, `[at ${token.lexeme}] ${message}`);
        }
    }

    #report(line: number, column: number|null, where: string, message?: string) {
        if (column === null) {
            console.error(`[line ${line}] Error ${where}: ${message}`);
        } else {
            console.error(`[line ${line}, column ${column}] Error ${where}: ${message}`);
        }
        this.hadError = true;
    }

    runtimeError(error: RuntimeError) {
        console.error(`${error.message}\n[line ${error.token.line}]`);
        this.hadRuntimeError = true;
    }
}

enum TokenType {
    // Single-character tokens.
    LEFT_PAREN,
    RIGHT_PAREN,
    COMMA,
    DOT,
    MINUS,
    PLUS,
    SLASH,
    STAR,
    PERCENT,
    NEWLINE,

    // One or two character tokens.
    BANG,
    BANG_EQUAL,
    EQUAL,
    EQUAL_EQUAL,
    GREATER,
    GREATER_EQUAL,
    LESS,
    LESS_EQUAL,

    // Literals.
    IDENTIFIER,
    STRING,
    NUMBER,
    EOF,

    TRUE,
    FALSE,
    NIL,

    FOMO,
    ENDUP,

    THATS,
    IT,
    SIH,

    SPILL,

    LITERALLY,
    SERIOUSLY,
    WHICHIS,
    ITU,

    SO,
    ABOUT,
    OVERTHINKING,
    CALL,
};

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

    type: TokenType
    lexeme: string
    literal: string|object|null
    line: number
    constructor(type: TokenType, lexeme: string, literal: string|object|null, line: number) {
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
    tokens: Array<Token> = [];
    start = 0;
    current = 0;
    line = 1;
    column = 0;
    private source: string;
    private errorReporter: ErrorReporter

    constructor(source: string, errorReporter: ErrorReporter) {
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

    #string(quote: string) {
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

    #match(expected: string) {
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

    #isAlpha(c: string): boolean {
        return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || (c == '_');
    }

    #isAlphaNumeric(c: string) {
        return this.#isAlpha(c) || this.#isDigit(c);
    }

    #isDigit(c: string) {
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

    #addToken(type: TokenType, literal: any = null) {
        const text = this.source.substring(this.start, this.current);
        this.tokens.push(new Token(type, text, literal, this.line));
    }
}

class Parser {
    private tokens: Array<Token>;
    private current: number;
    private errorReporter: ErrorReporter;

    constructor(tokens: Array<Token>, errorReporter: ErrorReporter) {
        this.tokens = tokens;
        this.current = 0;
        this.errorReporter = errorReporter;
    }

    parse() {
        const statements = [];
        while (!this.#isAtEnd()) {
            statements.push(this.#statement());
        }

        return statements;
    }

    #statement() {
        if (this.#match(TokenType.SPILL)) {
            return this.#spillStatement();
        }
        
        return this.#expressionStatement();
    }

    #spillStatement() {
        const expr = this.#expression();
        if (!this.#isAtEnd()) {
            this.#consume(TokenType.NEWLINE, "Expect newline after spill.");
        }
        return new StmtSpill(expr);
    }

    #expressionStatement() {
        const expr = this.#expression();
        if (!this.#isAtEnd()) {
            this.#consume(TokenType.NEWLINE, "Expect newline after expression.");
        }
        return new StmtExpr(expr);
    }

    #expression(): any {
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

    #unary(): any {
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

    #match(...types: TokenType[]) {
        for (const type of types) {
            if (this.#check(type)) {
                this.#advance();
                return true;
            }
        }
        return false;
    }

    #consume(type: TokenType, message: string) {
        if (this.#check(type)) return this.#advance();
        throw this.#error(this.#peek(), message);
    }
    #check(type: TokenType) {
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

    #peek(): Token {
        return this.tokens[this.current]!;
    }

    #previous(): Token {
        return this.tokens[this.current - 1]!;
    }

    #error(token: Token, message: string) {
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

interface Visitor {
    visitBinary(expr: ExprBinary): any

    visitAssign(expr: ExprAssign): any

	visitCall(expr: ExprCall): any
    
	visitGrouping(expr: ExprGrouping): any
    
	visitLiteral(expr: ExprLiteral): any

	visitLogical(expr: ExprLogical): any

	visitUnary(expr: ExprUnary): any

	visitVariable(expr: ExprVariable): any

    visitExpression(stmt: StmtExpr): any

    visitSpill(stmt: StmtSpill): any
}


class Interpreter implements Visitor {
    private errorReporter: ErrorReporter;

    constructor(errorReporter: ErrorReporter) {
        this.errorReporter = errorReporter;
    }

    interpret(statements: Array<Stmt>) {
        try {
            for (const statement of statements) {
                this.#execute(statement);
            }
        } catch (err) {
            if (err instanceof RuntimeError)
                this.errorReporter.runtimeError(err);
            else throw err;
        }
    }

    #evaluate(expr: Expr): any {
        return expr.accept(this);
    }

    #execute(stmt: Stmt) {
        stmt.accept(this);
    }

    visitExpression(expr: StmtExpr) {
        return this.#evaluate(expr.expr);
    }

    visitSpill(expr: StmtSpill) {
        const value = this.#evaluate(expr.expr);
        console.log(value);
        return value;
    }

    visitLiteral(expr: ExprLiteral) {
        return expr.value;
    }

    visitGrouping(expr: ExprGrouping) {
        return this.#evaluate(expr.expr);
    }

    visitUnary(expr: ExprUnary) {
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

    #checkNumberOperand(operator: Token, operand: any) {
        if (typeof operand === 'number') return;
        throw new RuntimeError(operator, "Operand must be a number.");
    }

    #isTruthy(value: any) {
        if (value === null) return false;
        if (typeof value === 'boolean') return value;
        return true;
    }

    
    visitBinary(expr: ExprBinary) {
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
                    return left + right;
                }
                if (typeof left === 'string' && typeof right === 'string') {
                    return parseFloat(left) + parseFloat(right);
                }
                throw new RuntimeError(expr.operator, "Operands must be two numbers or two strings.");
            case TokenType.PERCENT:
                return parseFloat(left) % parseFloat(right);
            case TokenType.BANG_EQUAL:
                return !this.#isEqual(left, right);
            case TokenType.EQUAL_EQUAL:
                return !this.#isEqual(left, right);
        }
    }

    visitAssign(expr: ExprAssign) {
        throw Error('Method not implemented yet');
    }

    visitCall(expr: ExprCall) {
        throw Error('Method not implemented yet');
    }

    visitLogical(expr: ExprLogical) {
        throw Error('Method not implemented yet');
    }

    visitVariable(expr: ExprVariable) {
        throw Error('Method not implemented yet');
    }

    #isEqual(a: any, b: any) {
        if (a === null && b === null) return true;
        if (a === null) return false;
        return a === b;
    }
}

class AstPrinter implements Visitor {
    print(expr: Expr) {
        return expr.accept(this);
    }

    visitBinary(expr: ExprBinary) {
        return this.#parenthesize(expr.operator.lexeme, expr.left, expr.right);
    }

    visitGrouping(expr: ExprGrouping) {
        return this.#parenthesize("group", expr.expr);
    }

    visitLiteral(expr: ExprLiteral) {
        return expr.value.toString();
    }

    visitUnary(expr: ExprUnary) {
        return this.#parenthesize(expr.operator.lexeme, expr.right);
    }

    visitAssign(expr: ExprAssign) {
        throw Error('Method not implemented yet');
    }

    visitCall(expr: ExprCall) {
        throw Error('Method not implemented yet');
    }

    visitExpression(stmt: StmtExpr) {
        throw Error('Method not implemented yet');
    }

    visitLogical(expr: ExprLogical) {
        throw Error('Method not implemented yet');
    }

    visitSpill(stmt: StmtSpill) {
        throw Error('Method not implemented yet');
    }

    visitVariable(expr: ExprVariable) {
        throw Error('Method not implemented yet');
    }

    #parenthesize(name: string, ...exprs: Expr[]) {
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
    accept(visitor: Visitor) {
        throw new Error('Accept should be implemented.');
    }
}

class Stmt {
    accept(visitor: Visitor) {
        throw new Error('Accept should be implemented.');
    }
}

class ExprBinary extends Expr {
    left: Expr
    operator: Token
    right: Expr

    constructor(left: Expr, operator: Token, right: Expr) {
        super();
        this.left = left;
        this.operator = operator;
        this.right = right;
    }

    override accept(visitor: Visitor) {
        return visitor.visitBinary(this);
    }
}

class ExprAssign extends Expr {
    name: Token
    value: Expr

    constructor(name: Token, value: Expr) {
        super();
        this.name = name;
        this.value = value;
    }

    override accept(visitor: Visitor) {
        return visitor.visitAssign(this);
    }
}

class ExprCall extends Expr {
    callee: Expr
    parent: Token
    arguments: Array<Expr>

    constructor(callee: Expr, parent: Token, args: Array<Expr>) {
        super();
        this.callee = callee;
        this.parent = parent;
        this.arguments = args;
    }

    override accept(visitor: Visitor) {
        return visitor.visitCall(this);
    }
}


class ExprGrouping extends Expr {
    expr: Expr

    constructor(expr: Expr) {
        super();
        this.expr = expr;
    }

    override accept(visitor: Visitor) {
        return visitor.visitGrouping(this);
    }
}

class ExprLiteral extends Expr {
    value: object

    constructor(value: any) {
        super();
        this.value = value;
    }

    override accept(visitor: Visitor) {
        return visitor.visitLiteral(this);
    }
}

class ExprLogical extends Expr {
    left: Expr
    operator: Token
    right: Expr

    constructor(left: Expr, operator: Token, right: Expr) {
        super();
        this.left = left;
        this.operator = operator;
        this.right = right;
    }

    override accept(visitor: Visitor) {
        return visitor.visitLogical(this);
    }
}

class ExprUnary extends Expr {
    operator: Token
    right: Expr

    constructor(operator: Token, right: Expr) {
        super();
        this.operator = operator;
        this.right = right;
    }

    override accept(visitor: Visitor) {
        return visitor.visitUnary(this);
    }
}

class ExprVariable extends Expr {
    name: Token

    constructor(name: Token) {
        super();
        this.name = name;
    }

    override accept(visitor: Visitor) {
        return visitor.visitVariable(this);
    }
}

class StmtSpill extends Stmt {
    expr: Expr

    constructor(expr: Expr) {
        super();
        this.expr = expr;
    }

    override accept(visitor: Visitor) {
        return visitor.visitSpill(this);
    }
}

class StmtExpr extends Stmt {
    expr: Expr

    constructor(expr: Expr) {
        super();
        this.expr = expr;
    }

    override accept(visitor: Visitor) {
        return visitor.visitExpression(this);
    }
}

class RuntimeError extends Error {
    token: Token

    constructor(token: Token, message: string) {
        super(message);
        this.token = token;
    }
}