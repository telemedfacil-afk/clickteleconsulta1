# Verification Guide: Notification System Fixes

This guide explains how to verify that the notification system repairs have been applied correctly.

## 1. Verify Database Schema
Check that the `notifications` table has the `body` and `link` columns and that the `notification_reads` table exists.

**In Supabase SQL Editor:**