import {inject, injectable} from '@loopback/core';
import {Filter, FilterExcludingWhere, repository} from '@loopback/repository';
import {HttpErrors} from '@loopback/rest';
import {hash} from 'bcryptjs';
import {AppblogBindings} from '../keys';
import {Post, User} from '../models';
import {UserRepository} from '../repositories';
import {RedisService} from './redis.service';

const TTL_MY_POSTS = 86400;
const KEY_MY_POSTS_PREFIX = 'posts:my:';

type CreateUserPayload = {
  username: string;
  email: string;
  password: string;
  image?: string;
  role?: string;
};

@injectable()
export class UserService {
  constructor(
    @repository(UserRepository)
    public userRepository: UserRepository,
    @inject(AppblogBindings.REDIS_SERVICE)
    private redisService: RedisService,
  ) {}

  private async findUserByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({where: {email}});
  }

  async createUser(payload: CreateUserPayload): Promise<User> {
    const existingUser = await this.findUserByEmail(payload.email);

    if (existingUser) {
      throw new HttpErrors.Conflict('Email already exists');
    }

    const hashedPassword = await hash(payload.password, 10);

    return this.userRepository.create({
      username: payload.username,
      email: payload.email,
      password: hashedPassword,
      role: payload.role ?? 'user',
      image: payload.image,
    });
  }

  async findUsers(filter?: Filter<User>): Promise<User[]> {
    return this.userRepository.find(filter);
  }

  async findUserById(
    id: string,
    filter?: FilterExcludingWhere<User>,
  ): Promise<User> {
    return this.userRepository.findById(id, filter);
  }

  async findPostsByUserId(id: string): Promise<Post[]> {
    const cacheKey = `${KEY_MY_POSTS_PREFIX}${id}`;
    const cached = await this.redisService.getJson<Post[]>(cacheKey);

    if (cached) {
      return cached;
    }

    const posts = await this.userRepository.posts(id).find({
      order: ['createdAt DESC'],
      include: [{relation: 'author'}],
    });

    await this.redisService.setJson(cacheKey, posts, TTL_MY_POSTS);

    return posts;
  }
}