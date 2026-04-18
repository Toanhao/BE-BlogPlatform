export class CountStatisticsResponseDto {
  static schema = {
    type: 'object' as const,
    properties: {
      totalUser: {type: 'number' as const},
      totalPost: {type: 'number' as const},
      todayUser: {type: 'number' as const},
      todayPost: {type: 'number' as const},
      updatedAt: {type: 'string' as const, format: 'date-time' as const},
    },
  };
}