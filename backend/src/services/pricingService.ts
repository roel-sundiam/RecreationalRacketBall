import { ObjectId } from 'mongodb';
import ClubSettings from '../models/ClubSettings';

/**
 * Club-specific pricing configuration
 */
export interface ClubPricing {
  pricingModel: 'variable' | 'fixed-hourly' | 'fixed-daily';
  peakHourFee: number;
  offPeakHourFee: number;
  fixedHourlyFee: number;
  fixedDailyFee: number;
  guestFee: number;
  peakHours: number[];
}

/**
 * Club-specific operating hours configuration
 */
export interface ClubOperatingHours {
  start: number;  // Starting hour (0-23)
  end: number;    // Ending hour (0-23)
}

/**
 * Combined club settings (pricing + operating hours)
 */
export interface ClubSettings {
  pricing: ClubPricing;
  operatingHours: ClubOperatingHours;
}

/**
 * Default pricing values (fallback when ClubSettings not found)
 */
const DEFAULT_PRICING: ClubPricing = {
  pricingModel: 'variable',
  peakHourFee: 150,
  offPeakHourFee: 100,
  fixedHourlyFee: 125,
  fixedDailyFee: 500,
  guestFee: 70,
  peakHours: [5, 18, 19, 20, 21]
};

/**
 * Default operating hours (fallback when ClubSettings not found)
 */
const DEFAULT_OPERATING_HOURS: ClubOperatingHours = {
  start: 5,   // 5 AM
  end: 22     // 10 PM (22:00)
};

/**
 * In-memory cache for club settings data
 * Key: clubId.toString()
 * Value: { settings: ClubSettings, timestamp: number }
 */
interface CacheEntry {
  settings: ClubSettings;
  timestamp: number;
}

class PricingServiceClass {
  private cache: Map<string, CacheEntry> = new Map();
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  /**
   * Get complete club settings (pricing + operating hours)
   * Uses in-memory cache with 5-minute TTL to reduce DB queries
   *
   * @param clubId - MongoDB ObjectId or string of the club
   * @returns ClubSettings object with pricing and operating hours
   */
  async getClubSettings(clubId: ObjectId | string): Promise<ClubSettings> {
    const clubIdStr = typeof clubId === 'string' ? clubId : clubId.toString();
    const now = Date.now();

    // Check cache first
    const cached = this.cache.get(clubIdStr);
    if (cached && (now - cached.timestamp) < this.CACHE_TTL_MS) {
      console.log(`⚙️  Settings cache HIT for club ${clubIdStr}`);
      return cached.settings;
    }

    console.log(`⚙️  Settings cache MISS for club ${clubIdStr} - fetching from DB`);

    try {
      // Fetch from database
      const settings = await ClubSettings.findOne({ clubId }).lean();

      let clubSettings: ClubSettings;

      if (!settings) {
        console.warn(`⚠️  No settings found for club ${clubIdStr}, using defaults`);
        clubSettings = {
          pricing: { ...DEFAULT_PRICING },
          operatingHours: { ...DEFAULT_OPERATING_HOURS }
        };
      } else {
        // Extract pricing from settings with defaults as fallback
        const pricing: ClubPricing = {
          pricingModel: settings.pricing?.pricingModel ?? DEFAULT_PRICING.pricingModel,
          peakHourFee: settings.pricing?.peakHourFee ?? DEFAULT_PRICING.peakHourFee,
          offPeakHourFee: settings.pricing?.offPeakHourFee ?? DEFAULT_PRICING.offPeakHourFee,
          fixedHourlyFee: settings.pricing?.fixedHourlyFee ?? DEFAULT_PRICING.fixedHourlyFee,
          fixedDailyFee: settings.pricing?.fixedDailyFee ?? DEFAULT_PRICING.fixedDailyFee,
          guestFee: settings.pricing?.guestFee ?? DEFAULT_PRICING.guestFee,
          peakHours: settings.pricing?.peakHours && settings.pricing.peakHours.length > 0
            ? settings.pricing.peakHours
            : DEFAULT_PRICING.peakHours
        };

        // Extract operating hours with defaults as fallback
        const operatingHours: ClubOperatingHours = {
          start: settings.operatingHours?.start ?? DEFAULT_OPERATING_HOURS.start,
          end: settings.operatingHours?.end ?? DEFAULT_OPERATING_HOURS.end
        };

        clubSettings = { pricing, operatingHours };

        console.log(`✅ Loaded settings for club ${clubIdStr}:`, {
          pricing: {
            peakHourFee: pricing.peakHourFee,
            offPeakHourFee: pricing.offPeakHourFee,
            guestFee: pricing.guestFee,
            peakHours: pricing.peakHours
          },
          operatingHours: {
            start: operatingHours.start,
            end: operatingHours.end
          }
        });
      }

      // Update cache
      this.cache.set(clubIdStr, {
        settings: clubSettings,
        timestamp: now
      });

      return clubSettings;
    } catch (error) {
      console.error(`❌ Error fetching settings for club ${clubIdStr}:`, error);

      // Try to use stale cache if available
      if (cached) {
        console.warn(`⚠️  Using stale cache for club ${clubIdStr} due to DB error`);
        return cached.settings;
      }

      // Final fallback to defaults
      console.warn(`⚠️  Using default settings for club ${clubIdStr} due to error`);
      return {
        pricing: { ...DEFAULT_PRICING },
        operatingHours: { ...DEFAULT_OPERATING_HOURS }
      };
    }
  }

  /**
   * Get pricing configuration for a specific club
   * Convenience method that extracts pricing from club settings
   *
   * @param clubId - MongoDB ObjectId or string of the club
   * @returns ClubPricing object with current fees and peak hours
   */
  async getClubPricing(clubId: ObjectId | string): Promise<ClubPricing> {
    const settings = await this.getClubSettings(clubId);
    return settings.pricing;
  }

  /**
   * Get operating hours for a specific club
   * Convenience method that extracts operating hours from club settings
   *
   * @param clubId - MongoDB ObjectId or string of the club
   * @returns ClubOperatingHours object with start and end hours
   */
  async getClubOperatingHours(clubId: ObjectId | string): Promise<ClubOperatingHours> {
    const settings = await this.getClubSettings(clubId);
    return settings.operatingHours;
  }

  /**
   * Clear cached pricing for a specific club or all clubs
   * Useful when ClubSettings are updated
   *
   * @param clubId - Optional clubId (ObjectId or string) to clear specific entry, omit to clear all
   */
  clearCache(clubId?: ObjectId | string): void {
    if (clubId) {
      const clubIdStr = typeof clubId === 'string' ? clubId : clubId.toString();
      this.cache.delete(clubIdStr);
      console.log(`🗑️  Cleared pricing cache for club ${clubIdStr}`);
    } else {
      this.cache.clear();
      console.log(`🗑️  Cleared all pricing cache`);
    }
  }

  /**
   * Get cache statistics (useful for monitoring)
   */
  getCacheStats(): { size: number; entries: string[] } {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys())
    };
  }
}

// Export singleton instance
export const PricingService = new PricingServiceClass();
