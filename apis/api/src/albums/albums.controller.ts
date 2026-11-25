import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import type { AuthUser } from '../common/auth-user';
import { CurrentUser } from '../common/current-user.decorator';
import { OptionalJwtAuthGuard } from '../common/jwt-auth.guard';
import { AlbumsService } from './albums.service';

/** Public endpoints; when a token is sent, responses include the user's progress. */
@Controller('albums')
@UseGuards(OptionalJwtAuthGuard)
export class AlbumsController {
  constructor(private readonly albums: AlbumsService) {}

  @Get()
  findAll(@CurrentUser() user?: AuthUser) {
    return this.albums.findAll(user?.sub);
  }

  @Get(':slug')
  findOne(@Param('slug') slug: string, @CurrentUser() user?: AuthUser) {
    return this.albums.findBySlug(slug, user?.sub);
  }
}
