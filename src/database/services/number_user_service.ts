import NumberUser, { NumberUserDoc } from '../models/number_user_model'

async function inc(id: string, name: string): Promise<void> {
  await NumberUser.findOneAndUpdate(
    { discord_id: id },
    { $inc: { count: 1 }, discord_name: name },
    { upsert: true },
  )
}

async function incDeleted(id: string, name: string): Promise<void> {
  await NumberUser.findOneAndUpdate(
    { discord_id: id },
    { $inc: { deleted_count: 1 }, discord_name: name },
    { upsert: true },
  )
}

async function top10(): Promise<NumberUserDoc[]> {
  return NumberUser.find({}).sort({ count: -1 }).limit(10)
}

export default {
  inc,
  incDeleted,
  top10,
}
