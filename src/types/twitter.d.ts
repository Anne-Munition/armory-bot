interface GetRulesResponse {
  data: { id: string; value: string }[]
  meta: { sent: string; result_count: number }
}

interface Tweet {
  id: string
  text: string
  in_reply_to_user_id?: string
}
