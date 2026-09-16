export function normalize(s: string) {
  return s
    .toLowerCase()
    .replace(/[ё]/g, "е")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map(stem)
    .join(" ");
}


function stem(word: string) {
  return word.replace(
    /(ами|ями|ов|ев|ий|ый|ой|ая|яя|ое|ее|ые|ие|у|ю|а|я|ы|и|е|о|ь)$/u,
    "",
  );
}