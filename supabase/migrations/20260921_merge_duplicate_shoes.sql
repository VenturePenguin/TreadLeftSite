-- ═══════════════════════════════════════════════════════════════
-- merge_duplicate_shoes RPC
-- Repoints all linked records from a duplicate product to the
-- master, then deletes the duplicate row.
-- Returns TRUE on success.
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION merge_duplicate_shoes(
  master_id uuid,
  duplicate_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Guard: master must exist
  IF NOT EXISTS (SELECT 1 FROM master_shoe_products WHERE id = master_id) THEN
    RAISE EXCEPTION 'Master product % does not exist', master_id;
  END IF;

  -- Guard: duplicate must exist
  IF NOT EXISTS (SELECT 1 FROM master_shoe_products WHERE id = duplicate_id) THEN
    RAISE EXCEPTION 'Duplicate product % does not exist', duplicate_id;
  END IF;

  -- Guard: cannot merge into self
  IF master_id = duplicate_id THEN
    RAISE EXCEPTION 'Cannot merge a product into itself';
  END IF;

  -- 1. Repoint shoe_deals
  UPDATE shoe_deals
    SET master_product_id = master_id,
        updated_at = NOW()
  WHERE master_product_id = duplicate_id;

  -- 2. Repoint user_gear_items
  UPDATE user_gear_items
    SET master_product_id = master_id,
        updated_at = NOW()
  WHERE master_product_id = duplicate_id;

  -- 3. Repoint user_price_alerts
  UPDATE user_price_alerts
    SET master_product_id = master_id,
        updated_at = NOW()
  WHERE master_product_id = duplicate_id;

  -- 4. Delete the duplicate product
  DELETE FROM master_shoe_products WHERE id = duplicate_id;

  RETURN TRUE;
END;
$$;

-- Grant to roles used by the Supabase client
GRANT EXECUTE ON FUNCTION merge_duplicate_shoes(uuid, uuid) TO anon, authenticated;
