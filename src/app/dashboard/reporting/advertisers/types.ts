export interface Advertiser {
  id: number
  name: string
  total_campaigns: number
  active_campaigns: number
  total_spend: number
  last_campaign_date: string | null
  affiliate_id: number | null
  affiliate_data?: {
    clicks: number
    conversions: number
    conversion_rate: number
  }
  created_at: string
} 