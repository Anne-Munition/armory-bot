const counts = {
  commandsRan: 0,
  messagesSeen: 0,
  twitchLivePosts: 0,
  twitchStreams: 0,
  twitchChannels: 0,
};

type CountName =
  | 'commandsRan'
  | 'messagesSeen'
  | 'twitchLivePosts'
  | 'twitchStreams'
  | 'twitchChannels';

function increment(name: CountName): void {
  counts[name]++;
}

function get(name: CountName): number {
  return counts[name];
}

function set(name: CountName, amount: number): void {
  counts[name] = amount;
}

export default {
  increment,
  get,
  set,
};
