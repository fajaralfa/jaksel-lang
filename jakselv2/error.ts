import { Token } from "./token";

export interface ErrorReporter {
    hadError: boolean;
    hadRuntimeError: boolean;
    error(token: Token, message: string): void;
    error(line: number, message: string): void;
    error(line: number, column: number, message: string): void;
    error(line: number, columnOrMessage: number | string, message?: string): void;
}

export class ConsoleErrorReporter implements ErrorReporter {
    hadError: boolean = false;
    hadRuntimeError: boolean = false;

    error(token: Token, message: string): void;
    error(line: number, message: string): void;
    error(line: number, column: number, message: string): void;
    error(lineOrToken: number | Token, columnOrMessage: number | string, message?: string): void {
        if (lineOrToken instanceof Token) {
            if (typeof columnOrMessage === 'string') {
                this.report(lineOrToken.line, lineOrToken.column, ` at '${lineOrToken.lexeme}'`, columnOrMessage);
            } else {
                throw new Error('Invalid arguments');
            }
        } else if (typeof lineOrToken === 'number') {
            if (typeof columnOrMessage === 'string') {
                this.report(lineOrToken, null, "", columnOrMessage);
            } else if (typeof columnOrMessage === 'number') {
                this.report(lineOrToken, columnOrMessage, "", message);
            } else {
                throw new Error('Invalid arguments');
            }
        } else {
            throw new Error('Invalid arguments');
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

export class ParseError extends Error {}