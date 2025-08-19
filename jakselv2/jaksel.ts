import type { ErrorReporter } from "./error";
import { Scanner } from "./scanner";
import { Token } from "./token";

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
