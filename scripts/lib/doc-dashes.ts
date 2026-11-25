/** Markdown and agent rule files whose prose follows the copy law's no-em-dash rule. */
export function isDashCheckedFile(file: string): boolean {
  if (/(^|\/)CHANGELOG\.md$/.test(file)) return false; // written by release-please
  return /\.mdx?$/.test(file) || file === ".cursorrules";
}

export function countEmDashes(text: string): number {
  return text.split("—").length - 1;
}
