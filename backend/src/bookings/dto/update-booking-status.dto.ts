import { IsString, IsIn } from 'class-validator';

export class UpdateBookingStatusDto {
  @IsString()
  @IsIn(['pending', 'confirmed', 'cancelled'])
  status: string;
}