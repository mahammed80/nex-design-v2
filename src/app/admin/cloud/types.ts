/** Wire types for the live admin API at `<ACCOUNT_API>/admin/*` (nex-design Website `public/api`). */

export type PlanSlug = 'starter' | 'professional' | 'teams'
export type CloudAccountStatus =
  | 'active'
  | 'approved'
  | 'pending'
  | 'invited_to_beta'
  | 'suspended'
  | 'restricted'
export type UserType = 'student' | 'graduate' | 'professional'
export type PreferredOs = 'windows' | 'mac_arm' | 'mac_intel' | 'linux'
export type ExpiryType =
  | '30_days'
  | '3_months'
  | '4_months'
  | '6_months'
  | '1_year'
  | 'lifetime'
  | 'custom'

export interface AdminIdentity {
  id: number
  name: string
  email: string
  role: string
}

export interface CloudUser {
  id: number
  name: string
  email: string
  role: string
  user_type: UserType | null
  institution: string | null
  faculty_major: string | null
  graduation_year: number | null
  preferred_os: PreferredOs | null
  status: CloudAccountStatus
  waitlist_number: number | null
  created_at: string
  last_login_at: string | null
  plan_slug: PlanSlug
  plan_name: string
  plan_expires_at: string | null
  restriction_reason: string | null
  license_key: string | null
}

/** MySQL `COUNT(*)` rows arrive as strings from PDO. */
export interface CloudStats {
  total_users: number
  students_count: number
  graduates_count: number
  professionals_count: number
  os_breakdown: Array<{ preferred_os: PreferredOs | null; count: number | string }>
  top_institutions: Array<{ institution: string; count: number | string }>
  top_majors: Array<{ faculty_major: string; count: number | string }>
  status_breakdown: Array<{ status: CloudAccountStatus; count: number | string }>
}

export interface CloudPagination {
  current_page: number
  limit: number
  total_records: number
  total_pages: number
}

export interface CloudUserFilters {
  search: string
  user_type: UserType | ''
  preferred_os: PreferredOs | ''
  status: CloudAccountStatus | ''
}

export interface CloudUserUpdate {
  plan_slug?: PlanSlug
  status?: CloudAccountStatus
  restriction_reason?: string | null
  regenerate_key?: boolean
  expiry_type?: ExpiryType
  custom_expiry_date?: string
}

export interface CloudUserUpdateResult {
  user_id: number
  plan_slug: PlanSlug
  plan_name: string
  status: CloudAccountStatus
  restriction_reason: string | null
  license_key: string | null
  plan_expires_at: string | null
}

export interface CloudBulkUpdate {
  plan_slug?: PlanSlug
  status?: CloudAccountStatus
  expiry_type?: ExpiryType
  regenerate_keys?: boolean
}

export interface CloudBulkUpdateResult {
  updated_count: number
  user_ids: number[]
}
