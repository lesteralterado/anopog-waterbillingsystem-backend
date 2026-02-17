import { Request, Response } from 'express';
import prisma from '../lib/prisma';

// Interface for the settings update body
interface SettingsUpdateBody {
  // Water Billing Rates
  water_rate_per_cubic_meter?: number;
  minimum_charge?: number;
  penalty_rate?: number;
  
  // Billing Cycle
  billing_cycle?: string;
  billing_day_of_month?: number;
  
  // Due Date Configuration
  due_date_days?: number;
  grace_period_days?: number;
  
  // Late Fee Calculation
  late_fee_method?: string;
  late_fee_fixed_amount?: number;
  late_fee_tier_1_days?: number;
  late_fee_tier_1_amount?: number;
  late_fee_tier_2_days?: number;
  late_fee_tier_2_amount?: number;
  
  // Consumption Tiers
  tiered_pricing_enabled?: boolean;
  tier_1_threshold?: number;
  tier_1_rate?: number;
  tier_2_threshold?: number;
  tier_2_rate?: number;
  tier_3_threshold?: number;
  tier_3_rate?: number;
  
  // Meter Reading
  meter_reading_frequency?: string;
  meter_reading_day?: number;
  
  // Notification Settings
  sms_notifications_enabled?: boolean;
  email_notifications_enabled?: boolean;
  notification_days_before_due?: number;
  
  // Company Information
  company_name?: string;
  company_address?: string;
  company_phone?: string;
  company_email?: string;
}

/**
 * Get system settings
 * Returns the first settings record or creates default settings if none exist
 */
export const getSettings = async (req: Request, res: Response) => {
  try {
    let settings = await prisma.system_settings.findFirst({
      orderBy: { id: 'desc' },
      take: 1
    });

    // If no settings exist, create default settings
    if (!settings) {
      settings = await prisma.system_settings.create({
        data: {}
      });
    }

    // Map to camelCase for frontend compatibility
    const mappedSettings = {
      id: settings.id,
      waterRatePerCubicMeter: settings.water_rate_per_cubic_meter,
      minimumCharge: settings.minimum_charge,
      penaltyRate: settings.penalty_rate,
      billingCycle: settings.billing_cycle,
      billingDayOfMonth: settings.billing_day_of_month,
      dueDateDays: settings.due_date_days,
      gracePeriodDays: settings.grace_period_days,
      lateFeeMethod: settings.late_fee_method,
      lateFeeFixedAmount: settings.late_fee_fixed_amount,
      lateFeeTier1Days: settings.late_fee_tier_1_days,
      lateFeeTier1Amount: settings.late_fee_tier_1_amount,
      lateFeeTier2Days: settings.late_fee_tier_2_days,
      lateFeeTier2Amount: settings.late_fee_tier_2_amount,
      tieredPricingEnabled: settings.tiered_pricing_enabled,
      tier1Threshold: settings.tier_1_threshold,
      tier1Rate: settings.tier_1_rate,
      tier2Threshold: settings.tier_2_threshold,
      tier2Rate: settings.tier_2_rate,
      tier3Threshold: settings.tier_3_threshold,
      tier3Rate: settings.tier_3_rate,
      meterReadingFrequency: settings.meter_reading_frequency,
      meterReadingDay: settings.meter_reading_day,
      smsNotificationsEnabled: settings.sms_notifications_enabled,
      emailNotificationsEnabled: settings.email_notifications_enabled,
      notificationDaysBeforeDue: settings.notification_days_before_due,
      companyName: settings.company_name,
      companyAddress: settings.company_address,
      companyPhone: settings.company_phone,
      companyEmail: settings.company_email,
      createdAt: settings.created_at,
      updatedAt: settings.updated_at,
    };

    res.json({ data: mappedSettings });
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ message: 'Failed to fetch settings' });
  }
};

/**
 * Update system settings
 * Updates the existing settings record or creates a new one if none exist
 */
