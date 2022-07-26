import { DateTime } from 'luxon'
import Birthday, { BirthdayDoc } from '../models/birthday_model'

async function find(id: string): Promise<BirthdayDoc | null> {
  return Birthday.findOne({ discord_id: id })
}

async function add(id: string, date: string, format: string): Promise<void> {
  const now = new Date()
  await new Birthday({
    discord_id: id,
    format,
    birthdate: date,
    created_at: now,
    updated_at: now,
  }).save()
}

async function activate(id: string): Promise<void> {
  await Birthday.updateOne({ discord_id: id }, { active: true, updated_at: new Date() })
}

async function deactivate(id: string): Promise<void> {
  await Birthday.updateOne({ discord_id: id }, { active: false, updated_at: new Date() })
}

async function getToday(): Promise<BirthdayDoc[]> {
  const today = DateTime.now().startOf('day').toFormat('MM/dd')
  return Birthday.find({ birthdate: today, active: true })
}

async function update(id: string, date: string, format: string): Promise<void> {
  await Birthday.updateOne(
    { discordId: id },
    { birthdate: date, format: format, updated_at: new Date(), $inc: { edits_remaining: -1 } },
  )
}

export default {
  find,
  add,
  activate,
  deactivate,
  getToday,
  update,
}
