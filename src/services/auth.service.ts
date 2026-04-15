import {UserService as LoopbackUserService} from '@loopback/authentication';
import {injectable} from '@loopback/core';
import {repository} from '@loopback/repository';
import {HttpErrors} from '@loopback/rest';
import {securityId, UserProfile} from '@loopback/security';
import {compare, hash} from 'bcryptjs';
import {LoginRequestDto} from '../dtos';
import {User} from '../models';
import {UserRepository} from '../repositories';

type CreateAuthUserPayload = {
  username: string;
  email: string;
  password: string;
  image?: string;
  role?: string;
};

@injectable()
export class AuthService implements LoopbackUserService<User, LoginRequestDto> {
  constructor(
    @repository(UserRepository)
    public userRepository: UserRepository,
  ) {}

  private async findUserByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({where: {email}});
  }

  async createUser(payload: CreateAuthUserPayload): Promise<User> {
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

  async verifyCredentials(credentials: LoginRequestDto): Promise<User> {
    const invalidCredentialsError = 'Invalid email or password';

    const foundUser = await this.findUserByEmail(credentials.email);

    if (!foundUser) {
      throw new HttpErrors.Unauthorized(invalidCredentialsError);
    }

    const passwordMatched = await compare(
      credentials.password,
      foundUser.password,
    );

    if (!passwordMatched) {
      throw new HttpErrors.Unauthorized(invalidCredentialsError);
    }

    return foundUser;
  }

  convertToUserProfile(user: User): UserProfile {
    return {
      [securityId]: String(user.id),
      id: String(user.id),
      name: user.username,
      email: user.email,
      role: user.role,
    };
  }
}
