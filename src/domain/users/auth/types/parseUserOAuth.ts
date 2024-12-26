import { RegistrationSources } from './providersOAuth.enum';

export type ParseUserOAuth = {
  name: string;
  email: string;
  icon: string;
  registrationSources: RegistrationSources[];
};
