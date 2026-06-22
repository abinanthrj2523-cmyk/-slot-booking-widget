import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SupabaseModule } from './supabase/supabase.module';
import { SlotsModule } from './slots/slots.module';
import { BookingsModule } from './bookings/bookings.module';

@Module({
  imports: [
    // Load .env into process.env globally
    ConfigModule.forRoot({ isGlobal: true }),
    SupabaseModule,
    SlotsModule,
    BookingsModule,
  ],
})
export class AppModule {}
