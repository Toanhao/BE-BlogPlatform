import {UserService} from '@loopback/authentication';
import {injectable} from '@loopback/core';
import {repository} from '@loopback/repository';
import {HttpErrors} from '@loopback/rest';
import {securityId, UserProfile} from '@loopback/security';
import {compare} from 'bcryptjs';
import {LoginRequestDto} from '../dtos';
import {User} from '../models';
import {UserRepository} from '../repositories';

@injectable()
export class AppblogUserService implements UserService<User, LoginRequestDto> {
  constructor(
    @repository(UserRepository)
    public userRepository: UserRepository,
  ) {}

  async verifyCredentials(credentials: LoginRequestDto): Promise<User> {
    const invalidCredentialsError = 'Invalid email or password';

    const foundUser = await this.userRepository.findOne({
      where: {email: credentials.email},
    });

    if (!foundUser) {
      throw new HttpErrors.Unauthorized(invalidCredentialsError);
    }

    const passwordMatched = await compare(credentials.password, foundUser.password);
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
