// Rich collection of quotes and common words for the typing game

const quotes = [
  "You do not find the happy life. You make it with every step you take.",
  "In all the world, there is no heart for me like yours. In all the world, there is no love for you like mine.",
  "The secret of getting ahead is getting started. The secret of getting started is breaking complex tasks into small manageable tasks.",
  "Whatever our souls are made of, his and mine are the same.",
  "Success is not final, failure is not fatal: it is the courage to continue that counts in every race.",
  "You are my favorite notification, my easiest hello, and my hardest goodbye.",
  "Life is really simple, but we insist on making it complicated. Keep your eyes on the road and hands on the keyboard.",
  "I would rather spend one lifetime with you, than face all the ages of this world alone.",
  "Happiness can be found even in the darkest of times, if one only remembers to turn on the light.",
  "To love and be loved is to feel the sun from both sides simultaneously.",
  "It is not our abilities that show what we truly are. It is our choices that define who we become.",
  "You make my heart smile in ways nobody else can, even in the middle of a frantic typing battle.",
  "Do not go where the path may lead, go instead where there is no path and leave a trail behind you.",
  "I saw that you were perfect, and so I loved you. Then I saw that you were not perfect and I loved you even more.",
  "The quick brown fox jumps over the lazy dog while dreaming of endless adventures under the starlit sky.",
  "Simplicity is the soul of efficiency, and speed is the art of turning thoughts into lightning fast words.",
  "Every moment spent with you is like a beautiful dream that I never want to wake up from.",
  "The future belongs to those who believe in the beauty of their dreams and the speed of their keystrokes."
];

const commonWords = [
  "the", "be", "to", "of", "and", "a", "in", "that", "have", "I",
  "it", "for", "not", "on", "with", "he", "as", "you", "do", "at",
  "this", "but", "his", "by", "from", "they", "we", "say", "her", "she",
  "or", "an", "will", "my", "one", "all", "would", "there", "their", "what",
  "so", "up", "out", "if", "about", "who", "get", "which", "go", "me",
  "when", "make", "can", "like", "time", "no", "just", "him", "know", "take",
  "people", "into", "year", "your", "good", "some", "could", "them", "see", "other",
  "than", "then", "now", "look", "only", "come", "its", "over", "think", "also",
  "back", "after", "use", "two", "how", "our", "work", "first", "well", "way",
  "even", "new", "want", "because", "any", "these", "give", "day", "most", "us",
  "heart", "smile", "love", "light", "dream", "star", "fast", "game", "speed", "sweet"
];

function getRandomQuote() {
  return quotes[Math.floor(Math.random() * quotes.length)];
}

function getRandomWords(count = 50) {
  const result = [];
  for (let i = 0; i < count; i++) {
    const word = commonWords[Math.floor(Math.random() * commonWords.length)];
    result.push(word);
  }
  return result.join(" ");
}

function getPassage(mode = 'quote', duration = 30) {
  if (mode === 'quote') {
    return getRandomQuote();
  }
  // For timed modes, generate enough words based on duration (e.g. 100 words for 30s/60s)
  const wordCount = duration <= 15 ? 40 : duration <= 30 ? 70 : 120;
  return getRandomWords(wordCount);
}

module.exports = { getRandomQuote, getRandomWords, getPassage };
