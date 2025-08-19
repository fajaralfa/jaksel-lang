import type { ErrorReporter } from "./error";
import { Token, TokenType, type Literal } from "./token";

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
            default:
                if (this.isDigit(c)) {
                    this.number();
                } else if (this.isAlpha(c)) {
                    this.identifier();
                } else {
                    this.errorReporter.error(this.line, this.column - 1, `Unexpected character.`);
                }
                break;
        }
    }

    private identifier(): void {
        while (this.isAlphaNumeric(this.peek())) {
            this.advance();
        }
        const text = this.source.substring(this.start, this.current);
        let type = Keywords.get(text);
        if (type === undefined) {
            type = TokenType.IDENTIFIER;
        }
        this.addToken(type);
    }

    private number(): void {
        while (this.isDigit(this.peek())) {
            this.advance();
        }
        if (this.peek() == '.' && this.isDigit(this.peekNext())) {
            this.advance();
            while (this.isDigit(this.peek())) {
                this.advance();
            }
        }
        this.addToken(TokenType.NUMBER, parseFloat(this.source.substring(this.start, this.current)));
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

    private peekNext(): string {
        if (this.current + 1 >= this.source.length) {
            return '\0';
        }
        return this.source.charAt(this.current + 1);
    }

    private isAlpha(c: string): boolean {
        return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || (c === '_');
    }
    
    private isAlphaNumeric(c: string): boolean {
        return this.isAlpha(c) || this.isDigit(c);
    }

    private isDigit(c: string): boolean {
        return c >= '0' && c <= '9';
    }

    private advance(): string {
        this.column++;
        return this.source.charAt(this.current++);
    }

    private addToken(type: TokenType): void
    private addToken(type: TokenType, literal: Literal): void
    private addToken(type: TokenType, literal: Literal = null): void {
        const text = this.source.substring(this.start, this.current);
        const tokenColumn = this.column - (this.current - this.start); // starting column
        this.tokens.push(new Token(type, text, literal, this.line, tokenColumn));
    }
}

const Keywords = new Map([
    ['ril', TokenType.TRUE],
    ['impossible', TokenType.FALSE],
    ['hampa', TokenType.NIL],

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