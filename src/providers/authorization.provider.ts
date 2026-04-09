import {
  AuthorizationContext,
  AuthorizationDecision,
  AuthorizationMetadata,
  Authorizer,
} from '@loopback/authorization';
import {Provider} from '@loopback/core';
import {repository} from '@loopback/repository';
import {securityId, UserProfile} from '@loopback/security';
import {CommentRepository, PostRepository} from '../repositories';

type AppblogAuthorizationMetadata = AuthorizationMetadata & {
  owner?: 'user' | 'post' | 'comment';
  ownerArgIndex?: number;
};

export class AppblogAuthorizationProvider implements Provider<Authorizer> {
  constructor(
    @repository(PostRepository)
    private postRepository: PostRepository,
    @repository(CommentRepository)
    private commentRepository: CommentRepository,
  ) {}

  value(): Authorizer {
    return this.authorize.bind(this);
  }

  async authorize(
    authorizationCtx: AuthorizationContext,
    metadata: AppblogAuthorizationMetadata,
  ): Promise<AuthorizationDecision> {
    const principal = authorizationCtx.principals[0] as UserProfile | undefined;
    if (!principal) {
      return AuthorizationDecision.DENY;
    }

    const currentUserId = String(
      principal[securityId] ?? principal.id ?? '',
    );
    const currentUserRole =
      typeof principal.role === 'string' ? principal.role : undefined;

    if (currentUserRole === 'admin') {
      return AuthorizationDecision.ALLOW;
    }

    if (this.hasAllowedRole(currentUserRole, metadata.allowedRoles)) {
      return AuthorizationDecision.ALLOW;
    }

    if (!metadata.owner) {
      return AuthorizationDecision.DENY;
    }

    const ownerArgIndex = metadata.ownerArgIndex ?? 0;
    const ownerArg = String(authorizationCtx.invocationContext.args[ownerArgIndex] ?? '');
    if (!ownerArg) {
      return AuthorizationDecision.DENY;
    }

    if (metadata.owner === 'user') {
      return ownerArg === currentUserId
        ? AuthorizationDecision.ALLOW
        : AuthorizationDecision.DENY;
    }

    if (metadata.owner === 'post') {
      const post = await this.postRepository.findById(ownerArg).catch(() => undefined);
      if (!post) {
        return AuthorizationDecision.ABSTAIN;
      }

      return String(post.authorId) === currentUserId
        ? AuthorizationDecision.ALLOW
        : AuthorizationDecision.DENY;
    }

    if (metadata.owner === 'comment') {
      const comment = await this.commentRepository
        .findById(ownerArg)
        .catch(() => undefined);
      if (!comment) {
        return AuthorizationDecision.ABSTAIN;
      }

      return String(comment.authorId) === currentUserId
        ? AuthorizationDecision.ALLOW
        : AuthorizationDecision.DENY;
    }

    return AuthorizationDecision.DENY;
  }

  private hasAllowedRole(
    currentRole: string | undefined,
    allowedRoles?: string[],
  ): boolean {
    return Boolean(currentRole && allowedRoles?.includes(currentRole));
  }
}
