export function calculateFleschPt(wordsPerSentence: number, syllablesPerWord: number): number {
  return 248.835 - 1.015 * wordsPerSentence - 84.6 * syllablesPerWord;
}
