const LATIN_TO_ARMENIAN_MULTI_CHAR: Array<[string, string]> = [
  ['tch', 'ճ'],
  ['sh', 'շ'],
  ['ch', 'չ'],
  ['dz', 'ձ'],
  ['ts', 'ց'],
  ['zh', 'ժ'],
  ['gh', 'ղ'],
  ['kh', 'խ'],
  ['vo', 'ո'],
  ['ev', 'և'],
  ['oo', 'ու'],
  ['yu', 'յու'],
  ['ya', 'յա'],
  ['yo', 'յո'],
];

const LATIN_TO_ARMENIAN_SINGLE_CHAR: Record<string, string> = {
  a: 'ա',
  b: 'բ',
  c: 'կ',
  d: 'դ',
  e: 'ե',
  f: 'ֆ',
  g: 'գ',
  h: 'հ',
  i: 'ի',
  j: 'ջ',
  k: 'կ',
  l: 'լ',
  m: 'մ',
  n: 'ն',
  o: 'ո',
  p: 'պ',
  q: 'ք',
  r: 'ր',
  s: 'ս',
  t: 'տ',
  u: 'ու',
  v: 'վ',
  w: 'վ',
  x: 'քս',
  y: 'յ',
  z: 'զ',
};

function looksLatin(text: string): boolean {
  return /[a-z]/i.test(text);
}

export function transliterateLatinToArmenian(input: string): string {
  const source = input.trim().toLowerCase();
  if (!source || !looksLatin(source)) {
    return source;
  }

  let index = 0;
  let output = '';

  while (index < source.length) {
    const remaining = source.slice(index);
    const matchedPair = LATIN_TO_ARMENIAN_MULTI_CHAR.find(([latin]) =>
      remaining.startsWith(latin),
    );

    if (matchedPair) {
      output += matchedPair[1];
      index += matchedPair[0].length;
      continue;
    }

    const char = source[index];
    output += LATIN_TO_ARMENIAN_SINGLE_CHAR[char] ?? char;
    index += 1;
  }

  return output;
}

export function buildArmenianSearchVariants(input: string): string[] {
  const base = input.trim().toLowerCase();
  if (!base) {
    return [];
  }

  const transliterated = transliterateLatinToArmenian(base);
  return Array.from(new Set([base, transliterated].filter(Boolean)));
}
