// Column metadata for every client-visible table. Used to:
//   * whitelist identifiers before they go into SQL (no injection via column names)
//   * convert SQLite 0/1 -> true/false and JSON text -> objects on the way out
// Suffix ":b" = boolean, ":j" = JSON (object/array). Unsuffixed = text/number as-is.
// Keep in sync with migrations/*.sql.

type ColType = "b" | "j" | "v";
export type TableMeta = { columns: Record<string, ColType>; hasUpdatedAt: boolean };

const raw: Record<string, string> = {
  profiles:
    "id,user_id,display_name,avatar_url,language,theme,security_mode,auto_copy_enabled:b,auto_dashboard_refresh:b,auto_redirect_enabled:b,email_alerts_enabled:b,link_preview_enabled:b,google_email,google_linked:b,has_password:b,scheduled_deletion_at,created_at,updated_at",
  user_roles: "id,user_id,role,created_at",
  folders: "id,user_id,name,color,created_at,updated_at",
  api_keys:
    "id,user_id,name,key_hash,key_prefix,status,rate_limit_daily,requests_today,rate_limit_reset_at,last_request_at,revoked_at,created_at,updated_at",
  links:
    "id,user_id,original_url,short_code,custom_slug,title,folder_id,api_key_id,api_source:b,batch_id,click_count,max_clicks,expires_at,last_clicked_at,password_hash,is_password_protected:b,is_private:b,is_favorite:b,is_pinned:b,is_creepy:b,creepy_style,creepy_extension,is_broken:b,health_status,last_health_check,notify_on_broken:b,safety_status,last_scanned_at,link_preview_enabled:b,facebook_pixel,google_pixel,custom_og_title,custom_og_description,custom_og_image,custom_favicon,order_index,slice_duration_ms,utm_enabled:b,utm_source,utm_medium,utm_campaign,utm_term,utm_content,final_utm_url,created_at,updated_at",
  clicks:
    "id,link_id,clicked_at,redirected_at,ip_address,user_agent,referrer,country,city,device_type,browser,os,is_unique:b",
  utm_data:
    "id,link_id,user_id,final_url,utm_source,utm_medium,utm_campaign,utm_term,utm_content,created_at,updated_at",
  qr_designs:
    "id,link_id,user_id,fg_color,bg_color,shape,corner_radius,padding,logo_url,logo_size,frame_type,frame_text,gradient_enabled:b,gradient_type,gradient_start,gradient_end,created_at,updated_at",
  shared_analytics:
    "id,link_id,user_id,share_token,password_hash,expires_at,is_active:b,views_count,created_at,updated_at",
  user_personas:
    "id,user_id,persona,total_links,total_clicks,folder_count,links_this_week,utm_usage_count,last_calculated_at,created_at,updated_at",
  announcements: "id,message,is_active:b,created_at,updated_at",
  global_counters: "id,total_clicks,total_links_created,total_signups,updated_at",
  ip_geo_cache: "ip_address,country,city,region,provider,cached_at,expires_at",
  geo_backfill_allowlist:
    "id,ip_address,city,country,region,notes,source,approved_by,approved_at,applied_at,rows_updated",
  geo_backfill_audit: "id,ip_address,city,country,region,rows_updated,performed_by,performed_at",
  slicebox_files:
    "id,file_id,short_code,user_id,storage_path,original_name,mime_type,file_size,service_type,password_hash,delete_token,is_encrypted:b,encryption_iv,download_count,expires_at,is_deleted:b,created_at",
  app_listings:
    "id,owner_id,file_id,app_name,short_code,short_description,full_description,whats_new,category,age_rating,developer_name,developer_url,icon_url,promo_banner_url,screenshots:j,version_name,version_code,release_date,is_published:b,rating_avg,rating_count,total_downloads,created_at,updated_at",
  app_reviews:
    "id,app_id,user_id,display_name,rating,review_text,ip_address,browser_fingerprint,deleted_at,created_at,updated_at",
  feedback_requests:
    "id,user_id,user_email,product,request_type,title,description,priority,status,page_url,browser,os,device,screenshot_url,admin_notes,is_read:b,is_important:b,created_at,updated_at",
  orders:
    "id,user_id,order_number,plan_id,billing_cycle,amount,tax,total,currency,status,dodo_payment_id,dodo_session_id,created_at,updated_at",
  payments:
    "id,order_id,user_id,provider,provider_order_id,provider_txn_id,amount,status,raw_response:j,created_at,updated_at",
  subscriptions:
    "id,user_id,plan_id,billing_cycle,status,current_period_start,current_period_end,cancel_at_period_end:b,dodo_subscription_id,created_at,updated_at",
  paytm_settings: "id,env,merchant_id,merchant_key,website,is_active:b,updated_by,created_at,updated_at",
  paytm_callback_logs:
    "id,event_type,paytm_order_id,paytm_txn_id,payment_status,status,http_status,verification_error,raw_headers:j,raw_payload:j,created_at",
  dodo_settings:
    "id,env,api_key,webhook_secret,product_pro_monthly,product_pro_yearly,product_business_monthly,product_business_yearly,reconciliation_token,is_active:b,updated_by,created_at,updated_at",
  dodo_webhook_logs:
    "id,webhook_id,event_type,order_id,dodo_payment_id,dodo_subscription_id,status,http_status,verification_error,raw_payload:j,processed_at,replay_count,last_replayed_at,created_at",
  merchant_api_keys: "id,name,key_hash,key_prefix,is_active:b,last_used_at,created_by,created_at,updated_at",
  merchant_orders:
    "id,order_number,api_key_id,external_order_id,amount,currency,description,customer_name,customer_email,customer_phone,callback_url,return_url,status,paytm_order_id,paytm_txn_id,txn_token,metadata:j,raw_response:j,verified_at,created_at,updated_at",
};

export const TABLES: Record<string, TableMeta> = Object.fromEntries(
  Object.entries(raw).map(([table, spec]) => {
    const columns: Record<string, ColType> = {};
    for (const part of spec.split(",")) {
      const [name, t] = part.split(":");
      columns[name] = (t as ColType) || "v";
    }
    return [table, { columns, hasUpdatedAt: "updated_at" in columns }];
  }),
);

/** SQLite row -> JSON row the frontend expects (booleans, parsed JSON). */
export function decodeRow(table: string, row: Record<string, unknown>): Record<string, unknown> {
  const meta = TABLES[table];
  if (!meta) return row;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    const t = meta.columns[k];
    if (t === "b") out[k] = v === null ? null : v === 1 || v === true;
    else if (t === "j" && typeof v === "string") {
      try { out[k] = JSON.parse(v); } catch { out[k] = v; }
    } else out[k] = v;
  }
  return out;
}

/** JS value -> SQLite bind value for a column. */
export function encodeValue(table: string, col: string, v: unknown): unknown {
  const t = TABLES[table]?.columns[col];
  if (v === undefined) return null;
  if (t === "b" && typeof v === "boolean") return v ? 1 : 0;
  if (typeof v === "boolean") return v ? 1 : 0;
  if (t === "j" && v !== null && typeof v !== "string") return JSON.stringify(v);
  if (v !== null && typeof v === "object") return JSON.stringify(v);
  return v;
}

export function nowIso(): string {
  return new Date().toISOString();
}
