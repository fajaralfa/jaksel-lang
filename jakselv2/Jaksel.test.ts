import { expect, test } from 'bun:test'
import { Token, TokenType } from './Token'
import { ConsoleErrorReporter, Scanner } from './Jaksel'

test('scan symbols', () => {
  const source = '(),.-+*/!!===>=<==\n><\t# komentar\r\n "Fajar \n Alfa"'
  const expected = [
    TokenType.LEFT_PAREN,
    TokenType.RIGHT_PAREN,
    TokenType.COMMA,
    TokenType.DOT,
    TokenType.MINUS,
    TokenType.PLUS,
    TokenType.STAR,
    TokenType.SLASH,
    TokenType.BANG,
    TokenType.BANG_EQUAL,
    TokenType.EQUAL_EQUAL,
    TokenType.GREATER_EQUAL,
    TokenType.LESS_EQUAL,
    TokenType.EQUAL,
    TokenType.NEWLINE,
    TokenType.GREATER,
    TokenType.LESS,
    TokenType.NEWLINE,
    TokenType.STRING,
    TokenType.EOF,
  ]
  const errorRepoter = new ConsoleErrorReporter();
  const scanner = new Scanner(errorRepoter, source);
  const result = scanner.scanTokens();
  expect(result.map(v => v.type)).toEqual(expected);
})

test('scan string', () => {
  const source = '><!"Fajar Alfa"';
  const expected = new Token(TokenType.STRING, `"Fajar Alfa\"`, 'Fajar Alfa', 1, 4);
  const errorRepoter = new ConsoleErrorReporter();
  const scanner = new Scanner(errorRepoter, source);
  const result = scanner.scanTokens()[3];
  expect(result).toEqual(expected);
})

test('scan number', () => {
  const sources = ['> 123 =', '123.45 +']
  const expected = [
    [
      new Token(TokenType.GREATER, '>', null, 1, 1),
      new Token(TokenType.NUMBER, '123', 123, 1, 3),
      new Token(TokenType.EQUAL, '=', null, 1, 7),
      new Token(TokenType.EOF, '', null, 1, 8),
    ],
    [
      new Token(TokenType.NUMBER, '123.45', 123.45, 1, 1),
      new Token(TokenType.PLUS, '+', null, 1, 8),
      new Token(TokenType.EOF, '', null, 1, 9),
    ],
  ]
  const errorRepoter = new ConsoleErrorReporter();
  for (const i in sources) {
    const source = sources[i]!
    const exp = expected[i]!
    const scanner = new Scanner(errorRepoter, source);
    const result = scanner.scanTokens();
    expect(result).toEqual(exp);
  }
})