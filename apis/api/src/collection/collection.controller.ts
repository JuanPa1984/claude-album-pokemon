import { Controller, Delete, Param, Put, UseGuards } from '@nestjs/common';
import type { AuthUser } from '../common/auth-user';
import { CurrentUser } from '../common/current-user.decorator';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { CollectionService } from './collection.service';

/** The signed-in user's owned stickers. Both operations are idempotent. */
@Controller('collection/stickers')
@UseGuards(JwtAuthGuard)
export class CollectionController {
  constructor(private readonly collection: CollectionService) {}

  @Put(':stickerId')
  markOwned(@CurrentUser() user: AuthUser, @Param('stickerId') stickerId: string) {
    return this.collection.markOwned(user.sub, stickerId);
  }

  @Delete(':stickerId')
  unmarkOwned(@CurrentUser() user: AuthUser, @Param('stickerId') stickerId: string) {
    return this.collection.unmarkOwned(user.sub, stickerId);
  }
}
