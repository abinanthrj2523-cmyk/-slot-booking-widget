import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class SlotsService {
  constructor(private readonly supabase: SupabaseService) {}

  async getBookedRequests(
    bookingType: string,
    windowStartKey: string,
    windowEndKey: string,
  ) {
    const client = this.supabase.getClient();

    const { data, error } = await client
      .from('booking_requests')
      .select('slot_date, start_time, status')
      .eq('booking_type', bookingType)
      .in('status', ['pending', 'confirmed'])
      .gte('slot_date', windowStartKey)
      .lte('slot_date', windowEndKey);

    if (error) {
      throw new Error(error.message);
    }

    return data ?? [];
  }
}