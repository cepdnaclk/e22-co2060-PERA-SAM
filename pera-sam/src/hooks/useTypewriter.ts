import { useState, useEffect } from 'react';

export function useTypewriter(lines: string[], speed = 60, pauseBetween = 500, enabled = true) {
  const [displayedLines, setDisplayedLines] = useState<string[]>([]);
  const [currentLine, setCurrentLine] = useState(0);
  const [currentChar, setCurrentChar] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!enabled || done) return;
    if (currentLine >= lines.length) {
      setDone(true);
      return;
    }
    if (currentChar <= lines[currentLine].length) {
      const timeout = setTimeout(() => {
        setDisplayedLines(prev => {
          const next = [...prev];
          next[currentLine] = lines[currentLine].slice(0, currentChar);
          return next;
        });
        setCurrentChar(c => c + 1);
      }, currentChar === 0 && currentLine > 0 ? pauseBetween : speed);
      return () => clearTimeout(timeout);
    } else {
      setCurrentLine(l => l + 1);
      setCurrentChar(0);
    }
  }, [enabled, currentLine, currentChar, done, lines, speed, pauseBetween]);

  return { displayedLines, activeLine: currentLine, done };
}
