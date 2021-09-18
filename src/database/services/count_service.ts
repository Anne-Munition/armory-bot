import Count from '../models/count_model'

async function get(key: string): Promise<number> {
  let doc = await Count.findOne({ key })
  if (!doc) {
    doc = new Count({ key, value: 0 })
    await doc.save()
  }
  return doc.value
}

async function set(key: string, value: number): Promise<void> {
  await Count.findOneAndUpdate({ key }, { value }, { upsert: true })
}

async function time(key: string): Promise<Date | null> {
  const doc = await Count.findOne({ key })
  return doc ? doc.created_at : null
}

export default {
  get,
  set,
  time,
}
