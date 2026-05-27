import {
  BadRequestException,
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { ZohoService } from './zoho.service';
import type {
  ZohoDeal,
  ZohoLead,
  ZohoSearchResult,
} from './zoho.types';

@UseGuards(FirebaseAuthGuard)
@Controller('zoho')
export class ZohoController {
  constructor(private readonly zoho: ZohoService) {}

  @Get('search')
  async search(
    @Query('q') q?: string,
    @Query('module') module?: string,
  ): Promise<{ results: ZohoSearchResult[] }> {
    const term = (q ?? '').trim();
    if (!term) {
      return { results: [] };
    }
    const target = module === 'deals' ? 'deals' : 'leads';
    const results =
      target === 'deals'
        ? await this.zoho.searchDeals(term)
        : await this.zoho.searchLeads(term);
    return { results };
  }

  @Get('leads/:id')
  async getLead(@Param('id') id: string): Promise<{ lead: ZohoLead }> {
    if (!id) throw new BadRequestException('id required');
    const lead = await this.zoho.getLead(id);
    if (!lead) throw new NotFoundException(`Lead ${id} not found`);
    return { lead };
  }

  @Get('deals/:id')
  async getDeal(@Param('id') id: string): Promise<{ deal: ZohoDeal }> {
    if (!id) throw new BadRequestException('id required');
    const deal = await this.zoho.getDeal(id);
    if (!deal) throw new NotFoundException(`Deal ${id} not found`);
    return { deal };
  }
}
