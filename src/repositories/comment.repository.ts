import {inject, Getter} from '@loopback/core';
import {DefaultCrudRepository, repository, BelongsToAccessor} from '@loopback/repository';
import {MongoDbDataSource} from '../datasources';
import {Comment, CommentRelations, User, Post} from '../models';
import {UserRepository} from './user.repository';
import {PostRepository} from './post.repository';

export class CommentRepository extends DefaultCrudRepository<
  Comment,
  typeof Comment.prototype.id,
  CommentRelations
> {

  public readonly author: BelongsToAccessor<User, typeof Comment.prototype.id>;

  public readonly post: BelongsToAccessor<Post, typeof Comment.prototype.id>;

  constructor(
    @inject('datasources.MongoDb') dataSource: MongoDbDataSource, @repository.getter('UserRepository') protected userRepositoryGetter: Getter<UserRepository>, @repository.getter('PostRepository') protected postRepositoryGetter: Getter<PostRepository>,
  ) {
    super(Comment, dataSource);
    this.post = this.createBelongsToAccessorFor('post', postRepositoryGetter,);
    this.registerInclusionResolver('post', this.post.inclusionResolver);
    this.author = this.createBelongsToAccessorFor('author', userRepositoryGetter,);
    this.registerInclusionResolver('author', this.author.inclusionResolver);
  }
}
