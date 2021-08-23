interface HelixUser {
  id: string
  login: string
  display_name: string
  type: string
  broadcaster_type: string
  description: string
  profile_image_url: string
  offline_image_url: string
  view_count: number
  created_at: string
}

interface HelixSubscription {
  broadcaster_id: string
  broadcaster_login: string
  broadcaster_name: string
  gifter_id: string
  gifter_login: string
  gifter_name: string
  is_gift: boolean
  plan_name: string
  tier: string
  user_id: string
  user_name: string
  user_login: string
}

interface HelixFollow {
  from_id: string
  from_login: string
  from_name: string
  to_id: string
  to_login: string
  to_name: string
  followed_at: string
}

interface HelixStream {
  id: string
  user_id: string
  user_login: string
  user_name: string
  game_id: string
  game_name: string
  type: 'live' | ''
  title: string
  viewer_count: number
  started_at: string
  language: string
  thumbnail_url: string
  tag_ids: string[]
  is_mature: boolean
}
