-- Migration: 0005_add_manufacturing_cost_centers_tables.down.sql

DROP TABLE IF EXISTS profit_centers CASCADE;
DROP TABLE IF EXISTS cost_centers CASCADE;
DROP TABLE IF EXISTS production_orders CASCADE;
DROP TABLE IF EXISTS bom_components CASCADE;
DROP TABLE IF EXISTS boms CASCADE;
