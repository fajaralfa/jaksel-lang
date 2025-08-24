import { Token, type Literal as LiteralType } from "./token";

export interface Expr {
    accept<T>(visitor: VisitorExpr<T>): T;
}

export interface VisitorExpr<T> {
    visitBinary(expr: Binary): T;
    visitGrouping(expr: Grouping): T;
    visitLiteral(expr: Literal): T;
    visitUnary(expr: Unary): T;
}

export class Binary implements Expr {
    constructor(public left: Expr, public operator: Token, public right: Expr) {}
    accept<T>(visitor: VisitorExpr<T>): T {
        return visitor.visitBinary(this);
    }
}

export class Grouping implements Expr {
    constructor(public expression: Expr) {}
    accept<T>(visitor: VisitorExpr<T>): T {
        return visitor.visitGrouping(this);
    }
}

export class Literal implements Expr {
    constructor(public value: LiteralType) {}
    accept<T>(visitor: VisitorExpr<T>): T {
        return visitor.visitLiteral(this);
    }
}

export class Unary implements Expr {
    constructor(public operator: Token, public right: Expr) {}
    accept<T>(visitor: VisitorExpr<T>): T {
        return visitor.visitUnary(this);
    }
}

export interface Stmt {
    accept<T>(visitor: VisitorStmt<T>): T;
}

export interface VisitorStmt<T> {
    visitExpression(stmt: Expression): T;
    visitPrint(stmt: Print): T;
}

export class Expression implements Stmt {
    constructor(public expression: Expr) {}
    accept<T>(visitor: VisitorStmt<T>): T {
        return visitor.visitExpression(this);
    }
}

export class Print implements Stmt {
    constructor(public expression: Expr) {}
    accept<T>(visitor: VisitorStmt<T>): T {
        return visitor.visitPrint(this);
    }
}