export type Literal = string | object | number | null

export class Token {
    type: TokenType;
    lexeme: string;
    literal: Literal;
    line: number;
    column: number;
    constructor(type: TokenType, lexeme: string, literal: Literal, line: number, column: number) {
        this.type = type;
        this.lexeme = lexeme;
        this.literal = literal;
        this.line = line;
        this.column = column;
    }

    toString() {
        return `${TokenType[this.type]} ${this.lexeme.replace(/\n/g, '\\n')} ${this.literal}`;
    }
}

export enum TokenType {
    // Single-character tokens.
    LEFT_PAREN,
    RIGHT_PAREN,
    COMMA,
    DOT,
    MINUS,
    PLUS,
    SLASH,
    STAR,
    PERCENT,
    NEWLINE,

    // One or two character tokens.
    BANG,
    BANG_EQUAL,
    EQUAL,
    EQUAL_EQUAL,
    GREATER,
    GREATER_EQUAL,
    LESS,
    LESS_EQUAL,

    // Literals.
    IDENTIFIER,
    STRING,
    NUMBER,
    EOF,

    TRUE,
    FALSE,
    NIL,

    FOMO,
    ENDUP,

    THATS,
    IT,
    SIH,

    SPILL,

    LITERALLY,
    SERIOUSLY,
    WHICHIS,
    ITU,

    SO,
    ABOUT,
    OVERTHINKING,
    CALL,
}