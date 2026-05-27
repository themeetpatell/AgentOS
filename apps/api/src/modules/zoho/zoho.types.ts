/**
 * Zoho CRM record shapes used by the platform.
 * Field names are the canonical Zoho v6 API shape and align with the
 * mapping documented in finanshels_web/src/lib/landingPages/zohoClient.ts
 * and finanshels_web/src/lib/chat/zoho.ts. If a third consumer appears,
 * extract these (and zoho.service.ts) into a shared @finanshels/zoho package.
 */

export type ZohoModule = 'Leads' | 'Deals' | 'Contacts' | 'Accounts';

export interface ZohoLead {
  readonly id: string;
  readonly Full_Name?: string;
  readonly First_Name?: string;
  readonly Last_Name?: string;
  readonly Email?: string;
  readonly Phone?: string;
  readonly Mobile?: string;
  readonly Company?: string;
  readonly Industry?: string;
  readonly Lead_Source?: string;
  readonly Lead_Status?: string;
  readonly Description?: string;
  readonly Service_Interest?: string;
  readonly No_of_Employees?: string | number;
  readonly Created_Time?: string;
  readonly Modified_Time?: string;
}

export interface ZohoDeal {
  readonly id: string;
  readonly Deal_Name?: string;
  readonly Stage?: string;
  readonly Amount?: number;
  readonly Closing_Date?: string;
  readonly Account_Name?: { id: string; name: string };
  readonly Contact_Name?: { id: string; name: string };
  readonly Owner?: { id: string; name: string };
  readonly Description?: string;
  readonly Created_Time?: string;
  readonly Modified_Time?: string;
}

export interface ZohoNote {
  readonly id: string;
  readonly Note_Title?: string;
  readonly Note_Content?: string;
  readonly Parent_Id?: { id: string; module: ZohoModule };
  readonly Created_Time?: string;
}

export interface ZohoTask {
  readonly id: string;
  readonly Subject?: string;
  readonly Status?: string;
  readonly Priority?: string;
  readonly Due_Date?: string;
  readonly Description?: string;
  readonly What_Id?: { id: string; name: string };
  readonly Who_Id?: { id: string; name: string };
}

export interface ZohoSearchResult {
  readonly type: 'lead' | 'deal';
  readonly id: string;
  readonly title: string;
  readonly subtitle: string;
}

export interface ZohoCreateResponseDatum {
  readonly code: 'SUCCESS' | 'INVALID_DATA' | 'DUPLICATE_DATA' | string;
  readonly details: { id?: string };
  readonly message?: string;
  readonly status: 'success' | 'error';
}

export interface ZohoCreateResponse {
  readonly data: ReadonlyArray<ZohoCreateResponseDatum>;
}
