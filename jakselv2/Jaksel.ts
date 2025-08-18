import { Token, TokenType } from "./Token";

export class Jaksel {
    errorReporter: ErrorReporter;
    constructor(errorReporter: ErrorReporter) {
        this.errorReporter = errorReporter;
    }

    run(source: string) {
        const scanner: Scanner = new Scanner(this.errorReporter, source);
        const tokens: Array<Token> = scanner.scanTokens();
        for (const token of tokens) {
            console.log(token.toString());
        }
    }
}

export interface ErrorReporter {
    hadError: boolean;
    hadRuntimeError: boolean;
    error(line: number, message: string): void;
    error(line: number, column: number, message: string): void;
    error(line: number, columnOrMessage: number | string, message?: string): void;
}

export class ConsoleErrorReporter implements ErrorReporter {
    hadError: boolean = false;
    hadRuntimeError: boolean = false;

    error(line: number, message: string): void;
    error(line: number, column: number, message: string): void;
    error(line: number, columnOrMessage: number | string, message?: string): void {
        if (typeof columnOrMessage === 'string') {
            this.report(line, null, "", columnOrMessage);
        } else {
            this.report(line, columnOrMessage, "", message);
        }
    }

    private report(line: number, column: number|null, where: string, message?: string) {
        if (column === null) {
            console.error(`[ln ${line}] Error ${where}: ${message}`);
        } else {
            console.error(`[ln ${line}, col ${column}] Error ${where}: ${message}`);
        }
        this.hadError = true;
    }

}

export class RuntimeError extends Error {
    token: Token;

    constructor(token: Token, message: string) {
        super(message);
        this.token = token;
    }
}

export class Scanner {
    private source: string;
    private tokens: Array<Token> = [];
    private start: number = 0;
    private current: number = 0;
    private line: number = 1;
    private column: number = 1;
    private errorReporter: ErrorReporter;

    constructor(errorReporter: ErrorReporter, source: string) {
        this.errorReporter = errorReporter;
        this.source = source;
    }

    scanTokens(): Array<Token> {
        while (!this.isAtEnd()) {
            this.start = this.current;
            this.scanToken();
        }

        this.tokens.push(new Token(TokenType.EOF, "", null, this.line, this.column));
        return this.tokens;
    }

    private isAtEnd(): boolean {
        return this.current >= this.source.length;
    }

    private scanToken(): void {
        const c = this.advance();
        switch (c) {
            case '(': this.addToken(TokenType.LEFT_PAREN); break;
            case ')': this.addToken(TokenType.RIGHT_PAREN); break;
            case ',': this.addToken(TokenType.COMMA); break;
            case '.': this.addToken(TokenType.DOT); break;
            case '-': this.addToken(TokenType.MINUS); break;
            case '+': this.addToken(TokenType.PLUS); break;
            case '*': this.addToken(TokenType.STAR); break;
            case '/': this.addToken(TokenType.SLASH); break;
            case '!':
                this.addToken(this.match('=') ? TokenType.BANG_EQUAL : TokenType.BANG);
                break;
            case '=':
                this.addToken(this.match('=') ? TokenType.EQUAL_EQUAL : TokenType.EQUAL);
                break;
            case '<':
                this.addToken(this.match('=') ? TokenType.LESS_EQUAL : TokenType.LESS);
                break;
            case '>':
                this.addToken(this.match('=') ? TokenType.GREATER_EQUAL : TokenType.GREATER);
                break;
            case '#':
                while (this.peek() !== '\n' && !this.isAtEnd()) {
                    this.advance();
                }
                break;
            case ' ':
            case '\r':
            case '\t':
                break;
            case '\n':
                this.addToken(TokenType.NEWLINE);
                this.line++;
                this.column = 1;
                break;
            case '"': this.string(); break;
            default: this.errorReporter.error(this.line, this.column - 1, "Unexpected character.");
        }
        this.column++;
    }

    private string(): void {
        while (this.peek() !== '"' && !this.isAtEnd()) {
            if (this.peek() === '\n') {
                this.line++;
                this.column = 1;
            }
            this.advance();
        }

        if (this.isAtEnd()) {
            this.errorReporter.error(this.line, "Unterminated string.");
            return;
        }

        this.advance();

        const value = this.source.substring(this.start + 1, this.current - 1);
        this.addToken(TokenType.STRING, value);
    }

    private match(expected: string): boolean {
        if (this.isAtEnd()) {
            return false;
        }
        if (this.source.charAt(this.current) !== expected) {
            return false;
        }
        this.current++;
        this.column++;
        return true;
    }

    private peek(): string {
        if (this.isAtEnd()) {
            return '\0';
        }
        return this.source.charAt(this.current);
    }

    private advance(): string {
        return this.source.charAt(this.current++);
    }

    private addToken(type: TokenType): void
    private addToken(type: TokenType, literal: object|string): void
    private addToken(type: TokenType, literal: object|string|null = null): void {
        const text = this.source.substring(this.start, this.current);
        this.tokens.push(new Token(type, text, literal, this.line, this.column));
    }
}