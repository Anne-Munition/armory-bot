import { Message, PartialMessage } from 'discord.js'

function messageDelete(msg: Message | PartialMessage) {
  // TODO
}

function messageUpdate(
  prev: Message | PartialMessage,
  next: Message | PartialMessage,
) {
  // TODO
}

export default {
  messageDelete,
  messageUpdate,
}
