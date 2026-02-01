/**
 * Build comprehensive word lists from Hunspell dictionaries
 *
 * This script downloads dictionary files from wooorm/dictionaries
 * and extracts all valid 5-letter words for English and German.
 *
 * Usage: bun run scripts/build-word-lists.ts
 */

const WORD_LENGTH = 5;

// Dictionary URLs from wooorm/dictionaries (raw GitHub content)
const DICT_URLS = {
  en: "https://raw.githubusercontent.com/wooorm/dictionaries/main/dictionaries/en/index.dic",
  de: "https://raw.githubusercontent.com/wooorm/dictionaries/main/dictionaries/de/index.dic",
};

async function fetchDictionary(url: string): Promise<string> {
  console.log(`Fetching: ${url}`);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }
  return response.text();
}

function parseDicFile(content: string): string[] {
  const lines = content.split("\n");
  const words: string[] = [];

  for (const line of lines) {
    // Skip empty lines and the first line (word count)
    if (!line.trim() || /^\d+$/.test(line.trim())) continue;

    // Dictionary entries can have affixes after / (e.g., "word/ABC")
    // We only want the base word
    const word = line.split("/")[0]?.trim().toUpperCase();

    if (!word) continue;

    // Filter for exactly 5 letters (handle German umlauts as single chars)
    // German: ä, ö, ü, ß count as single letters
    const normalizedLength = [...word].length;

    if (normalizedLength === WORD_LENGTH && isValidWord(word)) {
      words.push(word);
    }
  }

  return [...new Set(words)].sort();
}

function isValidWord(word: string): boolean {
  // Only allow letters (including German umlauts and ß)
  return /^[A-ZÄÖÜ]+$/i.test(word);
}

function generateTypeScript(
  words: string[],
  locale: string,
  varName: string,
): string {
  const localeUpper = locale.toUpperCase();
  const header =
    locale === "de"
      ? `// German 5-letter words extracted from Hunspell dictionary
// Source: https://github.com/wooorm/dictionaries
// Note: German umlauts (Ä, Ö, Ü) count as single letters`
      : `// English 5-letter words extracted from Hunspell dictionary
// Source: https://github.com/wooorm/dictionaries`;

  const wordArray = words.map((w) => `  "${w}",`).join("\n");

  return `${header}
export const ${varName}_${localeUpper}: string[] = [
${wordArray}
];

// Set for O(1) validation
export const VALID_${varName}_${localeUpper} = new Set(${varName}_${localeUpper});
`;
}

async function main() {
  console.log("Building word lists from Hunspell dictionaries...\n");

  for (const [locale, url] of Object.entries(DICT_URLS)) {
    try {
      const content = await fetchDictionary(url);
      const words = parseDicFile(content);

      console.log(
        `${locale.toUpperCase()}: Found ${words.length} 5-letter words`,
      );

      // Generate TypeScript file
      const tsContent = generateTypeScript(words, locale, "WORDS");
      const outputPath = `lib/wordle/words-${locale}.ts`;

      await Bun.write(outputPath, tsContent);
      console.log(`  Written to: ${outputPath}\n`);
    } catch (error) {
      console.error(`Error processing ${locale}:`, error);
    }
  }

  console.log("Done! Remember to:");
  console.log("1. Review the generated word lists for quality");
  console.log(
    "2. Consider creating separate 'answers' vs 'valid guesses' lists",
  );
  console.log("3. Run 'bun run check' to format the files");
}

main();
