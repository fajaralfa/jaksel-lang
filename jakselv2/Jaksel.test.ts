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