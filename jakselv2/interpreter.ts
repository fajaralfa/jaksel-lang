import type { Assign, Binary, Expr, Expression, Grouping, Literal, Print, Stmt, Unary, Var, Variable, VisitorExpr, VisitorStmt } from "./ast";
import { Environment } from "./environment";
import { RuntimeError, type ErrorReporter } from "./error";
import { Token, TokenType } from "./token";

export class Interpreter implements VisitorExpr<any>, VisitorStmt<void> {
    private environment: Environment = new Environment();

    constructor(public errorReporter: ErrorReporter) {}
    intepret(statements: Array<Stmt>): void {
        try {
            for (const s of statements) {
                this.execute(s);
            }
        } catch (err) {
            this.errorReporter.runtimeError(err as RuntimeError);
        }
    }

    visitBinary(expr: Binary): any {
        const left = this.evaluate(expr.left);
        const right = this.evaluate(expr.right);
        switch (expr.operator.type) {
            case TokenType.GREATER:
                this.checkNumberOperands(expr.operator, left, right);
                return left > right;
            case TokenType.GREATER_EQUAL:
                this.checkNumberOperands(expr.operator, left, right);
                return left >= right;
            case TokenType.LESS:
                this.checkNumberOperands(expr.operator, left, right);
                return left < right;
            case TokenType.LESS_EQUAL:
                this.checkNumberOperands(expr.operator, left, right);
                return left <= right;
            case TokenType.BANG_EQUAL:
                return !this.isEqual(left, right);
            case TokenType.EQUAL_EQUAL:
                return this.isEqual(left, right);
            case TokenType.MINUS:
                this.checkNumberOperands(expr.operator, left, right);
                return parseFloat(left) - parseFloat(right)
            case TokenType.SLASH:
                this.checkNumberOperands(expr.operator, left, right);
                return parseFloat(left) / parseFloat(right)
            case TokenType.STAR:
                this.checkNumberOperands(expr.operator, left, right);
                return parseFloat(left) * parseFloat(right)
            case TokenType.PLUS:
                if (typeof left === 'number' && typeof right === 'number') {
                    return left + right;
                }
                if (typeof left === 'string' && typeof right === 'string') {
                    return left + right;
                }
                break;
        }
        return null;
    }
    visitGrouping(expr: Grouping): any {
        return this.evaluate(expr.expression);
    }
    visitLiteral(expr: Literal): any {
        return expr.value as any;
    }
    visitUnary(expr: Unary): any {
        const right = this.evaluate(expr.right);
        switch (expr.operator.type) {
            case TokenType.BANG:
                return !this.isTruthy(right);
            case TokenType.MINUS:
                this.checkNumberOperand(expr.operator, right);
                return -parseFloat(right);
        }
        return null;
    }
    private checkNumberOperand(operator: Token, operand: any) {
        if (typeof operand === 'number') return;
        throw new RuntimeError(operator, "Operand must be a number.");
    }
    private checkNumberOperands(operator: Token, left: any, right: any) {
        if (typeof left === 'number' && typeof right === 'number') return;
        throw new RuntimeError(operator, "Operands must be a number.");
    }
    private evaluate(expr: Expr | null): any {
        return expr?.accept(this);
    }
    private execute(stmt: Stmt): void {
        stmt.accept(this);
    }
    visitExpression(stmt: Expression): void {
        this.evaluate(stmt.expression);
    }
    visitPrint(stmt: Print): void {
        const value = this.evaluate(stmt.expression);
        console.log(value);
    }
    visitVar(stmt: Var): void {
        let value = null;
        if (stmt.initializer !== null) {
            value = this.evaluate(stmt.initializer);
        }
        this.environment.define(stmt.name.lexeme, value);
    }
    visitAssign(expr: Assign) {
        const value = this.evaluate(expr.value);
        this.environment.assign(expr.name, value);
        return value;
    }
    visitVariable(expr: Variable) {
        return this.environment.get(expr.name);
    }
    private isTruthy(obj: any) {
        if (obj === null) {
            return false;
        }
        if (typeof obj === 'boolean') return obj;
        return true;
    }
    private isEqual(a: any, b: any) {
        return a === b
    }
}
