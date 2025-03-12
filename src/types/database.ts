// Database table definitions

export interface DIDType {
  id: number;
  did_type: string;  // NOT NULL
}

export interface Provider {
  providerid: number;
  provider_name: string | null;
  did_type: string | null;
  address: string | null;
  state: string | null;
  zip: string | null;
  phone: string | null;
  acctmgr1: string | null;
  acctmgr1_phone: string | null;
  acctmgr1_email: string | null;
  acctmgr2: string | null;
  acctmgr2_email: string | null;
  accounting: string | null;
  accounting_email: string | null;
}

export interface BriefTemplate {
  id: number;
  template_name: string;
  provider_id: number;
  did_type: number;
  template_file_path: string;
  template_text: string;  // Text with placeholders for preview and validation
  template_format: {
    placeholders: string[];  // List of valid placeholders
    version?: string;        // Optional template version
    metadata?: {            // Optional additional metadata
      created_by?: string;
      last_modified?: string;
      description?: string;
    };
  };
  created_at?: string;
  updated_at?: string;
}

// Type for inserting a new template
export interface InsertBriefTemplate extends Omit<BriefTemplate, 'id' | 'created_at' | 'updated_at'> {}

// Type for displaying template in UI with related data
export interface DisplayBriefTemplate extends BriefTemplate {
  provider: {
    provider_name: string;
  };
  did_type_display: {
    did_type: string;
  };
} 