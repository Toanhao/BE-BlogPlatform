
export class UserDailyStatDto {
  static schema = {
    type: 'object' as const,
    properties: {
      date: {type: 'string' as const, format: 'date' as const},
      userCount: {type: 'number' as const},
      updatedAt: {type: 'string' as const, format: 'date-time' as const},
    },
  };
}
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


export class TopPostDto {
  static schema = {
    type: 'object' as const,
    properties: {
      id: {type: 'string' as const},
      title: {type: 'string' as const},
      excerpt: {type: 'string' as const},
      image: {type: 'string' as const, nullable: true},
      createdAt: {type: 'string' as const, format: 'date-time' as const},
      authorId: {type: 'string' as const},
      commentCount: {type: 'number' as const},
    },
  };
}