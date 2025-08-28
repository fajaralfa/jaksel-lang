import { RuntimeError } from "./error";
import type { Literal, Token } from "./token";

export class Environment {
    public values: Map<string, Literal> = new Map();

    constructor(public enclosing: Environment | null = null) {}

    get(name: Token): Literal | undefined {
        if (this.values.has(name.lexeme)) {
            return this.values.get(name.lexeme);
        }
        if (this.enclosing != null) return this.enclosing.get(name);
        throw new RuntimeError(name, `Undefined variable ${name.lexeme}.`)
    }

    define(name: string, value: Literal): void {
        this.values.set(name, value);
    }

    assign(name: Token, value: Literal): void {
        if (this.values.has(name.lexeme)) {
            this.values.set(name.lexeme, value);
            return;
        }
        if (this.enclosing != null) {
            this.enclosing.assign(name, value);
        }
        throw new RuntimeError(name, `Undefined variable '${name.lexeme}'.`)
    }
}