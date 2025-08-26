import { RuntimeError } from "./error";
import type { Literal, Token } from "./token";

export class Environment {
    public values: Map<string, Literal> = new Map();
    get(name: Token) {
        if (this.values.has(name.lexeme)) {
            return this.values.get(name.lexeme);
        }
        throw new RuntimeError(name, `Undefined variable ${name.lexeme}.`)
    }

    define(name: string, value: Literal): void {
        this.values.set(name, value);
    }
}