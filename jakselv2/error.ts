import type { Token } from "./token";

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
