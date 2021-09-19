import { Message, PartialMessage } from 'discord.js'

function messageDelete(msg: Message | PartialMessage) {
  if (msg) {
    // TODO
  }
}

function messageUpdate(
  prev: Message | PartialMessage,
  next: Message | PartialMessage,
) {
  if (prev && next) {
    // TODO
  }
}

export default {
  messageDelete,
  messageUpdate,
}
