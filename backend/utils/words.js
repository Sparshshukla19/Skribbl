export const WORD_LIST = [
  'APPLE', 'BANANA', 'CHICKEN', 'DRAGON', 'ELEPHANT', 'FIREMAN', 'GUITAR', 'HAMBURGER',
  'ICEBERG', 'JACKET', 'KANGAROO', 'LAPTOP', 'MONKEY', 'NOTEBOOK', 'OSTRICH', 'PENGUIN',
  'QUEEN', 'ROCKET', 'SUBMARINE', 'TELEPHONE', 'UMBRELLA', 'VOLCANO', 'WIZARD', 'XALOPHONE',
  'YACHT', 'ZEBRA', 'AIRPLANE', 'BICYCLE', 'CASTLE', 'DOLPHIN', 'EYEGLASSES', 'FOREST',
  'GHOST', 'HELICOPTER', 'ISLAND', 'JUNGLE', 'KITE', 'LIGHTHOUSE', 'MOUNTAIN', 'NINJA'
];

export function getRandomWords(count = 3) {
  const shuffled = [...WORD_LIST].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}