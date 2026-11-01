// Large, rich, Monkeytype-grade quotes and extensive word dictionary

const quotes = [
  "Look again at that dot. That's here. That's home. That's us. On it everyone you love, everyone you know, everyone you ever heard of, every human being who ever was, lived out their lives. The aggregate of our joy and suffering, thousands of confident religions, ideologies, and economic doctrines, every hunter and forager, every hero and coward, every creator and destroyer of civilization lived there on a mote of dust suspended in a sunbeam.",

  "In vain I have struggled. It will not do. My feelings will not be repressed. You must allow me to tell you how ardently I admire and love you. In spite of all my endeavors to overcome what I considered your inferiority, the very great affection that I bear for you has conquered all my objections and conquered all my former reservations.",

  "It's like in the great stories, Mr. Frodo. The ones that really mattered. Full of darkness and danger they were. And sometimes you didn't want to know the end, because how could the end be happy? How could the world go back to the way it was when so much bad had happened? But in the end, it's only a passing thing, this shadow. Even darkness must pass. A new day will come, and when the sun shines it will shine out the clearer.",

  "He looked at her the way all women want to be looked at by a man. Gatsby believed in the green light, the orgastic future that year by year recedes before us. It eluded us then, but that's no matter tomorrow we will run faster, stretch out our arms farther, and one fine morning so we beat on, boats against the current, borne back ceaselessly into the past.",

  "You are an aperture through which the universe is looking at and exploring itself. Through our eyes, the universe is perceiving itself. Through our ears, the universe is listening to its harmonies. We are the witnesses through which the universe becomes conscious of its glory, of its vastness, and of its infinite creative possibilities.",

  "If there's any kind of magic in this world, it must be in the attempt of understanding someone, sharing something. I know it's almost impossible to succeed, but who cares, really? The answer must be in the attempt. When you look at someone and you see their imperfections, yet every little nuance makes them more endearing to you, that is when you know that you are truly in love.",

  "Your time is limited, so don't waste it living someone else's life. Don't be trapped by dogma, which is living with the results of other people's thinking. Don't let the noise of others' opinions drown out your own inner voice. And most important, have the courage to follow your heart and intuition. They somehow already know what you truly want to become.",

  "When you arise in the morning think of what a privilege it is to be alive, to think, to enjoy, to love. Very little is needed to make a happy life; it is all within yourself, in your way of thinking. Dwell on the beauty of life. Watch the stars, and see yourself running with them. Never let the future disturb you; you will meet it with the same weapons of reason.",

  "Love is the one thing we're capable of perceiving that transcends dimensions of time and space. Maybe we should trust that, even if we can't understand it yet. It has meaning, yes, social utility, social bonding, child rearing, but we love people who have died. Where's the social utility in that? Love is not something we invented; it's observable, powerful.",

  "It is not the critic who counts; not the man who points out how the strong man stumbles, or where the doer of deeds could have done them better. The credit belongs to the man who is actually in the arena, whose face is marred by dust and sweat and blood; who strives valiantly; who errs, who comes short again and again, but who does actually strive to do the deeds.",

  "In the depth of winter, I finally learned that within me there lay an invincible summer. And that makes me happy. For it says that no matter how hard the world pushes against me, within me, there's something stronger, something better, pushing right back, full of radiant warmth, unshakable resolve, and endless affection for the journey.",

  "We don't read and write poetry because it's cute. We read and write poetry because we are members of the human race. And the human race is filled with passion. And medicine, law, business, engineering, these are noble pursuits and necessary to sustain life. But poetry, beauty, romance, love, these are what we stay alive for.",

  "It is only with the heart that one can see rightly; what is essential is invisible to the eye. It is the time you have wasted for your rose that makes your rose so important. People have forgotten this truth, but you must not forget it. You become responsible forever for what you have tamed. You are responsible for your rose.",

  "Whatever our souls are made of, his and mine are the same. If all else perished, and he remained, I should still continue to be; and if all else remained, and he were annihilated, the universe would turn to a mighty stranger. I should not seem a part of it. My love for you is like the rocks beneath: a source of little visible delight, but necessary.",

  "I must not fear. Fear is the mind-killer. Fear is the little-death that brings total obliteration. I will face my fear. I will permit it to pass over me and through me. And when it has gone past, I will turn the inner eye to see its path. Where the fear has gone there will be nothing. Only I will remain, composed and ready for what lies ahead.",

  "To love at all is to be vulnerable. Love anything and your heart will be wrung and possibly broken. If you want to make sure of keeping it intact you must give it to no one, not even an animal. Wrap it carefully round with hobbies and little luxuries; avoid all entanglements. Lock it up safe in the casket or coffin of your selfishness.",

  "Be patient toward all that is unsolved in your heart and try to love the questions themselves, like locked rooms and like books that are now written in a very foreign tongue. Do not now seek the answers, which cannot be given you because you would not be able to live them. And the point is, to live everything. Live the questions now.",

  "He wondered if she could see the way his heart skipped every time she looked up at him. She was luminous, like a fallen star that had decided to walk the earth, leaving little trails of warmth and laughter in every room she entered. He wanted nothing more than to sit beside her and listen to her speak until the night ran out of hours.",

  "For what it's worth: it's never too late or, in my case, too early to be whoever you want to be. There's no time limit, stop whenever you want. You can change or stay the same, there are no rules to this thing. We can make the best or the worst of it. I hope you make the best of it. And I hope you see things that startle you. I hope you feel things you never felt before.",

  "I've learned that people will forget what you said, people will forget what you did, but people will never forget how you made them feel. Love recognizes no barriers. It jumps hurdles, leaps fences, penetrates walls to arrive at its destination full of hope. Have enough courage to trust love one more time and always one more time.",

  "A purpose of human life, no matter who is controlling it, is to love whoever is around to be loved. Be soft. Do not let the world make you hard. Do not let pain make you hate. Do not let the bitterness steal your sweetness. Take pride that even though the rest of the world may disagree, you still believe it to be a beautiful place."
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
  "heart", "smile", "love", "light", "dream", "star", "fast", "game", "speed", "sweet",
  "never", "always", "together", "world", "eyes", "night", "sun", "sound", "water", "earth",
  "voice", "mind", "life", "hand", "part", "child", "place", "case", "week", "company",
  "system", "program", "question", "work", "government", "number", "night", "point", "home",
  "water", "room", "mother", "area", "money", "story", "fact", "month", "lot", "right",
  "study", "book", "eye", "job", "word", "business", "issue", "side", "kind", "head",
  "house", "service", "friend", "father", "power", "hour", "game", "line", "end", "member"
];

function getRandomQuote() {
  return quotes[Math.floor(Math.random() * quotes.length)];
}

function getRandomWords(count = 80) {
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
  // Generates generous paragraphs so nobody runs out of text mid-race
  const wordCount = duration <= 15 ? 50 : duration <= 30 ? 90 : 160;
  return getRandomWords(wordCount);
}

module.exports = { quotes, getRandomQuote, getRandomWords, getPassage };
