"use client";

const QUOTES: { text: string; author: string }[] = [
  {
    text: "Der beste Weg, die Zukunft vorherzusagen, ist, sie zu gestalten.",
    author: "Peter Drucker",
  },
  {
    text: "Erfolg ist die Summe kleiner Anstrengungen, Tag für Tag wiederholt.",
    author: "Robert Collier",
  },
  {
    text: "Der einzige Weg, großartige Arbeit zu leisten, ist zu lieben, was man tut.",
    author: "Steve Jobs",
  },
  {
    text: "Vision without execution is hallucination.",
    author: "Thomas Edison",
  },
  {
    text: "Die größte Gefahr in turbulenten Zeiten ist nicht die Turbulenz – es ist, mit der Logik von gestern zu handeln.",
    author: "Peter Drucker",
  },
  {
    text: "Leadership is not about being in charge. It's about taking care of those in your charge.",
    author: "Simon Sinek",
  },
  {
    text: "Done is better than perfect.",
    author: "Sheryl Sandberg",
  },
  {
    text: "Risk comes from not knowing what you're doing.",
    author: "Warren Buffett",
  },
  {
    text: "In the middle of every difficulty lies opportunity.",
    author: "Albert Einstein",
  },
  {
    text: "Wer aufhört, besser zu werden, hat aufgehört, gut zu sein.",
    author: "Philip Rosenthal",
  },
  {
    text: "The way to get started is to quit talking and begin doing.",
    author: "Walt Disney",
  },
  {
    text: "Great things in business are never done by one person; they're done by a team of people.",
    author: "Steve Jobs",
  },
  {
    text: "It's not about ideas. It's about making ideas happen.",
    author: "Scott Belsky",
  },
  {
    text: "The function of leadership is to produce more leaders, not more followers.",
    author: "Ralph Nader",
  },
  {
    text: "Strategie ohne Taktik ist der langsamste Weg zum Sieg.",
    author: "Sun Tzu",
  },
  {
    text: "Success usually comes to those who are too busy to be looking for it.",
    author: "Henry David Thoreau",
  },
  {
    text: "The best time to plant a tree was 20 years ago. The second best time is now.",
    author: "Chinese Proverb",
  },
  {
    text: "Your time is limited, don't waste it living someone else's life.",
    author: "Steve Jobs",
  },
  {
    text: "Es ist nicht genug, beschäftigt zu sein. Die Frage ist: Womit sind wir beschäftigt?",
    author: "Henry David Thoreau",
  },
  {
    text: "Chancen sehen andere als Probleme.",
    author: "Henry Ford",
  },
  {
    text: "The secret of getting ahead is getting started.",
    author: "Mark Twain",
  },
  {
    text: "It does not matter how slowly you go as long as you do not stop.",
    author: "Confucius",
  },
  {
    text: "Innovation distinguishes between a leader and a follower.",
    author: "Steve Jobs",
  },
  {
    text: "The measure of intelligence is the ability to change.",
    author: "Albert Einstein",
  },
  {
    text: "An investment in knowledge pays the best interest.",
    author: "Benjamin Franklin",
  },
];

function getDayOfYear(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  return Math.floor((now.getTime() - start.getTime()) / 86_400_000);
}

export function WidgetQuote() {
  const quote = QUOTES[getDayOfYear() % QUOTES.length];

  return (
    <div className="flex flex-col justify-center gap-3 h-full">
      <p className="text-base font-medium text-foreground leading-relaxed">
        &ldquo;{quote.text}&rdquo;
      </p>
      <p className="text-sm text-muted-foreground">— {quote.author}</p>
    </div>
  );
}
