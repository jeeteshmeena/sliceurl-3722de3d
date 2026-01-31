// SliceAPPs Types

export interface AppListing {
  id: string;
  file_id: string;
  owner_id: string;
  app_name: string;
  short_description: string | null;
  full_description: string | null;
  icon_url: string | null;
  promo_banner_url: string | null;
  screenshots: string[];
  category: string;
  version_name: string;
  version_code: string;
  developer_name: string | null;
  whats_new: string | null;
  release_date: string;
  total_downloads: number;
  rating_avg: number;
  rating_count: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface AppReview {
  id: string;
  app_id: string;
  user_id: string | null;
  rating: number;
  review_text: string | null;
  created_at: string;
}

export interface SliceboxFile {
  id: string;
  file_id: string;
  short_code: string;
  original_name: string;
  file_size: number;
  mime_type: string;
  storage_path: string;
  service_type: string;
}

export const APP_CATEGORIES = [
  "Games",
  "Social",
  "Entertainment",
  "Productivity",
  "Tools",
  "Education",
  "Health & Fitness",
  "Music & Audio",
  "Photo & Video",
  "Business",
  "Finance",
  "News & Magazines",
  "Shopping",
  "Travel & Local",
  "Communication",
  "Other"
] as const;
