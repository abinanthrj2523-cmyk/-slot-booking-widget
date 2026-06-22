import { IsString, IsOptional } from 'class-validator';

export class AvailabilityQueryDto {
  @IsString()
  @IsOptional()
  booking_type?: string;

  @IsString()
  start_date: string;

  @IsString()
  end_date: string;
}