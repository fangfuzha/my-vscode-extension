export interface LicenseItem {
  key: string;
  name: string;
  spdx_id: string | null;
  description?: string;
  html_url?: string;
}

export interface License extends LicenseItem {
  body: string;
  permissions?: string[];
  conditions?: string[];
  limitations?: string[];
}

export interface AuthState {
  signedIn: boolean;
  account?: string;
}
