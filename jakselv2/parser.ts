import { ParseError, type ErrorReporter } from "./error";
import { Token, TokenType } from "./token";
import { type Expr, Binary, Unary, Grouping, Literal, type Stmt, Print, Expression, Var, Variable, Assign, If } from './ast'

export class Parser {
    private current: number = 0
    constructor(
        private errorReporter: ErrorReporter,
        private tokens: Array<Token>,
    ) {}

    parse(): Array<Stmt | null> {
        const statements: Array<Stmt | null> = [];
        while (!this.isAtEnd()) {
            if (this.match(TokenType.NEWLINE)) continue;
            statements.push(this.declaration());
        }
        return statements;
    }

    private expression(): Expr {
        return this.assignment();
    }

    private declaration(): Stmt | null {
        try {
            if (this.match(TokenType.LITERALLY)) return this.varDeclaration();
            return this.statement();
        } catch (err) {
            if (err instanceof ParseError) {
                this.synchronize();
                return null;
            }
            throw err;
        }
    }

    private statement(): Stmt {
        if (this.match(TokenType.KALO)) return this.ifStatement();
        if (this.match(TokenType.SPILL)) return this.spillStatement();
        return this.expressionStatement();
    }

    private ifStatement(): Stmt {
        const condition = this.expression();

        const thenBranch = this.openblock();

        // 3. Optionally parse elseIfBlocks
        const elseIfBlocks: If[] = [];
        while (this.match(TokenType.PERHAPS)) {
            const elseIfCondition = this.expression();
            const elseIfBranch = this.openblock();
            elseIfBlocks.push(new If(elseIfCondition, elseIfBranch, null));  // Handle else-if block
        }

        // 4. Optionally parse elseBlock
        let elseBranch: Stmt[] | null = null;
        if (this.match(TokenType.KALOGAK)) {
            elseBranch = this.openblock();
        }

        // 5. Ensure we end with 'udahan'
        this.consume(TokenType.UDAHAN, "Expect 'udahan' after if statement.");

        return new If(condition, thenBranch, elseBranch, elseIfBlocks);
    }

    private openblock(): Stmt[] {
        const statements: Stmt[] = [];
        this.consume(TokenType.NEWLINE, "Expect newline before block.");
        while (
            !this.isAtEnd() &&
            this.peek().type !== TokenType.UDAHAN &&
            this.peek().type !== TokenType.PERHAPS &&
            this.peek().type !== TokenType.KALOGAK
        ) {
            if (this.match(TokenType.NEWLINE)) continue;
            statements.push(this.statement());
        }
        return statements;
    }

    private spillStatement(): Stmt {
        const value = this.expression();
        this.consume([TokenType.NEWLINE, TokenType.EOF], "Expect newline after value.");
        return new Print(value);
    }

    private varDeclaration(): Stmt {
        const name = this.consume(TokenType.IDENTIFIER, "Expect variable name.");
        let initializer = null;
        if (this.match(TokenType.ITU)) {
            initializer = this.expression();
        }
        this.consume(TokenType.NEWLINE, "Expect newline after variable declaration.");
        return new Var(name, initializer);
    }

    private expressionStatement(): Stmt {
        const expr = this.expression();
        this.consume([TokenType.NEWLINE, TokenType.EOF], "Expect newline after expression.");
        return new Expression(expr);
    }

    private assignment(): Expr {
        const expr = this.equality();
        if (this.match(TokenType.ITU)) {
            const equals = this.previous();
            const value = this.assignment();
            if (expr instanceof Variable) {
                const name = expr.name;
                return new Assign(name, value);
            }

            this.error(equals, "Invalid assignment target.");
        }

        return expr;
    }

    private equality(): Expr {
        let expr = this.comparison();
        while (this.match(TokenType.BANG_EQUAL, TokenType.EQUAL_EQUAL)) {
            const operator = this.previous();
            const right = this.comparison();
            expr = new Binary(expr, operator, right);
        }
        return expr;
    }

    private comparison(): Expr {
        let expr = this.term();
        while (this.match(TokenType.GREATER, TokenType.GREATER_EQUAL, TokenType.LESS, TokenType.LESS_EQUAL)) {
            const operator = this.previous();
            const right = this.term();
            expr = new Binary(expr, operator, right);
        }
        return expr;
    }

    private term(): Expr {
        let expr = this.factor();
        while (this.match(TokenType.MINUS, TokenType.PLUS)) {
            const operator = this.previous();
            const right = this.factor();
            expr = new Binary(expr, operator, right);
        }
        return expr;
    }

    private factor(): Expr {
        let expr = this.unary();
        while (this.match(TokenType.STAR, TokenType.SLASH)) {
            const operator = this.previous();
            const right = this.unary();
            expr = new Binary(expr, operator, right);
        }
        return expr;
    }

    private unary(): Expr {
        if (this.match(TokenType.BANG, TokenType.MINUS)) {
            const operator = this.previous();
            const right = this.unary();
            return new Unary(operator, right);
        }
        return this.primary();
    }

    private primary(): Expr {
        if (this.match(TokenType.FALSE)) {
            return new Literal(false);
        }
        if (this.match(TokenType.TRUE)) {
            return new Literal(true);
        }
        if (this.match(TokenType.NIL)) {
            return new Literal(null);
        }
        if (this.match(TokenType.NUMBER, TokenType.STRING)) {
            return new Literal(this.previous().literal)
        }
        if (this.match(TokenType.IDENTIFIER)) {
            return new Variable(this.previous());
        }
        if (this.match(TokenType.LEFT_PAREN)) {
            const expr = this.expression();
            this.consume(TokenType.RIGHT_PAREN, "Expect ')' after expression.");
            return new Grouping(expr);
        }
        throw this.error(this.peek(), "Expect expression.");
    }

    private match(...types: TokenType[]): boolean {
        for (const type of types) {
            if(this.check(type)) {
                this.advance();
                return true;
            }
        }
        return false;
    }

    private consume(types: TokenType | Array<TokenType>, message: string) {
        if (Array.isArray(types)) {
            for (const type of types) {
                if ((this.isAtEnd() && type === TokenType.EOF) || this.check(type)) {
                    return this.advance();
                }
            }
        } else {
            if (this.check(types)) {
                return this.advance();
            }
        }
        throw this.error(this.peek(), message);
    }

    private error(token: Token, message: string) {
        this.errorReporter.error(token, message);
        return new ParseError();
    }

    private synchronize(): void {
        while (!this.isAtEnd()) {
            switch (this.peek().type) {
                case TokenType.NEWLINE:
                case TokenType.FOMO:
                case TokenType.SPILL:
                case TokenType.SO:
                case TokenType.KALO:
                    return;
            }
            this.advance();
        }
    }

    private check(type: TokenType): boolean {
        if (this.isAtEnd()) {
            return false;
        }
        return this.peek().type === type;
    }

    private advance(): Token {
        if (!this.isAtEnd()) {
            this.current++;
        }
        return this.previous();
    }

    private isAtEnd(): boolean {
        return this.peek().type === TokenType.EOF;
    }

    private peek(): Token {
        return this.tokens[this.current]!
    }

    private previous(): Token {
        return this.tokens[this.current - 1]!
    }
}
