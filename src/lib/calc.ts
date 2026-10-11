/**
 * A small recursive-descent evaluator for the calculator widget.
 * `eval` is never used: the parser only ever produces numbers, so a pasted
 * expression cannot run code.
 */
type Token = { kind: 'num'; value: number } | { kind: 'op' | 'fn' | 'paren'; value: string };

const FUNCTIONS: Record<string, (n: number) => number> = {
  sqrt: Math.sqrt,
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  ln: Math.log,
  log: Math.log10,
  abs: Math.abs,
  round: Math.round,
  floor: Math.floor,
  ceil: Math.ceil,
};

const CONSTANTS: Record<string, number> = { pi: Math.PI, e: Math.E };

function tokenize(src: string): Token[] {
  const out: Token[] = [];
  let i = 0;
  // Accept the symbols calculators print, and both decimal separators.
  const text = src
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/−/g, '-')
    .replace(/\s+/g, '');

  while (i < text.length) {
    const ch = text[i];
    if (/[0-9.,]/.test(ch)) {
      let j = i;
      while (j < text.length && /[0-9.,]/.test(text[j])) j++;
      const raw = text.slice(i, j).replace(/,/g, '.');
      const value = Number(raw);
      if (Number.isNaN(value)) throw new Error('Bad number');
      out.push({ kind: 'num', value });
      i = j;
      continue;
    }
    if (/[a-z]/i.test(ch)) {
      let j = i;
      while (j < text.length && /[a-z]/i.test(text[j])) j++;
      const name = text.slice(i, j).toLowerCase();
      if (name in CONSTANTS) out.push({ kind: 'num', value: CONSTANTS[name] });
      else if (name in FUNCTIONS) out.push({ kind: 'fn', value: name });
      else throw new Error(`Unknown name ${name}`);
      i = j;
      continue;
    }
    if ('+-*/^%'.includes(ch)) {
      out.push({ kind: 'op', value: ch });
      i++;
      continue;
    }
    if (ch === '(' || ch === ')') {
      out.push({ kind: 'paren', value: ch });
      i++;
      continue;
    }
    throw new Error(`Unexpected ${ch}`);
  }
  return out;
}

export function evaluate(expression: string): number {
  const tokens = tokenize(expression);
  let pos = 0;

  const peek = () => tokens[pos];
  const eat = () => tokens[pos++];

  // expression → term (('+'|'-') term)*
  const parseExpression = (): number => {
    let left = parseTerm();
    while (peek()?.kind === 'op' && '+-'.includes(peek().value as string)) {
      const op = eat().value;
      const right = parseTerm();
      left = op === '+' ? left + right : left - right;
    }
    return left;
  };

  // term → power (('*'|'/'|'%') power)*
  const parseTerm = (): number => {
    let left = parsePower();
    while (peek()?.kind === 'op' && '*/%'.includes(peek().value as string)) {
      const op = eat().value;
      const right = parsePower();
      if (op === '*') left *= right;
      else if (op === '/') left /= right;
      else left %= right;
    }
    return left;
  };

  // power → unary ('^' power)?   — right associative
  const parsePower = (): number => {
    const base = parseUnary();
    if (peek()?.kind === 'op' && peek().value === '^') {
      eat();
      return base ** parsePower();
    }
    return base;
  };

  const parseUnary = (): number => {
    const token = peek();
    if (token?.kind === 'op' && (token.value === '-' || token.value === '+')) {
      eat();
      const value = parseUnary();
      return token.value === '-' ? -value : value;
    }
    return parsePrimary();
  };

  const parsePrimary = (): number => {
    const token = eat();
    if (!token) throw new Error('Unexpected end');
    if (token.kind === 'num') return token.value;
    if (token.kind === 'fn') {
      const next = eat();
      if (next?.kind !== 'paren' || next.value !== '(') throw new Error('Expected (');
      const arg = parseExpression();
      const close = eat();
      if (close?.kind !== 'paren' || close.value !== ')') throw new Error('Expected )');
      return FUNCTIONS[token.value as string](arg);
    }
    if (token.kind === 'paren' && token.value === '(') {
      const value = parseExpression();
      const close = eat();
      if (close?.kind !== 'paren' || close.value !== ')') throw new Error('Expected )');
      return value;
    }
    throw new Error('Unexpected token');
  };

  const result = parseExpression();
  if (pos < tokens.length) throw new Error('Trailing input');
  if (!Number.isFinite(result)) throw new Error('Not finite');
  return result;
}

/** Formats a result without scientific notation for everyday numbers. */
export function formatResult(n: number, locale: string): string {
  if (Number.isInteger(n) && Math.abs(n) < 1e15) return n.toLocaleString(locale);
  if (Math.abs(n) >= 1e15 || (Math.abs(n) < 1e-6 && n !== 0)) return n.toExponential(6);
  return Number(n.toFixed(10)).toLocaleString(locale, { maximumFractionDigits: 10 });
}
