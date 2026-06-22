import { Injectable, ConflictException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto';

@Injectable()
export class BookingsService {
  constructor(private readonly supabase: SupabaseService) {}

  async create(createBookingDto: CreateBookingDto) {
    const client = this.supabase.getClient();

    const referenceCode = `BK-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    const { error } = await client.from('booking_requests').insert({
      reference_code: referenceCode,
      booking_type: createBookingDto.booking_type,
      slot_id: createBookingDto.slot_id ?? null,
      slot_date: createBookingDto.slot_date,
      start_time: createBookingDto.start_time,
      end_time: createBookingDto.end_time,
      full_name: createBookingDto.full_name,
      email: createBookingDto.email,
      phone: createBookingDto.phone,
      company: createBookingDto.company ?? null,
      meeting_type: createBookingDto.meeting_type,
      notes: createBookingDto.notes ?? null,
      status: createBookingDto.status ?? 'pending',
    });

    if (error) {
      if (error.code === '23505') {
        throw new ConflictException('That slot is already booked. Please choose another time.');
      }
      throw new Error(error.message);
    }

    return { reference_code: referenceCode };
  }

  async findAll() {
    const client = this.supabase.getClient();

    const { data, error } = await client
      .from('booking_requests')
      .select('*')
      .order('slot_date', { ascending: false })
      .order('start_time', { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return data ?? [];
  }

  async updateStatus(id: string, updateBookingStatusDto: UpdateBookingStatusDto) {
    const client = this.supabase.getClient();

    const { error } = await client
      .from('booking_requests')
      .update({ status: updateBookingStatusDto.status })
      .eq('id', id);

    if (error) {
      throw new Error(error.message);
    }
  }
}