export const updateSettings = async (req: Request, res: Response) => {
  try {
    const settingsData: SettingsUpdateBody = req.body;

    // Map camelCase to snake_case for database
    const dbData: any = {};
    
    if (settingsData.water_rate_per_cubic_meter !== undefined) dbData.water_rate_per_cubic_meter = settingsData.water_rate_per_cubic_meter;
    if (settingsData.minimum_charge !== undefined) dbData.minimum_charge = settingsData.minimum_charge;
    if (settingsData.penalty_rate !== undefined) dbData.penalty_rate = settingsData.penalty_rate;
    if (settingsData.billing_cycle !== undefined) dbData.billing_cycle = settingsData.billing_cycle;
    if (settingsData.billing_day_of_month !== undefined) dbData.billing_day_of_month = settingsData.billing_day_of_month;
    if (settingsData.due_date_days !== undefined) dbData.due_date_days = settingsData.due_date_days;
    if (settingsData.grace_period_days !== undefined) dbData.grace_period_days = settingsData.grace_period_days;
    if (settingsData.late_fee_method !== undefined) dbData.late_fee_method = settingsData.late_fee_method;
    if (settingsData.late_fee_fixed_amount !== undefined) dbData.late_fee_fixed_amount = settingsData.late_fee_fixed_amount;
    if (settingsData.late_fee_tier_1_days !== undefined) dbData.late_fee_tier_1_days = settingsData.late_fee_tier_1_days;
    if (settingsData.late_fee_tier_1_amount !== undefined) dbData.late_fee_tier_1_amount = settingsData.late_fee_tier_1_amount;
    if (settingsData.late_fee_tier_2_days !== undefined) dbData.late_fee_tier_2_days = settingsData.late_fee_tier_2_days;
    if (settingsData.late_fee_tier_2_amount !== undefined) dbData.late_fee_tier_2_amount = settingsData.late_fee_tier_2_amount;
    if (settingsData.tiered_pricing_enabled !== undefined) dbData.tiered_pricing_enabled = settingsData.tiered_pricing_enabled;
    if (settingsData.tier_1_threshold !== undefined) dbData.tier_1_threshold = settingsData.tier_1_threshold;
    if (settingsData.tier_1_rate !== undefined) dbData.tier_1_rate = settingsData.tier_1_rate;
    if (settingsData.tier_2_threshold !== undefined) dbData.tier_2_threshold = settingsData.tier_2_threshold;
    if (settingsData.tier_2_rate !== undefined) dbData.tier_2_rate = settingsData.tier_2_rate;
    if (settingsData.tier_3_threshold !== undefined) dbData.tier_3_threshold = settingsData.tier_3_threshold;
    if (settingsData.tier_3_rate !== undefined) dbData.tier_3_rate = settingsData.tier_3_rate;
    if (settingsData.meter_reading_frequency !== undefined) dbData.meter_reading_frequency = settingsData.meter_reading_frequency;
    if (settingsData.meter_reading_day !== undefined) dbData.meter_reading_day = settingsData.meter_reading_day;
    if (settingsData.sms_notifications_enabled !== undefined) dbData.sms_notifications_enabled = settingsData.sms_notifications_enabled;
    if (settingsData.email_notifications_enabled !== undefined) dbData.email_notifications_enabled = settingsData.email_notifications_enabled;
    if (settingsData.notification_days_before_due !== undefined) dbData.notification_days_before_due = settingsData.notification_days_before_due;
    if (settingsData.company_name !== undefined) dbData.company_name = settingsData.company_name;
    if (settingsData.company_address !== undefined) dbData.company_address = settingsData.company_address;
    if (settingsData.company_phone !== undefined) dbData.company_phone = settingsData.company_phone;
    if (settingsData.company_email !== undefined) dbData.company_email = settingsData.company_email;

    // Check if settings exist
    let existingSettings = await prisma.system_settings.findFirst({
      orderBy: { id: 'desc' },
      take: 1
    });

    let settings;
    if (existingSettings) {
      // Update existing settings
      settings = await prisma.system_settings.update({
        where: { id: existingSettings.id },
        data: dbData
      });
    } else {
      // Create new settings
      settings = await prisma.system_settings.create({
        data: dbData
      });
    }

    // Map to camelCase for frontend compatibility
    const mappedSettings = {
      id: settings.id,
      waterRatePerCubicMeter: settings.water_rate_per_cubic_meter,
      minimumCharge: settings.minimum_charge,
      penaltyRate: settings.penalty_rate,
      billingCycle: settings.billing_cycle,
      billingDayOfMonth: settings.billing_day_of_month,
      dueDateDays: settings.due_date_days,
      gracePeriodDays: settings.grace_period_days,
      lateFeeMethod: settings.late_fee_method,
      lateFeeFixedAmount: settings.late_fee_fixed_amount,
      lateFeeTier1Days: settings.late_fee_tier_1_days,
      lateFeeTier1Amount: settings.late_fee_tier_1_amount,
      lateFeeTier2Days: settings.late_fee_tier_2_days,
      lateFeeTier2Amount: settings.late_fee_tier_2_amount,
      tieredPricingEnabled: settings.tiered_pricing_enabled,
      tier1Threshold: settings.tier_1_threshold,
      tier1Rate: settings.tier_1_rate,
      tier2Threshold: settings.tier_2_threshold,
      tier2Rate: settings.tier_2_rate,
      tier3Threshold: settings.tier_3_threshold,
      tier3Rate: settings.tier_3_rate,
      meterReadingFrequency: settings.meter_reading_frequency,
      meterReadingDay: settings.meter_reading_day,
      smsNotificationsEnabled: settings.sms_notifications_enabled,
      emailNotificationsEnabled: settings.email_notifications_enabled,
      notificationDaysBeforeDue: settings.notification_days_before_due,
      companyName: settings.company_name,
      companyAddress: settings.company_address,
      companyPhone: settings.company_phone,
      companyEmail: settings.company_email,
      createdAt: settings.created_at,
      updatedAt: settings.updated_at,
    };

    res.json({ data: mappedSettings });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ message: 'Failed to update settings' });
  }
};
