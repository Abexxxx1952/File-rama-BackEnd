import { RegistrationSources } from './providers-oauth.enum';

export type ParseUserOAuth = {
  name: string;
  email: string;
  icon: string;
  registrationSources: RegistrationSources[];
};
