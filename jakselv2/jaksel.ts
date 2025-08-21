import type { ErrorReporter } from "./error";
import { Interpreter } from "./interpreter";
import { Parser } from "./parser";
import { Scanner } from "./scanner";
import { Token } from "./token";

export class Jaksel {
    errorReporter: ErrorReporter;
    constructor(errorReporter: ErrorReporter) {
        this.errorReporter = errorReporter;
    }

    run(source: string) {
        const scanner = new Scanner(this.errorReporter, source);
        const tokens: Array<Token> = scanner.scanTokens();
        const parser = new Parser(this.errorReporter, tokens);
        const expression = parser.parse();
        const interpreter = new Interpreter(this.errorReporter);
        interpreter.intepret(expression);
        if (this.errorReporter.hadError) {
            return;
        }
    }
}
