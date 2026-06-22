import { Controller, Get, Query } from '@nestjs/common';
import { SlotsService } from './slots.service';
import { AvailabilityQueryDto } from './dto/availability-query.dto';

@Controller('slots')
export class SlotsController {
  constructor(private readonly slotsService: SlotsService) {}

  @Get('availability')
  async getAvailability(@Query() query: AvailabilityQueryDto) {
    const bookingType = query.booking_type ?? 'default';
    return this.slotsService.getBookedRequests(
      bookingType,
      query.start_date,
      query.end_date,
    );
  }
}