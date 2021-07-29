const counts = {
  msgCommandsRan: 0,
  messagesSeen: 0,
  twitchLivePosts: 0,
  twitchStreams: 0,
  twitchChannels: 0,
  slashCommandsRan: 0,
}

type CountName =
  | 'msgCommandsRan'
  | 'messagesSeen'
  | 'twitchLivePosts'
  | 'twitchStreams'
  | 'twitchChannels'
  | 'slashCommandsRan'

function increment(name: CountName): void {
  counts[name]++
}

function get(name: CountName): number {
  return counts[name]
}

function set(name: CountName, amount: number): void {
  counts[name] = amount
}

export default {
  increment,
  get,
  set,
}
